package com.looin.finance.ui.calendar

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.CompleteDialog
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.Segmented
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.AmountStyle
import com.looin.finance.ui.theme.FinanceTheme
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus

enum class CalendarFilter(val label: String) { ALL("전체"), INCOME("수입"), EXPENSE("지출"), TRANSFER("이체") }

private fun Transaction.matches(f: CalendarFilter) = when (f) {
    CalendarFilter.ALL -> true
    CalendarFilter.INCOME -> type == TransactionType.INCOME
    CalendarFilter.EXPENSE -> type == TransactionType.EXPENSE
    CalendarFilter.TRANSFER -> type == TransactionType.TRANSFER || type == TransactionType.ADJUSTMENT
}

/** 금액을 달력 칸에 맞게 줄여 표시(예: 1.2만, 350만). 정확한 금액은 아래 목록에 표시. */
private fun compact(v: Long): String = when {
    v >= 100_000_000 -> "%.1f억".format(v / 100_000_000.0).replace(".0억", "억")
    v >= 1_000_000 -> "${v / 10_000}만"
    v >= 10_000 -> "%.1f만".format(v / 10_000.0).replace(".0만", "만")
    else -> "%,d".format(v)
}

@Composable
fun CalendarScreen(
    state: UiState,
    vm: MainViewModel,
    padding: PaddingValues,
    onOpenTx: (Long) -> Unit,
    onAddTx: (LocalDate) -> Unit,
) {
    val data = state.data
    var monthStartDays by rememberSaveable { mutableStateOf(LocalDate(state.today.year, state.today.month, 1).toEpochDays()) }
    var selectedDays by rememberSaveable { mutableStateOf(state.today.toEpochDays()) }
    var filter by rememberSaveable { mutableStateOf(CalendarFilter.ALL) }
    var completing by remember { mutableStateOf<Transaction?>(null) }
    val monthStart = LocalDate.fromEpochDays(monthStartDays)
    val selected = LocalDate.fromEpochDays(selectedDays)
    val month = PeriodCalculator.periodContaining(monthStart, PeriodBasis.CALENDAR, state.settings.paydayDay)

    val monthTxs = data.transactions.filter { it.effectiveDate in month && it.matches(filter) }
    val byDay = monthTxs.groupBy { it.effectiveDate }
    val active = monthTxs.filter { !it.isCancelled && it.currency == KRW }
    val monthIncome = active.filter { it.isCompleted && it.type == TransactionType.INCOME }.sumOf { it.amount }
    val monthExpense = active.filter { it.isCompleted && it.type == TransactionType.EXPENSE }.sumOf { it.amount }
    val monthPlanned = active.filter { it.isPlanned && it.type == TransactionType.EXPENSE }.sumOf { it.amount }

    fun go(delta: Int) {
        val m = if (delta > 0) PeriodCalculator.next(month, 1) else PeriodCalculator.previous(month, 1)
        monthStartDays = m.start.toEpochDays()
        selectedDays = if (state.today in m) state.today.toEpochDays() else m.start.toEpochDays()
    }

    LazyColumn(
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding() + 88.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            PeriodSwitcher(month.label, null, onPrev = { go(-1) }, onNext = { go(1) }, onToday = {
                monthStartDays = LocalDate(state.today.year, state.today.month, 1).toEpochDays()
                selectedDays = state.today.toEpochDays()
            })
            Segmented(CalendarFilter.entries, filter, { it.label }, { filter = it })
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                Summary("수입", monthIncome, FinanceTheme.colors.income)
                Summary("지출", monthExpense, FinanceTheme.colors.expense)
                Summary("예정 지출", monthPlanned, FinanceTheme.colors.planned)
            }
        }
        item {
            MonthGrid(month.start, month.endExclusive, selected, state.today, byDay) { selectedDays = it.toEpochDays() }
        }
        item {
            val dayTxs = (byDay[selected] ?: emptyList()).sortedWith(compareBy<Transaction> { it.status.ordinal }.thenBy { it.id })
            SectionCard(selected.korean(withYear = true), action = {
                TextButton(onClick = { onAddTx(selected) }) {
                    Icon(Icons.Filled.Add, null, Modifier.size(18.dp)); Text("추가")
                }
            }) {
                if (dayTxs.isEmpty()) EmptyHint("거래가 없습니다.")
                dayTxs.forEachIndexed { i, tx ->
                    if (i > 0) HorizontalDivider()
                    TransactionRow(tx, data, onClick = { onOpenTx(tx.id) }, onComplete = { completing = tx })
                }
            }
        }
    }
    completing?.let { tx ->
        CompleteDialog(tx, state.today, { completing = null }) { d, a -> completing = null; vm.completeTransaction(tx.id, d, a) }
    }
}

@Composable
private fun Summary(label: String, amount: Long, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        AmountText(amount, color = color, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun MonthGrid(
    start: LocalDate,
    endExclusive: LocalDate,
    selected: LocalDate,
    today: LocalDate,
    byDay: Map<LocalDate, List<Transaction>>,
    onSelect: (LocalDate) -> Unit,
) {
    val c = FinanceTheme.colors
    val leading = start.dayOfWeek.let { if (it == DayOfWeek.SUNDAY) 0 else it.ordinal + 1 } // 일요일 시작
    val days = endExclusive.toEpochDays() - start.toEpochDays()
    val cells = leading + days
    val rows = (cells + 6) / 7
    Column {
        Row {
            listOf("일", "월", "화", "수", "목", "금", "토").forEachIndexed { i, d ->
                Text(d, Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.labelMedium,
                    color = when (i) { 0 -> c.expense; 6 -> c.income; else -> MaterialTheme.colorScheme.onSurfaceVariant })
            }
        }
        for (r in 0 until rows) {
            Row {
                for (col in 0 until 7) {
                    val idx = r * 7 + col - leading
                    if (idx < 0 || idx >= days) {
                        Spacer(Modifier.weight(1f).height(64.dp))
                    } else {
                        val date = start.plus(DatePeriod(days = idx))
                        val list = byDay[date].orEmpty().filter { !it.isCancelled && it.currency == KRW }
                        val inc = list.filter { it.type == TransactionType.INCOME }.sumOf { it.amount }
                        val exp = list.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
                        val hasPlanned = list.any { it.isPlanned }
                        val hasTransfer = list.any { it.type == TransactionType.TRANSFER }
                        val isSel = date == selected
                        Column(
                            Modifier.weight(1f).height(64.dp).padding(1.dp).clip(RoundedCornerShape(8.dp))
                                .then(if (isSel) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp)) else Modifier)
                                .clickable { onSelect(date) }.padding(2.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("${date.dayOfMonth}", style = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (date == today) FontWeight.ExtraBold else FontWeight.Normal,
                                    color = if (date == today) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                if (hasPlanned) Box(Modifier.padding(start = 2.dp).size(5.dp).clip(CircleShape).let {
                                    it.then(Modifier.border(1.dp, c.planned, CircleShape))
                                })
                                if (hasTransfer) Box(Modifier.padding(start = 2.dp).size(5.dp).clip(CircleShape).border(3.dp, c.transfer, CircleShape))
                            }
                            if (inc > 0) Text("+" + compact(inc), fontSize = 10.sp, color = c.income, maxLines = 1, style = AmountStyle)
                            if (exp > 0) Text("-" + compact(exp), fontSize = 10.sp, color = c.expense, maxLines = 1, style = AmountStyle)
                        }
                    }
                }
            }
        }
        Text("○ 예정 포함  ● 이체  · 금액은 줄여서 표시(정확한 금액은 아래 목록)", style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}
