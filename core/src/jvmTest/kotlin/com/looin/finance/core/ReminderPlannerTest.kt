package com.looin.finance.core

import com.looin.finance.core.calc.ReminderPlanner
import com.looin.finance.core.calc.TransactionActions
import com.looin.finance.core.model.TransactionStatus
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ReminderPlannerTest {
    private val today = F.today // 11/12
    private fun label(t: com.looin.finance.core.model.Transaction) = t.memo.ifBlank { "거래" }

    /** 처리할 예정 거래가 없으면 알리지 않는다 */
    @Test fun noReminderWhenNothingToProcess() {
        val txs = listOf(
            F.expense(10_000),                                                            // 완료
            F.expense(5_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED), // 미래
            TransactionActions.cancel(F.expense(3_000, date = today, status = TransactionStatus.PLANNED), 1), // 취소
        )
        assertNull(ReminderPlanner.plan(txs, today, ::label))
    }

    /** 오늘 예정과 지난 예정을 함께 알리고 오늘 지출 합계를 보여 준다 */
    @Test fun todayAndOverdueWithTodaySpending() {
        val txs = listOf(
            F.expense(550_000, date = today, status = TransactionStatus.PLANNED).copy(memo = "월세"),
            F.income(3_000_000, date = today, status = TransactionStatus.PLANNED).copy(memo = "급여"),
            F.expense(69_000, date = LocalDate(2026, 11, 10), status = TransactionStatus.PLANNED).copy(memo = "통신비"),
        )
        val r = ReminderPlanner.plan(txs, today, ::label)!!
        assertEquals("오늘 예정 2건 · 지난 예정 1건", r.title)
        assertTrue(r.body.startsWith("오늘 나갈 돈 550,000원"))
        assertTrue(r.body.contains("월세") && r.body.contains("통신비"))
        assertEquals(1, r.overdue.size)
    }

    /** 많으면 세 건까지만 이름을 보인다 */
    @Test fun showsAtMostThreeNames() {
        val txs = (1..5).map { F.expense(1_000L * it, date = today, status = TransactionStatus.PLANNED).copy(memo = "항목$it") }
        val r = ReminderPlanner.plan(txs, today, ::label)!!
        assertTrue(r.body.contains("항목1, 항목2, 항목3 외"))
    }
}
