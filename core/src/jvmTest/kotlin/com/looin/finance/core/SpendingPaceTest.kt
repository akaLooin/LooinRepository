package com.looin.finance.core

import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SpendingPaceTest {
    private val period = PeriodCalculator.periodContaining(LocalDate(2026, 11, 14), PeriodBasis.CALENDAR, 25) // 11월, 30일
    private val txs = listOf(
        F.expense(10_000, date = LocalDate(2026, 11, 1)),
        F.expense(20_000, date = LocalDate(2026, 11, 3)),
        F.expense(5_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED), // 예정은 제외
        F.income(100_000, date = LocalDate(2026, 11, 2)),                                   // 수입 제외
    )

    /** 오늘(15일째)까지 날마다 누적, 예산 300,000 → 예상 150,000, 실제 30,000 → 120,000 여유 */
    @Test fun cumulativeAndPace() {
        val b = Budget(basis = PeriodBasis.CALENDAR, periodStart = period.start, periodEndExclusive = period.endExclusive, categoryId = null, amount = 300_000)
        val p = StatisticsCalculator.pace(period, txs, listOf(b), LocalDate(2026, 11, 15))
        assertEquals(30, p.days)
        assertEquals(15, p.cumulative.size)
        assertEquals(listOf(10_000L, 10_000L, 30_000L), p.cumulative.take(3))
        assertEquals(30_000L, p.cumulative.last())
        assertEquals(150_000L, p.expectedByNow)
        assertEquals(-120_000L, p.diff)
    }

    /** 예산이 없으면 비교 없음, 지난 기간은 마지막 날까지 */
    @Test fun noBudgetAndPastPeriod() {
        val p = StatisticsCalculator.pace(period, txs, emptyList(), LocalDate(2026, 12, 20))
        assertNull(p.budget); assertNull(p.diff)
        assertEquals(30, p.cumulative.size)
    }
}
