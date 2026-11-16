package com.looin.finance.core.calc

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.plus

/**
 * 자주 쓰는 거래: 최근 [days]일 동안 같은 유형·메모·카테고리·계좌·금액으로 [minCount]번 이상 기록한 것.
 * 홈의 빠른 입력 칩 → 누르면 그 내용으로 새 거래(복사) 입력.
 */
object QuickEntries {
    data class Entry(val sample: Transaction, val count: Int)

    fun suggest(txs: List<Transaction>, today: LocalDate, limit: Int = 4, days: Int = 60, minCount: Int = 2): List<Entry> {
        val from = today.minus(DatePeriod(days = days))
        return txs.filter {
            it.isCompleted && it.memo.isNotBlank() && it.effectiveDate >= from && it.recurringId == null &&
                (it.type == TransactionType.EXPENSE || it.type == TransactionType.INCOME)
        }.groupBy { listOf(it.type, it.memo.trim(), it.categoryId, it.fromAccountId, it.toAccountId, it.amount) }
            .values.filter { it.size >= minCount }
            .map { g -> Entry(g.maxWith(compareBy<Transaction> { it.effectiveDate }.thenBy { it.id }), g.size) }
            .sortedWith(compareByDescending<Entry> { it.count }.thenByDescending { it.sample.effectiveDate })
            .take(limit)
    }
}

/**
 * 잔고 부족 미리 알림: 현금성 원화 계좌(입출금·현금·저축)에 예정 거래를 차례로 반영했을 때
 * [horizonDays]일 안에 처음으로 0원 아래로 내려가는 날과 그때 잔고, 그 원인이 된 예정 거래.
 */
object BalanceForecast {
    data class Shortfall(val account: Account, val date: LocalDate, val balance: Long, val cause: Transaction?)

    fun shortfalls(accounts: List<Account>, txs: List<Transaction>, today: LocalDate, horizonDays: Int = 31): List<Shortfall> {
        val until = today.plus(DatePeriod(days = horizonDays))
        return accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }.mapNotNull { a ->
            val events = txs.filter { it.isPlanned && it.date <= until && it.deltaFor(a.id) != 0L }
                .sortedWith(compareBy<Transaction> { it.date }.thenBy { it.id })
            var bal = BalanceCalculator.actualBalance(a, txs)
            // 지난(밀린) 예정 거래는 오늘 처리될 것으로 본다
            var hit: Shortfall? = null
            for (e in events) {
                bal += e.deltaFor(a.id)
                if (bal < 0) { hit = Shortfall(a, maxOf(e.date, today), bal, e); break }
            }
            hit
        }.sortedBy { it.date }
    }
}
