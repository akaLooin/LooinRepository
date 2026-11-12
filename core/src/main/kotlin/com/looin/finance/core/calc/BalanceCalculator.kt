package com.looin.finance.core.calc

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.money.MoneyFormat
import kotlinx.datetime.LocalDate

/**
 * 잔고 계산.
 *
 * - 실제 잔고 = 초기 잔고 + 완료 거래의 변화량 합 (예정·취소 거래는 반영하지 않음)
 * - 예상 잔고(기준일 D) = 실제 잔고 + 예정일이 D 이하인 예정 거래 변화량 합
 *   (지난 날짜의 미처리 예정 거래도 아직 처리되지 않았으므로 포함)
 *
 * 예정 거래를 완료로 바꾸면 같은 거래 레코드의 상태만 바뀌므로
 * 예상 잔고와 실제 잔고에 동시에 두 번 반영되는 일이 없다.
 */
object BalanceCalculator {

    fun actualBalance(account: Account, transactions: List<Transaction>): Long =
        account.openingBalance + transactions.asSequence()
            .filter { it.isCompleted && it.touches(account.id) }
            .sumOf { it.deltaFor(account.id) }

    fun plannedDelta(account: Account, transactions: List<Transaction>, asOfInclusive: LocalDate): Long =
        transactions.asSequence()
            .filter { it.isPlanned && it.touches(account.id) && it.date <= asOfInclusive }
            .sumOf { it.deltaFor(account.id) }

    fun projectedBalance(account: Account, transactions: List<Transaction>, asOfInclusive: LocalDate): Long =
        actualBalance(account, transactions) + plannedDelta(account, transactions, asOfInclusive)

    fun actualBalances(accounts: List<Account>, transactions: List<Transaction>): Map<Long, Long> =
        accounts.associate { it.id to actualBalance(it, transactions) }

    /** 계좌의 원화 평가액. 원화 계좌는 잔액 그대로, 외화는 환율이 있을 때만 계산(없으면 null). */
    fun valuationKrw(account: Account, balance: Long): Long? = when {
        account.currency == KRW -> balance
        account.rateToKrwX10000 != null -> MoneyFormat.toKrw(balance, account.currency, account.rateToKrwX10000)
        else -> null
    }

    /**
     * 자산 요약. 보관 계좌도 포함한다(보관은 잔액 0·예정 거래 없음일 때만 허용되므로 값에 영향 없음).
     */
    fun assetSummary(accounts: List<Account>, transactions: List<Transaction>): AssetSummary {
        var assets = 0L
        var liabilities = 0L
        val unvalued = mutableListOf<Account>()
        val assetLines = mutableListOf<BreakdownLine>()
        val liabilityLines = mutableListOf<BreakdownLine>()
        for (account in accounts) {
            val balance = actualBalance(account, transactions)
            val krw = valuationKrw(account, balance)
            if (krw == null) {
                unvalued += account
                continue
            }
            if (account.type.isLiability) {
                // 부채 계좌 잔액은 음수(빚). 부채 총액은 양수로 표시한다.
                liabilities += -krw
                if (krw != 0L) liabilityLines += BreakdownLine(account.name, -krw, -1)
            } else {
                assets += krw
                if (krw != 0L) {
                    val note = if (account.currency != KRW) "${MoneyFormat.format(balance, account.currency)} 환산" else ""
                    assetLines += BreakdownLine(account.name, krw, 1, note)
                }
            }
        }
        val notes = buildList {
            if (unvalued.isNotEmpty()) add("평가 환율 미설정으로 제외: " + unvalued.joinToString { it.name })
        }
        val netWorth = assets - liabilities
        return AssetSummary(
            totalAssets = assets,
            totalLiabilities = liabilities,
            netWorth = netWorth,
            unvaluedAccounts = unvalued,
            netWorthBreakdown = Breakdown(
                title = "순자산",
                total = netWorth,
                lines = assetLines + liabilityLines,
                formula = "순자산 = 자산 평가액 합계 − 부채 합계",
                notes = notes,
            ),
        )
    }

    /**
     * 실제 보유 잔고: 부채가 아닌 원화 현금성 계좌(입출금·현금·저축) 잔액 합.
     */
    fun cashBreakdown(accounts: List<Account>, transactions: List<Transaction>): Breakdown {
        val lines = accounts
            .filter { !it.type.isLiability && it.currency == KRW && it.type in CASH_LIKE && !it.archived }
            .map { BreakdownLine(it.name, actualBalance(it, transactions)) }
        return Breakdown(
            title = "실제 보유 잔고",
            total = lines.sumOf { it.amount },
            lines = lines,
            formula = "입출금·현금·저축 원화 계좌의 현재 잔액 합 (완료 거래만 반영)",
        )
    }

    /** 대상 계좌들의 [asOfInclusive] 시점 예상 잔고 근거. */
    fun projectedBreakdown(
        accounts: List<Account>,
        transactions: List<Transaction>,
        asOfInclusive: LocalDate,
        title: String,
    ): Breakdown {
        val actual = accounts.sumOf { actualBalance(it, transactions) }
        val ids = accounts.map { it.id }.toSet()
        val planned = transactions.filter {
            it.isPlanned && it.date <= asOfInclusive &&
                (it.fromAccountId in ids || it.toAccountId in ids)
        }
        // 대상 계좌끼리 이체는 서로 상쇄된다.
        val plannedIn = planned.sumOf { tx -> ids.sumOf { id -> tx.deltaFor(id).coerceAtLeast(0) } }
        val plannedOut = planned.sumOf { tx -> ids.sumOf { id -> (-tx.deltaFor(id)).coerceAtLeast(0) } }
        return Breakdown(
            title = title,
            total = actual + plannedIn - plannedOut,
            lines = listOf(
                BreakdownLine("현재 실제 잔고", actual, 1),
                BreakdownLine("예정 입금 (${asOfInclusive}까지)", plannedIn, 1),
                BreakdownLine("예정 출금 (${asOfInclusive}까지)", plannedOut, -1),
            ),
            formula = "예상 잔고 = 실제 잔고 + 예정 입금 − 예정 출금",
            notes = listOf("대상: " + accounts.joinToString { it.name }.ifEmpty { "없음" }),
        )
    }

    val CASH_LIKE = setOf(
        com.looin.finance.core.model.AccountType.CHECKING,
        com.looin.finance.core.model.AccountType.CASH,
        com.looin.finance.core.model.AccountType.SAVINGS,
    )
}

data class AssetSummary(
    val totalAssets: Long,
    val totalLiabilities: Long,
    val netWorth: Long,
    val unvaluedAccounts: List<Account>,
    val netWorthBreakdown: Breakdown,
)
