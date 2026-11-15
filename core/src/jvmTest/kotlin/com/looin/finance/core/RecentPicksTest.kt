package com.looin.finance.core

import com.looin.finance.core.calc.RecentPicks
import com.looin.finance.core.model.TransactionType
import org.junit.Assert.assertEquals
import org.junit.Test

class RecentPicksTest {
    /** 나중에 입력한 순서로, 중복 없이 최대 3개. 유형별로 따로 */
    @Test fun mostRecentDistinct() {
        val txs = listOf(
            F.expense(1).copy(id = 1, categoryId = 10, createdAt = 100),
            F.expense(1).copy(id = 2, categoryId = 11, createdAt = 200),
            F.expense(1).copy(id = 3, categoryId = 10, createdAt = 300),
            F.expense(1).copy(id = 4, categoryId = 12, createdAt = 400),
            F.expense(1).copy(id = 5, categoryId = 13, createdAt = 500),
            F.expense(1).copy(id = 6, categoryId = null, createdAt = 600),
            F.income(1).copy(id = 7, categoryId = 20, createdAt = 700),
        )
        assertEquals(listOf(13L, 12L, 10L), RecentPicks.categories(txs, TransactionType.EXPENSE))
        assertEquals(listOf(20L), RecentPicks.categories(txs, TransactionType.INCOME))
        assertEquals(listOf(F.checking.id), RecentPicks.accounts(txs, TransactionType.EXPENSE, RecentPicks.Side.FROM))
        assertEquals(emptyList<Long>(), RecentPicks.accounts(txs, TransactionType.EXPENSE, RecentPicks.Side.TO))
    }
}
