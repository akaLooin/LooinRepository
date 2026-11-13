package com.looin.finance.desktop

import androidx.compose.ui.graphics.toAwtImage
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.runtime.CompositionLocalProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.platform.NoFileActions
import kotlinx.datetime.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File
import javax.imageio.ImageIO

/**
 * PC 앱 화면 테스트(창 없이 화면 없는 환경에서 실행). 계좌 등록 → 지출 → 각 탭 이동을 실제 화면으로 확인하고
 * 캡처를 build/desktop-screenshots 에 남긴다.
 */
@OptIn(ExperimentalTestApi::class)
class DesktopAppTest {
    @get:Rule val rule = createComposeRule()
    private val db = FinanceDatabase.build(file = null)
    private val repo = FinanceRepository(db, today = { LocalDate(2026, 11, 13) })

    /**
     * 실제 PC 앱은 Swing 이벤트 스레드가 Main 이다. 창 없는 테스트는 테스트 스레드에서 화면을 그리므로,
     * 화면 이동(수명 주기)의 "메인 스레드" 검사가 테스트 스레드를 메인으로 보도록 Main 을 바꿔 둔다.
     */
    @Before fun mainDispatcher() = Dispatchers.setMain(Dispatchers.Unconfined)

    @After fun close() {
        db.close()
        Dispatchers.resetMain()
    }

    private fun shot(name: String) {
        rule.waitForIdle()
        val dir = File("build/desktop-screenshots").apply { mkdirs() }
        ImageIO.write(rule.onRoot().captureToImage().toAwtImage(), "png", File(dir, "$name.png"))
    }

    private fun waitText(t: String) = rule.waitUntilAtLeastOneExists(hasText(t, substring = true), 10_000)
    private fun field(label: String) = rule.onNode(hasSetTextAction() and hasContentDescription(label))

    @Test fun desktopCoreFlow() {
        val vm = MainViewModel(repo)
        // 실제 PC 창은 활성(RESUMED) 수명 주기를 제공한다. 창 없는 테스트 환경에서도 같게 맞춘다(화면 이동 시 필요).
        val owner = object : LifecycleOwner {
            override val lifecycle = LifecycleRegistry.createUnsafe(this).apply { currentState = Lifecycle.State.RESUMED }
        }
        rule.setContent {
            CompositionLocalProvider(LocalLifecycleOwner provides owner) { DesktopRoot(vm, NoFileActions) }
        }

        waitText("첫 계좌 등록")
        shot("01_onboarding")
        rule.onNodeWithText("첫 계좌 등록").performClick()
        waitText("계좌 추가")
        field("이름").performTextInput("주거래 통장")
        field("초기 잔고").performTextInput("1500000")
        rule.onNodeWithText("저장").performClick()
        waitText("1,500,000원")

        rule.waitUntilAtLeastOneExists(hasContentDescription("거래 추가"), 10_000)
        rule.onAllNodes(hasContentDescription("거래 추가")).onFirst().performClick()
        waitText("거래 추가")
        field("금액").performTextInput("12000")
        rule.onNodeWithText("식비").performClick()
        field("메모").performTextInput("점심")
        rule.onNodeWithText("저장").performClick()
        waitText("1,488,000원")
        shot("02_home")

        for ((tab, expect, name) in listOf(
            Triple("캘린더", "오늘", "03_calendar"), Triple("돈 관리", "이번 기간", "04_plan"),
            Triple("자산", "순자산", "05_assets"), Triple("분석", "카테고리별 소비", "06_analysis"),
        )) {
            rule.onAllNodesWithText(tab).onFirst().performClick()
            waitText(expect)
            shot(name)
        }
    }
}
