package com.looin.finance.reminder

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.R
import com.looin.finance.core.calc.ReminderPlanner
import com.looin.finance.ui.platform.ReminderControl
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * 예정 거래 알림 (Android).
 * 하루 한 번 WorkManager 가 기기 안의 데이터만 보고, 오늘 예정·지난 미처리 예정 거래가 있을 때만 알린다.
 */
object ReminderScheduler {
    const val WORK_NAME = "planned-reminder"
    const val CHANNEL_ID = "planned"
    private const val PREF_KEY = "reminders"
    private const val HOUR = 9

    fun isEnabled(context: Context) = prefs(context).getBoolean(PREF_KEY, false)

    fun enable(context: Context) {
        prefs(context).edit().putBoolean(PREF_KEY, true).apply()
        val request = PeriodicWorkRequestBuilder<PlannedReminderWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(millisUntilNext(HOUR), TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun disable(context: Context) {
        prefs(context).edit().putBoolean(PREF_KEY, false).apply()
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }

    /** 다음 [hour]시 정각까지 남은 시간(지났으면 내일). */
    fun millisUntilNext(hour: Int, now: Calendar = Calendar.getInstance()): Long {
        val next = (now.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, hour); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            if (!after(now)) add(Calendar.DAY_OF_MONTH, 1)
        }
        return next.timeInMillis - now.timeInMillis
    }

    fun hasPermission(context: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun ensureChannel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL_ID, "예정 거래 알림", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "오늘 예정이거나 처리하지 않은 지난 예정 거래를 하루 한 번 알려요"
            })
        }
    }

    private fun prefs(context: Context) = context.applicationContext.getSharedPreferences("ui", Context.MODE_PRIVATE)
}

class PlannedReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        if (!ReminderScheduler.isEnabled(ctx) || !ReminderScheduler.hasPermission(ctx)) return Result.success()
        val repo = (ctx as LooinApp).repository
        val data = repo.snapshot()
        val reminder = ReminderPlanner.plan(data.transactions, repo.today()) { t -> t.memo.ifBlank { data.categoryName(t.categoryId) } }
            ?: return Result.success()
        ReminderScheduler.ensureChannel(ctx)
        val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = NotificationCompat.Builder(ctx, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setContentTitle(reminder.title)
            .setContentText(reminder.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(reminder.body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        @Suppress("MissingPermission") // hasPermission 으로 확인함
        NotificationManagerCompat.from(ctx).notify(NOTIFICATION_ID, notification)
        return Result.success()
    }

    companion object { const val NOTIFICATION_ID = 1001 }
}

/** 설정 화면의 알림 켜기/끄기: 켤 때 Android 13+ 알림 권한을 요청한다. */
@Composable
fun rememberAndroidReminderControl(): ReminderControl {
    val context = LocalContext.current
    val state = remember { ReminderState(ReminderScheduler.isEnabled(context)) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) { ReminderScheduler.enable(context); state.enabled = true; state.denied = false }
        else { state.denied = true; state.enabled = false }
    }
    return remember(permission) {
        object : ReminderControl {
            override val supported = true
            override val enabled get() = state.enabled
            override val permissionDenied get() = state.denied
            override fun setEnabled(on: Boolean) {
                if (!on) { ReminderScheduler.disable(context); state.enabled = false; return }
                if (ReminderScheduler.hasPermission(context)) { ReminderScheduler.enable(context); state.enabled = true; state.denied = false }
                else permission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}

private class ReminderState(initial: Boolean) {
    var enabled by mutableStateOf(initial)
    var denied by mutableStateOf(false)
}
