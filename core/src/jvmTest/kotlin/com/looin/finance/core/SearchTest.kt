package com.looin.finance.core

import com.looin.finance.core.calc.TransactionActions
import com.looin.finance.core.calc.TransactionQuery
import com.looin.finance.core.calc.TransactionSearch
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SearchTest {
    private val lunch = F.expense(12_000, date = LocalDate(2026, 11, 3)).copy(memo = "회사 점심")
    private val dinner = F.expense(30_000, date = LocalDate(2026, 11, 10), from = F.cash.id).copy(memo = "저녁 약속")
    private val bus = F.expense(1_500, date = LocalDate(2026, 11, 11), category = F.transport.id).copy(memo = "")
    private val salary = F.income(3_000_000, date = LocalDate(2026, 10, 25))
    private val rentPlanned = F.expense(500_000, date = LocalDate(2026, 11, 25), status = TransactionStatus.PLANNED).copy(memo = "월세")
    private val cancelled = TransactionActions.cancel(F.expense(9_000, date = LocalDate(2026, 11, 5)).copy(memo = "점심 취소"), 1)
    private val save = F.transfer(100_000, F.checking.id, F.savings.id, date = LocalDate(2026, 11, 1))
    private val all = listOf(lunch, dinner, bus, salary, rentPlanned, cancelled, save)

    private fun cat(id: Long?) = F.categories.firstOrNull { it.id == id }?.name ?: "미분류"
    private fun acc(id: Long?) = (F.accounts).firstOrNull { it.id == id }?.name ?: ""
    private fun run(q: TransactionQuery) = TransactionSearch.search(all, q, ::cat, ::acc)

    @Test fun `빈 조건은 전체를 최신순으로`() {
        val r = run(TransactionQuery())
        assertEquals(all.size, r.items.size)
        assertEquals(rentPlanned, r.items.first())
    }

    @Test fun `메모·카테고리·계좌 이름·금액으로 검색`() {
        assertEquals(setOf(lunch, cancelled), run(TransactionQuery(text = "점심")).items.toSet())
        assertEquals(listOf(bus), run(TransactionQuery(text = "교통")).items)
        assertEquals(listOf(dinner), run(TransactionQuery(text = "지갑")).items)
        assertEquals(listOf(lunch), run(TransactionQuery(text = "12,000")).items)
        // 여러 단어는 모두 포함(AND)
        assertEquals(listOf(lunch), run(TransactionQuery(text = "점심 회사")).items)
        assertTrue(run(TransactionQuery(text = "없는말")).items.isEmpty())
    }

    @Test fun `유형·상태·계좌·기간·금액 필터`() {
        assertEquals(listOf(salary), run(TransactionQuery(types = setOf(TransactionType.INCOME))).items)
        assertEquals(listOf(rentPlanned), run(TransactionQuery(statuses = setOf(TransactionStatus.PLANNED))).items)
        assertEquals(setOf(save), run(TransactionQuery(accountId = F.savings.id)).items.toSet())
        val nov1to10 = run(TransactionQuery(from = LocalDate(2026, 11, 1), to = LocalDate(2026, 11, 10))).items
        assertEquals(setOf(lunch, dinner, cancelled, save), nov1to10.toSet())
        assertEquals(setOf(dinner, save), run(TransactionQuery(minAmount = 20_000, maxAmount = 200_000)).items.toSet())
    }

    @Test fun `검색 결과 합계는 취소·이체를 빼고 계산`() {
        val r = run(TransactionQuery(text = "점심"))
        assertEquals(12_000, r.completedExpense)
        val all = run(TransactionQuery())
        assertEquals(12_000 + 30_000 + 1_500L, all.completedExpense)
        assertEquals(3_000_000, all.completedIncome)
        assertEquals(500_000, all.plannedExpense)
    }
}
