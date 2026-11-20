package com.looin.finance.widget

import com.looin.finance.ui.APP_NAME
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.action.actionStartActivity as startIntent
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.shortcut.Shortcuts
import com.looin.finance.ui.AppCommand
import com.looin.finance.ui.platform.AndroidKeyValueStore

/** 위젯에 보일 값(계산은 앱 화면과 같은 :core 계산기). */
data class WidgetSummary(
    val available: Long?,
    val spent: Long?,
    val periodLabel: String,
    val daysLeft: Long,
    val locked: Boolean,
    val hasAccounts: Boolean,
)

object WidgetData {
    suspend fun load(context: Context): WidgetSummary {
        val repo = (context.applicationContext as LooinApp).repository
        val d = repo.snapshot()
        val today = repo.today()
        val period = PeriodCalculator.periodContaining(today, d.settings.primaryBasis, d.settings.paydayDay)
        // 앱 잠금을 켰으면 홈 화면에 금액을 보이지 않는다(누구나 볼 수 있으므로)
        val locked = AndroidKeyValueStore(context).get("lock.hash").orEmpty().isNotEmpty()
        // 앱 홈과 같은 메인 숫자: 지금 쓸 수 있는 금액(남은 예산은 떼어 두지 않음)
        val available = AvailableFundsCalculator.calculate(d.accounts, d.transactions, d.budgets, period, d.goalStatuses).withoutBudgetLeft
        val spent = StatisticsCalculator.stats(period, d.transactions).expense
        return WidgetSummary(
            available = if (locked) null else available, spent = if (locked) null else spent,
            periodLabel = period.rangeLabel, daysLeft = period.endExclusive.toEpochDays() - today.toEpochDays(),
            locked = locked, hasAccounts = d.accounts.any { !it.archived },
        )
    }
}

/**
 * 홈 화면 위젯(4×2 기본, 크기 조절 가능): 생활비로 지금 쓸 수 있는 금액, 이번 기간 소비, D-day,
 * [+ 지출] [+ 수입] 버튼(앱 바로가기와 같은 명령). 나머지 영역을 누르면 앱을 연다.
 */
class LooinWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = WidgetData.load(context)
        provideContent { WidgetContent(context, s) }
    }
}

/** 위젯 화면(테스트에서도 그려 본다). */
@Composable
internal fun WidgetContent(context: Context, s: WidgetSummary) {
    val bg = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF171B22))
    val text = ColorProvider(day = Color(0xFF17202B), night = Color(0xFFEEF1F5))
    val muted = ColorProvider(day = Color(0xFF677080), night = Color(0xFF8B94A1))
    val primary = ColorProvider(day = Color(0xFF1F3A5F), night = Color(0xFF8DB8FF))
    val onPrimary = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF0E1116))
    val expense = ColorProvider(day = Color(0xFFE0484D), night = Color(0xFFFF6B6E))
    Column(
        GlanceModifier.fillMaxSize().background(bg).cornerRadius(20.dp).padding(16.dp)
            .clickable(actionStartActivity<MainActivity>()),
    ) {
        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("$APP_NAME · ${s.periodLabel}", style = TextStyle(color = muted, fontSize = 12.sp), modifier = GlanceModifier.defaultWeight())
            Text("D-${s.daysLeft}", style = TextStyle(color = expense, fontSize = 12.sp, fontWeight = FontWeight.Bold))
        }
        Spacer(GlanceModifier.height(6.dp))
        Text(if (s.locked) "잠금 중" else "생활비로 지금 쓸 수 있는 돈", style = TextStyle(color = muted, fontSize = 12.sp))
        Text(
            when {
                !s.hasAccounts -> "계좌를 등록하세요"
                s.available == null -> "앱에서 확인"
                else -> MoneyFormat.format(s.available)
            },
            style = TextStyle(color = if ((s.available ?: 0) < 0) expense else text, fontSize = 24.sp, fontWeight = FontWeight.Bold),
        )
        s.spent?.let { Text("이번 기간 소비 ${MoneyFormat.format(it)}", style = TextStyle(color = muted, fontSize = 12.sp)) }
        Spacer(GlanceModifier.defaultWeight())
        Row(GlanceModifier.fillMaxWidth()) {
            WidgetButton("+ 지출", primary, onPrimary, GlanceModifier.defaultWeight()
                .clickable(startIntent(Shortcuts.intent(context, AppCommand.NEW_EXPENSE))))
            Spacer(GlanceModifier.width(8.dp))
            WidgetButton("+ 수입", bg, primary, GlanceModifier.defaultWeight()
                .clickable(startIntent(Shortcuts.intent(context, AppCommand.NEW_INCOME))))
        }
    }
}

@Composable
private fun WidgetButton(label: String, bg: androidx.glance.unit.ColorProvider, fg: androidx.glance.unit.ColorProvider, modifier: GlanceModifier) {
    Box(modifier.height(40.dp).background(bg).cornerRadius(12.dp), contentAlignment = Alignment.Center) {
        Text(label, style = TextStyle(color = fg, fontSize = 14.sp, fontWeight = FontWeight.Bold))
    }
}

class LooinWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LooinWidget()
}
