package com.looin.finance.core

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.calc.TransactionActions
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.validation.AccountRules
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BalanceTest {
    private val acc = F.checking
    private val endOfMonth = LocalDate(2026, 11, 30)

    @Test fun `완료 지출 10,000원은 출금 계좌 잔고를 10,000원 줄인다`() {
        val txs = listOf(F.expense(10_000))
        assertEquals(990_000, BalanceCalculator.actualBalance(acc, txs))
    }

    @Test fun `예정 지출 10,000원은 실제 잔고를 바꾸지 않고 예상 잔고에만 반영된다`() {
        val txs = listOf(F.expense(10_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED))
        assertEquals(1_000_000, BalanceCalculator.actualBalance(acc, txs))
        assertEquals(1_000_000, BalanceCalculator.projectedBalance(acc, txs, LocalDate(2026, 11, 19)))
        assertEquals(990_000, BalanceCalculator.projectedBalance(acc, txs, endOfMonth))
    }

    @Test fun `예정 지출을 완료하면 실제와 예상 잔고에 한 번만 반영된다`() {
        val planned = F.expense(10_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED)
        val before = BalanceCalculator.projectedBalance(acc, listOf(planned), endOfMonth)
        val done = TransactionActions.complete(planned, F.today, now = 1)
        val txs = listOf(done)
        assertEquals(990_000, BalanceCalculator.actualBalance(acc, txs))
        assertEquals(990_000, BalanceCalculator.projectedBalance(acc, txs, endOfMonth))
        assertEquals(before, BalanceCalculator.projectedBalance(acc, txs, endOfMonth))
        // 예정일은 보존되고 실제 처리일이 기록된다.
        assertEquals(LocalDate(2026, 11, 20), done.date)
        assertEquals(F.today, done.effectiveDate)
    }

    @Test fun `완료 시 실제 금액이 다르면 실제 금액으로 반영된다`() {
        val planned = F.expense(10_000, status = TransactionStatus.PLANNED)
        val done = TransactionActions.complete(planned, F.today, actualAmount = 12_000, now = 1)
        assertEquals(988_000, BalanceCalculator.actualBalance(acc, listOf(done)))
    }

    @Test fun `계좌 A에서 B로 100,000원 이체해도 총자산과 순자산은 변하지 않는다`() {
        val before = BalanceCalculator.assetSummary(F.accounts, emptyList())
        val txs = listOf(F.transfer(100_000, F.checking.id, F.savings.id))
        val after = BalanceCalculator.assetSummary(F.accounts, txs)
        assertEquals(before.totalAssets, after.totalAssets)
        assertEquals(before.netWorth, after.netWorth)
        assertEquals(900_000, BalanceCalculator.actualBalance(F.checking, txs))
        assertEquals(600_000, BalanceCalculator.actualBalance(F.savings, txs))
        // 저축 이체는 소비가 아니다.
        val p = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
        assertEquals(0, StatisticsCalculator.stats(p, txs).expense)
    }

    @Test fun `카드 대금 이체는 부채를 줄이지만 순자산은 그대로다`() {
        val txs = listOf(F.transfer(200_000, F.checking.id, F.card.id))
        val s = BalanceCalculator.assetSummary(F.accounts, txs)
        assertEquals(0, s.totalLiabilities)
        assertEquals(BalanceCalculator.assetSummary(F.accounts, emptyList()).netWorth, s.netWorth)
    }

    @Test fun `순자산은 자산에서 부채를 뺀 값이다`() {
        val s = BalanceCalculator.assetSummary(F.accounts, emptyList())
        assertEquals(1_550_000, s.totalAssets)
        assertEquals(200_000, s.totalLiabilities)
        assertEquals(1_350_000, s.netWorth)
    }

    @Test fun `거래 수정과 삭제 후 잔고와 통계가 재계산된다`() {
        val tx = F.expense(10_000)
        val p = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
        var txs = listOf(tx)
        assertEquals(990_000, BalanceCalculator.actualBalance(acc, txs))
        // 수정: 금액 30,000, 계좌를 현금으로 변경
        txs = listOf(tx.copy(amount = 30_000, fromAccountId = F.cash.id))
        assertEquals(1_000_000, BalanceCalculator.actualBalance(acc, txs))
        assertEquals(20_000, BalanceCalculator.actualBalance(F.cash, txs))
        assertEquals(30_000, StatisticsCalculator.stats(p, txs).expense)
        // 삭제
        txs = emptyList()
        assertEquals(50_000, BalanceCalculator.actualBalance(F.cash, txs))
        assertEquals(0, StatisticsCalculator.stats(p, txs).expense)
    }

    @Test fun `취소 거래는 잔고·예상 잔고·통계에서 제외된다`() {
        val p = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
        val done = TransactionActions.cancel(F.expense(10_000), now = 1)
        val plan = TransactionActions.cancel(F.expense(5_000, status = TransactionStatus.PLANNED), now = 1)
        val txs = listOf(done, plan)
        assertEquals(1_000_000, BalanceCalculator.actualBalance(acc, txs))
        assertEquals(1_000_000, BalanceCalculator.projectedBalance(acc, txs, endOfMonth))
        assertEquals(0, StatisticsCalculator.stats(p, txs).expense)
        assertEquals(0, StatisticsCalculator.stats(p, txs).plannedExpense)
        // 취소 → 예정으로 복구
        val reopened = TransactionActions.reopen(done, now = 2)
        assertEquals(TransactionStatus.PLANNED, reopened.status)
        assertNull(reopened.completedDate)
    }

    @Test fun `예정 수입은 입금 전까지 실제 잔고를 늘리지 않는다`() {
        val txs = listOf(F.income(3_000_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED))
        assertEquals(1_000_000, BalanceCalculator.actualBalance(acc, txs))
        assertEquals(4_000_000, BalanceCalculator.projectedBalance(acc, txs, endOfMonth))
    }

    @Test fun `잔고 조정은 차액만큼 조정 거래를 만들고 이력이 남는다`() {
        val txs = mutableListOf(F.expense(10_000))
        val adj = AccountRules.adjustment(acc, txs, targetBalance = 985_000, date = F.today, memo = "", now = 1)
        assertNotNull(adj)
        adj!!
        assertEquals(5_000, adj.amount)
        assertEquals(acc.id, adj.fromAccountId)
        assertTrue(adj.memo.contains("990,000원 → 985,000원"))
        txs += adj.copy(id = 999)
        assertEquals(985_000, BalanceCalculator.actualBalance(acc, txs))
        // 증가 조정
        val up = AccountRules.adjustment(acc, txs, 1_000_000, F.today, "현금 입금 누락", 2)!!
        assertEquals(acc.id, up.toAccountId)
        assertEquals(15_000, up.amount)
        txs += up.copy(id = 1000)
        assertEquals(1_000_000, BalanceCalculator.actualBalance(acc, txs))
        // 이력: 조정 거래 두 건이 모두 보존
        assertEquals(2, txs.count { it.type == com.looin.finance.core.model.TransactionType.ADJUSTMENT })
        // 차이가 없으면 조정 거래를 만들지 않음
        assertNull(AccountRules.adjustment(acc, txs, 1_000_000, F.today, "", 3))
        // 잔고 조정은 수입/소비 통계에 들어가지 않음
        val p = PeriodCalculator.periodContaining(F.today, PeriodBasis.CALENDAR, 25)
        assertEquals(10_000, StatisticsCalculator.stats(p, txs).expense)
        assertEquals(0, StatisticsCalculator.stats(p, txs).income)
    }

    @Test fun `잔액이 남은 계좌나 예정 거래가 있는 계좌는 보관할 수 없다`() {
        assertNotNull(AccountRules.canArchive(acc, emptyList()))
        val zero = acc.copy(openingBalance = 0)
        assertNull(AccountRules.canArchive(zero, emptyList()))
        assertNotNull(AccountRules.canArchive(zero, listOf(F.expense(1_000, status = TransactionStatus.PLANNED))))
    }

    @Test fun `외화 계좌는 원래 통화 잔액을 보존하고 평가액은 별도로 계산한다`() {
        // 100.00 USD, 환율 1,400원
        assertEquals(10_000, BalanceCalculator.actualBalance(F.usd, emptyList()))
        val s = BalanceCalculator.assetSummary(F.accounts + F.usd, emptyList())
        assertEquals(1_550_000 + 140_000, s.totalAssets)
        val noRate = BalanceCalculator.assetSummary(listOf(F.usd.copy(rateToKrwX10000 = null)), emptyList())
        assertEquals(0, noRate.totalAssets)
        assertEquals(1, noRate.unvaluedAccounts.size)
    }
}
