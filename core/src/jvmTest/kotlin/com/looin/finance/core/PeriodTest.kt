package com.looin.finance.core

import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.period.Period
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PeriodTest {

    @Test fun `달력 기준은 1일부터 말일까지, 종료는 미포함`() {
        val p = PeriodCalculator.periodContaining(LocalDate(2026, 2, 14), PeriodBasis.CALENDAR, 25)
        assertEquals(LocalDate(2026, 2, 1), p.start)
        assertEquals(LocalDate(2026, 3, 1), p.endExclusive)
        assertEquals(LocalDate(2026, 2, 28), p.lastDay)
        assertTrue(LocalDate(2026, 2, 28) in p)
        assertFalse(LocalDate(2026, 3, 1) in p)
    }

    @Test fun `월급일 25일 기준은 25일부터 다음 달 24일까지`() {
        val p = PeriodCalculator.periodContaining(LocalDate(2026, 11, 12), PeriodBasis.PAYDAY, 25)
        assertEquals(LocalDate(2026, 10, 25), p.start)
        assertEquals(LocalDate(2026, 11, 25), p.endExclusive)
        val q = PeriodCalculator.periodContaining(LocalDate(2026, 11, 25), PeriodBasis.PAYDAY, 25)
        assertEquals(LocalDate(2026, 11, 25), q.start)
        assertEquals(LocalDate(2026, 12, 24), q.lastDay)
    }

    @Test fun `월급일 31일이면 2월에는 말일을 적용한다`() {
        assertEquals(LocalDate(2026, 2, 28), PeriodCalculator.paydayIn(2026, 2, 31))
        assertEquals(LocalDate(2028, 2, 29), PeriodCalculator.paydayIn(2028, 2, 31)) // 윤년
        assertEquals(LocalDate(2026, 4, 30), PeriodCalculator.paydayIn(2026, 4, 31))

        val jan = PeriodCalculator.periodContaining(LocalDate(2026, 2, 10), PeriodBasis.PAYDAY, 31)
        assertEquals(LocalDate(2026, 1, 31), jan.start)
        assertEquals(LocalDate(2026, 2, 28), jan.endExclusive)
        assertEquals(LocalDate(2026, 2, 27), jan.lastDay)

        val feb = PeriodCalculator.periodContaining(LocalDate(2026, 2, 28), PeriodBasis.PAYDAY, 31)
        assertEquals(LocalDate(2026, 2, 28), feb.start)
        assertEquals(LocalDate(2026, 3, 31), feb.endExclusive)

        // 다음/이전 이동이 끊김 없이 이어진다.
        assertEquals(feb, PeriodCalculator.next(jan, 31))
        assertEquals(jan, PeriodCalculator.previous(feb, 31))
    }

    @Test fun `연속된 기간은 빈틈이나 겹침이 없다`() {
        for (day in listOf(1, 15, 28, 29, 30, 31)) {
            var p = PeriodCalculator.periodContaining(LocalDate(2025, 12, 5), PeriodBasis.PAYDAY, day)
            repeat(30) {
                val n = PeriodCalculator.next(p, day)
                assertEquals("payday=$day", p.endExclusive, n.start)
                p = n
            }
        }
    }

    @Test fun `같은 거래를 달력 기준과 월급일 기준에서 각각 올바르게 조회한다`() {
        val a = F.expense(10_000, date = LocalDate(2026, 11, 3))
        val b = F.expense(20_000, date = LocalDate(2026, 11, 27))
        val c = F.expense(40_000, date = LocalDate(2026, 10, 28))
        val txs = listOf(a, b, c)

        val cal = PeriodCalculator.periodContaining(LocalDate(2026, 11, 12), PeriodBasis.CALENDAR, 25)
        val pay = PeriodCalculator.periodContaining(LocalDate(2026, 11, 12), PeriodBasis.PAYDAY, 25)

        assertEquals(setOf(a, b), StatisticsCalculator.transactionsIn(cal, txs).toSet())
        assertEquals(setOf(a, c), StatisticsCalculator.transactionsIn(pay, txs).toSet())
        assertEquals(30_000, StatisticsCalculator.stats(cal, txs).expense)
        assertEquals(50_000, StatisticsCalculator.stats(pay, txs).expense)
        // 원본 거래는 하나: 기간별 합계를 더해 총지출로 보지 않는다(전체 원본 합 70,000).
        assertEquals(70_000, txs.sumOf { it.amount })
    }

    @Test fun `완료 거래는 실제 처리일 기준으로 기간에 들어간다`() {
        val t = F.expense(10_000, date = LocalDate(2026, 10, 30)).copy(completedDate = LocalDate(2026, 11, 2))
        val nov = PeriodCalculator.periodContaining(LocalDate(2026, 11, 12), PeriodBasis.CALENDAR, 25)
        assertEquals(10_000, StatisticsCalculator.stats(nov, listOf(t)).expense)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `급여 기준일은 1~31만 허용`() {
        PeriodCalculator.paydayIn(2026, 1, 32)
    }

    @Test fun `기간 라벨`() {
        val p = Period(PeriodBasis.PAYDAY, LocalDate(2026, 10, 25), LocalDate(2026, 11, 25))
        assertEquals("10.25 ~ 11.24", p.rangeLabel)
        assertEquals(6, PeriodCalculator.recent(p, 6, 25).size)
    }
}
