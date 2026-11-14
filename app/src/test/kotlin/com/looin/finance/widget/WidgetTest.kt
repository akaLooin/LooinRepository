package com.looin.finance.widget

import androidx.glance.appwidget.testing.unit.runGlanceAppWidgetUnitTest
import androidx.glance.testing.unit.hasText
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.LooinApp
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.platform.AndroidKeyValueStore
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 홈 화면 위젯: 앱과 같은 계산값, 앱 잠금을 켜면 금액을 숨긴다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WidgetTest {
    private val app = ApplicationProvider.getApplicationContext<LooinApp>()

    private fun seed() = runBlocking {
        val repo = app.repository
        repo.ensureInitialized()
        val acc = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        val today = repo.today()
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 30_000,
            date = today, completedDate = today, fromAccountId = acc, memo = "점심"))
    }

    @Test fun showsAvailableAndSpending() {
        seed()
        val s = runBlocking { WidgetData.load(app) }
        assertEquals(970_000L, s.available)
        assertEquals(30_000L, s.spent)
        assertTrue(s.hasAccounts)
        runGlanceAppWidgetUnitTest {
            provideComposable { WidgetContent(app, s) }
            onNode(hasText("970,000원")).assertExists()
            onNode(hasText("이번 기간 소비 30,000원")).assertExists()
            onNode(hasText("+ 지출")).assertExists()
        }
    }

    @Test fun hidesAmountsWhenAppLockIsOn() {
        seed()
        AndroidKeyValueStore(app).put("lock.hash", "abc")
        val s = runBlocking { WidgetData.load(app) }
        assertNull(s.available)
        assertNull(s.spent)
        runGlanceAppWidgetUnitTest {
            provideComposable { WidgetContent(app, s) }
            onNode(hasText("잠금 중")).assertExists()
            onNode(hasText("앱에서 확인")).assertExists()
        }
    }
}
