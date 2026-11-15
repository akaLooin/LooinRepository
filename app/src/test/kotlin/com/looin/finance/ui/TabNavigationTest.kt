package com.looin.finance.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipe
import kotlinx.datetime.plus
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.semantics.SemanticsActions
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 회귀 테스트: 홈의 섹션 버튼으로 돈 관리·캘린더에 간 뒤 하단 "홈"을 누르면 반드시 홈으로 돌아와야 한다.
 * (예전에는 저장해 둔 화면 묶음이 되살아나 돈 관리 탭이 다시 열렸다)
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class TabNavigationTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    // 홈에만 있는 것: 빠른 입력 "지출 추가"(돈 관리 화면에도 "생활비로 사용 가능한 금액" 글자가 있어 그것으로는 구분 안 됨)
    private fun homeShown() = rule.waitUntilAtLeastOneExists(hasContentDescription("지출 추가"), 5_000)
    private fun tab(label: String) = rule.onNode(hasContentDescription(label) and androidx.compose.ui.test.hasClickAction()).performClick()

    @Test fun homeTabAlwaysReturnsHome() {
        runBlocking { (rule.activity.application as LooinApp).repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 10_000, includeInAvailable = true)) }
        homeShown()
        // 홈 → (남은 예산 + 추가) 돈 관리 → 홈 탭
        rule.onNode(hasScrollToNodeAction()).performScrollToNode(hasContentDescription("예산 관리"))
        rule.onNodeWithContentDescription("예산 관리").performSemanticsAction(SemanticsActions.OnClick)
        rule.waitUntilAtLeastOneExists(hasContentDescription("예산 추가"), 5_000)
        tab("홈"); homeShown()
        // 한 번 더: 돈 관리 → 캘린더 탭 → 홈 탭 → 다시 홈 탭
        rule.onNode(hasScrollToNodeAction()).performScrollToNode(hasContentDescription("예산 관리"))
        rule.onNodeWithContentDescription("예산 관리").performSemanticsAction(SemanticsActions.OnClick)
        rule.waitUntilAtLeastOneExists(hasContentDescription("예산 추가"), 5_000)
        tab("캘린더"); rule.waitUntilAtLeastOneExists(hasText("금액 보기"), 5_000)
        tab("홈"); homeShown()
        tab("홈"); homeShown()
        rule.waitUntilDoesNotExist(hasContentDescription("예산 추가"), 2_000)
        // 예정 거래 추가 → 뒤로 → 홈 탭
        rule.onAllNodesWithText("예정 거래").onFirst()
        rule.onNodeWithContentDescription("예정 거래 추가").performSemanticsAction(SemanticsActions.OnClick)
        rule.waitUntilAtLeastOneExists(hasText("거래 추가"), 5_000)
        rule.activityRule.scenario.onActivity { it.onBackPressedDispatcher.onBackPressed() }
        homeShown()
        tab("돈 관리"); rule.waitUntilAtLeastOneExists(hasContentDescription("예산 추가"), 5_000)
        tab("홈"); homeShown()
        rule.waitUntilDoesNotExist(hasContentDescription("예산 추가"), 2_000)
    }

    /** 캘린더: 왼쪽으로 밀면 다음 달, "오늘"을 누르면 이번 달로 */
    @Test fun calendarSwipesBetweenMonths() {
        val app = rule.activity.application as LooinApp
        runBlocking { app.repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 10_000, includeInAvailable = true)) }
        homeShown()
        tab("캘린더")
        val today = app.repository.today()
        val next = kotlinx.datetime.LocalDate(today.year, today.month, 1).plus(kotlinx.datetime.DatePeriod(months = 1))
        fun label(d: kotlinx.datetime.LocalDate) = "${d.year}년 ${d.month.ordinal + 1}월"
        rule.waitUntilAtLeastOneExists(hasText(label(today)), 5_000)
        rule.onRoot().performTouchInput {
            swipe(androidx.compose.ui.geometry.Offset(width * 0.9f, height * 0.45f), androidx.compose.ui.geometry.Offset(width * 0.1f, height * 0.45f), 300)
        }
        rule.waitUntilAtLeastOneExists(hasText(label(next)), 5_000)
        rule.onNode(hasText("오늘")).performClick()
        rule.waitUntilAtLeastOneExists(hasText(label(today)), 5_000)
    }
}
