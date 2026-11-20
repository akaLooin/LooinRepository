package com.looin.finance.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.swipeRight
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.plus
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.looin.finance.ui.components.korean

/**
 * 캘린더에서 다른 날을 고르고 + 를 누르면 그 날짜로 입력이 시작된다.
 * 알림(스낵바)은 옆으로 밀면 사라진다.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp-xhdpi")
class CalendarAddAndToastTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    /** 캘린더에 처음 들어가 날짜를 고르지 않았으면 오늘로 추가하고, 제목에도 오늘 날짜가 보인다. */
    @Test fun plusButtonWithoutSelectionUsesToday() {
        val app = rule.activity.application as LooinApp
        runBlocking { app.repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 10_000, includeInAvailable = true)) }
        rule.waitUntilAtLeastOneExists(hasText("생활비로 지금 쓸 수 있는 금액", substring = true), 10_000)
        rule.onAllNodesWithText("캘린더").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasText("금액 보기"), 10_000)
        rule.onNodeWithContentDescription("거래 추가").performClick()
        rule.waitUntilAtLeastOneExists(hasText("거래 추가: ${app.repository.today().korean()}"), 10_000)
    }

    @Test fun plusButtonUsesSelectedCalendarDay() {
        val app = rule.activity.application as LooinApp
        runBlocking { app.repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 10_000, includeInAvailable = true)) }
        rule.waitUntilAtLeastOneExists(hasText("생활비로 지금 쓸 수 있는 금액", substring = true), 10_000)
        rule.onAllNodesWithText("캘린더").onFirst().performClick()
        val today = app.repository.today()
        // 같은 달 안의 다른 날(오늘이 말일 근처면 앞쪽 날)
        val other = if (today.day <= 20) today.plus(DatePeriod(days = 3)) else today.plus(DatePeriod(days = -3))
        rule.waitUntilAtLeastOneExists(hasContentDescription(other.korean(), substring = true), 10_000)
        rule.onNode(hasContentDescription(other.korean() + ",", substring = true)).performClick()
        rule.onNodeWithContentDescription("거래 추가").performClick()
        rule.waitUntilAtLeastOneExists(hasText(other.korean(true)), 10_000)
        // 맨 위 제목에도 고른 날짜가 보인다
        rule.waitUntilAtLeastOneExists(hasText("거래 추가: ${other.korean()}"), 5_000)

        // 저장 → 알림이 뜨고, 옆으로 밀면 사라진다
        rule.onNode(androidx.compose.ui.test.hasSetTextAction() and hasContentDescription("금액")).performTextInput("3000")
        rule.onNodeWithText("저장").performClick()
        rule.waitUntilAtLeastOneExists(hasContentDescription("알림, 옆으로 밀어 닫기"), 10_000)
        rule.onNodeWithContentDescription("알림, 옆으로 밀어 닫기").performTouchInput { swipeRight() }
        rule.waitUntilDoesNotExist(hasContentDescription("알림, 옆으로 밀어 닫기"), 5_000)
        // 저장된 거래의 날짜도 고른 날
        runBlocking { check(app.repository.snapshot().transactions.single().date == other) }
    }
}
