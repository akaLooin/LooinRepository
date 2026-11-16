package com.looin.finance.core

import com.looin.finance.core.calc.BalanceForecast
import com.looin.finance.core.calc.QuickEntries
import com.looin.finance.core.model.TransactionStatus
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class InsightsTest {
    private val today = LocalDate(2026, 11, 16)

    /** 같은 메모·금액·카테고리·계좌를 2번 이상 → 자주 쓰는 거래, 많은 순 */
    @Test fun quickEntries() {
        val txs = listOf(
            F.expense(4_500, date = LocalDate(2026, 11, 3)).copy(memo = "커피"),
            F.expense(4_500, date = LocalDate(2026, 11, 10)).copy(memo = "커피"),
            F.expense(4_500, date = LocalDate(2026, 11, 14)).copy(memo = "커피 "),
            F.expense(1_450, date = LocalDate(2026, 11, 12)).copy(memo = "버스"),
            F.expense(1_450, date = LocalDate(2026, 11, 13)).copy(memo = "버스"),
            F.expense(9_000, date = LocalDate(2026, 11, 13)).copy(memo = "점심"),         // 한 번뿐
            F.expense(4_500, date = LocalDate(2026, 8, 1)).copy(memo = "옛날 커피"),
            F.expense(4_500, date = LocalDate(2026, 8, 2)).copy(memo = "옛날 커피"),      // 60일 전
        )
        val q = QuickEntries.suggest(txs, today)
        assertEquals(listOf("커피 " to 3, "버스" to 2), q.map { it.sample.memo to it.count })
    }

    /** 예정 지출을 차례로 반영해 처음 마이너스가 되는 날과 원인 */
    @Test fun shortfall() {
        val txs = listOf(
            F.expense(700_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED).copy(memo = "카드값"),
            F.expense(400_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED).copy(memo = "월세"),
            F.income(3_000_000, date = LocalDate(2026, 11, 28), status = TransactionStatus.PLANNED),
        )
        // 주거래 1,000,000 → 11/20 300,000 → 11/25 −100,000
        val s = BalanceForecast.shortfalls(listOf(F.checking), txs, today)
        assertEquals(1, s.size)
        assertEquals(LocalDate(2026, 11, 25), s[0].date)
        assertEquals(-100_000L, s[0].balance)
        assertEquals("월세", s[0].cause!!.memo)
        // 31일 밖의 예정은 보지 않음, 넉넉하면 없음
        assertTrue(BalanceForecast.shortfalls(listOf(F.checking), txs.take(1), today).isEmpty())
    }

    /** 지난 기간 대비 카테고리 변화: 늘어난 순, 새로 생긴 것·없어진 것 포함 */
    @Test fun categoryChanges() {
        val nov = com.looin.finance.core.period.PeriodCalculator.periodContaining(today, com.looin.finance.core.period.PeriodBasis.CALENDAR, 25)
        val oct = com.looin.finance.core.period.PeriodCalculator.previous(nov, 25)
        val txs = listOf(
            F.expense(50_000, date = LocalDate(2026, 11, 3)), F.expense(30_000, date = LocalDate(2026, 10, 3)),        // 식비 +20,000
            F.expense(10_000, date = LocalDate(2026, 11, 4), category = null),                                          // 미분류 새로
            F.expense(8_000, date = LocalDate(2026, 10, 5), category = F.transport.id),                                 // 교통 −8,000
        )
        val c = com.looin.finance.core.calc.StatisticsCalculator.categoryChanges(
            com.looin.finance.core.calc.StatisticsCalculator.stats(nov, txs), com.looin.finance.core.calc.StatisticsCalculator.stats(oct, txs))
        assertEquals(listOf(F.food.id to 20_000L, null to 10_000L, F.transport.id to -8_000L), c.map { it.categoryId to it.diff })
        assertTrue(c[1].isNew)
    }
}
