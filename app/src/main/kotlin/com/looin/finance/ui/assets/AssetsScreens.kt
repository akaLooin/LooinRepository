package com.looin.finance.ui.assets

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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.CurrencyExchange
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.FieldDivider
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.MenuRow
import com.looin.finance.ui.components.MetricRow
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TextAction
import com.looin.finance.ui.components.ToggleRow
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

fun AccountType.icon(): ImageVector = when (this) {
    AccountType.CHECKING -> Icons.Outlined.AccountBalance
    AccountType.CASH -> Icons.Outlined.Payments
    AccountType.SAVINGS -> Icons.Outlined.Savings
    AccountType.FOREIGN -> Icons.Outlined.CurrencyExchange
    AccountType.OTHER_ASSET -> Icons.Outlined.Inventory2
    AccountType.LIABILITY -> Icons.Outlined.CreditCard
}

@Composable
private fun AccountAvatar(type: AccountType, size: Int = 40) {
    val c = Looin.colors
    Box(Modifier.size(size.dp).clip(CircleShape).background(c.surfaceButton), contentAlignment = Alignment.Center) {
        Icon(type.icon(), null, tint = if (type.isLiability) c.expense else c.text, modifier = Modifier.size((size * 0.5).dp))
    }
}

@Composable
fun AssetsScreen(state: UiState, padding: PaddingValues, onOpenAccount: (Long) -> Unit, onAddAccount: () -> Unit) {
    val c = Looin.colors
    val data = state.data
    val summary = BalanceCalculator.assetSummary(data.accounts, data.transactions)
    var showArchived by rememberSaveable { mutableStateOf(false) }
    val visible = data.accounts.filter { showArchived || !it.archived }
    LazyColumn(
        contentPadding = PaddingValues(start = GUTTER, end = GUTTER, top = padding.calculateTopPadding() + 4.dp, bottom = padding.calculateBottomPadding() + 40.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        item {
            SmallLabel("순자산")
            AmountText(summary.netWorth, style = LooinType.bigAmount)
            Row {
                Text("자산 ", style = LooinType.body, color = c.textSecondary)
                Text(MoneyFormat.format(summary.totalAssets), style = LooinType.body, color = c.income)
                Text("  ·  부채 ", style = LooinType.body, color = c.textSecondary)
                Text(MoneyFormat.format(summary.totalLiabilities), style = LooinType.body, color = c.expense)
            }
            Spacer(Modifier.height(4.dp))
            MetricRow("순자산 계산 근거", summary.netWorth, summary.netWorthBreakdown)
            if (summary.unvaluedAccounts.isNotEmpty()) SmallLabel(summary.netWorthBreakdown.notes.joinToString(), color = c.danger)
        }
        AccountType.entries.forEach { type ->
            val list = visible.filter { it.type == type }
            if (list.isNotEmpty()) item {
                Section(type.label, dot = if (type.isLiability) c.expense else c.saturday) {
                    list.forEach { a ->
                        val bal = BalanceCalculator.actualBalance(a, data.transactions)
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onOpenAccount(a.id) }.padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            AccountAvatar(a.type)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(a.name + if (a.archived) " (보관)" else "", style = LooinType.bodyLg, color = if (a.archived) c.textMuted else c.text)
                                val tags = buildList {
                                    if (a.includeInAvailable) add("생활비 계산 대상")
                                    if (a.currency != KRW) add(a.currency)
                                }
                                if (tags.isNotEmpty()) SmallLabel(tags.joinToString(" · "))
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                AmountText(bal, currency = a.currency, color = if (bal < 0) c.expense else c.text)
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
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                PrimaryButton("+ 계좌 추가", onAddAccount)
                if (data.accounts.any { it.archived }) ChipPill(if (showArchived) "보관 계좌 숨기기" else "보관 계좌 보기", showArchived, { showArchived = !showArchived })
            }
        }
    }
}

@Composable
fun AccountDetailScreen(
    state: UiState,
    vm: MainViewModel,
    accountId: Long,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onOpenTx: (Transaction) -> Unit,
    onAddTx: (TransactionType) -> Unit,
) {
    val c = Looin.colors
    val data = state.data
    val account = data.accountById[accountId]
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding()) {
        ScreenHeader(account?.name ?: "계좌", onBack) { if (account != null) TextAction("편집", onEdit) }
        if (account == null) {
            EmptyHint("계좌를 찾을 수 없습니다."); return@Column
        }
        val txs = data.transactions.filter { it.touches(account.id) }
            .sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id })
        val actual = BalanceCalculator.actualBalance(account, data.transactions)
        val period = state.currentPeriod
        val projected = BalanceCalculator.projectedBreakdown(listOf(account), data.transactions, period.lastDay, "기간 말 예상 잔고")
        val adjustments = txs.filter { it.type == TransactionType.ADJUSTMENT }
        var menu by remember { mutableStateOf(false) }
        var adjusting by remember { mutableStateOf(false) }
        var archiveError by remember { mutableStateOf<String?>(null) }

        LazyColumn(
            contentPadding = PaddingValues(start = GUTTER, end = GUTTER, top = 8.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
            modifier = Modifier.navigationBarsPadding(),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AccountAvatar(account.type, 56)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        SmallLabel("${account.type.label}${if (account.archived) " · 보관됨" else ""}${if (account.includeInAvailable) " · 생활비 계산 대상" else ""}")
                        AmountText(actual, currency = account.currency, style = LooinType.bigAmount, color = if (actual < 0) c.expense else c.text)
                    }
                }
                if (account.currency != KRW) {
                    val krw = BalanceCalculator.valuationKrw(account, actual)
                    SmallLabel("원화 평가액 " + (krw?.let { "≈ ${MoneyFormat.format(it)}" } ?: "· 평가 환율 미설정"))
                }
                Spacer(Modifier.height(8.dp))
                MetricRow("${period.lastDay.korean()} 예상 잔고", projected.total, projected)
                MetricRow("초기 잔고", account.openingBalance)
                Spacer(Modifier.height(8.dp))
                if (!account.archived) PrimaryButton("이 계좌로 기록하기", { menu = true }, strong = true)
                Spacer(Modifier.height(8.dp))
                ChipPill(if (account.archived) "보관 해제" else "계좌 보관", false, {
                    if (account.archived) vm.setArchived(account.id, false)
                    else AccountRules.canArchive(account, data.transactions)?.let { archiveError = it } ?: vm.setArchived(account.id, true)
                })
            }
            if (adjustments.isNotEmpty()) item {
                Section("잔고 조정 이력", dot = c.menuMove) {
                    adjustments.forEach { t ->
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onOpenTx(t) }.padding(vertical = 8.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(t.effectiveDate.korean(withYear = true), style = LooinType.body, color = c.text)
                                SmallLabel(t.memo)
                            }
                            AmountText(t.deltaFor(account.id), currency = account.currency, signed = true)
                        }
                    }
                }
            }
            item {
                Section("거래 내역 ${txs.size}", dot = c.text) {
                    if (txs.isEmpty()) EmptyHint("거래가 없어요.")
                    txs.forEach { t -> TransactionRow(t, data, onClick = { onOpenTx(t) }, showDate = true, perspectiveAccountId = account.id) }
                }
            }
        }

        if (menu) LooinSheet({ menu = false }, account.name) {
            MenuRow(Icons.Outlined.ArrowUpward, "지출", c.expense, { menu = false; onAddTx(TransactionType.EXPENSE) })
            MenuRow(Icons.Outlined.ArrowDownward, "수입", c.income, { menu = false; onAddTx(TransactionType.INCOME) })
            MenuRow(Icons.Outlined.SwapHoriz, "이체", c.menuSoft, { menu = false; onAddTx(TransactionType.TRANSFER) }, "다른 계좌로 옮기기 (소비 아님)")
            MenuRow(Icons.Outlined.Tune, "잔고 조정", c.menuMove, { menu = false; adjusting = true }, "실제 잔고에 맞추고 이력을 남겨요")
        }
        if (adjusting) LooinSheet({ adjusting = false }, "잔고 조정") {
            AdjustForm(account, actual, state) { target, date, memo ->
                adjusting = false
                vm.adjustBalance(account.id, target, date, memo)
            }
        }
        archiveError?.let { ConfirmDialog("보관할 수 없어요", it, "확인", { archiveError = null }) {} }
    }
}

@Composable
private fun AdjustForm(account: Account, current: Long, state: UiState, onConfirm: (Long, kotlinx.datetime.LocalDate, String) -> Unit) {
    val liability = account.type.isLiability
    var text by remember { mutableStateOf(amountToInput(if (liability) -current else current, account.currency)) }
    var date by remember { mutableStateOf(state.today) }
    var memo by remember { mutableStateOf("") }
    val parsed = MoneyFormat.parse(text, account.currency)
    val target = parsed?.let { if (liability) -it else it }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SmallLabel("현재 기록상 ${if (liability) "부채" else "잔고"}: ${MoneyFormat.format(if (liability) -current else current, account.currency)}")
        AmountField(text, { text = it }, if (liability) "실제 부채 금액" else "실제 잔고", currency = account.currency, allowNegative = !liability)
        target?.let { SmallLabel("조정액 ${MoneyFormat.format(it - current, account.currency, signed = true)} · 잔고 조정 거래로 기록, 소비·수입 통계 제외") }
        FieldGroup { DateField("조정일", date, { date = it }) }
        UnderlineField(memo, { memo = it }, "사유 (선택)")
        PrimaryButton("조정", { onConfirm(target!!, date, memo) }, enabled = target != null && date <= state.today, strong = true)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AccountEditScreen(state: UiState, vm: MainViewModel, accountId: Long?, onDone: () -> Unit) {
    if (!state.data.loaded) return
    val c = Looin.colors
    val existing = accountId?.let { state.data.accountById[it] }
    val hasTx = existing != null && state.data.transactions.any { it.touches(existing.id) }
    var name by rememberSaveable { mutableStateOf(existing?.name ?: "") }
    var type by rememberSaveable { mutableStateOf(existing?.type ?: AccountType.CHECKING) }
    var currency by rememberSaveable { mutableStateOf(existing?.currency ?: KRW) }
    var openingText by rememberSaveable {
        mutableStateOf(existing?.let { amountToInput(if (it.type.isLiability) -it.openingBalance else it.openingBalance, it.currency) } ?: "")
    }
    var include by rememberSaveable { mutableStateOf(existing?.includeInAvailable ?: true) }
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

    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        ScreenHeader(if (existing == null) "계좌 추가" else "계좌 편집", onDone)
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = GUTTER),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            UnderlineField(name, { name = it }, "이름", placeholder = "예: 주거래 통장", textStyle = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold))
            Column {
                SmallLabel("종류")
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AccountType.entries.forEach { t ->
                        val enabled = !hasTx || (t.isLiability == type.isLiability && (t == AccountType.FOREIGN) == (type == AccountType.FOREIGN))
                        ChipPill(t.label, type == t, { type = t }, enabled = enabled)
                    }
                }
                if (hasTx) { Spacer(Modifier.height(6.dp)); SmallLabel("거래가 있는 계좌는 자산↔부채, 원화↔외화 종류를 바꿀 수 없어요.") }
            }
            if (type == AccountType.FOREIGN) {
                Column {
                    SmallLabel("통화")
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Currencies.all.filter { it.code != KRW }.forEach { cur ->
                            ChipPill("${cur.code} ${cur.label}", effectiveCurrency == cur.code, { currency = cur.code }, enabled = !hasTx)
                        }
                    }
                }
                UnderlineField(rateText, { v -> rateText = v.filter { it.isDigit() || it == '.' } }, "평가 환율 (1 $effectiveCurrency 당 원, 선택)",
                    placeholder = "예: 1380.5", keyboardType = KeyboardType.Decimal)
                SmallLabel("외화 잔액은 원래 통화로 보존되고, 순자산에는 이 환율로 환산한 평가액이 반영돼요. 환전 거래는 추후 지원.")
            }
            AmountField(openingText, { openingText = it }, if (type.isLiability) "초기 부채 금액 (갚아야 할 돈)" else "초기 잔고",
                currency = effectiveCurrency, allowNegative = !type.isLiability)
            if (existing != null) SmallLabel("초기 잔고를 바꾸면 모든 잔고 계산이 달라져요. 지금 잔고만 맞추려면 계좌 화면의 '잔고 조정'을 쓰세요(이력이 남아요).")
            FieldGroup {
                ToggleRow("생활비 계산 대상", if (includeAllowed) "홈의 '사용 가능 금액'에 이 계좌 잔고를 포함해요" else "원화 자산 계좌만 지정할 수 있어요",
                    include && includeAllowed, { include = it }, enabled = includeAllowed)
                FieldDivider()
                Box(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) { UnderlineField(memo, { memo = it }, "메모") }
            }
            error?.let { Text(it, color = c.danger, style = LooinType.body) }
            Spacer(Modifier.height(16.dp))
        }
        PrimaryButton("저장", ::save, Modifier.padding(horizontal = GUTTER, vertical = 12.dp), strong = true)
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

