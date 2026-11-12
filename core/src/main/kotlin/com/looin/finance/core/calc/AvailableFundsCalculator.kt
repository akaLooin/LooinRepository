package com.looin.finance.core.calc

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.Period

/**
 * 생활비로 사용 가능한 금액(여유 금액).
 *
 * ※ 기획서에 정확한 공식이 없어 아래 기본 규칙을 제안값으로 사용한다(확인 항목, docs/PHASE1_PLAN.md 참조).
 *
 * 사용 가능 금액 = A − B − C − D
 *  A. 생활비 계산 대상 계좌(원화·비부채·보관 아님)의 실제 잔고 합
 *  B. 현재 기간 예산 확보액
 *     - 전체 생활비 예산이 있으면: max(전체 예산 − 기간 확정 지출, 기간 예정 지출, 0)
 *       (카테고리 예산은 전체 예산의 하위 한도로만 보고 따로 더하지 않음 → 이중 차감 방지)
 *     - 없으면: 카테고리 예산별 max(예산 잔액, 예정 지출, 0)의 합
 *       (예정 지출은 예산 잔액 안에 포함되므로 별도로 다시 빼지 않음)
 *  C. 예산 밖의 예정 지출: 대상 계좌에서 나가는 예정 지출 중
 *     기간 종료 전이면서 (B에 포함되지 않은 카테고리 / 카테고리 없음 / 지난 기간에서 밀린 것)
 *  D. 대상 계좌 → 비대상 계좌 예정 이체(저축 이체, 카드 대금 등), 기간 종료 전
 *
 * 예정 수입은 실제 입금 전까지 반영하지 않는다(참고 정보로만 표시).
 */
object AvailableFundsCalculator {

    data class Result(
        val amount: Long,
        val cash: Long,
        val budgetReserve: Long,
        val unbudgetedPlanned: Long,
        val plannedTransfersOut: Long,
        val plannedIncomeNotCounted: Long,
        val breakdown: Breakdown,
    )

    fun includedAccounts(accounts: List<Account>) = accounts.filter {
        it.includeInAvailable && !it.archived && it.currency == KRW && !it.type.isLiability
    }

    fun calculate(
        accounts: List<Account>,
        transactions: List<Transaction>,
        budgets: List<Budget>,
        period: Period,
    ): Result {
        val included = includedAccounts(accounts)
        val ids = included.map { it.id }.toSet()
        val cash = included.sumOf { BalanceCalculator.actualBalance(it, transactions) }

        val statuses = BudgetCalculator.statuses(budgets, period, transactions)
        val overall = statuses.firstOrNull { it.budget.categoryId == null }
        val categoryStatuses = statuses.filter { it.budget.categoryId != null }

        val pendingExpenses = transactions.filter {
            it.isPlanned && it.type == TransactionType.EXPENSE && it.currency == KRW && it.date < period.endExclusive
        }

        val reserveLines = mutableListOf<BreakdownLine>()
        val budgetReserve: Long
        val coveredByBudget: (Transaction) -> Boolean
        if (overall != null) {
            budgetReserve = overall.reserve
            reserveLines += BreakdownLine("전체 생활비 예산 확보액", overall.reserve, -1,
                "예산 ${MoneyFormat.format(overall.budget.amount)} − 사용 ${MoneyFormat.format(overall.spent)}, 예정 ${MoneyFormat.format(overall.planned)} 포함")
            coveredByBudget = { it.date in period }
        } else {
            budgetReserve = categoryStatuses.sumOf { it.reserve }
            if (categoryStatuses.isNotEmpty()) {
                reserveLines += BreakdownLine("카테고리 예산 확보액 (${categoryStatuses.size}개)", budgetReserve, -1,
                    "예산별 max(잔액, 예정 지출)의 합")
            }
            val budgetedCategories = categoryStatuses.map { it.budget.categoryId }.toSet()
            coveredByBudget = { it.date in period && it.categoryId != null && it.categoryId in budgetedCategories }
        }

        val unbudgetedPlanned = pendingExpenses
            .filter { it.fromAccountId in ids && !coveredByBudget(it) }
            .sumOf { it.amount }

        val plannedTransfersOut = transactions
            .filter {
                it.isPlanned && it.type == TransactionType.TRANSFER && it.date < period.endExclusive &&
                    it.fromAccountId in ids && it.toAccountId !in ids
            }
            .sumOf { it.amount }

        val plannedIncome = transactions
            .filter {
                it.isPlanned && it.type == TransactionType.INCOME && it.currency == KRW &&
                    it.date < period.endExclusive && it.toAccountId in ids
            }
            .sumOf { it.amount }

        val amount = cash - budgetReserve - unbudgetedPlanned - plannedTransfersOut

        val breakdown = Breakdown(
            title = "생활비로 사용 가능한 금액",
            total = amount,
            lines = buildList {
                add(BreakdownLine("대상 계좌 실제 잔고", cash, 1))
                addAll(reserveLines)
                add(BreakdownLine("예산 밖 예정 지출", unbudgetedPlanned, -1, "기간 종료 전·밀린 예정 지출 포함"))
                add(BreakdownLine("예정 이체(대상 밖 계좌로)", plannedTransfersOut, -1, "저축·카드 대금 등"))
                add(BreakdownLine("참고: 예정 수입(미반영)", plannedIncome, 0, "입금 전까지 반영하지 않음"))
            },
            formula = "사용 가능 금액 = 대상 계좌 잔고 − 예산 확보액 − 예산 밖 예정 지출 − 예정 이체",
            notes = listOf(
                "대상 계좌: " + included.joinToString { it.name }.ifEmpty { "없음 (자산 화면에서 지정)" },
                "기준 기간: ${period.label}",
            ),
        )
        return Result(amount, cash, budgetReserve, unbudgetedPlanned, plannedTransfersOut, plannedIncome, breakdown)
    }
}
