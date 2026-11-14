package com.looin.finance.ui.platform

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.looin.finance.core.calc.ReminderPlanner
import com.looin.finance.data.FinanceData
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.number
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime
import platform.Foundation.NSDateComponents
import platform.UserNotifications.UNAuthorizationOptionAlert
import platform.UserNotifications.UNAuthorizationOptionSound
import platform.UserNotifications.UNCalendarNotificationTrigger
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNUserNotificationCenter
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue
import kotlin.time.Clock

/**
 * iOS 예정 거래 알림. iOS 는 매일 백그라운드 작업을 보장하지 않으므로, 데이터가 바뀔 때마다
 * 앞으로 예정 거래가 있는 날의 오전 9시 로컬 알림을 미리 예약한다(최대 30일치, [ReminderPlanner.schedule]).
 * 자동이체로 자동 완료되는 거래는 알리지 않는다. 끄면 예약한 알림을 모두 지운다.
 */
class IosReminderControl(private val store: KeyValueStore) : ReminderControl {
    private val center = UNUserNotificationCenter.currentNotificationCenter()
    private var last: Pair<FinanceData, LocalDate>? = null

    override val supported = true
    override var enabled by mutableStateOf(store.get("reminders") == "1")
        private set
    override var permissionDenied by mutableStateOf(false)
        private set

    override fun setEnabled(on: Boolean) {
        if (!on) {
            store.put("reminders", ""); enabled = false
            center.removeAllPendingNotificationRequests()
            return
        }
        center.requestAuthorizationWithOptions(UNAuthorizationOptionAlert or UNAuthorizationOptionSound) { granted, _ ->
            dispatch_async(dispatch_get_main_queue()) {
                if (granted) {
                    store.put("reminders", "1"); enabled = true; permissionDenied = false
                    last?.let { (d, t) -> reschedule(d, t) }
                } else permissionDenied = true
            }
        }
    }

    /** 데이터나 날짜가 바뀔 때 호출: 예약을 모두 지우고 다시 만든다. */
    fun reschedule(data: FinanceData, today: LocalDate) {
        last = data to today
        if (!enabled) return
        center.removeAllPendingNotificationRequests()
        val nowHour = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).hour
        val from = if (nowHour < HOUR) today else today.plus(DatePeriod(days = 1)) // 오늘 9시가 지났으면 내일부터
        val autoRules = data.rules.filter { it.autoComplete && it.active }.map { it.id }.toSet()
        ReminderPlanner.schedule(data.transactions, from, skip = { it.recurringId in autoRules }) { t ->
            t.memo.ifBlank { data.categoryName(t.categoryId) }
        }.forEach { (date, r) ->
            val content = UNMutableNotificationContent().apply { setTitle(r.title); setBody(r.body) }
            val at = NSDateComponents().apply {
                year = date.year.toLong(); month = date.month.number.toLong(); day = date.day.toLong(); hour = HOUR.toLong()
            }
            val trigger = UNCalendarNotificationTrigger.triggerWithDateMatchingComponents(at, repeats = false)
            center.addNotificationRequest(UNNotificationRequest.requestWithIdentifier("looin.planned.$date", content, trigger), null)
        }
    }

    private companion object { const val HOUR = 9 }
}
