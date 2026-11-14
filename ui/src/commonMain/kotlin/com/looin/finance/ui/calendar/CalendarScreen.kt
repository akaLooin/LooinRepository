package com.looin.finance.ui.calendar

import androidx.compose.foundation.background
import kotlinx.datetime.number
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.KRW
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.theme.CalendarDisplay
import com.looin.finance.ui.theme.ThemePrefs
import androidx.compose.foundation.layout.offset
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.CoinMarker
import com.looin.finance.ui.components.CompleteSheet
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.AddRowButton
import com.looin.finance.ui.components.AdaptiveColumns
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.OutlinePill
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.AmountStyle
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.plus

enum class CalendarFilter(val label: String) { ALL("전체"), INCOME("수입"), EXPENSE("지출"), TRANSFER("저축·이체") }

private fun Transaction.matches(f: CalendarFilter) = when (f) {
    CalendarFilter.ALL -> true
    CalendarFilter.INCOME -> type == TransactionType.INCOME
    CalendarFilter.EXPENSE -> type == TransactionType.EXPENSE
    CalendarFilter.TRANSFER -> type == TransactionType.TRANSFER || type == TransactionType.ADJUSTMENT
}

/** 달력 칸에 맞게 줄인 금액(1.2만, 350만). 정확한 금액은 아래 목록에 표시. */
fun compact(v: Long): String {
    /** 소수 첫째 자리까지 반올림, ".0" 은 생략. */
    fun oneDecimal(value: Long, unit: Long, suffix: String): String {
        val tenths = (value * 10 + unit / 2) / unit
        return if (tenths % 10 == 0L) "${tenths / 10}$suffix" else "${tenths / 10}.${tenths % 10}$suffix"
    }
    return when {
        v >= 100_000_000 -> oneDecimal(v, 100_000_000, "억")
        v >= 1_000_000 -> "${v / 10_000}만"
        v >= 10_000 -> oneDecimal(v, 10_000, "만")
        else -> com.looin.finance.core.money.MoneyFormat.number(v)
    }
}

fun startOfWeek(d: LocalDate): LocalDate = d.minus(DatePeriod(days = if (d.dayOfWeek == DayOfWeek.SUNDAY) 0 else d.dayOfWeek.ordinal + 1))

@Composable
fun CalendarScreen(
    state: UiState,
    vm: MainViewModel,
    padding: PaddingValues,
    onOpenTx: (Transaction) -> Unit,
    onAddTx: (LocalDate) -> Unit,
    /** 선택한 날짜(epoch day). 화면 밖(+ 버튼)에서도 쓰도록 앱 루트가 들고 있다. */
    selectedDays: Long = state.today.toEpochDays(),
    onSelectDays: (Long) -> Unit = {},
) {
    val c = Looin.colors
    val data = state.data
    var anchorDays by rememberSaveable { mutableStateOf(state.today.toEpochDays()) }
    var weekMode by rememberSaveable { mutableStateOf(false) }
    var filter by rememberSaveable { mutableStateOf(CalendarFilter.ALL) }
    val display = ThemePrefs.calendarDisplay
    var completing by remember { mutableStateOf<Transaction?>(null) }
    val anchor = LocalDate.fromEpochDays(anchorDays)
    val selected = LocalDate.fromEpochDays(selectedDays)
    val month = PeriodCalculator.periodContaining(anchor, PeriodBasis.CALENDAR, 1)
    val (rangeStart, rangeEnd) = if (weekMode) startOfWeek(anchor).let { it to it.plus(DatePeriod(days = 7)) } else month.start to month.endExclusive

    // 날짜별 잔고: 현금성 원화 계좌(홈의 '실제 보유 잔고'와 같은 범위)
    val cashAccounts = data.accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }
    val gridDates = remember(rangeStart, rangeEnd) {
        (0 until (rangeEnd.toEpochDays() - rangeStart.toEpochDays()).toInt()).map { rangeStart.plus(DatePeriod(days = it)) }
    }
    val balances = remember(data.transactions, data.accounts, gridDates, state.today, selected) {
        BalanceCalculator.balancesOn(cashAccounts, data.transactions, (gridDates + selected).distinct(), state.today)
    }
    val rangeTxs = data.transactions.filter { it.effectiveDate >= rangeStart && it.effectiveDate < rangeEnd && it.matches(filter) }
    val byDay = rangeTxs.groupBy { it.effectiveDate }
    val active = rangeTxs.filter { !it.isCancelled && it.currency == KRW }
    val sumIncome = active.filter { it.isCompleted && it.type == TransactionType.INCOME }.sumOf { it.amount }
    val sumExpense = active.filter { it.isCompleted && it.type == TransactionType.EXPENSE }.sumOf { it.amount }
    val sumPlanned = active.filter { it.isPlanned && it.type == TransactionType.EXPENSE }.sumOf { it.amount }

    fun go(delta: Int) {
        val next = if (weekMode) anchor.plus(DatePeriod(days = 7 * delta)) else (if (delta > 0) PeriodCalculator.next(month, 1) else PeriodCalculator.previous(month, 1)).start
        anchorDays = next.toEpochDays()
        onSelectDays(next.toEpochDays())
    }
    val title = if (weekMode) {
        val w = startOfWeek(anchor)
        "${w.year}년 ${w.month.number}월 ${(w.day - 1) / 7 + 1}주차"
    } else month.label

    // 넓은 화면(PC)에서는 왼쪽: 달력, 오른쪽: 고른 날의 거래.
    val left = mutableListOf<@Composable () -> Unit>()
    val right = mutableListOf<@Composable () -> Unit>()
        left += {
            PeriodSwitcher(title, null, onPrev = { go(-1) }, onNext = { go(1) },
                onToday = { anchorDays = state.today.toEpochDays(); onSelectDays(state.today.toEpochDays()) },
                extra = { OutlinePill(if (weekMode) "월" else "주") { weekMode = !weekMode } })
            Spacer(Modifier.height(4.dp))
            PillTabs(CalendarFilter.entries, filter, { it.label }, { filter = it })
            Spacer(Modifier.height(8.dp))
            PillTabs(CalendarDisplay.entries, display, { it.label }, { ThemePrefs.chooseCalendarDisplay(it) })
        }
        left += {
            CalendarGrid(rangeStart, rangeEnd, selected, state.today, byDay, showAmounts = true, onSelect = { onSelectDays(it.toEpochDays()) },
                display = display, balances = if (display == CalendarDisplay.BALANCE) balances else emptyMap())
        }
        left += {
            Row(Modifier.fillMaxWidth().clip(CircleShape).background(c.surfaceInput).padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                Summary("수입", sumIncome, c.income)
                Summary("지출", sumExpense, c.expense)
                Summary("예정 지출", sumPlanned, c.planned)
            }
        }
        right += {
            val dayTxs = (byDay[selected] ?: emptyList()).sortedWith(compareBy<Transaction> { it.status.ordinal }.thenBy { it.id })
            Section(selected.korean()) {
                balances[selected]?.let { b ->
                    SmallLabel((if (selected < state.today) "이날 끝 잔고 " else "이날 예상 잔고 ") + MoneyFormat.format(b) + " · 현금성 계좌",
                        color = if (b < 0) c.danger else c.textSecondary, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (dayTxs.isEmpty()) EmptyHint("이날 거래가 없어요.")
                dayTxs.forEach { tx -> TransactionRow(tx, data, onClick = { onOpenTx(tx) }, onComplete = { completing = tx }) }
                Spacer(Modifier.height(8.dp))
                // 날짜가 적힌 버튼 전체가 눌리는 영역
                AddRowButton("${selected.korean()} 수입·지출 추가", { onAddTx(selected) }, description = "이 날 거래 추가")
            }
        }
        AdaptiveColumns(left, right, mobilePadding = PaddingValues(start = GUTTER, end = GUTTER, top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding() + 96.dp), spacing = 14.dp, leftWeight = 1.25f)
    completing?.let { tx ->
        CompleteSheet(tx, state.today, { completing = null }) { d, a -> completing = null; vm.completeTransaction(tx.id, d, a) }
    }
}

@Composable
private fun Summary(label: String, amount: Long, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        SmallLabel(label)
        AmountText(amount, color = color, style = LooinType.body.copy(fontWeight = FontWeight.SemiBold))
    }
}

/**
 * 캘린더 칸: 위에 날짜(오늘 = 주 색 칸), 그 아래 상태 점.
 *  - 완료한 거래가 있으면 강조 색 점, 남은 예정이 있으면 예정 색 점 + 개수
 * 날짜 아래 표시는 [display]: 금액(수입·지출) / 잔고(그날 끝 잔고, 오늘 이후는 예상) / 점(표시 없음).
 * 반복 거래가 있는 날은 동전 오른쪽 위에 ↻ 를 붙인다.
 */
@Composable
fun CalendarGrid(
    start: LocalDate,
    endExclusive: LocalDate,
    selected: LocalDate?,
    today: LocalDate,
    byDay: Map<LocalDate, List<Transaction>>,
    showAmounts: Boolean,
    onSelect: (LocalDate) -> Unit,
    display: CalendarDisplay = if (showAmounts) CalendarDisplay.AMOUNT else CalendarDisplay.DOT,
    balances: Map<LocalDate, Long> = emptyMap(),
) {
    val c = Looin.colors
    val leading = start.dayOfWeek.let { if (it == DayOfWeek.SUNDAY) 0 else it.ordinal + 1 }
    val days = (endExclusive.toEpochDays() - start.toEpochDays()).toInt()
    val rows = (leading + days + 6) / 7
    Column {
        Row(Modifier.padding(bottom = 6.dp)) {
            listOf("일", "월", "화", "수", "목", "금", "토").forEachIndexed { i, d ->
                Text(d, Modifier.weight(1f), textAlign = TextAlign.Center, style = LooinType.weekday,
                    color = when (i) { 0 -> c.sunday; 6 -> c.saturday; else -> c.text })
            }
        }
        for (r in 0 until rows) {
            Row {
                for (col in 0 until 7) {
                    val idx = r * 7 + col - leading
                    if (idx < 0 || idx >= days) {
                        Spacer(Modifier.weight(1f))
                        continue
                    }
                    val date = start.plus(DatePeriod(days = idx))
                    val list = byDay[date].orEmpty().filter { !it.isCancelled }
                    val planned = list.count { it.isPlanned }
                    val done = list.count { it.isCompleted }
                    val krw = list.filter { it.currency == KRW && it.isCompleted }
                    val inc = krw.filter { it.type == TransactionType.INCOME }.sumOf { it.amount }
                    val exp = krw.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
                    val isToday = date == today
                    val isSel = date == selected && !isToday
                    val dayColor = when (col) { 0 -> c.sunday; 6 -> c.saturday; else -> c.text }
                    Column(
                        Modifier.weight(1f).clip(androidx.compose.foundation.shape.RoundedCornerShape(10.dp)).clickable { onSelect(date) }
                            .semantics { contentDescription = "${date.korean()}, 거래 ${list.size}건" + if (planned > 0) ", 예정 ${planned}건" else "" }
                            .padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        // 날짜: 오늘 = 주 색 칸, 선택한 날 = 옅은 주 색 칸
                        Box(
                            Modifier.size(32.dp).clip(androidx.compose.foundation.shape.RoundedCornerShape(10.dp)).background(
                                when { isToday -> c.primary; isSel -> c.primarySoft; else -> Color.Transparent },
                            ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("${date.day}", style = LooinType.date.copy(fontWeight = if (isToday || isSel) FontWeight.Bold else FontWeight.Medium),
                                color = when { isToday -> c.onPrimary; isSel -> c.primary; else -> dayColor })
                        }
                        // 상태 표시: 완료 = 강조 점, 남은 예정 = 예정 색 점 + 개수, 반복 = ↻
                        Row(Modifier.height(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            if (done > 0) Box(Modifier.size(5.dp).clip(CircleShape).background(c.accent))
                            if (planned > 0) {
                                if (done > 0) Spacer(Modifier.width(2.dp))
                                Box(Modifier.size(5.dp).clip(CircleShape).background(c.planned))
                                Text("$planned", style = LooinType.tiny, color = c.planned, modifier = Modifier.padding(start = 1.dp))
                            }
                            if (list.any { it.recurringId != null }) {
                                Text("↻", style = LooinType.tiny.copy(fontWeight = FontWeight.Bold), color = c.menuMove, modifier = Modifier.padding(start = 2.dp))
                            }
                        }
                        when (display) {
                            CalendarDisplay.AMOUNT -> {
                                Text(if (inc > 0) "+" + compact(inc) else " ", style = LooinType.tiny.merge(AmountStyle), color = c.income, maxLines = 1)
                                Text(if (exp > 0) "-" + compact(exp) else " ", style = LooinType.tiny.merge(AmountStyle), color = c.expense, maxLines = 1)
                            }
                            CalendarDisplay.BALANCE -> {
                                val b = balances[date]
                                Text(b?.let { (if (it < 0) "-" else "") + compact(kotlin.math.abs(it)) } ?: " ",
                                    style = LooinType.tiny.merge(AmountStyle), maxLines = 1,
                                    color = when { b == null -> c.textMuted; b < 0 -> c.danger; date > today -> c.textMuted; else -> c.textSecondary })
                            }
                            CalendarDisplay.DOT -> Unit
                        }
                    }
                }
            }
        }
    }
}
