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
}
