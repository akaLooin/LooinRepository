package com.looin.finance.ui

import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.tx.TransactionEditScreen
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 메모를 치면 예전 메모가 추천되고, 고르면 그때의 카테고리·계좌·금액이 채워져 그대로 저장된다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class MemoSuggestUiTest {
    @get:Rule val rule = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("memo.db"); FinanceDatabase.build(context, "memo.db") }
    private val today = LocalDate(2026, 11, 14)
    private val repo = FinanceRepository(db, now = { 1 }, today = { today })

    @After fun tearDown() { db.close(); context.deleteDatabase("memo.db") }

    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) {
            check(System.currentTimeMillis() < until) { "시간 초과" }
            Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper()
        }
        rule.waitForIdle()
    }

    @Test fun pickingSuggestionFillsCategoryAccountAndAmount() {
        val (card, cafe) = runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
            val card = repo.saveAccount(Account(name = "생활비 통장", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
            val cafe = repo.snapshot().categories.first { it.name == "카페·간식" }.id
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 4_500,
                date = LocalDate(2026, 11, 10), completedDate = LocalDate(2026, 11, 10), fromAccountId = card, categoryId = cafe, memo = "스타벅스"))
            card to cafe
        }
        val vm = MainViewModel(repo)
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { TransactionEditScreen(state, vm, null, null, null, null, null, onClose = { closed = true }) }
        }
        await { vm.state.value.data.transactions.size == 1 }
        rule.onNode(hasSetTextAction() and hasContentDescription("메모")).performScrollTo().performTextInput("스타")
        rule.onNodeWithText("스타벅스 · 카페·간식").performScrollTo().performClick()
        rule.onNodeWithText("저장").performClick()
        await { closed }
        val saved = runBlocking { repo.snapshot().transactions.maxBy { it.id } }
        assertEquals("스타벅스", saved.memo)
        assertEquals(cafe, saved.categoryId)
        assertEquals(card, saved.fromAccountId)
        assertEquals(4_500L, saved.amount)
    }
}
