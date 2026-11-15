package com.looin.finance.core

import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.BudgetLevel
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** 예산 경고·초과(지출 한도를 예산에 합침), 예정 지출 경고, 계좌 예산, 입력 중 영향. */
class BudgetWarningTest {
    private val period = PeriodCalculator.periodContaining(LocalDate(2026, 11, 15), PeriodBasis.CALENDAR, 25)
    private fun budget(amount: Long, category: Long? = F.food.id, account: Long? = null, warn: Int = 80) =
        Budget(basis = period.basis, periodStart = period.start, periodEndExclusive = period.endExclusive,
            categoryId = category, amount = amount, accountId = account, warnPercent = warn)
    private val won: (Long) -> String = { "${it}원" }

    @Test fun levelsAndMessages() {
        val txs = listOf(F.expense(85_000, date = LocalDate(2026, 11, 3)))
        val s = BudgetCalculator.status(budget(100_000), period, txs)
        assertEquals(BudgetLevel.WARN, s.level)
        assertEquals("예산의 85%를 썼어요 · 남은 15000원", s.message(won))
        // 예정 지출은 따로: 확정 50,000 + 예정 60,000 → 확정은 여유, 예정 포함 초과
        val s2 = BudgetCalculator.status(budget(100_000), period, listOf(
            F.expense(50_000, date = LocalDate(2026, 11, 3)),
            F.expense(60_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED),
        ))
        assertEquals(BudgetLevel.OK, s2.level)
        assertEquals(BudgetLevel.OVER, s2.forecastLevel)
        assertEquals("예정 지출까지 더하면 예산을 10000원 넘어요 · 이대로면 과소비예요", s2.message(won))
        val s3 = BudgetCalculator.status(budget(100_000), period, listOf(F.expense(120_000, date = LocalDate(2026, 11, 3))))
        assertEquals("예산을 20000원 넘었어요", s3.message(won))
        assertNull(BudgetCalculator.status(budget(100_000), period, emptyList()).message(won))
    }

    /** 계좌 예산: 그 계좌에서 나간 지출만 세고, 사용 가능 금액 계산에는 들어가지 않는다 */
    @Test fun accountBudgetIsWarningOnly() {
        val txs = listOf(
            F.expense(40_000, date = LocalDate(2026, 11, 3), from = F.card.id),
            F.expense(30_000, date = LocalDate(2026, 11, 4)),
        )
        val card = budget(50_000, category = null, account = F.card.id)
        assertEquals(40_000L, BudgetCalculator.status(card, period, txs).spent)
        val withCard = AvailableFundsCalculator.calculate(F.accounts, txs, listOf(card), period)
        val without = AvailableFundsCalculator.calculate(F.accounts, txs, emptyList(), period)
        assertEquals(without.amount, withCard.amount)
    }

    /** 입력 중 거래의 영향: 경고·초과에 걸리는 예산만, 수정이면 원래 금액은 빼고 */
    @Test fun impactOfEntry() {
        val existing = F.expense(70_000, date = LocalDate(2026, 11, 3))
        val b = listOf(budget(100_000), budget(1_000_000, category = null))
        val lunch = F.expense(15_000, date = LocalDate(2026, 11, 15)).copy(id = 0)
        val i = BudgetCalculator.impact(b, period, listOf(existing), lunch)
        assertEquals(1, i.size); assertEquals(BudgetLevel.WARN, i.single().level)
        assertTrue(BudgetCalculator.impact(b, period, listOf(existing), existing.copy(amount = 75_000)).isEmpty())
        // 예정 거래로 넣으면 확정은 여유, 예정 포함 경고
        val planned = lunch.copy(amount = 40_000, status = TransactionStatus.PLANNED, completedDate = null, date = LocalDate(2026, 11, 28))
        val p = BudgetCalculator.impact(b, period, listOf(existing), planned).single()
        assertEquals(BudgetLevel.OK, p.level); assertEquals(BudgetLevel.OVER, p.forecastLevel)
    }

    /** 카테고리 예산만 있을 때 예산 밖(미분류 등) 지출은 예산 여유를 깎지 않고 따로 센다 */
    @Test fun summaryCountsOnlyBudgetedScopes() {
        val txs = listOf(
            F.expense(30_000, date = LocalDate(2026, 11, 3)),                                        // 식비(예산 있음)
            F.expense(20_000, date = LocalDate(2026, 11, 4), category = null),                       // 미분류
            F.expense(500_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED, category = null), // 미분류 예정
        )
        val st = BudgetCalculator.statuses(listOf(budget(100_000)), period, txs)
        val s = BudgetCalculator.summary(st, period, txs)!!
        assertEquals(70_000L, s.left)          // 예전에는 100,000 − 50,000 − 500,000 = −450,000 으로 빨갛게 보였다
        assertEquals(20_000L, s.outsideSpent)
        assertEquals(500_000L, s.outsidePlanned)
        assertEquals(0.3f, s.usage!!, 0.001f)
        // 전체 생활비 예산이 있으면 모든 지출이 범위 안
        val all = BudgetCalculator.summary(BudgetCalculator.statuses(listOf(budget(1_000_000, category = null)), period, txs), period, txs)!!
        assertEquals(1_000_000L - 50_000 - 500_000, all.left)
        assertEquals(0L, all.outsidePlanned)
        // 계좌 예산만 있으면 요약 없음(경고용)
        assertNull(BudgetCalculator.summary(BudgetCalculator.statuses(listOf(budget(1, category = null, account = F.card.id)), period, txs), period, txs))
    }
}
