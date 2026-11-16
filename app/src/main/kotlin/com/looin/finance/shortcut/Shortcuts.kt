package com.looin.finance.shortcut

import android.content.Context
import android.content.Intent
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.looin.finance.MainActivity
import com.looin.finance.R
import com.looin.finance.ui.AppCommand

/**
 * 앱 아이콘을 길게 누르면 나오는 바로가기(지출 추가·수입 추가·영수증 스캔·캘린더).
 * 미리보기 빌드는 앱 ID 가 달라 정적 shortcuts.xml 대신 실행 중에 등록한다.
 */
object Shortcuts {
    const val ACTION = "com.looin.finance.action.COMMAND"
    const val EXTRA = "command"

    fun intent(context: Context, cmd: AppCommand): Intent =
        Intent(context, MainActivity::class.java).setAction(ACTION).putExtra(EXTRA, cmd.name)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    /** 인텐트에 담긴 명령(없거나 모르는 값이면 null). */
    fun commandOf(intent: Intent?): AppCommand? =
        intent?.takeIf { it.action == ACTION }?.getStringExtra(EXTRA)?.let { n -> AppCommand.entries.firstOrNull { it.name == n } }

    fun register(context: Context) {
        fun item(id: String, short: String, long: String, icon: Int, cmd: AppCommand, rank: Int) =
            ShortcutInfoCompat.Builder(context, id).setShortLabel(short).setLongLabel(long)
                .setIcon(IconCompat.createWithResource(context, icon)).setIntent(intent(context, cmd)).setRank(rank).build()
        runCatching {
            ShortcutManagerCompat.setDynamicShortcuts(context, listOf(
                item("expense", "지출 추가", "지출 기록하기", R.drawable.ic_shortcut_expense, AppCommand.NEW_EXPENSE, 0),
                item("income", "수입 추가", "수입 기록하기", R.drawable.ic_shortcut_income, AppCommand.NEW_INCOME, 1),
                item("receipt", "영수증 스캔", "영수증 찍어서 지출 기록", R.drawable.ic_shortcut_receipt, AppCommand.SCAN_RECEIPT, 2),
                item("calendar", "캘린더", "캘린더 열기", R.drawable.ic_shortcut_calendar, AppCommand.TAB_CALENDAR, 3),
            ))
        }
    }
}
