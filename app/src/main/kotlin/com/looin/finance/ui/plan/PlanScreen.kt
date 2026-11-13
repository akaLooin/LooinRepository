package com.looin.finance.ui.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.Breakdown
import com.looin.finance.core.calc.BreakdownLine
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.BudgetStatus
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.recurring.RecurrenceCalculator
import com.looin.finance.ui.components.typeColor
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.BreakdownSheet
import com.looin.finance.ui.components.BudgetBar
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.CompleteSheet
import com.looin.finance.ui.components.DangerButton
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.home.fmt
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.LocalDate

/**
 * 월간 돈 관리: 주 회계 기간 기준으로 예산(한도)과 예정 지출(거래)을 함께 관리한다.
 * 예산과 거래는 별개 객체이며, 예정 지출은 예산 "안에서" 확보되는 금액으로 계산한다.
 */
@Composable
fun PlanScreen(
    state: UiState,
    vm: MainViewModel,
    padding: PaddingValues,
    onOpenTx: (Transaction) -> Unit,
    onAddPlanned: (LocalDate) -> Unit,
    onOpenRule: (Long?) -> Unit = {},
) {
    val c = Looin.colors
    val data = state.data
    val settings = state.settings
    val current = state.currentPeriod
    var offset by rememberSaveable(settings.primaryBasis, settings.paydayDay) { mutableStateOf(0) }
    val period = remember(current, offset) {
        var p = current
        repeat(kotlin.math.abs(offset)) { p = if (offset > 0) PeriodCalculator.next(p, settings.paydayDay) else PeriodCalculator.previous(p, settings.paydayDay) }
        p
    }
    val txs = data.transactions
    val statuses = BudgetCalculator.statuses(data.budgets, period, txs)
    val overall = statuses.firstOrNull { it.budget.categoryId == null }
    val categoryStatuses = statuses.filter { it.budget.categoryId != null }
    val stats = StatisticsCalculator.stats(period, txs)
    val plannedInPeriod = txs.filter { it.isPlanned && it.date in period }.sortedBy { it.date }
    val isCurrent = offset == 0
    var editing by remember { mutableStateOf<Budget?>(null) }
    var completing by remember { mutableStateOf<Transaction?>(null) }
    var showSummary by remember { mutableStateOf(false) }

    val totalBudget = overall?.budget?.amount ?: categoryStatuses.sumOf { it.budget.amount }
    val left = totalBudget - stats.expense - stats.plannedExpense
    val budgetSummary = Breakdown(
        title = "예정 지출 확보 후 남는 예산",
        total = left,
        lines = listOf(
            BreakdownLine(if (overall != null) "전체 생활비 예산" else "카테고리 예산 합계", totalBudget, 1),
            BreakdownLine("확정 지출", stats.expense, -1),
            BreakdownLine("예정 지출", stats.plannedExpense, -1),
        ),
        formula = "예산 − 확정 지출 − 예정 지출 (예정 지출은 예산 안에서 확보, 이중 차감 없음)",
        notes = if (overall == null && categoryStatuses.isNotEmpty()) listOf("예산 없는 카테고리 지출도 확정·예정 지출에 포함됩니다.") else emptyList(),
    )

    LazyColumn(
        contentPadding = PaddingValues(start = GUTTER, end = GUTTER, top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding() + 40.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        item {
            PeriodSwitcher(
                if (isCurrent) "이번 기간" else period.label,
                "${period.basis.label} · ${period.start.year}.${period.rangeLabel}",
                onPrev = { offset-- }, onNext = { offset++ }, onToday = if (isCurrent) null else ({ offset = 0 }),
            )
            Spacer(Modifier.height(10.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).clickable(enabled = statuses.isNotEmpty()) { showSummary = true }.padding(vertical = 4.dp)) {
                SmallLabel(if (statuses.isEmpty()) "예산이 없어요" else "예정 지출까지 확보하고 남는 예산 ⓘ")
                AmountText(if (statuses.isEmpty()) 0 else left, style = LooinType.bigAmount, color = if (left < 0 && statuses.isNotEmpty()) c.danger else c.text)
                Row {
                    Text("예산 ${fmt(totalBudget)}  ·  쓴 돈 ", style = LooinType.body, color = c.textSecondary)
                    Text(fmt(stats.expense), style = LooinType.body, color = c.expense)
                    Text("  ·  예정 ", style = LooinType.body, color = c.textSecondary)
                    Text(fmt(stats.plannedExpense), style = LooinType.body, color = c.planned)
                }
            }
        }
        item {
            Section("요약", dot = c.accent) {
                if (isCurrent) {
                    val avail = AvailableFundsCalculator.calculate(data.accounts, txs, data.budgets, period)
                    MetricRow("생활비로 사용 가능한 금액", avail.amount, avail.breakdown)
                }
                val cashAccounts = data.accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }
                val proj = BalanceCalculator.projectedBreakdown(cashAccounts, txs, period.lastDay, "기간 말 예상 잔고")
                MetricRow("기간 말(${period.lastDay.monthNumber}.${period.lastDay.dayOfMonth}) 예상 잔고", proj.total, proj)
                MetricRow("확정 소비", stats.expense, StatisticsCalculator.expenseBreakdown(stats, data::categoryName), color = c.expense)
            }
        }
        item {
            Section("예산", dot = c.menuSoft, onAdd = {
                editing = Budget(basis = period.basis, periodStart = period.start, periodEndExclusive = period.endExclusive, categoryId = -1, amount = 0)
            }, addLabel = "예산 추가") {
                if (statuses.isEmpty()) {
                    EmptyHint("이 기간 예산이 없어요. + 로 추가하거나 지난 기간 예산을 가져오세요.")
                    ChipPill("지난 기간 예산 가져오기", false, { vm.copyBudgets(PeriodCalculator.previous(period, settings.paydayDay), period) })
                }
                statuses.forEach { s -> BudgetRow(s, data) { editing = s.budget } }
            }
        }
        item {
            Section("예정 지출·수입", dot = c.planned, onAdd = {
                onAddPlanned(if (state.today in period) state.today else period.start)
            }, addLabel = "예정 추가") {
                if (plannedInPeriod.isEmpty()) EmptyHint("이 기간 예정 거래가 없어요.")
                plannedInPeriod.forEach { tx -> TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true, onComplete = { completing = tx }) }
                if (plannedInPeriod.isNotEmpty()) SmallLabel("동그라미를 누르면 완료 처리, 줄을 누르면 수정·취소 메뉴가 열려요.")
            }
        }
        item {
            Section("반복 거래", dot = c.menuMove, onAdd = { onOpenRule(null) }, addLabel = "반복 거래 추가") {
                if (data.rules.isEmpty()) EmptyHint("월세·통신비·급여처럼 매번 같은 거래를 등록하면 예정 거래가 자동으로 생겨요.")
                data.rules.forEach { r ->
                    val next = RecurrenceCalculator.nextOccurrence(r, state.today)
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onOpenRule(r.id) }.padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(32.dp).clip(CircleShape).background(if (r.active) c.surfaceButton else c.markerEmpty), contentAlignment = Alignment.Center) {
                            Text("↻", style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), color = if (r.active) c.text else c.textMuted)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(r.name, style = LooinType.bodyLg, color = if (r.active) c.text else c.textMuted)
                            SmallLabel(r.scheduleLabel + if (!r.active) " · 꺼짐" else next?.let { " · 다음 ${it.monthNumber}.${it.dayOfMonth}" } ?: " · 끝남")
                        }
                        AmountText(if (r.type == TransactionType.EXPENSE) -r.amount else r.amount, currency = r.currency,
                            signed = r.type != TransactionType.TRANSFER, color = if (r.active) typeColor(r.type) else c.textMuted)
                    }
                }
            }
        }
        item {
            val rows = StatisticsCalculator.planVsActual(period, data.budgets, txs)
            Section("계획 대비 실제", dot = c.saturday) {
                if (rows.isEmpty()) EmptyHint("비교할 데이터가 없어요.")
                else Row(Modifier.padding(vertical = 4.dp)) {
                    listOf("카테고리" to 1.2f, "예산" to 1f, "실제" to 1f, "차이" to 1f).forEach { (t, w) ->
                        Text(t, Modifier.weight(w), style = LooinType.weekday, color = c.textMuted)
                    }
                }
                rows.forEach { r ->
                    Row(Modifier.padding(vertical = 6.dp)) {
                        Text(data.categoryName(r.categoryId), Modifier.weight(1.2f), style = LooinType.body, color = c.text)
                        Text(if (r.budget == 0L) "-" else MoneyFormat.number(r.budget), Modifier.weight(1f), style = LooinType.body, color = c.textSecondary)
                        Text(MoneyFormat.number(r.actual), Modifier.weight(1f), style = LooinType.body, color = c.text)
                        Text(if (r.budget == 0L) "-" else MoneyFormat.number(r.difference), Modifier.weight(1f), style = LooinType.body,
                            color = if (r.difference < 0 && r.budget > 0) c.danger else c.text)
                    }
                }
                SmallLabel("차이 = 예산 − 실제 지출 (예정 지출 제외)")
            }
        }
    }

    if (showSummary) BreakdownSheet(budgetSummary) { showSummary = false }
    editing?.let { b ->
        LooinSheet({ editing = null }, if (b.id == 0L) "예산 추가" else "예산 수정") {
            BudgetForm(b, data, statuses,
                onSave = { vm.saveBudget(it) { editing = null } },
                onDelete = { vm.deleteBudget(b.id); editing = null })
        }
    }
    completing?.let { tx ->
        CompleteSheet(tx, state.today, { completing = null }) { d, a -> completing = null; vm.completeTransaction(tx.id, d, a) }
    }
}

@Composable
private fun BudgetRow(s: BudgetStatus, data: FinanceData, onClick: () -> Unit) {
    val c = Looin.colors
    val name = s.budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비"
    val dot = s.budget.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: c.text
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable(onClick = onClick).padding(vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(9.dp).clip(CircleShape).background(dot))
            Spacer(Modifier.width(8.dp))
            Text(name, Modifier.weight(1f), style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            SmallLabel("잔액 ")
            AmountText(s.remaining, color = if (s.isOver) c.danger else c.text, style = LooinType.bodyLg)
        }
        Spacer(Modifier.height(8.dp))
        val total = s.budget.amount.coerceAtLeast(1).toFloat()
        BudgetBar(s.spent / total, s.planned / total, s.isOver)
        Spacer(Modifier.height(4.dp))
        Row {
            SmallLabel("예산 ${fmt(s.budget.amount)} · 사용 ${fmt(s.spent)} · 예정 ${fmt(s.planned)}", modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            when {
                s.isOver -> SmallLabel("초과 ${fmt(-s.remaining)}", color = c.danger)
                s.isOverWithPlanned -> SmallLabel("예정 포함 시 초과", color = c.planned)
                else -> SmallLabel("확보 후 ${fmt(s.unreserved)}")
            }
        }
    }
}

/** 예산 입력 폼(시트 내용). categoryId: -1 = 미선택(신규), null = 전체 생활비. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BudgetForm(
    budget: Budget,
    data: FinanceData,
    existing: List<BudgetStatus>,
    onSave: (Budget) -> Unit,
    onDelete: () -> Unit,
) {
    val c = Looin.colors
    val isNew = budget.id == 0L
    var categoryId by remember { mutableStateOf(budget.categoryId) }
    var text by remember { mutableStateOf(if (isNew) "" else amountToInput(budget.amount, KRW)) }
    val used = existing.map { it.budget.categoryId }.toSet()
    val amount = MoneyFormat.parse(text)
    val accent = categoryId?.let { id -> data.categoryById[id]?.colorArgb }?.let { Color(it) } ?: c.text
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        if (isNew) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (null !in used) ChipPill("전체 생활비", categoryId == null, { categoryId = null })
                data.categories.filter { it.kind == CategoryKind.EXPENSE && !it.archived && it.id !in used }.forEach { cat ->
                    ChipPill(cat.name, categoryId == cat.id, { categoryId = cat.id }, dot = Color(cat.colorArgb))
                }
            }
        } else {
            Text(budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비", style = LooinType.pill, color = accent)
        }
        AmountField(text, { text = it }, "예산 금액", accent = accent)
        SmallLabel("예산은 쓸 수 있는 한도예요. 예정 지출은 이 한도 안에서 확보됩니다.")
        if (categoryId == null) SmallLabel("전체 생활비 예산이 있으면 사용 가능 금액은 전체 예산 기준으로 계산하고, 카테고리 예산은 하위 한도로만 봐요.")
        PrimaryButton("저장", { onSave(budget.copy(categoryId = categoryId, amount = amount!!)) },
            enabled = amount != null && amount >= 0 && categoryId != -1L, strong = true)
        if (!isNew) DangerButton("예산 삭제", onDelete)
    }
}
