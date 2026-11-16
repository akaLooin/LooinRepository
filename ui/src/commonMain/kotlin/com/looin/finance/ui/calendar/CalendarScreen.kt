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
import kotlinx.coroutines.launch
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.pager.HorizontalPager
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
import androidx.compose.foundation.shape.RoundedCornerShape
import com.looin.finance.ui.components.typeColor
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

/** 모아 보기 방식. */
enum class CalendarGrouping(val label: String) { DATE("날짜순"), TYPE("유형별"), CATEGORY("카테고리별") }

private const val PAGE_COUNT = 2401
private const val CENTER_PAGE = 1200

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
    var weekMode by rememberSaveable { mutableStateOf(false) }
    // 좌우로 밀어 이전·다음 달(주)로: 오늘이 있는 달(주)을 가운데 페이지로 두고 앞뒤로 넉넉히
    val todayMonth = LocalDate(state.today.year, state.today.month, 1)
    fun pageStart(page: Int): LocalDate = if (weekMode) startOfWeek(state.today).plus(DatePeriod(days = 7 * (page - CENTER_PAGE)))
        else todayMonth.plus(DatePeriod(months = page - CENTER_PAGE))
    var savedPage by rememberSaveable(weekMode) { mutableStateOf(CENTER_PAGE) }
    val pager = rememberPagerState(initialPage = savedPage) { PAGE_COUNT }
    val scope = rememberCoroutineScope()
    var anchorDays by remember(weekMode) { mutableStateOf(pageStart(savedPage).toEpochDays()) }
    // 밀어서 넘기면 그 달(주)을 기준으로: 오늘이 있으면 오늘, 아니면 첫날을 고른다
    LaunchedEffect(pager, weekMode) {
        snapshotFlow { pager.settledPage }.collect { page ->
            if (page == savedPage && anchorDays == pageStart(page).toEpochDays()) return@collect
            savedPage = page
            val start = pageStart(page)
            anchorDays = start.toEpochDays()
            val end = if (weekMode) start.plus(DatePeriod(days = 7)) else start.plus(DatePeriod(months = 1))
            onSelectDays((if (state.today >= start && state.today < end) state.today else start).toEpochDays())
        }
    }
    var filter by rememberSaveable { mutableStateOf(CalendarFilter.ALL) }
    var grouping by rememberSaveable { mutableStateOf(CalendarGrouping.TYPE) }
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

    // 버튼(‹ › 오늘)은 애니메이션 없이 즉시 넘어간다. 손가락으로 밀 때만 부드럽게
    fun go(delta: Int) { scope.launch { pager.scrollToPage(pager.currentPage + delta) } }
    val title = if (weekMode) {
        val w = startOfWeek(anchor)
        "${w.year}년 ${w.month.number}월 ${(w.day - 1) / 7 + 1}주차"
    } else month.label

    // 넓은 화면(PC)에서는 왼쪽: 달력, 오른쪽: 고른 날의 거래.
    val left = mutableListOf<@Composable () -> Unit>()
    val right = mutableListOf<@Composable () -> Unit>()
        left += {
            PeriodSwitcher(title, null, onPrev = { go(-1) }, onNext = { go(1) },
                onToday = { scope.launch { pager.scrollToPage(CENTER_PAGE) }; onSelectDays(state.today.toEpochDays()) },
                extra = { OutlinePill(if (weekMode) "월" else "주") { weekMode = !weekMode } })
            Spacer(Modifier.height(4.dp))
            PillTabs(CalendarFilter.entries, filter, { it.label }, { filter = it })
            Spacer(Modifier.height(8.dp))
            PillTabs(CalendarDisplay.entries, display, { it.label }, { ThemePrefs.chooseCalendarDisplay(it) })
        }
        left += {
            HorizontalPager(pager, Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top, key = { it }) { page ->
                // 페이지마다 그 달(주)의 칸·거래·잔고
                val ps = pageStart(page)
                val pe = if (weekMode) ps.plus(DatePeriod(days = 7)) else ps.plus(DatePeriod(months = 1))
                val pageTxs = data.transactions.filter { it.effectiveDate >= ps && it.effectiveDate < pe && it.matches(filter) }.groupBy { it.effectiveDate }
                val pageBalances = if (display != CalendarDisplay.BALANCE) emptyMap() else remember(data.transactions, data.accounts, ps, state.today) {
                    val days = (0 until (pe.toEpochDays() - ps.toEpochDays()).toInt()).map { ps.plus(DatePeriod(days = it)) }
                    BalanceCalculator.balancesOn(cashAccounts, data.transactions, days, state.today)
                }
                CalendarGrid(ps, pe, selected, state.today, pageTxs, showAmounts = true, onSelect = { onSelectDays(it.toEpochDays()) },
                    display = display, balances = pageBalances)
            }
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
        // 이번 달(주) 거래를 유형별·카테고리별로 모아 보기(위의 수입/지출/저축 필터도 함께 적용)
        right += {
            Section(if (weekMode) "이번 주 모아 보기" else "${anchor.month.number}월 모아 보기", dot = c.primary) {
                PillTabs(CalendarGrouping.entries, grouping, { it.label }, { grouping = it })
                Spacer(Modifier.height(8.dp))
                GroupedTransactions(rangeTxs, data, grouping, onOpenTx)
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

/**
 * 거래 모아 보기. 그룹 머리(이름·건수·합계)를 누르면 그 안의 거래가 펼쳐진다. 취소한 거래는 합계·목록에서 뺀다.
 *  - 날짜순: 날마다(펼친 채로)
 *  - 유형별: 수입 / 지출 / 저축 및 이체 / 잔고 조정
 *  - 카테고리별: 식비·교통… (수입 카테고리는 +, 지출은 −, 많은 순). 이체는 "저축 및 이체"로 묶음
 */
@Composable
fun GroupedTransactions(txs: List<Transaction>, data: com.looin.finance.data.FinanceData, grouping: CalendarGrouping, onOpenTx: (Transaction) -> Unit) {
    val c = Looin.colors
    val live = txs.filter { !it.isCancelled }
    if (live.isEmpty()) { EmptyHint("이 기간 거래가 없어요."); return }
    data class Group(val key: String, val title: String, val dot: Color, val items: List<Transaction>) {
        // 합계는 확정(완료) 거래만, 예정은 따로(확정과 섞지 않음)
        val net: Long get() = items.filter { it.currency == KRW && it.isCompleted }.sumOf { signedAmount(it) }
        val plannedNet: Long get() = items.filter { it.currency == KRW && it.isPlanned }.sumOf { signedAmount(it) }
    }
    val groups: List<Group> = when (grouping) {
        CalendarGrouping.DATE -> live.groupBy { it.effectiveDate }.toList().sortedBy { it.first }
            .map { (d, l) -> Group(d.toString(), d.korean(), c.textMuted, l) }
        CalendarGrouping.TYPE -> live.groupBy { it.type }.toList().sortedBy { it.first.ordinal }
            .map { (t, l) -> Group(t.name, t.label, typeColor(t), l) }
        CalendarGrouping.CATEGORY -> live.groupBy { if (it.type == TransactionType.INCOME || it.type == TransactionType.EXPENSE) "c${it.categoryId}" else "t${it.type}" }
            .map { (k, l) ->
                val t = l.first()
                val cat = t.categoryId?.let { data.categoryById[it] }
                val title = when {
                    t.type == TransactionType.TRANSFER -> "저축 및 이체"
                    t.type == TransactionType.ADJUSTMENT -> "잔고 조정"
                    cat != null -> cat.name + if (t.type == TransactionType.INCOME) " (수입)" else ""
                    else -> "미분류" + if (t.type == TransactionType.INCOME) " (수입)" else ""
                }
                Group(k, title, cat?.let { Color(it.colorArgb) } ?: typeColor(t.type), l)
            }.sortedByDescending { kotlin.math.abs(it.net) + kotlin.math.abs(it.plannedNet) }
    }
    var open by remember(grouping) { mutableStateOf(if (grouping == CalendarGrouping.DATE) groups.map { it.key }.toSet() else emptySet()) }
    Column { groups.forEach { g ->
        val expanded = g.key in open
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { open = if (expanded) open - g.key else open + g.key }
            .padding(horizontal = 4.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(9.dp).clip(CircleShape).background(g.dot))
            Spacer(Modifier.width(8.dp))
            Text(g.title, style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold), color = c.text, modifier = Modifier.weight(1f))
            SmallLabel("${g.items.size}건  ")
            Column(horizontalAlignment = Alignment.End) {
                AmountText(g.net, signed = g.items.any { it.type != TransactionType.TRANSFER }, style = LooinType.body,
                    color = if (g.net < 0) c.expense else if (g.items.all { it.type == TransactionType.TRANSFER }) c.transfer else c.income)
                if (g.plannedNet != 0L) SmallLabel("예정 ${MoneyFormat.format(g.plannedNet, signed = g.items.any { it.type != TransactionType.TRANSFER })}", color = c.planned)
            }
            Text(if (expanded) " ▴" else " ▾", style = LooinType.body, color = c.textMuted)
        }
        if (expanded) g.items.sortedWith(compareBy<Transaction> { it.effectiveDate }.thenBy { it.id }).forEach { tx ->
            TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = grouping != CalendarGrouping.DATE)
        }
    } }
}

/** 모아 보기 합계용 부호: 수입 +, 지출 −, 이체는 옮긴 금액(+), 조정은 증감. */
private fun signedAmount(t: Transaction): Long = when (t.type) {
    TransactionType.INCOME -> t.amount
    TransactionType.EXPENSE -> -t.amount
    TransactionType.ADJUSTMENT -> if (t.toAccountId != null) t.amount else -t.amount
    else -> t.amount
}
