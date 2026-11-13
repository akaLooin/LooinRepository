package com.looin.finance.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.looin.finance.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 화면 전환은 애니메이션 없이 즉시(사용자 요청). 시계를 멈추고 100ms 만 진행했을 때(기존 페이드는 수백 ms)
 * 새 화면만 있고 이전 화면은 이미 사라져 있어야 한다(페이드라면 두 화면이 함께 남아 있음).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class InstantTransitionTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun after100ms() = rule.mainClock.advanceTimeBy(100)

    @Test fun tabsAndScreensSwitchWithoutAnimation() {
        rule.waitUntilAtLeastOneExists(hasText("첫 계좌 등록"), 10_000)
        rule.mainClock.autoAdvance = false

        // 탭 이동: 홈 → 캘린더
        rule.onAllNodesWithText("캘린더").onFirst().performClick()
        after100ms()
        rule.onNodeWithText("오늘").assertExists()
        rule.onNodeWithText("첫 계좌 등록").assertDoesNotExist()

        // 탭 이동: 캘린더 → 홈
        rule.onAllNodesWithText("홈").onFirst().performClick()
        after100ms()
        rule.onNodeWithText("첫 계좌 등록").assertExists()
        rule.onNodeWithText("오늘").assertDoesNotExist()

        // 화면 열기: 홈 → 계좌 추가, 그리고 뒤로
        rule.onNodeWithText("첫 계좌 등록").performClick()
        after100ms()
        rule.onNodeWithText("계좌 추가").assertExists()
        rule.onNodeWithText("첫 계좌 등록").assertDoesNotExist()
    }
}
