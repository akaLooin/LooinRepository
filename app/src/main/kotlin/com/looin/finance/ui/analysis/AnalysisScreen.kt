package com.looin.finance.ui.analysis

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.UiState
import com.looin.finance.ui.calendar.compact
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.HBar
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 기본 분석. 같은 원본 거래를 달력 기준·월급일 기준으로 바꿔 볼 수 있다(주 기준과 별개로 선택). */
@Composable
fun AnalysisScreen(state: UiState, padding: PaddingValues) {
    val c = Looin.colors
    val data = state.data
    val payday = state.settings.paydayDay
    var basis by rememberSaveable { mutableStateOf(state.settings.primaryBasis) }
    var offset by rememberSaveable(basis) { mutableStateOf(0) }
    val period = remember(basis, offset, payday, state.today) {
        var p = PeriodCalculator.periodContaining(state.today, basis, payday)
        repeat(kotlin.math.abs(offset)) { p = if (offset > 0) PeriodCalculator.next(p, payday) else PeriodCalculator.previous(p, payday) }
        p
    }
    val txs = data.transactions
    val s = StatisticsCalculator.stats(period, txs)
    val trend = StatisticsCalculator.trend(period, 6, payday, txs)
    val planVsActual = StatisticsCalculator.planVsActual(period, data.budgets, txs).filter { it.budget > 0 }

    LazyColumn(
        contentPadding = PaddingValues(start = GUTTER, end = GUTTER, top = padding.calculateTopPadding() + 4.dp, bottom = padding.calculateBottomPadding() + 40.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        item {
            PillTabs(PeriodBasis.entries, basis, { it.label }, { basis = it })
            if (basis != state.settings.primaryBasis) {
                Spacer(Modifier.height(6.dp))
                SmallLabel("비교 조회 중이에요. 예산 관리는 주 기준(${state.settings.primaryBasis.label})으로 해요. 두 기준 합계를 더하지 마세요.")
            }
            Spacer(Modifier.height(6.dp))
            PeriodSwitcher(period.label, if (basis == PeriodBasis.PAYDAY) "급여 기준일 ${payday}일" else period.rangeLabel,
                onPrev = { offset-- }, onNext = { offset++ }, onToday = if (offset == 0) null else ({ offset = 0 }))
            Spacer(Modifier.height(6.dp))
            SmallLabel("수입 − 소비")
            AmountText(s.net, style = LooinType.bigAmount, signed = true, color = if (s.net < 0) c.expense else c.text)
        }
        item {
            Section("수입·소비", dot = c.accent) {
                MetricRow("수입", s.income, StatisticsCalculator.incomeBreakdown(s, data::categoryName), color = c.income)
                MetricRow("소비", s.expense, StatisticsCalculator.expenseBreakdown(s, data::categoryName), color = c.expense)
                if (s.plannedIncome + s.plannedExpense > 0) {
                    SmallLabel("미완료 예정: 수입 ${MoneyFormat.format(s.plannedIncome)} · 지출 ${MoneyFormat.format(s.plannedExpense)} (위 합계 미포함)")
                }
                SmallLabel("이체·저축·잔고 조정은 수입/소비에 포함하지 않아요. 원화 거래만 집계해요.")
            }
        }
        item {
            Section("카테고리별 소비", dot = c.sunday) {
                val entries = s.expenseByCategory.entries.sortedByDescending { it.value }
                if (entries.isEmpty()) EmptyHint("소비 기록이 없어요.")
                val max = entries.maxOfOrNull { it.value }?.coerceAtLeast(1) ?: 1
                entries.forEach { (cat, amount) ->
                    val color = cat?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: c.expense
                    Column(Modifier.padding(vertical = 6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(9.dp).clip(CircleShape).background(color))
                            Spacer(Modifier.width(8.dp))
                            Text(data.categoryName(cat), Modifier.weight(1f), style = LooinType.bodyLg, color = c.text)
                            SmallLabel("${(amount * 100 / s.expense.coerceAtLeast(1))}%")
                            Spacer(Modifier.width(8.dp))
                            AmountText(amount)
                        }
                        Spacer(Modifier.height(6.dp))
                        HBar(amount.toFloat() / max, color)
                    }
                }
            }
        }
        if (planVsActual.isNotEmpty()) item {
            Section("계획 대비 실제", dot = c.menuSoft) {
                planVsActual.forEach { r ->
                    Column(Modifier.padding(vertical = 6.dp)) {
                        Row {
                            Text(data.categoryName(r.categoryId), Modifier.weight(1f), style = LooinType.bodyLg, color = c.text)
                            SmallLabel("${MoneyFormat.format(r.actual)} / ${MoneyFormat.format(r.budget)}")
                        }
                        Spacer(Modifier.height(6.dp))
                        HBar(r.actual.toFloat() / r.budget, if (r.actual > r.budget) c.danger else c.positive)
                    }
                }
            }
        }
        item {
            Section("최근 6개 기간", dot = c.saturday) {
                val max = trend.maxOf { maxOf(it.income, it.expense) }.coerceAtLeast(1)
                // 세로 막대(수입 파랑·소비 빨강)
                Row(Modifier.fillMaxWidth().height(150.dp).padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
                    trend.forEach { t ->
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                            Row(Modifier.height(110.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                Bar(t.income.toFloat() / max, c.income)
                                Bar(t.expense.toFloat() / max, c.expense)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(if (basis == PeriodBasis.CALENDAR) "${t.period.start.monthNumber}월" else "${t.period.start.monthNumber}.${t.period.start.dayOfMonth}~",
                                style = LooinType.weekday, color = if (t.period == period) c.text else c.textMuted, textAlign = TextAlign.Center)
                        }
                    }
                }
                trend.reversed().forEach { t ->
                    Row(Modifier.padding(vertical = 3.dp)) {
                        Text(t.period.label, Modifier.weight(1f), style = LooinType.helper, color = c.textMuted)
                        Text("+${compact(t.income)}", style = LooinType.helper, color = c.income)
                        Text("  -${compact(t.expense)}", style = LooinType.helper, color = c.expense)
                    }
                }
                if (trend.size >= 2) {
                    val diff = s.expense - trend[trend.size - 2].expense
                    Spacer(Modifier.height(4.dp))
                    SmallLabel("직전 기간 대비 소비 ${MoneyFormat.format(diff, signed = true)}", color = c.textSecondary)
                }
            }
        }
    }
}

@Composable
private fun Bar(fraction: Float, color: Color) {
    Box(Modifier.width(10.dp).fillMaxHeight(fraction.coerceIn(0.02f, 1f)).clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)).background(color))
}
