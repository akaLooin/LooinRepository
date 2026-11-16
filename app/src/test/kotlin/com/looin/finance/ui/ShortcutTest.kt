package com.looin.finance.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.TransactionType
import com.looin.finance.shortcut.Shortcuts
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 앱 바로가기: 등록되고, "수입 추가"로 열면 수입 입력이 바로 열린다. */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class ShortcutTest {
    @get:Rule val rule = createEmptyComposeRule()
    private val app = ApplicationProvider.getApplicationContext<LooinApp>()

    @Test fun incomeShortcutOpensIncomeEntry() {
        runBlocking { app.repository.ensureInitialized(); app.repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 0, includeInAvailable = true)) }
        ActivityScenario.launch<MainActivity>(Shortcuts.intent(app, AppCommand.NEW_INCOME)).use {
            rule.waitUntilAtLeastOneExists(hasText("거래 추가"), 10_000)
            assertEquals(setOf("expense", "income", "receipt", "calendar"), ShortcutManagerCompat.getDynamicShortcuts(app).map { it.id }.toSet())
            rule.onNode(hasSetTextAction() and hasContentDescription("금액")).performTextInput("50000")
            rule.onNodeWithText("저장").performClick()
            rule.waitUntilAtLeastOneExists(hasText("생활비로 사용 가능한 금액", substring = true), 10_000)
            val tx = runBlocking { app.repository.snapshot().transactions.single() }
            assertEquals(TransactionType.INCOME, tx.type)
            assertEquals(50_000L, tx.amount)
        }
    }
}
