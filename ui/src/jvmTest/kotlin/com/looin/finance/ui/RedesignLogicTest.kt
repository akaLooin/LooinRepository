package com.looin.finance.ui

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.components.hexOf
import com.looin.finance.ui.components.parseHexColor
import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.theme.ColorRole
import com.looin.finance.ui.theme.LightTokens
import com.looin.finance.ui.theme.ThemePrefs
import com.looin.finance.ui.theme.withOverrides
import com.looin.finance.ui.tx.convertType
import androidx.compose.ui.graphics.Color
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RedesignLogicTest {
    private val d = LocalDate(2026, 11, 13)
    private val expense = Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 5_000, date = d,
        completedDate = d, fromAccountId = 1, categoryId = 7, memo = "점심")

    /** 지출 → 수입 → 저축 및 이체 → 지출: 원래 계좌 유지, 카테고리는 비움, 이체는 고른 자산으로 */
    @Test fun convertBetweenTypesKeepsAccount() {
        val income = convertType(expense, TransactionType.INCOME)
        assertEquals(1L, income.toAccountId); assertNull(income.fromAccountId); assertNull(income.categoryId)
        val transfer = convertType(income, TransactionType.TRANSFER, dest = 2)
        assertEquals(1L, transfer.fromAccountId); assertEquals(2L, transfer.toAccountId)
        // 이체의 넣을 자산만 바꾸기
        assertEquals(3L, convertType(transfer, TransactionType.TRANSFER, dest = 3).toAccountId)
        // 이체 → 수입: 돈이 들어간 계좌
        assertEquals(2L, convertType(transfer, TransactionType.INCOME).toAccountId)
        val back = convertType(transfer, TransactionType.EXPENSE)
        assertEquals(1L, back.fromAccountId); assertNull(back.toAccountId)
        assertEquals(expense.amount, back.amount); assertEquals("점심", back.memo)
    }

    @Test fun hexColors() {
        assertEquals(0xFF12A594L, parseHexColor("#12a594"))
        assertEquals(0xFF12A594L, parseHexColor("12A594"))
        assertEquals(0x8012A594L, parseHexColor("#8012A594"))
        assertNull(parseHexColor("#12A59"))
        assertNull(parseHexColor("#GGGGGG"))
        assertEquals("#12A594", hexOf(0xFF12A594L))
    }

    /** 사용자 색은 저장되고 다시 읽히며, 밝은 주 색 위 글자는 검정 */
    @Test fun colorOverridesPersist() {
        val store = InMemoryKeyValueStore()
        ThemePrefs.init(store)
        ThemePrefs.setColor(ColorRole.PRIMARY, 0xFFFFE066L)
        ThemePrefs.setColor(ColorRole.EXPENSE, 0xFF000000L)
        ThemePrefs.init(store) // 앱 재시작
        assertEquals(mapOf(ColorRole.PRIMARY to 0xFFFFE066L, ColorRole.EXPENSE to 0xFF000000L), ThemePrefs.colorOverrides)
        val c = LightTokens.withOverrides(ThemePrefs.colorOverrides)
        assertEquals(Color(0xFFFFE066), c.primary)
        assertEquals(Color(0xFF0E1116), c.onPrimary)
        assertEquals(Color(0xFF000000), c.expense)
        ThemePrefs.resetColors()
        ThemePrefs.init(store)
        assertEquals(emptyMap(), ThemePrefs.colorOverrides)
    }
}
