package com.looin.finance.reminder

import android.Manifest
import android.app.Application
import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import com.looin.finance.LooinApp
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.util.Calendar

/** 예정 거래 알림 작업: 켜짐·권한·처리할 거래가 있을 때만 알림을 띄운다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReminderWorkerTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val nm get() = shadowOf(context.getSystemService(NotificationManager::class.java))

    @Before fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        shadowOf(context as Application).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun runWorker(): ListenableWorker.Result = runBlocking {
        TestListenableWorkerBuilder<PlannedReminderWorker>(context).build().doWork()
    }

    private fun seedPlannedToday(memo: String = "월세") = runBlocking {
        val repo = (context as LooinApp).repository
        repo.ensureInitialized()
        val acc = repo.saveAccount(Account(name = "통장", type = AccountType.CHECKING, openingBalance = 1_000_000))
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED, amount = 550_000,
            date = repo.today(), fromAccountId = acc, memo = memo))
    }

    /** 켜져 있고 오늘 예정 거래가 있으면 알림 */
    @Test fun notifiesWhenEnabledAndDue() {
        seedPlannedToday()
        ReminderScheduler.enable(context)
        assertEquals(ListenableWorker.Result.success(), runWorker())
        val n = nm.allNotifications.single()
        assertEquals("오늘 예정 1건", n.extras.getString("android.title"))
        assertTrue(n.extras.getCharSequence("android.text").toString().contains("550,000원"))
    }

    /** 꺼져 있으면 알리지 않음 */
    @Test fun silentWhenDisabled() {
        seedPlannedToday()
        ReminderScheduler.disable(context)
        runWorker()
        assertTrue(nm.allNotifications.isEmpty())
    }

    /** 처리할 예정 거래가 없으면 알리지 않음 */
    @Test fun silentWhenNothingDue() {
        runBlocking { (context as LooinApp).repository.ensureInitialized() }
        ReminderScheduler.enable(context)
        runWorker()
        assertTrue(nm.allNotifications.isEmpty())
    }

    /** 다음 오전 9시까지의 시간 */
    @Test fun nextNineOClock() {
        val morning = Calendar.getInstance().apply { set(2026, 10, 13, 8, 30, 0); set(Calendar.MILLISECOND, 0) }
        assertEquals(30 * 60_000L, ReminderScheduler.millisUntilNext(9, morning))
        val evening = Calendar.getInstance().apply { set(2026, 10, 13, 21, 0, 0); set(Calendar.MILLISECOND, 0) }
        assertEquals(12 * 3_600_000L, ReminderScheduler.millisUntilNext(9, evening))
    }
}
