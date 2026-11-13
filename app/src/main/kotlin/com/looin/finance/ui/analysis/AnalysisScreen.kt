package com.looin.finance.ui.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.HBar
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.Segmented
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.theme.FinanceTheme

/**
 * 기본 분석. 같은 원본 거래를 달력 기준·월급일 기준으로 바꿔 볼 수 있다(주 기준과 별개로 선택).
 */
@Composable
fun AnalysisScreen(state: UiState, padding: PaddingValues) {
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
    val c = FinanceTheme.colors

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding() + 8.dp, bottom = padding.calculateBottomPadding() + 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Segmented(PeriodBasis.entries, basis, { it.label }, { basis = it })
            if (basis != state.settings.primaryBasis) {
                SmallLabel("비교 조회 중입니다. 예산 관리는 주 기준(${state.settings.primaryBasis.label})으로 합니다. 두 기준 합계를 더하지 마세요.")
            }
            PeriodSwitcher(period.label, if (basis == PeriodBasis.PAYDAY) "급여 기준일 ${payday}일" else period.rangeLabel,
                onPrev = { offset-- }, onNext = { offset++ }, onToday = if (offset == 0) null else ({ offset = 0 }))
        }
        item {
            SectionCard("수입·소비") {
                MetricRow("수입", s.income, StatisticsCalculator.incomeBreakdown(s, data::categoryName), color = c.income)
                MetricRow("소비", s.expense, StatisticsCalculator.expenseBreakdown(s, data::categoryName), color = c.expense)
                MetricRow("수입 − 소비", s.net, emphasize = true)
                if (s.plannedIncome + s.plannedExpense > 0) {
                    SmallLabel("미완료 예정: 수입 ${MoneyFormat.format(s.plannedIncome)} · 지출 ${MoneyFormat.format(s.plannedExpense)} (위 합계 미포함)")
                }
                SmallLabel("이체·저축·잔고 조정은 수입/소비에 포함하지 않습니다. 원화 거래만 집계합니다.")
            }
        }
        item {
            SectionCard("카테고리별 소비") {
                val entries = s.expenseByCategory.entries.sortedByDescending { it.value }
                if (entries.isEmpty()) EmptyHint("소비 기록이 없습니다.")
                val max = entries.maxOfOrNull { it.value }?.coerceAtLeast(1) ?: 1
                entries.forEach { (cat, amount) ->
                    val color = cat?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: c.expense
                    Column(Modifier.padding(vertical = 5.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(data.categoryName(cat), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                            SmallLabel("${(amount * 100 / s.expense.coerceAtLeast(1))}%")
                            Spacer(Modifier.width(8.dp))
                            AmountText(amount, style = MaterialTheme.typography.bodyMedium)
                        }
                        Spacer(Modifier.height(3.dp))
                        HBar(amount.toFloat() / max, color)
                    }
                }
            }
        }
        if (planVsActual.isNotEmpty()) item {
            SectionCard("계획 대비 실제 지출") {
                planVsActual.forEach { r ->
                    Column(Modifier.padding(vertical = 5.dp)) {
                        Row {
                            Text(data.categoryName(r.categoryId), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                            SmallLabel("${MoneyFormat.format(r.actual)} / ${MoneyFormat.format(r.budget)}")
                        }
                        HBar(r.actual.toFloat() / r.budget, if (r.actual > r.budget) c.warning else MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
        item {
            SectionCard("최근 6개 기간 변화") {
                val max = trend.maxOf { maxOf(it.income, it.expense) }.coerceAtLeast(1)
                trend.forEach { t ->
                    Column(Modifier.padding(vertical = 5.dp)) {
                        Row {
                            Text(if (basis == PeriodBasis.CALENDAR) "${t.period.start.year % 100}.${t.period.start.monthNumber}월" else t.period.rangeLabel,
                                Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                            SmallLabel("수입 ${MoneyFormat.number(t.income)} · 소비 ${MoneyFormat.number(t.expense)}")
                        }
                        HBar(t.income.toFloat() / max, c.income)
                        Spacer(Modifier.height(2.dp))
                        HBar(t.expense.toFloat() / max, c.expense)
                    }
                }
                if (trend.size >= 2) {
                    val prev = trend[trend.size - 2]
                    val diff = s.expense - prev.expense
                    SmallLabel("직전 기간 대비 소비 ${MoneyFormat.format(diff, signed = true)}")
                }
            }
        }
    }
}
