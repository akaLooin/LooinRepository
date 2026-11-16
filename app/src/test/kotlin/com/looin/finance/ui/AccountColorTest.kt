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
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.assets.AccountEditScreen
import com.looin.finance.ui.theme.LooinTheme
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 계좌 추가에서 통장 색을 고르면(추천 색) 그대로 저장된다. 고르지 않으면 0(종류별 기본 색). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class AccountColorTest {
    @get:Rule val rule = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("color.db"); FinanceDatabase.build(context, "color.db") }
    private val repo = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 16) })
    @After fun tearDown() { db.close(); context.deleteDatabase("color.db") }

    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) { check(System.currentTimeMillis() < until); Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper() }
        rule.waitForIdle()
    }

    @Test fun pickColorAndSave() {
        runBlocking { repo.ensureInitialized() }
        val vm = MainViewModel(repo)
        var done = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { AccountEditScreen(state, vm, null) { done = true } }
        }
        await { vm.state.value.data.loaded }
        rule.onNode(hasSetTextAction() and hasContentDescription("이름")).performTextInput("월급 통장")
        rule.onNode(hasContentDescription("색 #FC5A5A")).performScrollTo().performClick()
        rule.onNodeWithText("저장").performClick()
        await { done }
        val a = runBlocking { repo.snapshot().accounts.single() }
        assertEquals("월급 통장", a.name)
        assertEquals(0xFFFC5A5AL, a.colorArgb)
    }
}
