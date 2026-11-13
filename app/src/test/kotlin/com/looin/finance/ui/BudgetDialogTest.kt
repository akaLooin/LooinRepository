package com.looin.finance.ui

import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.looin.finance.core.model.Budget
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.data.DefaultData
import com.looin.finance.data.FinanceData
import com.looin.finance.data.toModel
import com.looin.finance.ui.plan.BudgetDialog
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 예산 추가 다이얼로그: 항목 선택 + 금액 입력(천 단위 쉼표) → 저장 값 확인. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BudgetDialogTest {
    @get:Rule val rule = createComposeRule()

    @Test fun addCategoryBudget() {
        val cats = DefaultData.categories().mapIndexed { i, c -> c.copy(id = i + 1L).toModel() }
        val food = cats.first { it.name == "식비" }
        val draft = Budget(basis = PeriodBasis.CALENDAR, periodStart = LocalDate(2026, 11, 1),
            periodEndExclusive = LocalDate(2026, 12, 1), categoryId = -1, amount = 0)
        var saved: Budget? = null
        rule.setContent { BudgetDialog(draft, FinanceData(categories = cats, loaded = true), emptyList(), {}, { saved = it }, {}) }

        rule.onNodeWithText("식비").performClick()
        rule.onNode(hasSetTextAction() and hasText("예산 금액")).performTextInput("400000")
        rule.onNodeWithText("400,000", substring = true).assertExists() // 천 단위 쉼표 표시
        rule.onNodeWithText("저장").performClick()

        assertEquals(food.id, saved!!.categoryId)
        assertEquals(400_000L, saved!!.amount)
    }
}
