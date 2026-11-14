package com.looin.finance.desktop

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.toAwtImage
import androidx.compose.ui.test.ComposeUiTest
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runDesktopComposeUiTest
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import androidx.compose.ui.test.waitUntilDoesNotExist
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.AppCommand
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.platform.NoFileActions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.File
import javax.imageio.ImageIO

/**
 * PC 넓은 창 배치: 사이드바(하단 탭 없음), 홈·캘린더 두 칸, 단축키.
 * 좁은 창으로 줄이면 휴대폰 배치(하단 탭)로 돌아온다. 캡처는 build/desktop-screenshots/wide_*.
 */
@OptIn(ExperimentalTestApi::class)
class DesktopWideLayoutTest {
    private val today = LocalDate(2026, 11, 13)
    private val db = FinanceDatabase.build(file = null)
    private val repo = FinanceRepository(db, today = { today })

    @Before fun mainDispatcher() = Dispatchers.setMain(Dispatchers.Unconfined)
    @After fun close() { db.close(); Dispatchers.resetMain() }

    private fun seed() = runBlocking {
        repo.ensureInitialized()
        val main = repo.saveAccount(Account(name = "주거래 통장", type = AccountType.CHECKING, openingBalance = 2_400_000, includeInAvailable = true))
        val save = repo.saveAccount(Account(name = "적금", type = AccountType.SAVINGS, openingBalance = 5_000_000))
        val cats = repo.snapshot().categories
        fun cat(n: String) = cats.first { it.name == n }.id
        listOf(
            Triple(12_000L, "점심", "식비"), Triple(4_800L, "커피", "카페·간식"), Triple(1_450L, "버스", "교통"),
            Triple(32_000L, "장보기", "식비"), Triple(55_000L, "통신비", "통신"),
        ).forEachIndexed { i, (amt, memo, c) ->
            val d = LocalDate(2026, 11, 3 + i * 2)
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = amt, date = d,
                completedDate = d, fromAccountId = main, categoryId = cat(c), memo = memo))
        }
        repo.saveTransaction(Transaction(type = TransactionType.INCOME, status = TransactionStatus.COMPLETED, amount = 3_100_000,
            date = LocalDate(2026, 11, 10), completedDate = LocalDate(2026, 11, 10), toAccountId = main, categoryId = cat("급여"), memo = "급여"))
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 300_000,
            date = LocalDate(2026, 11, 11), completedDate = LocalDate(2026, 11, 11), fromAccountId = main, toAccountId = save, memo = "적금"))
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED, amount = 600_000,
            date = LocalDate(2026, 11, 25), fromAccountId = main, categoryId = cat("주거·관리비"), memo = "월세"))
        val p = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)
        repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = null, amount = 1_200_000))
        repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = cat("식비"), amount = 300_000))
    }

    private fun ComposeUiTest.shot(name: String) {
        waitForIdle()
        val dir = File("build/desktop-screenshots").apply { mkdirs() }
        ImageIO.write(onRoot().captureToImage().toAwtImage(), "png", File(dir, "$name.png"))
    }

    private fun ComposeUiTest.show(vm: MainViewModel, commands: MutableSharedFlow<AppCommand>) {
        val owner = object : LifecycleOwner {
            override val lifecycle = LifecycleRegistry.createUnsafe(this).apply { currentState = Lifecycle.State.RESUMED }
        }
        setContent { CompositionLocalProvider(LocalLifecycleOwner provides owner) { DesktopRoot(vm, NoFileActions, commands) } }
    }

    @Test fun wideWindowUsesSidebarAndTwoColumns() = runDesktopComposeUiTest(width = 1280, height = 820) {
        seed()
        val commands = MutableSharedFlow<AppCommand>(extraBufferCapacity = 8)
        show(MainViewModel(repo), commands)
        waitUntilAtLeastOneExists(hasText("생활비로 사용 가능한 금액", substring = true), 10_000)
        // 사이드바: 단축키 표시, 하단 탭(아이콘 아래 '홈' 글자 탭 줄)은 없음
        waitUntilAtLeastOneExists(hasText("Ctrl+N"), 5_000)
        // 두 칸: 왼쪽 최근 거래와 오른쪽 잔고가 한 화면에 함께 보인다
        waitUntilAtLeastOneExists(hasText("최근 거래"), 5_000)
        waitUntilAtLeastOneExists(hasText("실제 보유 잔고"), 5_000)
        shot("wide_01_home")

        // 단축키: Ctrl+2 → 캘린더(오른쪽에 고른 날 거래)
        commands.tryEmit(AppCommand.TAB_CALENDAR)
        waitUntilAtLeastOneExists(hasContentDescription("이 날 거래 추가"), 5_000)
        shot("wide_02_calendar")

        commands.tryEmit(AppCommand.TAB_PLAN)
        waitUntilAtLeastOneExists(hasText("이번 기간"), 5_000)
        shot("wide_03_plan")

        // Ctrl+N → 거래 입력(가운데 폭 제한), Esc → 돌아오기
        commands.tryEmit(AppCommand.NEW_TRANSACTION)
        waitUntilAtLeastOneExists(hasText("거래 추가"), 5_000)
        waitUntilAtLeastOneExists(hasText("저장"), 5_000)
        shot("wide_04_edit")
        commands.tryEmit(AppCommand.BACK)
        waitUntilDoesNotExist(hasText("저장"), 5_000)

        commands.tryEmit(AppCommand.SETTINGS)
        waitUntilAtLeastOneExists(hasText("회계 기간"), 5_000)
        shot("wide_05_settings")
        commands.tryEmit(AppCommand.BACK)

        // 사이드바 클릭으로도 이동
        onNodeWithContentDescription("자산").performClick()
        waitUntilAtLeastOneExists(hasText("순자산", substring = true), 5_000)
        shot("wide_06_assets")
    }

    @Test fun narrowWindowKeepsPhoneLayout() = runDesktopComposeUiTest(width = 420, height = 860) {
        seed()
        show(MainViewModel(repo), MutableSharedFlow())
        waitUntilAtLeastOneExists(hasText("생활비로 사용 가능한 금액", substring = true), 10_000)
        // 하단 탭과 + 버튼, 사이드바 단축키 표시는 없음
        onAllNodesWithText("캘린더").onFirst().assertExists()
        onAllNodes(hasContentDescription("거래 추가")).onFirst().assertExists()
        waitUntilDoesNotExist(hasText("Ctrl+N"), 2_000)
        shot("narrow_01_home")
    }
}
