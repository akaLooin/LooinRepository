package com.looin.finance.ui

import androidx.compose.ui.test.hasText
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import androidx.compose.ui.test.ExperimentalTestApi
import com.looin.finance.ui.settings.CsvImportScreen
import com.looin.finance.ui.theme.LooinTheme
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

/** 가져오기 미리보기: 새/중복/오류 개수, 기본 계좌 바꾸기, 확인하면 새 거래만 저장. */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class CsvImportScreenTest {
    @get:Rule val rule = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("csv-ui.db"); FinanceDatabase.build(context, "csv-ui.db") }
    private val repo = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 13) })

    /** DB 작업은 IO 스레드에서 끝나고 메인 루퍼로 돌아오므로, 시간을 두며 메인 루퍼를 비운다. */
    private fun await(cond: () -> Boolean) {
        val until = System.currentTimeMillis() + 15_000
        while (!cond()) {
            check(System.currentTimeMillis() < until) { "시간 초과" }
            Thread.sleep(20); org.robolectric.shadows.ShadowLooper.idleMainLooper()
        }
        rule.waitForIdle()
    }

    @After fun tearDown() { db.close(); context.deleteDatabase("csv-ui.db") }

    @Test fun previewThenImportNewRowsOnly() {
        val save = runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
            repo.saveAccount(Account(name = "생활비 카드통장", type = AccountType.CHECKING, openingBalance = 0, includeInAvailable = true))
        }
        val vm = MainViewModel(repo)
        val csv = "날짜,금액,메모\n2026-11-01,-12000,점심\n2026-11-01,-12000,점심\n어제,-1,오류"
        var loaded = false
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { CsvImportScreen(state, vm) { closed = true } }
        }
        // 저장소 데이터가 화면 상태에 올라온 뒤 파일을 읽는다(기본 계좌 결정에 필요)
        await { vm.state.value.data.accounts.size == 2 }
        rule.runOnIdle { vm.loadCsv({ csv }) { loaded = true } }
        await { loaded }
        rule.onNodeWithText("새 거래 1건").assertExists()
        rule.onNodeWithText("중복 1건 · 오류 1건은 건너뛰어요").assertExists()
        // 기본 계좌: 생활비 계좌 중 첫 번째(주거래) → 다른 계좌로 바꾸기
        rule.onNodeWithText("생활비 카드통장").performClick()
        await { vm.csvImport.value?.accountId == save }
        rule.onNodeWithText("1건 가져오기").performClick()
        await { closed }
        val txs = runBlocking { repo.snapshot().transactions }
        assertEquals(1, txs.size)
        assertEquals(save, txs.single().fromAccountId)
        assertTrue(vm.csvImport.value == null)
        rule.waitUntilAtLeastOneExists(hasText("가져올 파일이 없어요", substring = true), 5_000)
    }

    /** 중복 의심 줄은 재확인 안내가 뜨고, "중복 아님"을 누르면 함께 저장된다 */
    @Test fun duplicateCanBeKeptAfterConfirming() {
        runBlocking {
            repo.ensureInitialized()
            repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 100_000, includeInAvailable = true))
        }
        val vm = MainViewModel(repo)
        var loaded = false
        var closed = false
        rule.setContent {
            val state by vm.state.collectAsState()
            LooinTheme { CsvImportScreen(state, vm) { closed = true } }
        }
        await { vm.state.value.data.accounts.size == 1 }
        rule.runOnIdle { vm.loadCsv({ "날짜,금액,메모\n2026-11-01,-4500,커피\n2026-11-01,-4500,커피" }) { loaded = true } }
        await { loaded }
        rule.onNodeWithText("중복으로 보이는 거래 1건을 확인해 주세요").assertExists()
        rule.onNodeWithText("중복 아님 · 가져오기").performClick()
        await { vm.csvImport.value?.keepDuplicates?.size == 1 }
        rule.onNodeWithText("2건 가져오기").performClick()
        await { closed }
        assertEquals(2, runBlocking { repo.snapshot().transactions.size })
    }
}
