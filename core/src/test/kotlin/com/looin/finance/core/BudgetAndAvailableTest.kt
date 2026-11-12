package com.looin.finance.core

import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BudgetAndAvailableTest {
    private val period = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
    private fun budget(category: Long?, amount: Long, id: Long = 1) =
        Budget(id, PeriodBasis.CALENDAR, period.start, period.endExclusive, category, amount)

    @Test fun `식비 예산 400,000원 중 100,000원 사용하면 잔여 예산은 300,000원`() {
        val txs = listOf(F.expense(100_000))
        val s = BudgetCalculator.status(budget(F.food.id, 400_000), period, txs)
        assertEquals(100_000, s.spent)
        assertEquals(300_000, s.remaining)
    }

    @Test fun `예정 식비 50,000원을 추가하면 예산 잔액 300,000원, 미배정 예산 250,000원`() {
        val txs = listOf(
            F.expense(100_000),
            F.expense(50_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED),
        )
        val s = BudgetCalculator.status(budget(F.food.id, 400_000), period, txs)
        assertEquals(300_000, s.remaining)
        assertEquals(250_000, s.unreserved)
        assertFalse(s.isOver)
    }

    @Test fun `사용 가능 금액에서 예산과 예정 지출을 이중 차감하지 않는다`() {
        val txs = listOf(
            F.expense(100_000),
            F.expense(50_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED),
        )
        val r = AvailableFundsCalculator.calculate(F.accounts, txs, listOf(budget(F.food.id, 400_000)), period)
        // 대상 계좌: 주거래 통장(900,000) + 지갑(50,000) = 950,000
        assertEquals(950_000, r.cash)
        // 확보액 = 예산 잔액 300,000 (예정 50,000은 그 안에 포함)
        assertEquals(300_000, r.budgetReserve)
        assertEquals(0, r.unbudgetedPlanned)
        assertEquals(650_000, r.amount)
    }

    @Test fun `예산 밖 예정 지출과 대상 밖 계좌로의 예정 이체는 따로 차감한다`() {
        val txs = listOf(
            F.expense(30_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED, category = F.transport.id),
            F.transfer(200_000, F.checking.id, F.savings.id, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED),
            // 대상 계좌끼리 이체는 차감하지 않음
            F.transfer(10_000, F.checking.id, F.cash.id, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED),
            // 다음 기간 예정은 이번 기간 계산에 포함하지 않음
            F.expense(99_000, date = LocalDate(2026, 12, 3), status = TransactionStatus.PLANNED, category = F.transport.id),
        )
        val r = AvailableFundsCalculator.calculate(F.accounts, txs, listOf(budget(F.food.id, 400_000)), period)
        assertEquals(1_050_000, r.cash)
        assertEquals(400_000, r.budgetReserve)
        assertEquals(30_000, r.unbudgetedPlanned)
        assertEquals(200_000, r.plannedTransfersOut)
        assertEquals(1_050_000 - 400_000 - 30_000 - 200_000, r.amount)
    }

    @Test fun `예산 초과 시에도 남은 예정 지출은 확보하고 초과로 표시한다`() {
        val txs = listOf(
            F.expense(450_000),
            F.expense(20_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED),
        )
        val s = BudgetCalculator.status(budget(F.food.id, 400_000), period, txs)
        assertTrue(s.isOver)
        assertEquals(-50_000, s.remaining)
        assertEquals(20_000, s.reserve)
    }

    @Test fun `전체 생활비 예산이 있으면 카테고리 예산을 중복 확보하지 않는다`() {
        val txs = listOf(
            F.expense(100_000),
            F.expense(50_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED, category = F.transport.id),
        )
        val budgets = listOf(budget(null, 1_000_000, 1), budget(F.food.id, 400_000, 2))
        val r = AvailableFundsCalculator.calculate(F.accounts, txs, budgets, period)
        assertEquals(900_000, r.budgetReserve)
        assertEquals(0, r.unbudgetedPlanned)
    }

    @Test fun `다른 기간의 예산은 현재 기간에 적용되지 않는다`() {
        val other = Budget(9, PeriodBasis.PAYDAY, LocalDate(2026, 10, 25), LocalDate(2026, 11, 25), F.food.id, 400_000)
        assertEquals(0, BudgetCalculator.statuses(listOf(other), period, emptyList()).size)
    }

    @Test fun `예정 수입은 사용 가능 금액에 반영하지 않는다`() {
        val txs = listOf(F.income(3_000_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED))
        val r = AvailableFundsCalculator.calculate(F.accounts, txs, emptyList(), period)
        assertEquals(1_050_000, r.amount)
        assertEquals(3_000_000, r.plannedIncomeNotCounted)
    }
}
