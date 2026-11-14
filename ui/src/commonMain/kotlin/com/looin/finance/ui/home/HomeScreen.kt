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
import com.looin.finance.ui.components.Card
import com.looin.finance.ui.components.AdaptiveColumns
import com.looin.finance.ui.components.HBar
import com.looin.finance.ui.components.TextAction
import androidx.compose.foundation.border
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import com.looin.finance.ui.theme.ThemePrefs
import com.looin.finance.ui.platform.LocalFileActions
import com.looin.finance.ui.platform.LocalAppInfo
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
    val files = LocalFileActions.current
    val appInfo = LocalAppInfo.current
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

    val available = AvailableFundsCalculator.calculate(data.accounts, txs, data.budgets, period, data.goalStatuses)
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

    // 넓은 화면(PC)에서는 왼쪽: 요약·입력·거래, 오른쪽: 예산·잔고. 휴대폰에서는 이 순서대로 한 줄.
    val left = mutableListOf<@Composable () -> Unit>()
    val right = mutableListOf<@Composable () -> Unit>()
        // 1) 요약: 사용 가능 금액 · 기간 · 예산 사용 · 이번 기간 수입/소비/예정
        left += {
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${period.basis.label} ${period.rangeLabel}", style = LooinType.body.copy(fontWeight = FontWeight.SemiBold), color = c.textSecondary,
                        modifier = Modifier.weight(1f))
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(c.dday.copy(alpha = 0.12f)).padding(horizontal = 8.dp, vertical = 3.dp)) {
                        Text("D-$daysLeft", style = LooinType.helper.copy(fontWeight = FontWeight.Bold), color = c.dday)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { showAvailable = true }
                    .semantics(mergeDescendants = true) { contentDescription = "생활비로 사용 가능한 금액 ${fmt(available.amount)}, 계산 근거 보기" }) {
                    SmallLabel("생활비로 사용 가능한 금액 ⓘ")
                    AmountText(available.amount, style = LooinType.bigAmount, color = if (available.amount < 0) c.danger else c.text)
                }
                if (AvailableFundsCalculator.includedAccounts(data.accounts).isEmpty()) {
                    SmallLabel("생활비 계산 대상 계좌가 없어요. 자산 탭에서 계좌를 '생활비 계산 대상'으로 켜 주세요.", color = c.danger)
                }
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SmallLabel(if (usage == null) "예산 없음" else "예산 ${(usage * 100).toInt()}% 사용", modifier = Modifier.weight(1f))
                    if (budgetTotal > 0) SmallLabel("예산 ${fmt(budgetTotal)}")
                }
                Spacer(Modifier.height(6.dp))
                HBar(usage ?: 0f, if ((usage ?: 0f) > 1f) c.danger else c.accent)
                Spacer(Modifier.height(14.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).background(c.divider))
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth()) {
                    MiniStat("수입", stats.income, c.income, StatisticsCalculator.incomeBreakdown(stats, data::categoryName), Modifier.weight(1f))
                    MiniStat("확정 소비", stats.expense, c.expense, StatisticsCalculator.expenseBreakdown(stats, data::categoryName), Modifier.weight(1f))
                    MiniStat("미완료 예정 지출", pendingBreakdown.total, c.planned, pendingBreakdown, Modifier.weight(1f))
                }
            }
        }
        // 백업 알림(필요할 때만)
        BackupReminder.message(txs, state.today, ThemePrefs.lastBackupDay, ThemePrefs.backupSnoozeUntil)?.let { msg ->
            left += {
                Card {
                    Text(msg, style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.text)
                    SmallLabel("데이터는 이 기기에만 있어요. 휴대폰을 잃어버리거나 앱을 지우면 사라지니 백업 파일을 만들어 안전한 곳에 두세요.")
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PrimaryButton("지금 백업", {
                            files.saveText("looin-backup-${state.today}.json") { write -> vm.exportBackup("${appInfo.versionName} (${appInfo.platform.label})", write) }
                        }, Modifier.weight(1f), strong = true)
                        PrimaryButton("${BackupReminder.SNOOZE_DAYS}일 뒤에", {
                            ThemePrefs.snoozeBackup(state.today.toEpochDays() + BackupReminder.SNOOZE_DAYS)
                        }, Modifier.weight(1f))
                    }
                }
            }
        }
        // 2) 빠른 입력
        left += {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickAdd("지출", c.expense, Modifier.weight(1f)) { onAddTx(null, TransactionType.EXPENSE, false) }
                QuickAdd("수입", c.income, Modifier.weight(1f)) { onAddTx(null, TransactionType.INCOME, false) }
                QuickAdd("저축 및 이체", c.transfer, Modifier.weight(1f)) { onAddTx(null, TransactionType.TRANSFER, false) }
            }
        }
        // 3) 예정 거래
        left += {
            Section("예정 거래", dot = c.planned, onAdd = { onAddTx(null, TransactionType.EXPENSE, true) }, addLabel = "예정 거래 추가") {
                if (upcoming.isEmpty()) EmptyHint("예정 거래가 없어요.")
                upcoming.forEach { tx ->
                    TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true, onComplete = { completing = tx })
                    if (tx.date < state.today) SmallLabel("예정일이 지났어요 · 동그라미를 눌러 완료 처리", color = c.danger, modifier = Modifier.padding(start = 45.dp))
                }
            }
        }
        // 4) 최근 거래
        left += {
            Section("최근 거래", dot = c.expense, onAdd = { onAddTx(null, null, false) }, addLabel = "거래 추가",
                trailing = { TextAction("캘린더 ›", onOpenCalendar, color = c.textMuted) }) {
                if (recent.isEmpty()) EmptyHint("완료된 거래가 없어요. + 로 기록해 보세요.")
                recent.forEach { tx -> TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true) }
            }
        }
        // 5) 남은 예산
        right += {
            Section("남은 예산", dot = c.accent, onAdd = onOpenPlan, addLabel = "예산 관리") {
                if (statuses.isEmpty()) EmptyHint("이번 기간 예산이 없어요. 추가를 눌러 돈 관리에서 만들어 보세요.")
                statuses.forEach { s ->
                    val name = s.budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비"
                    val dot = s.budget.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: c.primary
                    Column(Modifier.padding(horizontal = 4.dp, vertical = 8.dp)) {
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
        // 6) 잔고
        right += {
            Section("잔고", dot = c.income, onAdd = onAddAccount, addLabel = "계좌 추가") {
                MetricRow("실제 보유 잔고", cash.total, cash)
                MetricRow("전체 순자산", assets.netWorth, assets.netWorthBreakdown)
                MetricRow("${projectionDate.korean()} 예상 잔고", projected.total, projected, sub = "현금성 계좌 + 그날까지의 예정 거래")
                Spacer(Modifier.height(4.dp))
                FieldGroup { DateField("예상 잔고 기준일", projectionDate, { projectionDate = it }) }
            }
        }
        AdaptiveColumns(left, right, mobilePadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding() + 4.dp, bottom = padding.calculateBottomPadding() + 96.dp))

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

/** 요약 카드 아래 작은 지표: 누르면 계산 근거. */
@Composable
private fun MiniStat(label: String, amount: Long, color: Color, breakdown: Breakdown, modifier: Modifier) {
    var show by remember { mutableStateOf(false) }
    Column(modifier.clip(RoundedCornerShape(10.dp)).clickable { show = true }.padding(vertical = 4.dp, horizontal = 2.dp)) {
        SmallLabel(label)
        AmountText(amount, color = color, style = LooinType.body.copy(fontWeight = FontWeight.Bold))
    }
    if (show) BreakdownSheet(breakdown) { show = false }
}

/** 빠른 입력 버튼: 유형을 골라 둔 채 입력 화면을 연다. */
@Composable
private fun QuickAdd(label: String, color: Color, modifier: Modifier, onClick: () -> Unit) {
    val c = Looin.colors
    Row(
        modifier.height(46.dp).clip(RoundedCornerShape(12.dp)).background(c.card).border(1.dp, c.cardBorder, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick).semantics(mergeDescendants = true) { contentDescription = "$label 추가" },
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center,
    ) {
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(color))
        Spacer(Modifier.width(6.dp))
        Text("+ $label", style = LooinType.body.copy(fontWeight = FontWeight.SemiBold), color = c.text, maxLines = 1)
    }
}
