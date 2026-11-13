package com.looin.finance.ui.assets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.Currencies
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.validation.AccountRules
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.FinanceTheme

@Composable
fun AssetsScreen(state: UiState, padding: PaddingValues, onOpenAccount: (Long) -> Unit, onAddAccount: () -> Unit) {
    val data = state.data
    val summary = BalanceCalculator.assetSummary(data.accounts, data.transactions)
    var showArchived by rememberSaveable { mutableStateOf(false) }
    val visible = data.accounts.filter { showArchived || !it.archived }
    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding() + 8.dp, bottom = padding.calculateBottomPadding() + 88.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionCard("자산 요약") {
                MetricRow("총자산", summary.totalAssets, summary.netWorthBreakdown.copy(
                    title = "총자산", total = summary.totalAssets, lines = summary.netWorthBreakdown.lines.filter { it.sign > 0 },
                    formula = "부채가 아닌 모든 계좌의 원화 평가액 합"))
                MetricRow("부채", summary.totalLiabilities, color = FinanceTheme.colors.expense)
                MetricRow("순자산", summary.netWorth, summary.netWorthBreakdown, emphasize = true)
                if (summary.unvaluedAccounts.isNotEmpty()) SmallLabel(summary.netWorthBreakdown.notes.joinToString(), color = FinanceTheme.colors.warning)
            }
        }
        AccountType.entries.forEach { type ->
            val list = visible.filter { it.type == type }
            if (list.isNotEmpty()) item {
                SectionCard(type.label) {
                    list.forEachIndexed { i, a ->
                        if (i > 0) HorizontalDivider()
                        val bal = BalanceCalculator.actualBalance(a, data.transactions)
                        Row(Modifier.fillMaxWidth().clickable { onOpenAccount(a.id) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(a.name + if (a.archived) " (보관)" else "", style = MaterialTheme.typography.bodyLarge)
                                val tags = buildList {
                                    if (a.includeInAvailable) add("생활비 계산 대상")
                                    if (a.currency != KRW) add(a.currency)
                                }
                                if (tags.isNotEmpty()) SmallLabel(tags.joinToString(" · "))
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                AmountText(bal, currency = a.currency, color = if (bal < 0) FinanceTheme.colors.expense else androidx.compose.ui.graphics.Color.Unspecified)
                                if (a.currency != KRW) {
                                    val krw = BalanceCalculator.valuationKrw(a, bal)
                                    SmallLabel(if (krw == null) "환율 미설정" else "≈ ${MoneyFormat.format(krw)}")
                                }
                            }
                        }
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onAddAccount) { Text("+ 계좌 추가") }
                if (data.accounts.any { it.archived }) OutlinedButton(onClick = { showArchived = !showArchived }) {
                    Text(if (showArchived) "보관 계좌 숨기기" else "보관 계좌 보기")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountDetailScreen(
    state: UiState,
    vm: MainViewModel,
    accountId: Long,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onOpenTx: (Long) -> Unit,
    onAddTx: (TransactionType) -> Unit,
) {
    val data = state.data
    val account = data.accountById[accountId]
    Scaffold(topBar = {
        TopAppBar(
            title = { Text(account?.name ?: "계좌") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "뒤로") } },
            actions = { if (account != null) IconButton(onClick = onEdit) { Icon(Icons.Outlined.Edit, "수정") } },
        )
    }) { padding ->
        if (account == null) {
            Text("계좌를 찾을 수 없습니다.", Modifier.padding(padding).padding(16.dp)); return@Scaffold
        }
        val txs = data.transactions.filter { it.touches(account.id) }
            .sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id })
        val actual = BalanceCalculator.actualBalance(account, data.transactions)
        val period = state.currentPeriod
        val projected = BalanceCalculator.projectedBreakdown(listOf(account), data.transactions, period.lastDay, "기간 말 예상 잔고")
        val adjustments = txs.filter { it.type == TransactionType.ADJUSTMENT }
        var adjusting by remember { mutableStateOf(false) }
        var archiveError by remember { mutableStateOf<String?>(null) }

        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding() + 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                SectionCard("${account.type.label}${if (account.archived) " · 보관됨" else ""}") {
                    MetricRow("현재 실제 잔고", actual, emphasize = true)
                    MetricRow("${period.lastDay.korean()} 예상 잔고", projected.total, projected)
                    MetricRow("초기 잔고", account.openingBalance)
                    if (account.currency != KRW) {
                        val krw = BalanceCalculator.valuationKrw(account, actual)
                        SmallLabel("통화 ${account.currency} · " + (krw?.let { "원화 평가액 ≈ ${MoneyFormat.format(it)}" } ?: "평가 환율 미설정"))
                    }
                    if (account.includeInAvailable) SmallLabel("생활비 계산 대상 계좌")
                    Spacer(Modifier.height(8.dp))
                    if (!account.archived) {
                        FlowButtons(
                            "지출" to { onAddTx(TransactionType.EXPENSE) },
                            "수입" to { onAddTx(TransactionType.INCOME) },
                            "이체" to { onAddTx(TransactionType.TRANSFER) },
                            "잔고 조정" to { adjusting = true },
                        )
                    }
                    TextButton(onClick = {
                        if (account.archived) vm.setArchived(account.id, false)
                        else {
                            val reason = AccountRules.canArchive(account, data.transactions)
                            if (reason != null) archiveError = reason else vm.setArchived(account.id, true)
                        }
                    }) { Text(if (account.archived) "보관 해제" else "계좌 보관") }
                }
            }
            if (adjustments.isNotEmpty()) item {
                SectionCard("잔고 조정 이력") {
                    adjustments.forEach { t ->
                        Row(Modifier.fillMaxWidth().clickable { onOpenTx(t.id) }.padding(vertical = 6.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(t.effectiveDate.korean(withYear = true), style = MaterialTheme.typography.bodyMedium)
                                SmallLabel(t.memo)
                            }
                            AmountText(t.deltaFor(account.id), currency = account.currency, signed = true)
                        }
                    }
                }
            }
            item {
                SectionCard("거래 내역 (${txs.size})") {
                    if (txs.isEmpty()) EmptyHint("거래가 없습니다.")
                    txs.forEachIndexed { i, t ->
                        if (i > 0) HorizontalDivider()
                        TransactionRow(t, data, onClick = { onOpenTx(t.id) }, showDate = true, perspectiveAccountId = account.id)
                    }
                }
            }
        }
        if (adjusting) AdjustDialog(account, actual, state, { adjusting = false }) { target, date, memo ->
            adjusting = false
            vm.adjustBalance(account.id, target, date, memo)
        }
        archiveError?.let {
            AlertDialog(onDismissRequest = { archiveError = null }, confirmButton = { TextButton({ archiveError = null }) { Text("확인") } },
                title = { Text("보관할 수 없습니다") }, text = { Text(it) })
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowButtons(vararg items: Pair<String, () -> Unit>) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { (label, action) -> OutlinedButton(onClick = action) { Text(label) } }
    }
}

@Composable
private fun AdjustDialog(account: Account, current: Long, state: UiState, onDismiss: () -> Unit, onConfirm: (Long, kotlinx.datetime.LocalDate, String) -> Unit) {
    val liability = account.type.isLiability
    // 부채는 "갚아야 할 금액"(양수)으로 입력받는다.
    var text by remember { mutableStateOf(amountToInput(if (liability) -current else current, account.currency)) }
    var date by remember { mutableStateOf(state.today) }
    var memo by remember { mutableStateOf("") }
    val parsed = MoneyFormat.parse(text, account.currency)
    val target = parsed?.let { if (liability) -it else it }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("잔고 조정") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("현재 기록상 잔고: ${MoneyFormat.format(if (liability) -current else current, account.currency)}")
                AmountField(text, { text = it }, if (liability) "실제 부채 금액" else "실제 잔고", currency = account.currency, allowNegative = !liability)
                target?.let {
                    val diff = it - current
                    SmallLabel("조정액: ${MoneyFormat.format(diff, account.currency, signed = true)} (잔고 조정 거래로 기록, 소비·수입 통계 제외)")
                }
                DateField("조정일", date, { date = it }, Modifier.fillMaxWidth())
                OutlinedTextField(memo, { memo = it }, label = { Text("사유(선택)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = { TextButton(enabled = target != null && date <= state.today, onClick = { onConfirm(target!!, date, memo) }) { Text("조정") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AccountEditScreen(state: UiState, vm: MainViewModel, accountId: Long?, onDone: () -> Unit) {
    if (!state.data.loaded) return
    val existing = accountId?.let { state.data.accountById[it] }
    val hasTx = existing != null && state.data.transactions.any { it.touches(existing.id) }
    var name by rememberSaveable { mutableStateOf(existing?.name ?: "") }
    var type by rememberSaveable { mutableStateOf(existing?.type ?: AccountType.CHECKING) }
    var currency by rememberSaveable { mutableStateOf(existing?.currency ?: KRW) }
    var openingText by rememberSaveable {
        mutableStateOf(existing?.let { amountToInput(if (it.type.isLiability) -it.openingBalance else it.openingBalance, it.currency) } ?: "")
    }
    var include by rememberSaveable { mutableStateOf(existing?.includeInAvailable ?: (existing == null)) }
    var rateText by rememberSaveable { mutableStateOf(existing?.rateToKrwX10000?.let(::formatRate) ?: "") }
    var memo by rememberSaveable { mutableStateOf(existing?.memo ?: "") }
    var error by remember { mutableStateOf<String?>(null) }

    val effectiveCurrency = if (type == AccountType.FOREIGN) (if (currency == KRW) "USD" else currency) else KRW
    val includeAllowed = !type.isLiability && effectiveCurrency == KRW

    fun save() {
        val opening = if (openingText.isBlank()) 0L else MoneyFormat.parse(openingText, effectiveCurrency)
        if (opening == null) { error = "초기 잔고를 확인하세요."; return }
        if (name.isBlank()) { error = "이름을 입력하세요."; return }
        val rate = if (effectiveCurrency == KRW || rateText.isBlank()) null else parseRate(rateText)
        if (effectiveCurrency != KRW && rateText.isNotBlank() && rate == null) { error = "환율 형식을 확인하세요(예: 1380.5)."; return }
        vm.saveAccount(
            Account(
                id = existing?.id ?: 0, name = name.trim(), type = type, currency = effectiveCurrency,
                openingBalance = if (type.isLiability) -opening else opening,
                includeInAvailable = include && includeAllowed, archived = existing?.archived ?: false, memo = memo,
                sortOrder = existing?.sortOrder ?: state.data.accounts.size, rateToKrwX10000 = rate,
                createdAt = existing?.createdAt ?: 0,
            ),
            onDone,
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(if (existing == null) "계좌 추가" else "계좌 수정") },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "뒤로") } })
        },
        bottomBar = { Button(onClick = ::save, modifier = Modifier.fillMaxWidth().imePadding().padding(16.dp).height(52.dp)) { Text("저장") } },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(name, { name = it }, label = { Text("이름") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Text("종류", style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                AccountType.entries.forEach { t ->
                    FilterChip(type == t, { if (!hasTx || t.isLiability == type.isLiability) type = t }, label = { Text(t.label) },
                        enabled = !hasTx || (t.isLiability == type.isLiability && (t == AccountType.FOREIGN) == (type == AccountType.FOREIGN)))
                }
            }
            if (hasTx) SmallLabel("거래가 있는 계좌는 자산↔부채, 원화↔외화 종류를 바꿀 수 없습니다.")
            if (type == AccountType.FOREIGN) {
                Text("통화", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Currencies.all.filter { it.code != KRW }.forEach { c ->
                        FilterChip(effectiveCurrency == c.code, { if (!hasTx) currency = c.code }, label = { Text("${c.code} ${c.label}") }, enabled = !hasTx)
                    }
                }
                OutlinedTextField(rateText, { v -> rateText = v.filter { it.isDigit() || it == '.' } }, singleLine = true,
                    label = { Text("평가 환율 (1 $effectiveCurrency 당 원, 선택)") }, modifier = Modifier.fillMaxWidth())
                SmallLabel("외화 잔액은 원래 통화로 보존되고, 순자산에는 이 환율로 환산한 평가액이 반영됩니다. 환전 거래는 추후 지원.")
            }
            AmountField(openingText, { openingText = it }, if (type.isLiability) "초기 부채 금액(갚아야 할 돈)" else "초기 잔고",
                currency = effectiveCurrency, allowNegative = !type.isLiability)
            if (existing != null) SmallLabel("초기 잔고를 바꾸면 모든 잔고 계산이 달라집니다. 현재 잔고만 맞추려면 계좌 화면의 '잔고 조정'을 쓰세요(이력이 남습니다).")
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("생활비 계산 대상", style = MaterialTheme.typography.bodyLarge)
                    SmallLabel(if (includeAllowed) "홈의 '사용 가능 금액' 계산에 이 계좌 잔고를 포함합니다." else "원화 자산 계좌만 지정할 수 있습니다.")
                }
                Switch(include && includeAllowed, { include = it }, enabled = includeAllowed)
            }
            OutlinedTextField(memo, { memo = it }, label = { Text("메모") }, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(16.dp))
        }
    }
}

fun formatRate(x10000: Long): String {
    val frac = (x10000 % 10_000).toString().padStart(4, '0').trimEnd('0')
    return if (frac.isEmpty()) "${x10000 / 10_000}" else "${x10000 / 10_000}.$frac"
}

/** "1380.5" → 13,805,000 (×10,000 정수). 소수 4자리까지. */
fun parseRate(text: String): Long? {
    val parts = text.trim().split(".")
    if (parts.size > 2 || parts[0].isEmpty() || !parts.all { p -> p.all { it.isDigit() } }) return null
    val frac = parts.getOrElse(1) { "" }
    if (frac.length > 4) return null
    return parts[0].toLong() * 10_000 + frac.padEnd(4, '0').toLong()
}
