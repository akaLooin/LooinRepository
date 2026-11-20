package com.looin.finance.ui.home

import kotlinx.datetime.number
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.AppIcons
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material3.Icon
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
import com.looin.finance.ui.plan.BudgetRow
import com.looin.finance.core.calc.BalanceForecast
import com.looin.finance.core.calc.QuickEntries
import com.looin.finance.ui.platform.LocalReceiptScanner
import com.looin.finance.ui.components.accountColor
import com.looin.finance.ui.components.typeColor
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
    /** 이 거래 내용을 복사해 새로 입력(자주 쓰는 거래 칩). */
    onCopyTx: (Long) -> Unit = {},
    /** 영수증을 찍어 바로 지출 입력(지원하는 기기만). */
    onScanReceipt: () -> Unit = {},
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
    val assets = BalanceCalculator.assetSummary(data.accounts, txs, com.looin.finance.ui.components.liveRates())
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
    // 가장 가까운 예정 거래 3개(지난 미처리 예정이 있으면 그것부터). 나머지는 "외 N건"
    val allPlanned = txs.filter { it.isPlanned }.sortedBy { it.date }
    val upcoming = allPlanned.take(3)
    val recent = txs.filter { it.isCompleted }.sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id }).take(6)
    // 예산 사용률: 예산이 정해진 범위의 지출만(예산 밖 미분류 등은 넣지 않음, 계좌 예산 제외, 고정 비용 포함)
    val budgetSum = BudgetCalculator.summary(statuses, period, txs)
    val budgetTotal = budgetSum?.effective ?: 0
    val usage = budgetSum?.usage
    val daysLeft = period.endExclusive.toEpochDays() - state.today.toEpochDays()
    var completing by remember { mutableStateOf<Transaction?>(null) }
    var showAvailable by remember { mutableStateOf(false) }
    var showSplit by remember { mutableStateOf(false) }
    var showCurrent by remember { mutableStateOf(false) }
    var showPayday by remember { mutableStateOf(false) }
    val regularPayday = AvailableFundsCalculator.nextRegularPayday(state.today, state.settings.paydayDay)
    val paydayAnswer = ThemePrefs.paydayAnswers[regularPayday.toEpochDays().toLong()]?.let { LocalDate.fromEpochDays(it) }
    val payday = AvailableFundsCalculator.untilPayday(data.accounts, txs, state.today, state.settings.paydayDay, data.goalStatuses,
        basis = ThemePrefs.dailyBasis, includeDaily = ThemePrefs.includeDailyEstimate, paydayOverride = paydayAnswer)

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
                // 메인: 지금 상황(잔고 − 예정 지출·이체·저축 목표). 남은 예산은 떼어 두지 않는다
                val current = available.withoutBudgetLeft
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { showCurrent = true }
                    .semantics(mergeDescendants = true) { contentDescription = "생활비로 지금 쓸 수 있는 금액 ${fmt(current)}, 계산 근거 보기" }) {
                    SmallLabel("생활비로 지금 쓸 수 있는 금액 ⓘ")
                    AmountText(current, style = LooinType.bigAmount, color = if (current < 0) c.danger else c.text)
                }
                Spacer(Modifier.height(10.dp))
                // 따로: 예산을 다 쓴다면(예산별 나눔 막대) · 다음 월급 전까지 예상
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(c.surfaceInput).padding(horizontal = 12.dp, vertical = 6.dp)) {
                    if (available.shares.isNotEmpty()) {
                        ScenarioRow("예산을 다 쓴다면", available.amount, "예산별 보기 ›") { showSplit = true }
                        AvailableSplitBar(available, data)
                        Spacer(Modifier.height(6.dp))
                    }
                    ScenarioRow("다음 월급(${payday.nextPayday.month.number}월 ${payday.nextPayday.day}일) 전까지 예상", payday.amount,
                        if (payday.includeDaily) "하루 평균 ${fmt(payday.dailyAverage)} × ${payday.days}일 포함 · ${payday.basisLabel} ⓘ"
                        else "예정 거래만 반영 · 하루 평균 생활비 제외 ⓘ") { showPayday = true }
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
        // 월급날이 3일 안으로 다가오면 한 번 물어본다: 그날 들어오는지(주말·휴일 앞당김 등)
        val daysToPayday = regularPayday.toEpochDays() - state.today.toEpochDays()
        if (daysToPayday in 0..3 && paydayAnswer == null) left += { PaydayQuestion(regularPayday, state.today) }
        // 예산대로 다 쓰면 모자랄 때: 예산 합계를 얼마나 줄여야 하는지
        available.adjust?.let { adj ->
            left += {
                Card {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(4.dp, 16.dp).clip(RoundedCornerShape(50)).background(c.danger))
                        Spacer(Modifier.width(10.dp))
                        Text("예산대로 다 쓰면 ${fmt(adj.deficit)} 모자라요", style = LooinType.sheetTitle, color = c.danger)
                    }
                    Spacer(Modifier.height(8.dp))
                    if (!ThemePrefs.showBudgetCuts) {
                        // 예산을 바꾸지 않는 사람을 위한 설정: 줄이기 제안 없이 원인과 대응만
                        Text("남은 예산까지 쓰면 생활비 계좌 잔고보다 ${fmt(adj.deficit)} 많아요. 예정 지출·이체를 줄이거나 생활비 계좌에 돈을 더 넣어야 해요.",
                            style = LooinType.body, color = c.text)
                    } else if (adj.shortAfterAll == 0L) {
                        Text("예산 합계를 ${fmt(adj.currentTotal)}에서 ${fmt(adj.suggestedTotal)} 이하로 줄여야 해요.", style = LooinType.body, color = c.text)
                        Spacer(Modifier.height(6.dp))
                        adj.cuts.forEach { (st, cut) ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(budgetColor(st, data)))
                                Spacer(Modifier.width(8.dp))
                                Text(com.looin.finance.ui.plan.budgetName(st.budget, data), style = LooinType.body, color = c.text, modifier = Modifier.weight(1f))
                                SmallLabel("${fmt(st.budget.amount)} → ${fmt(st.budget.amount - cut)}", color = c.textSecondary)
                                Spacer(Modifier.width(8.dp))
                                Text("−${fmt(cut)}", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.danger)
                            }
                        }
                        SmallLabel("남은 예산에 비례해서 나눈 제안이에요. 줄일 곳은 직접 정해도 돼요." +
                            if (adj.excluded.isNotEmpty()) " 고정 비용이 들어간 예산(${adj.excluded.joinToString { com.looin.finance.ui.plan.budgetName(it.budget, data) }})은 빼고 계산했어요." else "")
                    } else {
                        Text((if (adj.reducible > 0) "고정 비용을 뺀 남은 예산(${fmt(adj.reducible)})을 모두 줄여도 ${fmt(adj.shortAfterAll)} 모자라요. " else "") +
                            "예정 지출·이체를 줄이거나 생활비 계좌에 돈을 더 넣어야 해요.", style = LooinType.body, color = c.text)
                    }
                    Spacer(Modifier.height(10.dp))
                    PrimaryButton(if (ThemePrefs.showBudgetCuts) "돈 관리에서 예산 조정" else "돈 관리에서 예정 거래 보기", onOpenPlan)
                }
            }
        }
        // 잔고 부족 미리 알림: 예정 거래를 반영하면 0원 아래로 내려가는 통장
        val shortfalls = BalanceForecast.shortfalls(data.accounts, txs, state.today)
        if (shortfalls.isNotEmpty()) left += {
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(4.dp, 16.dp).clip(RoundedCornerShape(50)).background(c.danger))
                    Spacer(Modifier.width(10.dp))
                    Text("잔고 부족 예상", style = LooinType.sheetTitle, color = c.danger)
                }
                Spacer(Modifier.height(8.dp))
                shortfalls.forEach { sf ->
                    val cause = sf.cause?.let { it.memo.ifBlank { data.categoryName(it.categoryId) } } ?: "예정 거래"
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { sf.cause?.let(onOpenTx) }.padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(accountColor(sf.account)))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text("${sf.account.name} · ${sf.date.korean()} $cause 뒤", style = LooinType.body, color = c.text)
                            SmallLabel("미리 이체하거나 예정 거래를 조정하세요")
                        }
                        AmountText(sf.balance, color = c.danger, style = LooinType.body.copy(fontWeight = FontWeight.Bold))
                    }
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
        left += { Column {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickAdd("지출", AppIcons.Expense, c.expense, Modifier.weight(1f)) { onAddTx(null, TransactionType.EXPENSE, false) }
                QuickAdd("수입", AppIcons.Income, c.income, Modifier.weight(1f)) { onAddTx(null, TransactionType.INCOME, false) }
                QuickAdd("저축 및 이체", AppIcons.Transfer, c.transfer, Modifier.weight(1f)) { onAddTx(null, TransactionType.TRANSFER, false) }
            }
            // 자주 쓰는 거래: 누르면 같은 내용으로 오늘 날짜 새 거래(금액 등은 고칠 수 있음)
            val quick = QuickEntries.suggest(txs, state.today)
            val canScan = LocalReceiptScanner.current.supported
            if (quick.isNotEmpty() || canScan) {
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    if (canScan) ChipPill("영수증 스캔", false, onScanReceipt, dot = c.expense, icon = AppIcons.ReceiptScan)
                    if (quick.isNotEmpty()) SmallLabel("자주 쓰는")
                    quick.forEach { q ->
                        val t = q.sample
                        ChipPill("${t.memo.trim()} ${MoneyFormat.format(t.amount, t.currency)}", false, { onCopyTx(t.id) },
                            dot = t.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: typeColor(t.type))
                    }
                }
            } }
        }
        // 3) 예정 거래
        left += {
            Section("예정 거래", dot = c.planned, onAdd = { onAddTx(null, TransactionType.EXPENSE, true) }, addLabel = "예정 거래 추가") {
                if (upcoming.isEmpty()) EmptyHint("예정 거래가 없어요.")
                upcoming.forEach { tx ->
                    TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true, onComplete = { completing = tx })
                    if (tx.date < state.today) SmallLabel("예정일이 지났어요 · 동그라미를 눌러 완료 처리", color = c.danger, modifier = Modifier.padding(start = 45.dp))
                }
                if (allPlanned.size > upcoming.size) TextAction("외 ${allPlanned.size - upcoming.size}건 · 돈 관리에서 모두 보기 ›", onOpenPlan, color = c.textMuted)
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
        // 5) 남은 예산(고정 비용 자동 포함, 경고·초과 표시)
        right += {
            Section("남은 예산", dot = c.accent, onAdd = onOpenPlan, addLabel = "예산 관리") {
                if (statuses.isEmpty()) EmptyHint("이번 기간 예산이 없어요. 추가를 눌러 돈 관리에서 만들어 보세요.")
                statuses.forEach { s -> BudgetRow(s, data) }
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
    if (showCurrent) available.currentBreakdown?.let { BreakdownSheet(it) { showCurrent = false } }
    if (showPayday) BreakdownSheet(payday.breakdown) { showPayday = false }
    if (showSplit) LooinSheet({ showSplit = false }, "예산별로 나눠 보기") { AvailableSplit(available, data) }
    completing?.let { tx ->
        CompleteSheet(tx, state.today, { completing = null }) { d, a, r -> completing = null; vm.completeTransaction(tx.id, d, a, r) }
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
private fun QuickAdd(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier, onClick: () -> Unit) {
    val c = Looin.colors
    Row(
        modifier.height(46.dp).clip(RoundedCornerShape(12.dp)).background(c.card).border(1.dp, c.cardBorder, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick).semantics(mergeDescendants = true) { contentDescription = "$label 추가" },
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center,
    ) {
        // 연한 색 원 안에 직접 그린 아이콘
        Box(Modifier.size(26.dp).clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = color, modifier = Modifier.size(17.dp))
        }
        Spacer(Modifier.width(6.dp))
        Text(label, style = LooinType.body.copy(fontWeight = FontWeight.SemiBold), color = c.text, maxLines = 1)
    }
}

/** 예산 색: 카테고리 예산은 카테고리 색, 전체 생활비는 강조 색. */
@Composable
private fun budgetColor(st: com.looin.finance.core.calc.BudgetStatus, data: com.looin.finance.data.FinanceData): Color =
    st.budget.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: Looin.colors.accent

/** 지금 쓸 수 있는 돈(쓴 예산만 반영)을 남은 예산별 + 예산 밖 여유로 나눈 막대. */
@Composable
private fun AvailableSplitBar(a: AvailableFundsCalculator.Result, data: com.looin.finance.data.FinanceData) {
    val c = Looin.colors
    val free = maxOf(a.amount, 0)
    val parts = a.shares.filter { it.left > 0 }.map { it.left to budgetColor(it.status, data) } + listOfNotNull((free to c.income).takeIf { free > 0 })
    val total = parts.sumOf { it.first }
    Row(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(c.surfaceStrong)) {
        if (total > 0) parts.forEach { (v, col) -> Box(Modifier.weight(v.toFloat()).fillMaxHeight().background(col)) }
    }
    if (a.amount < 0) { Spacer(Modifier.height(4.dp)); SmallLabel("남은 예산이 쓸 수 있는 돈보다 ${MoneyFormat.format(-a.amount)} 많아요", color = c.danger) }
}

/** 예산별로 나눠 보기 시트 내용. */
@Composable
private fun AvailableSplit(a: AvailableFundsCalculator.Result, data: com.looin.finance.data.FinanceData) {
    val c = Looin.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(c.surfaceInput).padding(12.dp)) {
            SmallLabel("생활비 계좌 잔고에서 예정 지출·예정 이체·저축 목표를 뺀 돈이 지금 쓸 수 있는 돈이에요. " +
                "이 돈을 아직 안 쓴 예산별로 나눴고, 예산을 다 쓰고도 남는 돈이 '예산을 다 쓴다면' 금액이에요.", color = c.textSecondary)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("지금 쓸 수 있는 돈", style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), color = c.text, modifier = Modifier.weight(1f))
            AmountText(a.withoutBudgetLeft, style = LooinType.monthTitle, color = if (a.withoutBudgetLeft < 0) c.danger else c.text)
        }
        AvailableSplitBar(a, data)
        a.shares.forEach { sh ->
            val st = sh.status
            Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).clip(RoundedCornerShape(50)).background(budgetColor(st, data)))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("${com.looin.finance.ui.plan.budgetName(st.budget, data)} 남은 예산", style = LooinType.body, color = c.text)
                    SmallLabel("예산 ${MoneyFormat.format(st.effective)} · 사용 ${MoneyFormat.format(st.spent)}" +
                        (if (sh.planned > 0) " · 예정 ${MoneyFormat.format(sh.planned)}" else "") + if (st.isOver) " · 초과" else "",
                        color = if (st.isOver) c.danger else c.textMuted)
                }
                AmountText(sh.left, style = LooinType.body.copy(fontWeight = FontWeight.SemiBold))
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(c.divider))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(50)).background(c.income))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("예산을 다 써도 남는 돈", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.text)
                SmallLabel("= 홈의 '예산을 다 쓴다면' 금액")
            }
            AmountText(a.amount, style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = if (a.amount < 0) c.danger else c.income)
        }
        a.adjust?.takeIf { ThemePrefs.showBudgetCuts }?.let { adj ->
            SmallLabel(if (adj.shortAfterAll == 0L) "예산 합계를 ${MoneyFormat.format(adj.suggestedTotal)} 이하로 줄이면 모자라지 않아요."
                else "남은 예산을 모두 줄여도 ${MoneyFormat.format(adj.shortAfterAll)} 모자라요.", color = c.danger)
        }
    }
}

/** 홈 요약의 "경우" 한 줄: 이름 · 금액(모자라면 빨강) · 작은 안내. 누르면 근거. */
@Composable
private fun ScenarioRow(label: String, amount: Long, hint: String, onClick: () -> Unit) {
    val c = Looin.colors
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).clickable(onClick = onClick).padding(vertical = 6.dp)
        .semantics(mergeDescendants = true) { contentDescription = "$label ${MoneyFormat.format(amount)}" }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = LooinType.body, color = c.textSecondary, modifier = Modifier.weight(1f))
            Text(MoneyFormat.format(amount), style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), color = if (amount < 0) c.danger else c.text)
        }
        SmallLabel(hint)
    }
}

/** 월급날 확인 카드: 설정 급여일 그대로 들어오는지, 다른 날인지(이번 월급에만 적용). */
@Composable
private fun PaydayQuestion(regular: LocalDate, today: LocalDate) {
    val c = Looin.colors
    var other by remember { mutableStateOf(false) }
    var picked by remember(regular) { mutableStateOf(maxOf(today.plus(kotlinx.datetime.DatePeriod(days = 1)), LocalDate.fromEpochDays(regular.toEpochDays() - 1))) }
    Card {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(4.dp, 16.dp).clip(RoundedCornerShape(50)).background(c.accent))
            Spacer(Modifier.width(10.dp))
            Text("월급날 확인", style = LooinType.sheetTitle, color = c.text)
        }
        Spacer(Modifier.height(8.dp))
        Text("이번 월급이 ${regular.korean()}에 들어오나요?", style = LooinType.body, color = c.text)
        SmallLabel("주말·휴일이라 앞당겨 들어오면 '다른 날'을 골라 주세요. 이번 월급에만 쓰고 급여일 설정은 그대로예요.")
        Spacer(Modifier.height(10.dp))
        if (!other) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PrimaryButton("네, 그날이에요", { ThemePrefs.answerPayday(regular.toEpochDays().toLong(), regular.toEpochDays().toLong()) }, Modifier.weight(1f), strong = true)
            PrimaryButton("다른 날이에요", { other = true }, Modifier.weight(1f))
        } else {
            FieldGroup { DateField("이번 월급이 들어오는 날", picked, { picked = it }) }
            Spacer(Modifier.height(8.dp))
            val ok = picked > today
            if (!ok) SmallLabel("오늘 이후 날짜를 골라 주세요.", color = c.danger)
            PrimaryButton("이 날로 계산하기", { ThemePrefs.answerPayday(regular.toEpochDays().toLong(), picked.toEpochDays().toLong()) }, enabled = ok, strong = true)
        }
    }
}
