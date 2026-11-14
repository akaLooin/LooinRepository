package com.looin.finance.core

import com.looin.finance.core.calc.MemoSuggest
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MemoSuggestTest {
    private val txs = listOf(
        F.expense(4_500, date = LocalDate(2026, 11, 1)).copy(id = 1, memo = "스타벅스", categoryId = F.food.id),
        F.expense(5_000, date = LocalDate(2026, 11, 5)).copy(id = 2, memo = "스타벅스 ", categoryId = F.food.id),
        F.expense(6_100, date = LocalDate(2026, 11, 9)).copy(id = 3, memo = "스타벅스", categoryId = null),
        F.expense(3_000, date = LocalDate(2026, 11, 2)).copy(id = 4, memo = "메가커피 스타필드점"),
        F.expense(9_000, date = LocalDate(2026, 11, 3)).copy(id = 5, memo = "스타일 소품", status = TransactionStatus.CANCELLED),
        F.income(3_000_000, date = LocalDate(2026, 10, 25)).copy(id = 6, memo = "스타트업 급여"),
    )

    /** 앞글자 일치 먼저, 자주 쓴 순. 최근 거래의 카테고리·금액을 따른다. 취소·다른 유형 제외 */
    @Test fun ranksPrefixAndFrequency() {
        val s = MemoSuggest.suggest(txs, "스타", TransactionType.EXPENSE)
        assertEquals(listOf("스타벅스", "메가커피 스타필드점"), s.map { it.memo })
        assertEquals(3, s[0].count)
        assertEquals(6_100L, s[0].lastAmount)
        assertEquals(null, s[0].categoryId) // 가장 최근 것(카테고리 없음)을 따른다
        assertEquals(F.checking.id, s[0].accountId)
        assertEquals(listOf("스타트업 급여"), MemoSuggest.suggest(txs, "스타", TransactionType.INCOME).map { it.memo })
    }

    @Test fun nothingForEmptyOrExactMatch() {
        assertTrue(MemoSuggest.suggest(txs, " ", TransactionType.EXPENSE).isEmpty())
        assertTrue(MemoSuggest.suggest(txs, "스타벅스", TransactionType.EXPENSE).isEmpty())
        assertEquals(listOf("스타벅스"), MemoSuggest.suggest(txs, "벅", TransactionType.EXPENSE).map { it.memo })
    }
}
