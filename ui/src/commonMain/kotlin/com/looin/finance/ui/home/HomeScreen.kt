package com.looin.finance.ui.home

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.Breakdown
import com.looin.finance.core.calc.BreakdownLine
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.calendar.CalendarGrid
import com.looin.finance.ui.calendar.startOfWeek
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.BreakdownSheet
import com.looin.finance.ui.components.BudgetBar
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.CompleteSheet
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus

fun fmt(v: Long) = MoneyFormat.format(v)

@Composable
fun HomeScreen(
    state: UiState,
    vm: MainViewModel,
    padding: PaddingValues,
    onOpenTx: (Transaction) -> Unit,
    onAddTx: (LocalDate?, TransactionType?, Boolean) -> Unit,
    onAddAccount: () -> Unit,
    onOpenPlan: () -> Unit,
    onOpenCalendar: () -> Unit,
) {
    val c = Looin.colors
    val data = state.data
    val period = state.currentPeriod
    val txs = data.transactions

    if (data.loaded && data.accounts.isEmpty()) {
        Column(Modifier.padding(padding).padding(horizontal = GUTTER, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("반가워요!", style = LooinType.monthTitle, color = c.text)
            Text("실제로 쓰는 계좌와 지금 잔고를 등록하면\n쓸 수 있는 돈과 예상 잔고를 계산해 드려요.", style = LooinType.bodyLg, color = c.textSecondary)
            SmallLabel("샘플 데이터는 만들지 않아요. 화면의 모든 숫자는 직접 입력한 실데이터입니다.")
            Spacer(Modifier.height(8.dp))
            PrimaryButton("첫 계좌 등록", onAddAccount, strong = true)
        }
        return
    }

    val available = AvailableFundsCalculator.calculate(data.accounts, txs, data.budgets, period)
    val cash = BalanceCalculator.cashBreakdown(data.accounts, txs)
    val assets = BalanceCalculator.assetSummary(data.accounts, txs)
    val stats = StatisticsCalculator.stats(period, txs)
    val statuses = BudgetCalculator.statuses(data.budgets, period, txs)
    var projectionDate by remember(period) { mutableStateOf(period.lastDay) }
    val cashAccounts = data.accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }
    val projected = BalanceCalculator.projectedBreakdown(cashAccounts, txs, projectionDate, "예상 잔고")
    val pendingExpenses = txs.filter { it.isPlanned && it.type == TransactionType.EXPENSE && it.currency == KRW && it.date < period.endExclusive }
    val pendingBreakdown = Breakdown(
        "미완료 예정 지출", pendingExpenses.sumOf { it.amount },
        pendingExpenses.sortedBy { it.date }.map {
            BreakdownLine("${it.date.korean()} ${it.memo.ifBlank { data.categoryName(it.categoryId) }}", it.amount, 1,
                if (it.date < state.today) "예정일 지남" else "")
        },
        formula = "${period.lastDay.korean()}까지 처리되지 않은 예정 지출 (지난 예정 포함)",
    )
    val upcoming = txs.filter { it.isPlanned }.sortedBy { it.date }.take(6)
    val recent = txs.filter { it.isCompleted }.sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id }).take(6)
    val budgetTotal = statuses.firstOrNull { it.budget.categoryId == null }?.budget?.amount ?: statuses.sumOf { it.budget.amount }
    val usage = if (budgetTotal > 0) (stats.expense.toFloat() / budgetTotal) else null
    val daysLeft = period.endExclusive.toEpochDays() - state.today.toEpochDays()
    var completing by remember { mutableStateOf<Transaction?>(null) }
    var showAvailable by remember { mutableStateOf(false) }
    val week = startOfWeek(state.today)
    val weekTxs = txs.filter { it.effectiveDate >= week && it.effectiveDate < week.plus(DatePeriod(days = 7)) }.groupBy { it.effectiveDate }

    LazyColumn(
        contentPadding = PaddingValues(start = GUTTER, end = GUTTER, top = padding.calculateTopPadding() + 4.dp, bottom = padding.calculateBottomPadding() + 96.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        // 머리: 예산 사용 고리 + 사용 가능 금액 + 기간 D-day (투두메이트 프로필 머리 자리)
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
                .clickable { showAvailable = true }.padding(vertical = 4.dp)
                .semantics { contentDescription = "생활비로 사용 가능한 금액 ${fmt(available.amount)}, 계산 근거 보기" }) {
                UsageRing(usage, Modifier.size(69.dp))
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    SmallLabel("생활비로 사용 가능한 금액 ⓘ")
                    AmountText(available.amount, style = LooinType.bigAmount.copy(fontSize = LooinType.monthTitle.fontSize * 1.35f),
                        color = if (available.amount < 0) c.danger else c.text)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${period.basis.label} ${period.rangeLabel}", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.text)
                        Spacer(Modifier.width(6.dp))
                        Text("D-$daysLeft", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.dday)
                    }
                }
            }
            if (AvailableFundsCalculator.includedAccounts(data.accounts).isEmpty()) {
                SmallLabel("생활비 계산 대상 계좌가 없어요. 자산 탭에서 계좌를 '생활비 계산 대상'으로 켜 주세요.", color = c.danger)
            }
        }
        // 이번 주 캘린더 줄
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("이번 주", style = LooinType.monthTitle, color = c.text, modifier = Modifier.weight(1f))
                ChipPill("캘린더 ›", false, onOpenCalendar)
            }
            Spacer(Modifier.height(10.dp))
            CalendarGrid(week, week.plus(DatePeriod(days = 7)), null, state.today, weekTxs, showAmounts = true, onSelect = { onOpenCalendar() })
        }
        item {
            Section("잔고", dot = c.accent, onAdd = onAddAccount, addLabel = "계좌 추가") {
                MetricRow("실제 보유 잔고", cash.total, cash)
                MetricRow("전체 순자산", assets.netWorth, assets.netWorthBreakdown)
                MetricRow("${projectionDate.korean()} 예상 잔고", projected.total, projected, sub = "현금성 계좌 + 그날까지의 예정 거래")
                Spacer(Modifier.height(4.dp))
                FieldGroup { DateField("예상 잔고 기준일", projectionDate, { projectionDate = it }) }
            }
        }
        item {
            Section("이번 기간", dot = c.saturday) {
                MetricRow("수입 합계", stats.income, StatisticsCalculator.incomeBreakdown(stats, data::categoryName), color = c.income)
                MetricRow("확정 소비", stats.expense, StatisticsCalculator.expenseBreakdown(stats, data::categoryName), color = c.expense)
                MetricRow("미완료 예정 지출", pendingBreakdown.total, pendingBreakdown, color = c.planned)
            }
        }
        item {
            Section("남은 예산", dot = c.menuSoft, onAdd = onOpenPlan, addLabel = "예산 관리") {
                if (statuses.isEmpty()) EmptyHint("이번 기간 예산이 없어요. + 를 눌러 돈 관리에서 만들어 보세요.")
                statuses.forEach { s ->
                    val name = s.budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비"
                    val dot = s.budget.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: c.text
                    Column(Modifier.padding(vertical = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(9.dp).clip(RoundedCornerShape(50)).background(dot))
                            Spacer(Modifier.width(8.dp))
                            Text(name, Modifier.weight(1f), style = LooinType.bodyLg, color = c.text)
                            AmountText(s.remaining, color = if (s.isOver) c.danger else c.text, style = LooinType.bodyLg)
                        }
                        Spacer(Modifier.height(6.dp))
                        val total = s.budget.amount.coerceAtLeast(1).toFloat()
                        BudgetBar(s.spent / total, s.planned / total, s.isOver)
                        Spacer(Modifier.height(3.dp))
                        SmallLabel("예산 ${fmt(s.budget.amount)} · 사용 ${fmt(s.spent)} · 예정 ${fmt(s.planned)}" + if (s.isOver) " · 초과" else "")
                    }
                }
            }
        }
        item {
            Section("예정 거래", dot = c.planned, onAdd = { onAddTx(null, TransactionType.EXPENSE, true) }, addLabel = "예정 거래 추가") {
                if (upcoming.isEmpty()) EmptyHint("예정 거래가 없어요.")
                upcoming.forEach { tx ->
                    TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true, onComplete = { completing = tx })
                    if (tx.date < state.today) SmallLabel("예정일이 지났어요 · 동그라미를 눌러 완료 처리", color = c.danger, modifier = Modifier.padding(start = 45.dp))
                }
            }
        }
        item {
            Section("최근 거래", dot = c.sunday, onAdd = { onAddTx(null, null, false) }, addLabel = "거래 추가") {
                if (recent.isEmpty()) EmptyHint("완료된 거래가 없어요. + 로 기록해 보세요.")
                recent.forEach { tx -> TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true) }
            }
        }
    }

    if (showAvailable) BreakdownSheet(available.breakdown) { showAvailable = false }
    completing?.let { tx ->
        CompleteSheet(tx, state.today, { completing = null }) { d, a -> completing = null; vm.completeTransaction(tx.id, d, a) }
    }
}

/** 예산 사용률 고리(69dp, 투두메이트 프로필 사진 자리). 예산이 없으면 빈 고리. */
@Composable
fun UsageRing(usage: Float?, modifier: Modifier) {
    val c = Looin.colors
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(69.dp)) {
            val stroke = 7.dp.toPx()
            val inset = stroke / 2
            val arcSize = Size(size.width - stroke, size.height - stroke)
            drawArc(c.markerEmpty, 0f, 360f, false, Offset(inset, inset), arcSize, style = Stroke(stroke))
            if (usage != null) {
                drawArc(if (usage > 1f) c.danger else c.accent, -90f, 360f * usage.coerceIn(0f, 1f), false,
                    Offset(inset, inset), arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(if (usage == null) "-" else "${(usage * 100).toInt()}%", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.text)
            Text("예산", style = LooinType.tiny, color = c.textMuted)
        }
    }
}
