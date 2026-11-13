package com.looin.finance.ui.plan

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.BudgetStatus
import com.looin.finance.core.calc.Breakdown
import com.looin.finance.core.calc.BreakdownLine
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.BudgetBar
import com.looin.finance.ui.components.CompleteDialog
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PeriodSwitcher
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.home.fmt
import com.looin.finance.ui.theme.FinanceTheme
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
    onOpenTx: (Long) -> Unit,
    onAddPlanned: (LocalDate) -> Unit,
) {
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
    val plannedInPeriod = txs.filter { !it.isCancelled && it.isPlanned && it.date in period }.sortedBy { it.date }
    val isCurrent = offset == 0
    var editing by remember { mutableStateOf<Budget?>(null) }
    var completing by remember { mutableStateOf<Transaction?>(null) }

    val totalBudget = overall?.budget?.amount ?: categoryStatuses.sumOf { it.budget.amount }
    val budgetSummary = Breakdown(
        title = "예산 확보 후 남는 금액",
        total = totalBudget - stats.expense - stats.plannedExpense,
        lines = listOf(
            BreakdownLine(if (overall != null) "전체 생활비 예산" else "카테고리 예산 합계", totalBudget, 1),
            BreakdownLine("확정 지출", stats.expense, -1),
            BreakdownLine("예정 지출", stats.plannedExpense, -1),
        ),
        formula = "예산 − 확정 지출 − 예정 지출 (예정 지출은 예산 안에서 확보, 이중 차감 없음)",
        notes = if (overall == null && categoryStatuses.isNotEmpty()) listOf("예산 없는 카테고리 지출도 확정·예정 지출에 포함됩니다.") else emptyList(),
    )

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding() + 88.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            PeriodSwitcher(
                if (isCurrent) "이번 기간" else period.label,
                "${period.basis.label} · ${period.start.year}.${period.rangeLabel}",
                onPrev = { offset-- }, onNext = { offset++ }, onToday = if (isCurrent) null else ({ offset = 0 }),
            )
        }
        item {
            SectionCard("요약") {
                MetricRow("예산 합계", totalBudget)
                MetricRow("확정 소비", stats.expense, StatisticsCalculator.expenseBreakdown(stats, data::categoryName), color = FinanceTheme.colors.expense)
                MetricRow("예정 지출", stats.plannedExpense, color = FinanceTheme.colors.planned)
                if (statuses.isNotEmpty()) {
                    MetricRow("예정 지출 확보 후 남는 예산", budgetSummary.total, budgetSummary, emphasize = true,
                        color = if (budgetSummary.total < 0) FinanceTheme.colors.warning else androidx.compose.ui.graphics.Color.Unspecified)
                } else {
                    SmallLabel("예산이 없어 예산 잔액을 계산하지 않습니다.")
                }
                if (isCurrent) {
                    val avail = AvailableFundsCalculator.calculate(data.accounts, txs, data.budgets, period)
                    MetricRow("생활비로 사용 가능한 금액", avail.amount, avail.breakdown)
                }
                val cashAccounts = data.accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }
                val proj = BalanceCalculator.projectedBreakdown(cashAccounts, txs, period.lastDay, "기간 말 예상 잔고")
                MetricRow("기간 말(${period.lastDay.monthNumber}.${period.lastDay.dayOfMonth}) 예상 잔고", proj.total, proj)
            }
        }
        item {
            SectionCard("예산", action = { TextButton(onClick = {
                editing = Budget(basis = period.basis, periodStart = period.start, periodEndExclusive = period.endExclusive, categoryId = -1, amount = 0)
            }) { Text("+ 예산 추가") } }) {
                if (statuses.isEmpty()) {
                    EmptyHint("이 기간 예산이 없습니다.")
                    OutlinedButton(onClick = { vm.copyBudgets(PeriodCalculator.previous(period, settings.paydayDay), period) }) {
                        Text("이전 기간 예산 복사")
                    }
                }
                statuses.forEachIndexed { i, s ->
                    if (i > 0) HorizontalDivider()
                    BudgetRow(s, data) { editing = s.budget }
                }
            }
        }
        item {
            SectionCard("예정 지출·수입", action = { TextButton(onClick = {
                onAddPlanned(if (state.today in period) state.today else period.start)
            }) { Text("+ 예정 추가") } }) {
                if (plannedInPeriod.isEmpty()) EmptyHint("이 기간 예정 거래가 없습니다.")
                plannedInPeriod.forEachIndexed { i, tx ->
                    if (i > 0) HorizontalDivider()
                    TransactionRow(tx, data, onClick = { onOpenTx(tx.id) }, showDate = true, onComplete = { completing = tx })
                    Row {
                        TextButton(onClick = { vm.cancelTransaction(tx.id) }) { Text("취소 처리", style = MaterialTheme.typography.labelMedium) }
                    }
                }
            }
        }
        item {
            val rows = StatisticsCalculator.planVsActual(period, data.budgets, txs)
            SectionCard("계획 대비 실제") {
                if (rows.isEmpty()) EmptyHint("비교할 데이터가 없습니다.")
                else Row {
                    Text("카테고리", Modifier.weight(1.2f), style = MaterialTheme.typography.labelMedium)
                    Text("예산", Modifier.weight(1f), style = MaterialTheme.typography.labelMedium)
                    Text("실제", Modifier.weight(1f), style = MaterialTheme.typography.labelMedium)
                    Text("차이", Modifier.weight(1f), style = MaterialTheme.typography.labelMedium)
                }
                rows.forEach { r ->
                    Row(Modifier.padding(vertical = 4.dp)) {
                        Text(data.categoryName(r.categoryId), Modifier.weight(1.2f), style = MaterialTheme.typography.bodySmall)
                        Text(if (r.budget == 0L) "-" else MoneyFormat.number(r.budget), Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        Text(MoneyFormat.number(r.actual), Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        Text(if (r.budget == 0L) "-" else MoneyFormat.number(r.difference), Modifier.weight(1f),
                            style = MaterialTheme.typography.bodySmall, color = if (r.difference < 0 && r.budget > 0) FinanceTheme.colors.warning else androidx.compose.ui.graphics.Color.Unspecified)
                    }
                }
                SmallLabel("차이 = 예산 − 실제 지출. 예정 지출은 포함하지 않습니다.")
            }
        }
    }

    editing?.let { b ->
        BudgetDialog(b, data, statuses, onDismiss = { editing = null },
            onSave = { vm.saveBudget(it) { editing = null } },
            onDelete = { vm.deleteBudget(b.id); editing = null })
    }
    completing?.let { tx ->
        CompleteDialog(tx, state.today, { completing = null }) { d, a -> completing = null; vm.completeTransaction(tx.id, d, a) }
    }
}

@Composable
private fun BudgetRow(s: BudgetStatus, data: FinanceData, onClick: () -> Unit) {
    val name = s.budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비"
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(name, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
            Text("예산 ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            AmountText(s.budget.amount, style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.height(6.dp))
        val total = s.budget.amount.coerceAtLeast(1).toFloat()
        BudgetBar(s.spent / total, s.planned / total, s.isOver)
        Spacer(Modifier.height(4.dp))
        Row {
            SmallLabel("사용 ${fmt(s.spent)} · 예정 ${fmt(s.planned)}", )
            Spacer(Modifier.weight(1f))
            SmallLabel("잔액 ${fmt(s.remaining)}", color = if (s.isOver) FinanceTheme.colors.warning else MaterialTheme.colorScheme.onSurface)
        }
        Row {
            if (s.isOver) SmallLabel("예산 초과 ${fmt(-s.remaining)}", color = FinanceTheme.colors.warning)
            else if (s.isOverWithPlanned) SmallLabel("예정 지출까지 포함하면 초과", color = FinanceTheme.colors.planned)
            Spacer(Modifier.weight(1f))
            SmallLabel("예정 확보 후 ${fmt(s.unreserved)}")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BudgetDialog(
    budget: Budget,
    data: FinanceData,
    existing: List<BudgetStatus>,
    onDismiss: () -> Unit,
    onSave: (Budget) -> Unit,
    onDelete: () -> Unit,
) {
    val isNew = budget.id == 0L
    // categoryId: -1 = 미선택(신규), null = 전체 생활비
    var categoryId by remember { mutableStateOf(budget.categoryId) }
    var text by remember { mutableStateOf(if (isNew) "" else amountToInput(budget.amount, KRW)) }
    val used = existing.map { it.budget.categoryId }.toSet()
    val amount = MoneyFormat.parse(text)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "예산 추가" else "예산 수정") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (isNew) {
                    Text("항목", style = MaterialTheme.typography.labelLarge)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (null !in used) FilterChip(categoryId == null, { categoryId = null }, label = { Text("전체 생활비") })
                        data.categories.filter { it.kind == CategoryKind.EXPENSE && !it.archived && it.id !in used }.forEach { c ->
                            FilterChip(categoryId == c.id, { categoryId = c.id }, label = { Text(c.name) })
                        }
                    }
                } else {
                    Text(budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비", style = MaterialTheme.typography.titleMedium)
                }
                AmountField(text, { text = it }, "예산 금액")
                SmallLabel("예산은 사용 한도입니다. 예정 지출은 이 한도 안에서 확보됩니다.")
                if (categoryId == null) SmallLabel("전체 생활비 예산이 있으면 사용 가능 금액 계산은 전체 예산 기준으로 하고, 카테고리 예산은 하위 한도로만 봅니다.")
            }
        },
        confirmButton = {
            TextButton(enabled = amount != null && amount >= 0 && categoryId != -1L, onClick = {
                onSave(budget.copy(categoryId = categoryId, amount = amount!!))
            }) { Text("저장") }
        },
        dismissButton = {
            Row {
                if (!isNew) TextButton(onClick = onDelete) { Text("삭제", color = MaterialTheme.colorScheme.error) }
                Spacer(Modifier.width(4.dp))
                TextButton(onClick = onDismiss) { Text("닫기") }
            }
        },
    )
}

