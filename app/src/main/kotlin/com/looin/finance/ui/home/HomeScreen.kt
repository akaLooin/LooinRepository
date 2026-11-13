package com.looin.finance.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.Breakdown
import com.looin.finance.core.calc.BreakdownLine
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.BreakdownDialog
import com.looin.finance.ui.components.BudgetBar
import com.looin.finance.ui.components.CompleteDialog
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.BigAmountStyle
import com.looin.finance.ui.theme.FinanceTheme

@Composable
fun HomeScreen(
    state: UiState,
    vm: MainViewModel,
    padding: PaddingValues,
    onOpenTx: (Long) -> Unit,
    onAddAccount: () -> Unit,
    onOpenPlan: () -> Unit,
) {
    val data = state.data
    val period = state.currentPeriod
    val txs = data.transactions

    if (data.loaded && data.accounts.isEmpty()) {
        Column(Modifier.padding(padding).padding(16.dp)) {
            SectionCard("시작하기") {
                Text("아직 등록된 계좌가 없습니다. 실제 사용하는 계좌와 현재 잔고를 등록하면 대시보드가 계산됩니다.")
                Spacer(Modifier.height(4.dp))
                SmallLabel("이 앱은 샘플 데이터를 만들지 않습니다. 화면의 모든 숫자는 직접 입력한 실데이터입니다.")
                Spacer(Modifier.height(12.dp))
                Button(onClick = onAddAccount) { Text("첫 계좌 등록") }
            }
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

    // 미완료 예정 지출: 이번 기간 종료 전(밀린 것 포함)
    val pendingExpenses = txs.filter { it.isPlanned && it.type == TransactionType.EXPENSE && it.currency == KRW && it.date < period.endExclusive }
    val pendingBreakdown = Breakdown(
        "미완료 예정 지출", pendingExpenses.sumOf { it.amount },
        pendingExpenses.sortedBy { it.date }.map {
            BreakdownLine("${it.date.korean()} ${data.categoryName(it.categoryId)}", it.amount, 1,
                if (it.date < state.today) "예정일 지남" else it.memo)
        },
        formula = "${period.lastDay.korean()}까지 처리되지 않은 예정 지출 (지난 예정 포함)",
    )
    val upcoming = txs.filter { it.isPlanned }.sortedBy { it.date }.take(6)
    val recent = txs.filter { it.isCompleted }.sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id }).take(6)
    var completing by remember { mutableStateOf<Transaction?>(null) }
    var showAvailable by remember { mutableStateOf(false) }

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding() + 8.dp, bottom = padding.calculateBottomPadding() + 88.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionCard {
                Column(Modifier.fillMaxWidth().clickable { showAvailable = true }.padding(vertical = 4.dp)) {
                    Text("생활비로 사용 가능한 금액 ⓘ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    AmountText(available.amount, style = BigAmountStyle,
                        color = if (available.amount < 0) FinanceTheme.colors.warning else MaterialTheme.colorScheme.onSurface)
                }
                SmallLabel("${period.basis.label} · ${period.label} (${period.rangeLabel}) · 남은 ${period.endExclusive.toEpochDays() - state.today.toEpochDays()}일")
                if (AvailableFundsCalculator.includedAccounts(data.accounts).isEmpty()) {
                    SmallLabel("생활비 계산 대상 계좌가 없습니다. 자산 탭에서 계좌를 '생활비 계산 대상'으로 지정하세요.", color = FinanceTheme.colors.warning)
                }
            }
        }
        item {
            SectionCard("잔고와 자산") {
                MetricRow("실제 보유 잔고", cash.total, cash)
                MetricRow("전체 순자산", assets.netWorth, assets.netWorthBreakdown)
                MetricRow("${projectionDate.korean()} 예상 잔고", projected.total, projected, sub = "현금성 계좌 + 그날까지의 예정 거래")
                DateField("기준일 변경", projectionDate, { projectionDate = it }, Modifier.fillMaxWidth())
            }
        }
        item {
            SectionCard("이번 기간 (${period.rangeLabel})") {
                MetricRow("수입 합계", stats.income, StatisticsCalculator.incomeBreakdown(stats, data::categoryName), color = FinanceTheme.colors.income)
                MetricRow("확정 소비", stats.expense, StatisticsCalculator.expenseBreakdown(stats, data::categoryName), color = FinanceTheme.colors.expense)
                MetricRow("미완료 예정 지출", pendingBreakdown.total, pendingBreakdown, color = FinanceTheme.colors.planned)
            }
        }
        item {
            SectionCard("카테고리별 남은 예산", action = { TextButton(onClick = onOpenPlan) { Text("관리") } }) {
                if (statuses.isEmpty()) EmptyHint("이번 기간 예산이 없습니다. 돈 관리 탭에서 예산을 만드세요.")
                statuses.forEach { s ->
                    val name = s.budget.categoryId?.let { data.categoryName(it) } ?: "전체 생활비"
                    Column(Modifier.padding(vertical = 6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                            AmountText(s.remaining, color = if (s.isOver) FinanceTheme.colors.warning else MaterialTheme.colorScheme.onSurface,
                                style = MaterialTheme.typography.bodyMedium)
                        }
                        Spacer(Modifier.height(4.dp))
                        val total = s.budget.amount.coerceAtLeast(1).toFloat()
                        BudgetBar(s.spent / total, s.planned / total, s.isOver)
                        SmallLabel("예산 ${fmt(s.budget.amount)} · 사용 ${fmt(s.spent)} · 예정 ${fmt(s.planned)}" +
                            if (s.isOver) " · 초과" else "")
                    }
                }
            }
        }
        item {
            SectionCard("다가오는 예정 거래") {
                if (upcoming.isEmpty()) EmptyHint("예정 거래가 없습니다.")
                upcoming.forEachIndexed { i, tx ->
                    if (i > 0) HorizontalDivider()
                    TransactionRow(tx, data, onClick = { onOpenTx(tx.id) }, showDate = true, onComplete = { completing = tx })
                    if (tx.date < state.today) SmallLabel("예정일이 지났습니다", color = FinanceTheme.colors.warning)
                }
            }
        }
        item {
            SectionCard("최근 거래") {
                if (recent.isEmpty()) EmptyHint("완료된 거래가 없습니다. + 버튼으로 기록하세요.")
                recent.forEachIndexed { i, tx ->
                    if (i > 0) HorizontalDivider()
                    TransactionRow(tx, data, onClick = { onOpenTx(tx.id) }, showDate = true)
                }
            }
        }
    }

    if (showAvailable) BreakdownDialog(available.breakdown) { showAvailable = false }
    completing?.let { tx ->
        CompleteDialog(tx, state.today, { completing = null }) { d, a ->
            completing = null
            vm.completeTransaction(tx.id, d, a)
        }
    }
}

fun fmt(v: Long) = com.looin.finance.core.money.MoneyFormat.format(v)
