package com.looin.finance.ui

import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
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
import com.looin.finance.ui.assets.AccountRatesScreen
import com.looin.finance.ui.platform.ExchangeRates
import com.looin.finance.ui.platform.HttpGet
import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.tx.TransactionEditScreen
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 원화 계좌 → 엔화 계좌 바꾸기(기록 날짜 환율 자동 채우기), 외화 지출 입력 시 실시간 환율이 미리 채워짐. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class ForeignUiTest {
    @get:Rule val rule = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("fxui.db"); FinanceDatabase.build(context, "fxui.db") }
    private val today = LocalDate(2026, 11, 16)
    private val repo = FinanceRepository(db, now = { 1 }, today = { today })
    private val requested = mutableListOf<String>()
    @After fun tearDown() { db.close(); context.deleteDatabase("fxui.db") }

    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) { check(System.currentTimeMillis() < until); Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper(); rule.waitForIdle() }
        rule.waitForIdle()
    }

    private fun fakeRates() = ExchangeRates.init(InMemoryKeyValueStore(), HttpGet { url ->
        requested += url
        if (".." in url) """{"base":"JPY","rates":{"2026-10-30":{"KRW":9.0},"2026-11-02":{"KRW":9.5}}}"""
        else """{"amount":1.0,"base":"JPY","date":"2026-11-16","rates":{"KRW":8.5}}"""
    })

    @Test fun convertWithHistoricalRates() {
        fakeRates()
        val (trip, ids) = runBlocking {
            repo.ensureInitialized()
            val main = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
            val trip = repo.saveAccount(Account(name = "여행", type = AccountType.CHECKING, openingBalance = 0, includeInAvailable = true))
            val a = repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 180_000,
                date = LocalDate(2026, 11, 1), fromAccountId = main, toAccountId = trip))
            val b = repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 19_000,
                date = LocalDate(2026, 11, 2), fromAccountId = trip, memo = "라멘"))
            trip to listOf(a, b)
        }
        val vm = MainViewModel(repo)
        var done = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { AccountRatesScreen(state, vm, trip, convert = true) { done = true } }
        }
        await { vm.state.value.data.loaded }
        rule.onNodeWithText("JPY 일본 엔").performClick()
        rule.onNodeWithText("원화로 적었어요", substring = true).performClick()
        rule.onNodeWithText("기록 날짜 환율로 빈 칸 채우기").performClick()
        await { runCatching { rule.onNodeWithText("2칸 중 2칸 입력").assertExists() }.isSuccess }
        rule.onNodeWithText("JPY 계좌로 바꾸기").performClick()
        await { done }
        val s = runBlocking { repo.snapshot() }
        val acc = s.accounts.first { it.id == trip }
        assertEquals("JPY", acc.currency)
        // 11/1(일)은 직전 영업일 10/30 환율 9.0 → ¥20,000, 11/2 는 9.5 → 19,000원 = ¥2,000
        assertEquals(90_000L, s.transactions.first { it.id == ids[0] }.rateToKrwX10000)
        assertEquals(20_000L, s.transactions.first { it.id == ids[0] }.toAmount)
        assertEquals(2_000L, s.transactions.first { it.id == ids[1] }.amount)
        assertTrue(requested.any { "base=JPY" in it && ".." in it })
    }

    @Test fun foreignExpenseUsesLiveRate() {
        fakeRates()
        runBlocking { ExchangeRates.refresh(setOf("JPY"), 1, force = true) }
        val yen = runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "엔화", type = AccountType.FOREIGN, currency = "JPY", openingBalance = 50_000, openingRateX10000 = 90_000))
        }
        val vm = MainViewModel(repo)
        var done = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { TransactionEditScreen(state, vm, null, null, TransactionType.EXPENSE, null, yen, onClose = { done = true }) }
        }
        await { vm.state.value.data.loaded }
        rule.onNode(hasSetTextAction() and hasContentDescription("금액")).performTextInput("1000")
        rule.onNodeWithText("≈ 8,500원", substring = true).assertExists() // 실시간 1 JPY = 8.5원이 미리 들어감
        rule.onNodeWithText("저장").performClick()
        await { done }
        val t = runBlocking { repo.snapshot().transactions.single() }
        assertEquals(85_000L, t.rateToKrwX10000)
        assertEquals("JPY", t.currency)
    }
}
