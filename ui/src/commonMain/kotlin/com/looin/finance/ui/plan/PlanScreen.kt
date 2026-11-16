package com.looin.finance.ui.plan

import androidx.compose.foundation.background
import kotlinx.datetime.number
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
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
import com.looin.finance.core.money.AmountExpression
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PickItem
import com.looin.finance.ui.components.accountColor
import com.looin.finance.ui.components.PickerField
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
    val overall = statuses.firstOrNull { it.budget.isOverall }
    val categoryStatuses = statuses.filter { it.budget.categoryId != null }
    // 이 기간 고정 비용(반복 거래로 생긴 지출): 예산에 자동으로 더해진다
    val fixedTxs = txs.filter { it.recurringId != null && it.type == TransactionType.EXPENSE && it.currency == KRW && !it.isCancelled &&
        ((it.isCompleted && it.effectiveDate in period) || (it.isPlanned && it.date in period)) }
    val stats = StatisticsCalculator.stats(period, txs)
    val plannedInPeriod = txs.filter { it.isPlanned && it.date in period }.sortedBy { it.date }
    val isCurrent = offset == 0
    var editing by remember { mutableStateOf<Budget?>(null) }
    var completing by remember { mutableStateOf<Transaction?>(null) }
    var showSummary by remember { mutableStateOf(false) }

    // 예산 요약: 예산이 정해진 범위의 지출만(예산 밖 미분류 등은 따로 — 사용 가능 금액에서 별도로 확보되므로 여기서 깎지 않음)
    val sum = BudgetCalculator.summary(statuses, period, txs)
    val totalBudget = sum?.effective ?: 0
    val left = sum?.left ?: 0
    val budgetSummary = Breakdown(
        title = "예정 지출까지 확보하고 남는 예산",
        total = left,
        lines = buildList {
            add(BreakdownLine(if (sum?.hasOverall == true) "전체 생활비 예산(고정 비용 포함)" else "카테고리 예산 합계(고정 비용 포함)", totalBudget, 1))
            add(BreakdownLine("예산 안 확정 지출", sum?.spent ?: 0, -1))
            add(BreakdownLine("예산 안 예정 지출", sum?.planned ?: 0, -1))
            if ((sum?.outsideSpent ?: 0) > 0) add(BreakdownLine("참고: 예산 밖 확정 지출(미분류 등)", sum!!.outsideSpent, 0, "예산이 없는 카테고리"))
            if ((sum?.outsidePlanned ?: 0) > 0) add(BreakdownLine("참고: 예산 밖 예정 지출", sum!!.outsidePlanned, 0, "사용 가능 금액에서 따로 확보"))
        },
        formula = "예산 − 예산 안 확정 지출 − 예산 안 예정 지출 (예정 지출은 예산 안에서 확보, 이중 차감 없음)",
        notes = listOf("예산이 없는 카테고리·미분류 지출은 예산 여유를 깎지 않아요. 대신 '생활비로 사용 가능한 금액'에서 따로 확보돼요."),
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
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).clickable(enabled = sum != null) { showSummary = true }.padding(vertical = 4.dp)) {
                SmallLabel(if (sum == null) "예산이 없어요" else "예정 지출까지 확보하고 남는 예산 ⓘ")
                AmountText(left, style = LooinType.bigAmount, color = if (left < 0) c.danger else c.text)
                // 한 문장으로 그려 좁은 화면에서도 금액 단위로 줄바꿈되게 한다(줄바꿈 금지 공백 사용)
                Text(buildAnnotatedString {
                    append(glue("예산 ${fmt(totalBudget)}"))
                    append("  ·  ")
                    append(glue("쓴 돈 "))
                    withStyle(SpanStyle(color = c.expense)) { append(glue(fmt(sum?.spent ?: 0))) }
                    append("  ·  ")
                    append(glue("예정 "))
                    withStyle(SpanStyle(color = c.planned)) { append(glue(fmt(sum?.planned ?: 0))) }
                }, style = LooinType.body, color = c.textSecondary)
                if ((sum?.outsidePlanned ?: 0) + (sum?.outsideSpent ?: 0) > 0) SmallLabel(
                    "예산 밖(미분류 등) 지출 ${fmt(sum!!.outsideSpent)} · 예정 ${fmt(sum.outsidePlanned)}은 따로 계산해요",
                )
            }
        }
        item {
            Section("요약", dot = c.accent) {
                if (isCurrent) {
                    val avail = AvailableFundsCalculator.calculate(data.accounts, txs, data.budgets, period, data.goalStatuses)
                    MetricRow("생활비로 사용 가능한 금액", avail.amount, avail.breakdown)
                }
                val cashAccounts = data.accounts.filter { !it.archived && it.currency == KRW && it.type in BalanceCalculator.CASH_LIKE }
                val proj = BalanceCalculator.projectedBreakdown(cashAccounts, txs, period.lastDay, "기간 말 예상 잔고")
                MetricRow("기간 말(${period.lastDay.month.number}.${period.lastDay.day}) 예상 잔고", proj.total, proj)
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
                // 고정 비용: 예산에 자동 포함. 여기서는 고칠 수 없고 누르면 고정 비용 편집으로 간다
                if (fixedTxs.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    SmallLabel("고정 비용 · 예산에 자동 포함 (합계 ${fmt(fixedTxs.sumOf { it.amount })})", weight = FontWeight.SemiBold)
                    fixedTxs.groupBy { it.recurringId }.forEach { (ruleId, list) ->
                        val rule = data.rules.firstOrNull { it.id == ruleId }
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onOpenRule(ruleId) }.padding(horizontal = 4.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("↻", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.menuMove)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(rule?.name ?: list.first().memo, style = LooinType.body, color = c.text)
                                SmallLabel(data.categoryName(list.first().categoryId) + " · " +
                                    list.joinToString { "${it.date.month.number}.${it.date.day}" + if (it.isCompleted) " 완료" else " 예정" })
                            }
                            AmountText(-list.sumOf { it.amount }, signed = true, color = c.expense, style = LooinType.body)
                            Text(" ›", style = LooinType.body, color = c.textMuted)
                        }
                    }
                }
            }
        }
        item {
            Section("고정 비용", dot = c.menuMove, onAdd = { onOpenRule(null) }, addLabel = "고정 비용 추가") {
                if (data.rules.isEmpty()) EmptyHint("월세·통신비·급여처럼 매번 같은 거래를 등록하면 예정 거래가 자동으로 생기고, 지출은 예산에 자동으로 더해져요.")
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
                            SmallLabel(r.scheduleLabel + (if (r.autoComplete) " · 자동이체" else "") + if (!r.active) " · 꺼짐" else next?.let { " · 다음 ${it.month.number}.${it.day}" } ?: " · 끝남")
                        }
                        AmountText(if (r.type == TransactionType.EXPENSE) -r.amount else r.amount, currency = r.currency,
                            signed = r.type != TransactionType.TRANSFER, color = if (r.active) typeColor(r.type) else c.textMuted)
                    }
                }
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
        item { SavingsGoalsSection(data, state.today, vm) }
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
                onDelete = { vm.deleteBudget(b.id); editing = null },
                fixedFor = { BudgetCalculator.fixedIn(it, period, txs) })
        }
    }
    completing?.let { tx ->
        CompleteSheet(tx, state.today, { completing = null }) { d, a, r -> completing = null; vm.completeTransaction(tx.id, d, a, r) }
    }
}

/** 한 덩어리로 보여야 하는 글자(예: "예정 619,000원")가 중간에서 줄바꿈되지 않게 Word Joiner 로 묶는다. */
private fun glue(text: String) = text.replace(' ', '\u00A0').toList().joinToString("\u2060")

/** 예산 대상 종류. */
private enum class BudgetKind(val label: String) { ALL("전체 생활비"), CATEGORY("카테고리"), ACCOUNT("계좌") }

/**
 * 예산 입력 폼(시트 내용). categoryId: -1 = 미선택(신규).
 * 대상: 전체 생활비 / 카테고리 / 계좌(경고용). 금액 + 경고 시점. 범위 안의 고정 비용은 자동으로 더해진다([fixedFor]).
 */
@Composable
fun BudgetForm(
    budget: Budget,
    data: FinanceData,
    existing: List<BudgetStatus>,
    onSave: (Budget) -> Unit,
    onDelete: () -> Unit,
    fixedFor: (Budget) -> Long = { 0 },
) {
    val c = Looin.colors
    val isNew = budget.id == 0L
    var kind by remember {
        mutableStateOf(when { budget.accountId != null -> BudgetKind.ACCOUNT; budget.categoryId == null -> BudgetKind.ALL; else -> BudgetKind.CATEGORY })
    }
    var categoryId by remember { mutableStateOf(budget.categoryId?.takeIf { it != -1L }) }
    var accountId by remember { mutableStateOf(budget.accountId) }
    var warn by remember { mutableStateOf(budget.warnPercent) }
    var text by remember { mutableStateOf(if (isNew) "" else amountToInput(budget.amount, KRW)) }
    val usedCats = existing.filter { it.budget.id != budget.id }.mapNotNull { it.budget.categoryId }.toSet()
    val usedAccs = existing.filter { it.budget.id != budget.id }.mapNotNull { it.budget.accountId }.toSet()
    val hasOverall = existing.any { it.budget.isOverall && it.budget.id != budget.id }
    val amount = AmountExpression.parse(text)
    val draft = budget.copy(
        categoryId = if (kind == BudgetKind.CATEGORY) categoryId else null,
        accountId = if (kind == BudgetKind.ACCOUNT) accountId else null,
        amount = amount ?: 0, warnPercent = warn,
    )
    val ready = amount != null && amount >= 0 && when (kind) {
        BudgetKind.ALL -> !hasOverall
        BudgetKind.CATEGORY -> categoryId != null
        BudgetKind.ACCOUNT -> accountId != null
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        if (isNew) {
            PillTabs(BudgetKind.entries, kind, { it.label }, { kind = it })
            when (kind) {
                BudgetKind.ALL -> if (hasOverall) SmallLabel("이 기간에는 전체 생활비 예산이 이미 있어요.", color = c.danger)
                BudgetKind.CATEGORY -> PickerField("카테고리",
                    data.categories.filter { it.kind == CategoryKind.EXPENSE && !it.archived && it.id !in usedCats }.map { PickItem(it.id, it.name, Color(it.colorArgb)) },
                    categoryId, emptyList(), { categoryId = it })
                BudgetKind.ACCOUNT -> PickerField("출금 계좌",
                    data.accounts.filter { !it.archived && it.id !in usedAccs }.map { PickItem(it.id, it.name, accountColor(it)) }, accountId, emptyList(), { accountId = it })
            }
        } else {
            Text(budgetName(budget, data), style = LooinType.pill, color = c.text)
        }
        AmountField(text, { text = it }, "예산 금액 (직접 정하는 금액)", calculator = true)
        val fixed = if (ready) fixedFor(draft) else 0
        if (fixed > 0 && amount != null) SmallLabel("이 범위의 고정 비용 ${fmt(fixed)}이 자동으로 더해져 예산은 ${fmt(amount + fixed)}이 돼요.",
            color = c.textSecondary, weight = FontWeight.SemiBold)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SmallLabel("경고를 보여 줄 시점")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(70, 80, 90).forEach { p -> ChipPill("$p%", warn == p, { warn = p }) }
            }
        }
        SmallLabel(when (kind) {
            BudgetKind.ACCOUNT -> "계좌 예산은 그 계좌(예: 신용카드)에서 나간 지출을 봐요. 경고용이라 사용 가능 금액 계산에는 들어가지 않아요."
            BudgetKind.ALL -> "전체 생활비 예산이 있으면 사용 가능 금액은 전체 예산 기준으로 계산하고, 카테고리 예산은 하위 한도로만 봐요."
            BudgetKind.CATEGORY -> "예정 지출은 이 예산 안에서 확보돼요. 넘어도 저장은 되고, 경고로 알려 줘요."
        })
        PrimaryButton("저장", { onSave(draft) }, enabled = ready, strong = true)
        if (!isNew) DangerButton("예산 삭제", onDelete)
    }
}
