package com.looin.finance.ui

import android.graphics.Bitmap
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.home.HomeScreen
import com.looin.finance.ui.theme.LooinTheme
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** 홈: "지금까지 쓴 예산만 반영하면" 금액과 예산별 나눔, 예산대로 다 쓰면 모자랄 때 줄일 금액 안내. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w400dp-h1400dp")
class AvailableSplitUiTest {
    @get:Rule val rule = androidx.compose.ui.test.junit4.createAndroidComposeRule<androidx.activity.ComponentActivity>()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("split.db"); FinanceDatabase.build(context, "split.db") }
    private val today = LocalDate(2026, 11, 10)
    private val repo = FinanceRepository(db, now = { 1 }, today = { today })
    @After fun tearDown() { db.close(); context.deleteDatabase("split.db") }

    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) { check(System.currentTimeMillis() < until); Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper() }
        rule.waitForIdle()
    }

    @Test fun splitAndAdjust() {
        runBlocking {
            repo.ensureInitialized()
            val acc = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 500_000, includeInAvailable = true))
            val s = repo.snapshot()
            val food = s.categories.first { it.name == "식비" }.id
            val traffic = s.categories.first { it.name == "교통" }.id
            val p = PeriodCalculator.periodContaining(today, s.settings.primaryBasis, s.settings.paydayDay)
            repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = food, amount = 400_000))
            repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = traffic, amount = 200_000))
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 100_000, date = today,
                fromAccountId = acc, categoryId = food))
        }
        val vm = MainViewModel(repo)
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { HomeScreen(state, vm, PaddingValues(), {}, { _, _, _ -> }, {}, {}, {}) }
        }
        await { vm.state.value.data.loaded }
        // 잔고 400,000, 남은 예산 식비 300,000 + 교통 200,000 → 예산대로면 −100,000, 쓴 것만 반영하면 400,000
        has("-100,000원")
        has("400,000원")
        has("예산대로 다 쓰면 100,000원 모자라요")
        has("예산 합계를 600,000원에서 500,000원 이하로 줄여야 해요.")
        has("−60,000원")
        has("−40,000원")
        shot("home")
        rule.onNodeWithText("예산별 보기 ›").performClick()
        rule.waitForIdle()
        has("식비 남은 예산")
        has("예산을 다 써도 남는 돈")
    }

    private fun has(text: String) = org.junit.Assert.assertTrue("'$text' 없음",
        rule.onAllNodes(androidx.compose.ui.test.hasText(text), useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty())

    private fun shot(name: String) {
        val dir = File("build/split-screenshots").apply { mkdirs() }
        val view = rule.activity.window.decorView
        val bmp = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        rule.runOnUiThread { view.draw(android.graphics.Canvas(bmp)) }
        File(dir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
