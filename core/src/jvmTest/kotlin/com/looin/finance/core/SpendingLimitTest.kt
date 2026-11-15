package com.looin.finance.core

import com.looin.finance.core.limit.LimitCalculator
import com.looin.finance.core.limit.LimitLevel
import com.looin.finance.core.limit.LimitStatus
import com.looin.finance.core.limit.LimitTarget
import com.looin.finance.core.limit.SpendingLimit
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SpendingLimitTest {
    private val period = PeriodCalculator.periodContaining(LocalDate(2026, 11, 15), PeriodBasis.CALENDAR, 25)
    private val food = SpendingLimit(id = 1, target = LimitTarget.CATEGORY, targetId = F.food.id, amount = 100_000)
    private val card = SpendingLimit(id = 2, target = LimitTarget.ACCOUNT, targetId = F.card.id, amount = 50_000, warnPercent = 90)
    private val all = SpendingLimit(id = 3, target = LimitTarget.ALL, amount = 1_000_000)
    private val txs = listOf(
        F.expense(70_000, date = LocalDate(2026, 11, 3)).copy(id = 10),                           // 식비, 주거래
        F.expense(10_000, date = LocalDate(2026, 11, 4)).copy(id = 11, categoryId = null, fromAccountId = F.card.id),
        F.expense(30_000, date = LocalDate(2026, 10, 30)).copy(id = 12),                          // 지난 기간
        F.expense(50_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED).copy(id = 13), // 예정 제외
    )

    @Test fun levels() {
        assertEquals(LimitLevel.OK, LimitStatus(food, 79_999).level)
        assertEquals(LimitLevel.WARN, LimitStatus(food, 80_000).level)
        assertEquals(LimitLevel.OVER, LimitStatus(food, 100_000).level)
    }

    @Test fun usedCountsCompletedThisPeriodOnly() {
        val s = LimitCalculator.statuses(listOf(food, card, all), period, txs)
        assertEquals(listOf(70_000L, 10_000L, 80_000L), s.map { it.used })
    }

    /** 입력 중 거래의 영향: 식비 15,000 → 85% 경고, 카드 45,000 → 110% 제한, 수정이면 원래 금액은 빼고 */
    @Test fun impactOfEntry() {
        val lunch = F.expense(15_000, date = LocalDate(2026, 11, 15))
        val i = LimitCalculator.impact(listOf(food, card, all), period, txs, lunch)
        assertEquals(listOf(1L), i.map { it.limit.id }); assertEquals(LimitLevel.WARN, i.single().level)
        val onCard = F.expense(45_000, date = LocalDate(2026, 11, 15)).copy(categoryId = null, fromAccountId = F.card.id)
        assertEquals(LimitLevel.OVER, LimitCalculator.impact(listOf(card), period, txs, onCard).single().level)
        // 70,000 짜리를 85,000 으로 고치면 85,000 (원래 70,000 과 중복 계산 없음) → 경고. 75,000 이면 75% 라 알림 없음
        assertEquals(85_000L, LimitCalculator.impact(listOf(food), period, txs, txs[0].copy(amount = 85_000)).single().used)
        assertTrue(LimitCalculator.impact(listOf(food), period, txs, txs[0].copy(amount = 75_000)).isEmpty())
        // 수입·이체는 영향 없음
        assertTrue(LimitCalculator.impact(listOf(all), period, txs, F.income(5_000_000)).isEmpty())
    }

    @Test fun validation() {
        assertTrue(LimitCalculator.validate(food).isEmpty())
        assertEquals(1, LimitCalculator.validate(food.copy(targetId = null)).size)
        assertEquals(2, LimitCalculator.validate(all.copy(amount = 0, warnPercent = 100)).size)
    }
}
