package com.looin.finance.core

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.TransactionStatus
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class BalanceOnDateTest {
    private val acc = F.checking // 초기 1,000,000
    private val txs = listOf(
        F.expense(100_000, date = LocalDate(2026, 11, 5)),
        F.income(50_000, date = LocalDate(2026, 11, 10)),
        F.expense(30_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED),
        // 지난 날짜의 미처리 예정 거래: 과거 잔고에는 넣지 않고, 오늘 이후 예상 잔고에는 넣는다
        F.expense(7_000, date = LocalDate(2026, 11, 8), status = TransactionStatus.PLANNED),
    )
    private val today = F.today // 11/12

    @Test fun `지난 날짜는 그날까지 완료된 거래만 반영한 실제 잔고`() {
        assertEquals(1_000_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 4), today))
        assertEquals(900_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 5), today))
        assertEquals(900_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 8), today))
        assertEquals(950_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 11), today))
    }

    @Test fun `오늘 이후는 실제 잔고와 그날까지의 예정 거래(밀린 것 포함)`() {
        assertEquals(943_000, BalanceCalculator.balanceOn(acc, txs, today, today))
        assertEquals(943_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 19), today))
        assertEquals(913_000, BalanceCalculator.balanceOn(acc, txs, LocalDate(2026, 11, 20), today))
    }

    @Test fun `여러 계좌 합과 이체 상쇄`() {
        val t = F.transfer(200_000, F.checking.id, F.savings.id, date = LocalDate(2026, 11, 6))
        val map = BalanceCalculator.balancesOn(listOf(F.checking, F.savings), txs + t,
            listOf(LocalDate(2026, 11, 5), LocalDate(2026, 11, 6)), today)
        assertEquals(1_400_000L, map[LocalDate(2026, 11, 5)])
        assertEquals(1_400_000L, map[LocalDate(2026, 11, 6)]) // 이체는 합계를 바꾸지 않음
    }
}
