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

/** 사용 가능 금액을 예산별로 나눠 보기와 "예산대로 다 쓰면 모자랄 때" 조정 안내. */
class AvailableSplitTest {
    private val d = kotlinx.datetime.LocalDate(2026, 11, 10)
    private val period = com.looin.finance.core.period.PeriodCalculator.periodContaining(d, com.looin.finance.core.period.PeriodBasis.CALENDAR, 25)
    private val acc = com.looin.finance.core.model.Account(id = 1, name = "주거래", type = com.looin.finance.core.model.AccountType.CHECKING,
        openingBalance = 500_000, includeInAvailable = true)
    private fun budget(id: Long, cat: Long, amount: Long) = com.looin.finance.core.model.Budget(id = id, basis = period.basis, periodStart = period.start,
        periodEndExclusive = period.endExclusive, categoryId = cat, amount = amount)
    private fun spend(id: Long, cat: Long, amount: Long, planned: Boolean = false) = com.looin.finance.core.model.Transaction(id = id,
        type = com.looin.finance.core.model.TransactionType.EXPENSE,
        status = if (planned) com.looin.finance.core.model.TransactionStatus.PLANNED else com.looin.finance.core.model.TransactionStatus.COMPLETED,
        amount = amount, date = if (planned) kotlinx.datetime.LocalDate(2026, 11, 20) else d, fromAccountId = 1, categoryId = cat)

    @org.junit.Test fun splitByBudget() {
        // 잔고 500,000 − 지출 100,000 = 400,000 / 식비 300,000(사용 100,000, 예정 50,000), 교통 100,000
        val txs = listOf(spend(1, 10, 100_000), spend(2, 10, 50_000, planned = true))
        val r = AvailableFundsCalculator.calculate(listOf(acc), txs, listOf(budget(1, 10, 300_000), budget(2, 11, 100_000)), period)
        org.junit.Assert.assertEquals(100_000L, r.amount) // 400,000 − 식비 확보 200,000 − 교통 100,000
        org.junit.Assert.assertEquals(250_000L, r.budgetLeft) // 식비 150,000 + 교통 100,000
        org.junit.Assert.assertEquals(350_000L, r.withoutBudgetLeft) // 예정 지출 50,000 만 뺀 금액
        org.junit.Assert.assertEquals(listOf(150_000L, 100_000L), r.shares.map { it.left })
        org.junit.Assert.assertNull(r.adjust)
    }

    @org.junit.Test fun adjustWhenShort() {
        // 잔고 400,000(지출 100,000 뒤), 예산 남은 돈 식비 300,000 + 교통 200,000 = 500,000 → 100,000 부족
        val txs = listOf(spend(1, 10, 100_000))
        val r = AvailableFundsCalculator.calculate(listOf(acc), txs, listOf(budget(1, 10, 400_000), budget(2, 11, 200_000)), period)
        org.junit.Assert.assertEquals(-100_000L, r.amount)
        val a = r.adjust!!
        org.junit.Assert.assertEquals(100_000L, a.deficit)
        org.junit.Assert.assertEquals(0L, a.shortAfterAll)
        org.junit.Assert.assertEquals(100_000L, a.cuts.sumOf { it.second })
        org.junit.Assert.assertEquals(600_000L, a.currentTotal); org.junit.Assert.assertEquals(500_000L, a.suggestedTotal)
        // 남은 예산 비율 3:2 → 60,000 / 40,000
        org.junit.Assert.assertEquals(listOf(60_000L, 40_000L), a.cuts.map { it.second })
        // 예산을 다 줄여도 모자라는 경우
        val big = listOf(spend(1, 10, 100_000), spend(3, 12, 450_000, planned = true))
        val r2 = AvailableFundsCalculator.calculate(listOf(acc), big, listOf(budget(1, 10, 150_000)), period)
        val a2 = r2.adjust!!
        org.junit.Assert.assertEquals(50_000L, a2.reducible)
        org.junit.Assert.assertTrue(a2.shortAfterAll > 0)
    }

    /** 고정 비용이 들어간 카테고리 예산은 줄이기 제안에서 빠진다. */
    @org.junit.Test fun fixedBudgetsNotCut() {
        val rent = com.looin.finance.core.model.Transaction(id = 9, type = com.looin.finance.core.model.TransactionType.EXPENSE,
            status = com.looin.finance.core.model.TransactionStatus.PLANNED, amount = 50_000, date = kotlinx.datetime.LocalDate(2026, 11, 25),
            fromAccountId = 1, categoryId = 12, recurringId = 3)
        // 잔고 400,000 / 식비 400,000(사용 100,000 → 남은 300,000), 주거 예산 200,000 + 고정 50,000(남은 200,000) → 150,000 부족
        val txs = listOf(spend(1, 10, 100_000), rent)
        val r = AvailableFundsCalculator.calculate(listOf(acc), txs, listOf(budget(1, 10, 400_000), budget(2, 12, 200_000)), period)
        val a = r.adjust!!
        org.junit.Assert.assertEquals(150_000L, a.deficit)
        org.junit.Assert.assertEquals(listOf(10L), a.cuts.map { it.first.budget.categoryId })
        org.junit.Assert.assertEquals(150_000L, a.cuts.single().second)
        org.junit.Assert.assertEquals(listOf(12L), a.excluded.map { it.budget.categoryId })
    }

    /** 다음 월급 전까지: 월급 전 예정 지출 + 최근 30일 하루 평균(고정 비용 제외) × 남은 날. */
    @org.junit.Test fun untilPayday() {
        // 오늘 11/10, 급여일 25 → 11/25, 남은 날 15일
        val coffee = (1..10).map { spend(100L + it, 10, 3_000).copy(date = kotlinx.datetime.LocalDate(2026, 11, it)) } // 30,000 → 하루 1,000
        val rent = com.looin.finance.core.model.Transaction(id = 200, type = com.looin.finance.core.model.TransactionType.EXPENSE,
            status = com.looin.finance.core.model.TransactionStatus.COMPLETED, amount = 300_000, date = kotlinx.datetime.LocalDate(2026, 11, 1),
            fromAccountId = 1, recurringId = 5) // 고정 비용은 하루 평균에서 뺀다
        val bill = spend(300, 11, 50_000, planned = true).copy(date = kotlinx.datetime.LocalDate(2026, 11, 20))
        val late = spend(301, 11, 70_000, planned = true).copy(date = kotlinx.datetime.LocalDate(2026, 11, 28)) // 월급 뒤
        val f = AvailableFundsCalculator.untilPayday(listOf(acc), coffee + rent + bill + late, d, 25)
        org.junit.Assert.assertEquals(kotlinx.datetime.LocalDate(2026, 11, 25), f.nextPayday)
        org.junit.Assert.assertEquals(15, f.days)
        org.junit.Assert.assertEquals(1_000L, f.dailyAverage)
        // 잔고 500,000 − 30,000 − 300,000 = 170,000 − 예정 50,000 − 15,000 = 105,000
        org.junit.Assert.assertEquals(105_000L, f.amount)
        // 오늘이 급여일이면 다음 달 급여일
        org.junit.Assert.assertEquals(kotlinx.datetime.LocalDate(2026, 12, 25), AvailableFundsCalculator.untilPayday(listOf(acc), emptyList(), kotlinx.datetime.LocalDate(2026, 11, 25), 25).nextPayday)
    }
}
