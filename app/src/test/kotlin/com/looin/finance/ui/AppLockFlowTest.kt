package com.looin.finance.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.looin.finance.MainActivity
import com.looin.finance.ui.security.AppLock
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 설정에서 PIN 을 두 번 입력해 잠금을 켜고, 잠긴 화면을 키패드로 푼다. */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w400dp-h860dp-xhdpi")
class AppLockFlowTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun shot(name: String) {
        rule.waitForIdle()
        val view = rule.activity.window.decorView
        val bmp = android.graphics.Bitmap.createBitmap(view.width, view.height, android.graphics.Bitmap.Config.ARGB_8888)
        rule.runOnUiThread { view.draw(android.graphics.Canvas(bmp)) }
        java.io.File("build/screenshots").apply { mkdirs() }.resolve("light_$name.png").outputStream()
            .use { bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun type(pin: String) = pin.forEach { rule.onNodeWithContentDescription("$it").performClick() }

    @Test fun setPinThenUnlockWithKeypad() {
        rule.waitUntilAtLeastOneExists(hasText("첫 계좌 등록"), 10_000)
        rule.onNodeWithContentDescription("설정").performClick()
        rule.onNodeWithText("앱 잠금").performScrollTo().performClick()
        rule.waitUntilAtLeastOneExists(hasText("새 PIN", substring = true), 10_000)
        type("1357")
        rule.waitUntilAtLeastOneExists(hasText("한 번 더 입력하세요"), 5_000)
        type("1357")
        rule.waitUntilAtLeastOneExists(hasText("PIN 바꾸기"), 5_000)
        assertTrue(AppLock.enabled)

        rule.runOnUiThread { AppLock.lockNow() }
        rule.waitUntilAtLeastOneExists(hasText("PIN 4자리를 입력하세요"), 5_000)
        shot("12_lock")
        type("0000")
        rule.waitUntilAtLeastOneExists(hasText("PIN이 맞지 않아요", substring = true), 5_000)
        type("1357")
        rule.waitUntilDoesNotExist(hasContentDescription("지우기"), 5_000)
        assertFalse(AppLock.locked)
        rule.runOnUiThread { AppLock.disable() }
    }
}
