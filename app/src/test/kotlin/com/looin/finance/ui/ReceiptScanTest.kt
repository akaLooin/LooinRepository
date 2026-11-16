package com.looin.finance.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.TransactionType
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.platform.LocalReceiptScanner
import com.looin.finance.ui.platform.ReceiptScan
import com.looin.finance.ui.platform.ReceiptScanner
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

/** 영수증 스캔으로 열면 바로 촬영 → 읽은 금액·날짜·가게·카테고리가 채워지고, 저장하면 사진 경로가 거래에 붙는다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class ReceiptScanTest {
    @get:Rule val rule = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("receipt.db"); FinanceDatabase.build(context, "receipt.db") }
    private val repo = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 16) })
    @After fun tearDown() { db.close(); context.deleteDatabase("receipt.db") }

    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) { check(System.currentTimeMillis() < until); Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper() }
        rule.waitForIdle()
    }

    private class FakeScanner : ReceiptScanner {
        var calls = mutableListOf<Boolean>()
        override val supported = true
        override fun scan(fromCamera: Boolean, onResult: (ReceiptScan) -> Unit) {
            calls += fromCamera
            onResult(ReceiptScan("receipts/r-1.jpg", "스타벅스 강남역점\n2026-11-15 08:42\n아메리카노 4,500\n결제금액 4,500원"))
        }
        override fun load(path: String, maxSize: Int): ImageBitmap? = null
    }

    @Test fun autoScanFillsAndSavesAttachment() {
        runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
        }
        val vm = MainViewModel(repo)
        val scanner = FakeScanner()
        var done = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme {
                CompositionLocalProvider(LocalReceiptScanner provides scanner) {
                    TransactionEditScreen(state, vm, null, null, TransactionType.EXPENSE, null, null, onClose = { done = true }, autoScan = true)
                }
            }
        }
        await { vm.state.value.data.loaded }
        // 화면 그리기(LaunchedEffect)는 테스트 시계가 돌아야 진행된다
        rule.waitUntil(15_000) { scanner.calls.isNotEmpty() }
        assertEquals(listOf(true), scanner.calls) // 바로 카메라
        rule.onNodeWithText("영수증에서 읽었어요", substring = true).assertExists()
        rule.onNodeWithText("저장").performClick()
        await { done }
        val tx = runBlocking { repo.snapshot().transactions.single() }
        assertEquals(4_500L, tx.amount)
        assertEquals(LocalDate(2026, 11, 15), tx.date)
        assertEquals("스타벅스 강남역점", tx.memo)
        assertEquals("receipts/r-1.jpg", tx.attachment)
        val cafe = runBlocking { repo.snapshot().categories.first { it.name == "카페·간식" } }
        assertEquals(cafe.id, tx.categoryId)
    }
}
