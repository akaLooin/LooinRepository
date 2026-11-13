package com.looin.finance.core

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurrenceCalculator
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RecurringTest {
    private fun monthly(day: Int, start: LocalDate = LocalDate(2026, 1, 1), interval: Int = 1, end: LocalDate? = null) = RecurringRule(
        id = 7, name = "월세", type = TransactionType.EXPENSE, amount = 500_000, fromAccountId = F.checking.id,
        categoryId = F.food.id, frequency = Frequency.MONTHLY, dayOfMonth = day, interval = interval, startDate = start, endDate = end,
    )

    @Test fun `매월 31일 규칙은 짧은 달에 말일로 발생한다`() {
        val d = RecurrenceCalculator.occurrences(monthly(31), LocalDate(2026, 1, 1), LocalDate(2026, 4, 30))
        assertEquals(listOf(LocalDate(2026, 1, 31), LocalDate(2026, 2, 28), LocalDate(2026, 3, 31), LocalDate(2026, 4, 30)), d)
    }

    @Test fun `N개월 간격은 시작 달 기준으로 센다`() {
        val d = RecurrenceCalculator.occurrences(monthly(10, start = LocalDate(2026, 2, 1), interval = 3), LocalDate(2026, 1, 1), LocalDate(2026, 12, 31))
        assertEquals(listOf(LocalDate(2026, 2, 10), LocalDate(2026, 5, 10), LocalDate(2026, 8, 10), LocalDate(2026, 11, 10)), d)
    }

    @Test fun `매주 규칙과 종료일`() {
        val r = RecurringRule(name = "용돈", type = TransactionType.EXPENSE, amount = 1, fromAccountId = 1, frequency = Frequency.WEEKLY,
            dayOfWeek = DayOfWeek.FRIDAY, startDate = LocalDate(2026, 11, 1), endDate = LocalDate(2026, 11, 20))
        assertEquals(listOf(LocalDate(2026, 11, 6), LocalDate(2026, 11, 13), LocalDate(2026, 11, 20)),
            RecurrenceCalculator.occurrences(r, LocalDate(2026, 10, 1), LocalDate(2026, 12, 31)))
        val biweekly = r.copy(interval = 2, endDate = null)
        assertEquals(listOf(LocalDate(2026, 11, 20), LocalDate(2026, 12, 4)),
            RecurrenceCalculator.occurrences(biweekly, LocalDate(2026, 11, 14), LocalDate(2026, 12, 10)))
    }

    @Test fun `예정 거래는 오늘부터 기간까지만 만들고 과거는 채우지 않는다`() {
        val (txs, through) = RecurrenceCalculator.plan(monthly(25), today = LocalDate(2026, 11, 13), horizon = LocalDate(2027, 1, 31), now = 1)
        assertEquals(listOf(LocalDate(2026, 11, 25), LocalDate(2026, 12, 25), LocalDate(2027, 1, 25)), txs.map { it.date })
        assertTrue(txs.all { it.status == TransactionStatus.PLANNED && it.recurringId == 7L && it.recurringOccurrence == it.date })
        assertEquals(LocalDate(2027, 1, 31), through)
    }

    @Test fun `이미 만든 기간은 다시 만들지 않는다(지운 발생분 재생성 방지)`() {
        val rule = monthly(25).copy(generatedThrough = LocalDate(2026, 12, 31))
        val (txs, through) = RecurrenceCalculator.plan(rule, LocalDate(2026, 11, 13), LocalDate(2027, 2, 28), 1)
        assertEquals(listOf(LocalDate(2027, 1, 25), LocalDate(2027, 2, 25)), txs.map { it.date })
        assertEquals(LocalDate(2027, 2, 28), through)
        // 같은 범위로 다시 실행해도 새로 만들 것이 없다
        assertEquals(0, RecurrenceCalculator.plan(rule.copy(generatedThrough = through), LocalDate(2026, 11, 13), LocalDate(2027, 2, 28), 1).first.size)
        // 비활성 규칙은 만들지 않는다
        assertEquals(0, RecurrenceCalculator.plan(monthly(25).copy(active = false), LocalDate(2026, 11, 13), LocalDate(2027, 2, 28), 1).first.size)
    }

    @Test fun `반복으로 만든 예정 지출은 예산 안에서 한 번만 확보된다`() {
        val period = PeriodCalculator.periodContaining(LocalDate(2026, 11, 13), PeriodBasis.CALENDAR, 25)
        val (txs, _) = RecurrenceCalculator.plan(monthly(25), LocalDate(2026, 11, 13), period.lastDay, 1)
        val budget = Budget(1, PeriodBasis.CALENDAR, period.start, period.endExclusive, F.food.id, 600_000)
        val s = BudgetCalculator.status(budget, period, txs)
        assertEquals(500_000, s.planned)
        assertEquals(600_000, s.remaining)
        assertEquals(100_000, s.unreserved)
        // 실제 잔고는 그대로, 예상 잔고에만 반영
        assertEquals(1_000_000, BalanceCalculator.actualBalance(F.checking, txs))
        assertEquals(500_000, BalanceCalculator.projectedBalance(F.checking, txs, period.lastDay))
    }

    @Test fun `규칙 검증`() {
        assertTrue(RecurrenceCalculator.validate(monthly(25)).isEmpty())
        assertTrue(RecurrenceCalculator.validate(monthly(32)).isNotEmpty())
        assertTrue(RecurrenceCalculator.validate(monthly(25).copy(amount = 0)).isNotEmpty())
        assertTrue(RecurrenceCalculator.validate(monthly(25, end = LocalDate(2025, 1, 1))).isNotEmpty())
        assertTrue(RecurrenceCalculator.validate(monthly(25).copy(type = TransactionType.ADJUSTMENT)).isNotEmpty())
    }

    @Test fun `일정 표시 문구`() {
        assertEquals("매월 25일", monthly(25).scheduleLabel)
        assertEquals("2개월마다 31일", monthly(31, interval = 2).scheduleLabel)
    }
}
