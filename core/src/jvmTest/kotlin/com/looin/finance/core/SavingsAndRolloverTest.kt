package com.looin.finance.core

import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.savings.GoalStatus
import com.looin.finance.core.savings.SavingsAllocation
import com.looin.finance.core.savings.SavingsCalculator
import com.looin.finance.core.savings.SavingsGoal
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** 사용자 결정(2026-11-13): 예산 이월 없음, 저축 목표 배정액은 사용 가능 금액에서 빼 둔다. */
class SavingsAndRolloverTest {
    private val period = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
    private val trip = SavingsGoal(id = 1, name = "여행", targetAmount = 1_000_000)                       // 생활비 계좌에서 떼어 둠
    private val emergency = SavingsGoal(id = 2, name = "비상금", targetAmount = 3_000_000, accountId = F.savings.id) // 적금 통장에 있음
    private val allocs = listOf(
        SavingsAllocation(1, goalId = 1, amount = 300_000, date = F.today),
        SavingsAllocation(2, goalId = 1, amount = -50_000, date = F.today),  // 일부 해제
        SavingsAllocation(3, goalId = 2, amount = 500_000, date = F.today),
    )

    @Test fun goalProgressFromAllocationHistory() {
        val s = SavingsCalculator.statuses(listOf(trip, emergency), allocs)
        assertEquals(250_000, s[0].allocated)
        assertEquals(750_000, s[0].remaining)
        assertEquals(0.25f, s[0].progress, 0.0001f)
        assertFalse(s[0].achieved)
    }

    @Test fun availableDeductsOnlyMoneyHeldInLivingAccounts() {
        val goals = SavingsCalculator.statuses(listOf(trip, emergency), allocs)
        val r = AvailableFundsCalculator.calculate(F.accounts, emptyList(), emptyList(), period, goals)
        // 대상 계좌(주거래 1,000,000 + 지갑 50,000) − 여행 배정 250,000. 비상금(적금 통장)은 이미 대상 밖이라 빼지 않음
        assertEquals(1_050_000, r.cash)
        assertEquals(250_000, r.savingsReserved)
        assertEquals(800_000, r.amount)
        assertTrue(r.breakdown.lines.any { it.label == "저축 목표 배정" && it.amount == 250_000L })
    }

    @Test fun archivedGoalReleasesReservation() {
        val goals = SavingsCalculator.statuses(listOf(trip.copy(archived = true)), allocs)
        val r = AvailableFundsCalculator.calculate(F.accounts, emptyList(), emptyList(), period, goals)
        assertEquals(0, r.savingsReserved)
        assertEquals(1_050_000, r.amount)
    }

    @Test fun allocationValidation() {
        val st = GoalStatus(trip, 250_000)
        assertNull(SavingsCalculator.validateAllocation(st, 100_000))
        assertNull(SavingsCalculator.validateAllocation(st, -250_000))
        assertNotNull(SavingsCalculator.validateAllocation(st, -250_001))   // 배정보다 많이 해제 불가
        assertNotNull(SavingsCalculator.validateAllocation(st, 0))
        assertNotNull(SavingsCalculator.validateAllocation(GoalStatus(trip.copy(archived = true), 0), 1))
        assertTrue(SavingsCalculator.validate(trip.copy(name = " ")).isNotEmpty())
        assertTrue(SavingsCalculator.validate(trip.copy(targetAmount = 0)).isNotEmpty())
    }

    /** 이월 없음: 지난 기간의 남은 예산·초과 사용이 다음 기간 예산 잔액에 영향을 주지 않는다. */
    @Test fun noBudgetRollover() {
        val oct = PeriodCalculator.previous(period, 25)
        val budgets = listOf(
            Budget(1, PeriodBasis.CALENDAR, oct.start, oct.endExclusive, F.food.id, 400_000),
            Budget(2, PeriodBasis.CALENDAR, period.start, period.endExclusive, F.food.id, 400_000),
        )
        val txs = listOf(F.expense(550_000, date = LocalDate(2026, 10, 15)), F.expense(20_000)) // 10월 초과, 11월 2만 사용
        val octStatus = BudgetCalculator.statuses(budgets, oct, txs).single()
        val novStatus = BudgetCalculator.statuses(budgets, period, txs).single()
        assertTrue(octStatus.isOver)
        assertEquals(380_000, novStatus.remaining) // 10월 초과분(150,000)을 빼지 않고, 남은 예산도 더하지 않음
    }
}
