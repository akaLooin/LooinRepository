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

    /** 금액 칸 계산식: 48000 ÷ 4 → [=] → 12,000 으로 저장 */
    @Test fun amountCalculator() {
        runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
        }
        val vm = MainViewModel(repo)
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { TransactionEditScreen(state, vm, null, null, null, null, null, onClose = { closed = true }) }
        }
        await { vm.state.value.data.accounts.size == 1 }
        val amount = rule.onNode(hasSetTextAction() and hasContentDescription("금액"))
        amount.performTextInput("48000")
        rule.onNode(hasContentDescription("나누기")).performClick()
        amount.performTextInput("4")
        rule.onNodeWithText("= 12,000원").assertExists()
        rule.onNode(hasContentDescription("계산 결과 넣기")).performClick()
        rule.onNodeWithText("저장").performClick()
        await { closed }
        assertEquals(12_000L, runBlocking { repo.snapshot().transactions.single().amount })
    }

    /** 카테고리: 최근 3개만 칩으로, 나머지는 목록을 펼쳐서 고른다 */
    @Test fun pickerShowsRecentThreeAndFullList() {
        runBlocking {
            repo.ensureInitialized()
            val acc = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
            val cats = repo.snapshot().categories
            listOf("교통", "식비", "카페·간식", "쇼핑").forEach { n ->
                repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 1_000,
                    date = today, completedDate = today, fromAccountId = acc, categoryId = cats.first { it.name == n }.id))
            }
        }
        val vm = MainViewModel(repo)
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { TransactionEditScreen(state, vm, null, null, null, null, null, onClose = { closed = true }) }
        }
        await { vm.state.value.data.transactions.size == 4 }
        // now 가 고정이라 입력 순서(id)로 최근을 정한다: 쇼핑, 카페·간식, 식비 / 교통은 목록에만
        rule.onNodeWithText("쇼핑").assertExists()
        rule.onNodeWithText("카페·간식").assertExists()
        rule.onNodeWithText("식비").assertExists()
        rule.onNodeWithText("교통").assertDoesNotExist()
        rule.onNode(hasContentDescription("카테고리 목록")).performScrollTo().performClick()
        rule.onNodeWithText("교육").performScrollTo().performClick()
        rule.onNodeWithText("교통").assertDoesNotExist() // 고르면 다시 접힘
        rule.onNode(hasSetTextAction() and hasContentDescription("금액")).performTextInput("3000")
        rule.onNodeWithText("저장").performClick()
        await { closed }
        val saved = runBlocking { repo.snapshot().let { s -> s.categoryName(s.transactions.maxBy { it.id }.categoryId) } }
        assertEquals("교육", saved)
    }

    /** 지출 한도: 입력 중 경고(85%) → 금액을 올리면 제한 → 저장 시 확인 후 저장 */
    @Test fun limitWarningsWhileEntering() {
        runBlocking {
            repo.ensureInitialized()
            val acc = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 500_000, includeInAvailable = true))
            val food = repo.snapshot().categories.first { it.name == "식비" }.id
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 70_000,
                date = today, completedDate = today, fromAccountId = acc, categoryId = food))
            repo.saveLimit(com.looin.finance.core.limit.SpendingLimit(target = com.looin.finance.core.limit.LimitTarget.CATEGORY, targetId = food, amount = 100_000))
        }
        val vm = MainViewModel(repo)
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { TransactionEditScreen(state, vm, null, null, null, null, null, onClose = { closed = true }) }
        }
        await { vm.state.value.data.limits.size == 1 }
        rule.onNodeWithText("식비").performClick() // 최근 카테고리
        val amount = rule.onNode(hasSetTextAction() and hasContentDescription("금액"))
        amount.performTextInput("15000")
        rule.onNodeWithText("식비 한도의 85% (85,000원 / 100,000원)").assertExists()
        rule.onNodeWithText("경고").assertExists()
        amount.performTextInput("0") // 150000
        rule.onNodeWithText("식비 한도를 120,000원 넘어요").assertExists()
        rule.onNodeWithText("저장").performClick()
        rule.waitUntil(5_000) { rule.onAllNodes(androidx.compose.ui.test.hasText("한도(100,000원)를 120,000원 넘어요", substring = true)).fetchSemanticsNodes().isNotEmpty() }
        rule.onAllNodes(androidx.compose.ui.test.hasText("저장")).fetchSemanticsNodes().size.let { check(it >= 2) }
        rule.onAllNodes(androidx.compose.ui.test.hasText("저장"))[1].performClick() // 확인 창의 저장
        await { closed }
        assertEquals(2, runBlocking { repo.snapshot().transactions.size })
    }
}
