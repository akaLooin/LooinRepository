package world.looin.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import world.looin.shared.LooinApi
import java.util.concurrent.TimeUnit

/**
 * 30분마다 서버의 소식함을 확인해서, 아카엘이 먼저 말을 걸었으면 알림을 띄운다.
 * (구글 푸시 서비스 없이 동작 — 배터리 절약 모드에서는 조금 늦게 올 수 있다.)
 */
class InboxWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        AppSettings.init(applicationContext)
        val url = AppSettings.get(AppController.KEY_URL) ?: return Result.success()
        val token = AppSettings.get(AppController.KEY_TOKEN) ?: return Result.success()
        val api = LooinApi(url, token)
        return try {
            val inbox = api.inbox()
            val latest = inbox.latest.lastOrNull()
            if (inbox.unread > 0 && latest != null && latest.id != AppSettings.get(KEY_LAST)) {
                notify(applicationContext, latest.content, inbox.unread)
                AppSettings.set(KEY_LAST, latest.id)
            }
            // 내 글에 달린 댓글, 답글, 커뮤니티 요약
            val notices = api.notices()
            val fresh = notices.items.firstOrNull { !it.read }
            if (fresh != null && fresh.id != AppSettings.get(KEY_LAST_NOTICE)) {
                notifyNotice(applicationContext, fresh.title, fresh.body, notices.unread)
                AppSettings.set(KEY_LAST_NOTICE, fresh.id)
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        } finally {
            api.close()
        }
    }

    companion object {
        private const val KEY_LAST = "last_notified_message"
        private const val KEY_LAST_NOTICE = "last_notified_notice"
        private const val CHANNEL_COMMUNITY = "akael_community"
        const val EXTRA_OPEN_NOTICES = "open_notices"
        private const val CHANNEL = "akael_reach_out"
        const val EXTRA_OPEN_INBOX = "open_inbox"

        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<InboxWorker>(30, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("akael-inbox", ExistingPeriodicWorkPolicy.KEEP, req)
        }

        fun notifyNotice(ctx: Context, title: String, body: String, unread: Int) {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) return
            val nm = ctx.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL_COMMUNITY) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL_COMMUNITY, "커뮤니티 댓글 · 요약", NotificationManager.IMPORTANCE_DEFAULT))
            }
            val open = PendingIntent.getActivity(
                ctx, 1,
                Intent(ctx, MainActivity::class.java).putExtra(EXTRA_OPEN_NOTICES, true).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val n = NotificationCompat.Builder(ctx, CHANNEL_COMMUNITY)
                .setSmallIcon(R.drawable.ic_stat_akael)
                .setColor(0xFF00FF7F.toInt())
                .setContentTitle(title + if (unread > 1) " 외 ${unread - 1}개" else "")
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
            NotificationManagerCompat.from(ctx).notify(8, n)
        }

        fun notify(ctx: Context, text: String, unread: Int) {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) return
            val nm = ctx.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "아카엘이 먼저 건 말", NotificationManager.IMPORTANCE_DEFAULT))
            }
            val open = PendingIntent.getActivity(
                ctx, 0,
                Intent(ctx, MainActivity::class.java).putExtra(EXTRA_OPEN_INBOX, true).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val first = text.lineSequence().first()
            val n = NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_akael)
                .setColor(0xFF00FF7F.toInt())
                .setContentTitle("아카엘" + if (unread > 1) " ($unread)" else "")
                .setContentText(first)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
            NotificationManagerCompat.from(ctx).notify(7, n)
        }
    }
}
