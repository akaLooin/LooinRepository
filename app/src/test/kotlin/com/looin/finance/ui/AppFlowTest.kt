package com.looin.finance.ui

import android.graphics.Bitmap
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.looin.finance.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * 실제 MainActivity 를 띄워 핵심 사용 흐름을 끝까지 실행하는 스모크 테스트.
 * 계좌 등록 → 지출 입력 → 예산 추가 → 모든 탭 이동, 그리고 화면 캡처를 build/screenshots 에 저장한다.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w400dp-h860dp-xhdpi")
open class AppFlowTest {
    /** 캡처 파일 이름 앞에 붙는 말(다크 모드 실행과 구분). */
    open val prefix = "light"

    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun shot(name: String) {
        rule.waitForIdle()
        val dir = File("build/screenshots").apply { mkdirs() }
        val view = rule.activity.window.decorView
        val bmp = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        rule.runOnUiThread { view.draw(android.graphics.Canvas(bmp)) }
        File(dir, "${prefix}_$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun waitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text, substring = true), 10_000)

    private fun field(label: String) = rule.onNode(hasSetTextAction() and hasContentDescription(label))

    @Test
    fun coreUserFlow() {
        waitText("첫 계좌 등록")
        shot("01_onboarding")
        rule.onNodeWithText("첫 계좌 등록").performClick()

        waitText("계좌 추가")
        field("이름").performTextInput("주거래 통장")
        field("초기 잔고").performTextInput("1500000")
        shot("02_account_edit")
        rule.onNodeWithText("저장").performClick()

        waitText("생활비로 사용 가능한 금액")
        rule.onAllNodesWithText("1,500,000원").onFirst().assertExists()

        // 빠른 지출 입력
        rule.onAllNodesWithContentDescription("거래 추가").onFirst().performClick()
        waitText("거래 추가")
        field("금액").performTextInput("12000")
        rule.onNodeWithText("식비").performClick()
        field("메모").performTextInput("점심")
        shot("03_transaction_edit")
        rule.onNodeWithText("저장").performClick()

        waitText("1,488,000원")
        shot("04_home")

        // 돈 관리: 전체 생활비 예산 500,000원
        rule.onAllNodesWithText("돈 관리").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasContentDescription("예산 추가"), 10_000)
        // 예산 입력 다이얼로그 자체는 BudgetDialogTest 에서 검증한다(Robolectric 에서 큰 화면의 다이얼로그 텍스트 필드가 idle 되지 않는 환경 문제).
        val app = rule.activity.application as com.looin.finance.LooinApp
        kotlinx.coroutines.runBlocking {
            val p = app.repository.snapshot().let { s ->
                com.looin.finance.core.period.PeriodCalculator.periodContaining(app.repository.today(), s.settings.primaryBasis, s.settings.paydayDay)
            }
            app.repository.saveBudget(com.looin.finance.core.model.Budget(basis = p.basis, periodStart = p.start,
                periodEndExclusive = p.endExclusive, categoryId = null, amount = 500_000))
        }
        // 예산 500,000 − 사용 12,000 = 잔액 488,000
        waitText("488,000원")
        shot("05_plan")

        // 홈: 사용 가능 = 잔고 1,488,000 − 예산 확보 488,000 = 1,000,000
        rule.onAllNodesWithText("홈").onFirst().performClick()
        waitText("1,000,000원")

        rule.onAllNodesWithText("캘린더").onFirst().performClick()
        waitText("예정 지출")
        shot("06_calendar")

        rule.onAllNodesWithText("자산").onFirst().performClick()
        waitText("순자산")
        shot("07_assets")

        rule.onAllNodesWithText("분석").onFirst().performClick()
        waitText("카테고리별 소비")
        shot("08_analysis")

        rule.onNodeWithContentDescription("설정").performClick()
        waitText("급여 기준일")
        shot("09_settings")
    }
}

/** 같은 흐름을 다크 모드(시스템 night)로 실행. */
@Config(sdk = [34], qualifiers = "w400dp-h860dp-night-xhdpi")
class AppFlowDarkTest : AppFlowTest() {
    override val prefix = "dark"
}
