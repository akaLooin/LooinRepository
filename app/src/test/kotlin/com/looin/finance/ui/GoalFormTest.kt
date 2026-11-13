package com.looin.finance.ui

import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.savings.SavingsGoal
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.plan.GoalForm
import com.looin.finance.ui.theme.LooinTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 저축 목표 입력 폼: 이름·금액·보관 계좌 선택 → 저장 값 확인. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GoalFormTest {
    @get:Rule val rule = createComposeRule()

    private val accounts = listOf(
        Account(id = 1, name = "주거래", type = AccountType.CHECKING, includeInAvailable = true),
        Account(id = 2, name = "적금 통장", type = AccountType.SAVINGS),
        Account(id = 3, name = "카드", type = AccountType.LIABILITY),
    )

    private fun open(onSave: (SavingsGoal) -> Unit) = rule.setContent {
        LooinTheme { GoalForm(SavingsGoal(name = "", targetAmount = 0), FinanceData(accounts = accounts, loaded = true), onSave) }
    }

    @Test fun defaultKeepsMoneyInLivingAccounts() {
        var saved: SavingsGoal? = null
        open { saved = it }
        rule.onNode(hasSetTextAction() and hasContentDescription("목표 이름")).performTextInput("여행")
        rule.onNode(hasSetTextAction() and hasContentDescription("목표 금액")).performTextInput("1000000")
        rule.onNodeWithText("저장").performClick()
        assertEquals("여행", saved!!.name)
        assertEquals(1_000_000L, saved!!.targetAmount)
        assertNull(saved!!.accountId)
    }

    @Test fun canKeepMoneyInExcludedSavingsAccountOnly() {
        var saved: SavingsGoal? = null
        open { saved = it }
        rule.onNode(hasSetTextAction() and hasContentDescription("목표 이름")).performTextInput("전세")
        rule.onNode(hasSetTextAction() and hasContentDescription("목표 금액")).performTextInput("5000000")
        // 생활비 대상 계좌(주거래)와 부채(카드)는 보관 계좌로 고를 수 없다
        rule.onNodeWithText("주거래").assertDoesNotExist()
        rule.onNodeWithText("카드").assertDoesNotExist()
        rule.onNodeWithText("적금 통장").performClick()
        rule.onNodeWithText("저장").performClick()
        assertEquals(2L, saved!!.accountId)
    }
}
