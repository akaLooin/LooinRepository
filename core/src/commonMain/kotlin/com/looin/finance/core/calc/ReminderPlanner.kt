package com.looin.finance.core.calc

import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import kotlinx.datetime.LocalDate

/** 하루 알림 내용. 보낼 것이 없으면 [ReminderPlanner.plan] 이 null. */
data class Reminder(
    val title: String,
    val body: String,
    val dueToday: List<Transaction>,
    val overdue: List<Transaction>,
)

/**
 * 예정 거래 알림 내용 정하기(플랫폼과 무관한 순수 함수).
 *  - 오늘 예정된 거래와, 예정일이 지났는데 아직 처리하지 않은 거래를 알린다
 *  - 둘 다 없으면 알리지 않는다(불필요한 알림 금지)
 *  - 금액 합계는 원화 지출만(수입·이체는 건수에만 포함)
 */
object ReminderPlanner {
    fun plan(transactions: List<Transaction>, today: LocalDate, label: (Transaction) -> String): Reminder? {
        val planned = transactions.filter { it.isPlanned }
        val dueToday = planned.filter { it.date == today }.sortedBy { it.id }
        val overdue = planned.filter { it.date < today }.sortedBy { it.date }
        if (dueToday.isEmpty() && overdue.isEmpty()) return null
        val todayExpense = dueToday.filter { it.type == TransactionType.EXPENSE && it.currency == KRW }.sumOf { it.amount }
        val title = buildList {
            if (dueToday.isNotEmpty()) add("오늘 예정 ${dueToday.size}건")
            if (overdue.isNotEmpty()) add("지난 예정 ${overdue.size}건")
        }.joinToString(" · ")
        val names = (dueToday + overdue).take(3).joinToString(", ") { label(it) } + if (dueToday.size + overdue.size > 3) " 외" else ""
        val body = (if (todayExpense > 0) "오늘 나갈 돈 ${MoneyFormat.format(todayExpense)} · " else "") + names +
            " — 처리했으면 앱에서 완료로 바꿔 주세요."
        return Reminder(title, body, dueToday, overdue)
    }

    /**
     * 미리 예약하는 알림(iOS 처럼 매일 백그라운드 작업을 돌릴 수 없는 플랫폼용).
     * [from] 부터 예정 거래가 있는 날마다 그날 예정분만으로 알림 내용을 만든다(지난 예정은 넣지 않음 — 그 사이 처리할 수 있으므로).
     * [skip] 은 알릴 필요가 없는 거래(예: 자동이체로 자동 완료되는 것). 날짜순 최대 [max]개.
     */
    fun schedule(
        transactions: List<Transaction>, from: LocalDate, max: Int = 30,
        skip: (Transaction) -> Boolean = { false }, label: (Transaction) -> String,
    ): List<Pair<LocalDate, Reminder>> =
        transactions.filter { it.isPlanned && it.date >= from && !skip(it) }
            .groupBy { it.date }.entries.sortedBy { it.key }.take(max)
            .mapNotNull { (d, txs) -> plan(txs, d, label)?.let { d to it } }
}
