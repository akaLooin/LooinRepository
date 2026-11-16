package com.looin.finance.ui.assets

import com.looin.finance.core.money.AccountFx
import com.looin.finance.core.money.Fx
import com.looin.finance.ui.components.liveRates
import androidx.compose.runtime.collectAsState

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
import com.looin.finance.ui.components.PickItem
import com.looin.finance.ui.components.PickerField
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.border
import com.looin.finance.ui.components.hexOf
import com.looin.finance.ui.components.HexColorField
import com.looin.finance.ui.components.defaultAccountColor
import com.looin.finance.ui.components.accountColor
import com.looin.finance.ui.theme.LooinType

fun AccountType.icon(): ImageVector = when (this) {
    AccountType.CHECKING -> Icons.Outlined.AccountBalance
    AccountType.CASH -> Icons.Outlined.Payments
    AccountType.SAVINGS -> Icons.Outlined.Savings
    AccountType.FOREIGN -> Icons.Outlined.CurrencyExchange
    AccountType.OTHER_ASSET -> Icons.Outlined.Inventory2
    AccountType.LIABILITY -> Icons.Outlined.CreditCard
}

/** 계좌 아이콘: 통장 색을 옅게 깐 원 + 그 색 아이콘. */
@Composable
private fun AccountAvatar(account: Account, size: Int = 40) {
    val col = accountColor(account)
    Box(Modifier.size(size.dp).clip(CircleShape).background(col.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
        Icon(account.type.icon(), null, tint = col, modifier = Modifier.size((size * 0.5).dp))
    }
}

@Composable
fun AssetsScreen(state: UiState, padding: PaddingValues, onOpenAccount: (Long) -> Unit, onAddAccount: () -> Unit) {
    val c = Looin.colors
    val data = state.data
    val live = liveRates()
    val summary = BalanceCalculator.assetSummary(data.accounts, data.transactions, live)
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
                            AccountAvatar(a)
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
                                    // 외화 잔고는 외화로, 원화는 실시간(없으면 최근) 환율로 함께
                                    val krw = BalanceCalculator.valuationKrw(a, bal, data.transactions, live)
                                    SmallLabel(if (krw == null) "환율 정보 없음" else "≈ ${MoneyFormat.format(krw)}")
                                    if (AccountFx.missingRates(a, data.transactions).isNotEmpty() || AccountFx.openingRateMissing(a)) SmallLabel("환율 기입 필요", color = c.danger)
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
    /** 환율 기입 화면(convert = 원화 계좌를 외화 계좌로 바꾸기). */
    onRates: (convert: Boolean) -> Unit = {},
) {
    val c = Looin.colors
    val data = state.data
    val account = data.accountById[accountId]
    val live = liveRates()
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
                    AccountAvatar(account, 56)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        SmallLabel("${account.type.label}${if (account.archived) " · 보관됨" else ""}${if (account.includeInAvailable) " · 생활비 계산 대상" else ""}")
                        AmountText(actual, currency = account.currency, style = LooinType.bigAmount, color = if (actual < 0) c.expense else c.text)
                    }
                }
                if (account.currency != KRW) {
                    Spacer(Modifier.height(6.dp))
                    ForeignSummary(account, actual, data.transactions, live) { onRates(false) }
                } else if (!account.type.isLiability && !account.archived && txs.isNotEmpty()) {
                    Spacer(Modifier.height(6.dp))
                    ChipPill("외화 계좌로 바꾸기", false, { onRates(true) })
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
fun AccountEditScreen(state: UiState, vm: MainViewModel, accountId: Long?, onConvert: (Long) -> Unit = {}, onDone: () -> Unit) {
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
    var rateText by rememberSaveable { mutableStateOf(existing?.rateToKrwX10000?.let(Fx::formatRate)?.replace(",", "") ?: "") }
    var openingRateText by rememberSaveable { mutableStateOf(existing?.openingRateX10000?.let(Fx::formatRate)?.replace(",", "") ?: "") }
    var memo by rememberSaveable { mutableStateOf(existing?.memo ?: "") }
    var color by rememberSaveable { mutableStateOf(existing?.colorArgb ?: 0L) }
    // 카드 결제일 관리(부채 계좌)
    var billingOn by rememberSaveable { mutableStateOf(existing?.billingDay != null) }
    var billingDayText by rememberSaveable { mutableStateOf(existing?.billingDay?.toString() ?: "14") }
    var billingStart by rememberSaveable { mutableStateOf(existing?.billingStartDay ?: 1) }
    var billingAccount by rememberSaveable { mutableStateOf(existing?.billingAccountId) }
    var error by remember { mutableStateOf<String?>(null) }

    val effectiveCurrency = if (type == AccountType.FOREIGN) (if (currency == KRW) "USD" else currency) else KRW
    val includeAllowed = !type.isLiability && effectiveCurrency == KRW

    fun save() {
        val opening = if (openingText.isBlank()) 0L else MoneyFormat.parse(openingText, effectiveCurrency)
        if (opening == null) { error = "초기 잔고를 확인하세요."; return }
        if (name.isBlank()) { error = "이름을 입력하세요."; return }
        if (type.isLiability && billingOn) {
            if (billingDayText.toIntOrNull() !in 1..31) { error = "결제일은 1~31 사이로 입력하세요."; return }
            if (billingAccount == null) { error = "카드 대금을 낼 계좌를 고르세요."; return }
        }
        val rate = if (effectiveCurrency == KRW || rateText.isBlank()) null else Fx.parseRate(rateText)
        if (effectiveCurrency != KRW && rateText.isNotBlank() && rate == null) { error = "환율 형식을 확인하세요(예: 1380.5)."; return }
        val openingRate = if (effectiveCurrency == KRW || openingRateText.isBlank()) null else Fx.parseRate(openingRateText)
        if (effectiveCurrency != KRW && openingRateText.isNotBlank() && openingRate == null) { error = "초기 잔고 환율 형식을 확인하세요(예: 9.12)."; return }
        // 정확한 원화 계산을 위해 외화 초기 잔고는 당시 환율이 꼭 있어야 한다
        if (effectiveCurrency != KRW && opening != 0L && openingRate == null) { error = "초기 잔고를 기록할 당시 환율을 입력하세요."; return }
        vm.saveAccount(
            Account(
                id = existing?.id ?: 0, name = name.trim(), type = type, currency = effectiveCurrency,
                openingBalance = if (type.isLiability) -opening else opening,
                includeInAvailable = include && includeAllowed, archived = existing?.archived ?: false, memo = memo,
                sortOrder = existing?.sortOrder ?: state.data.accounts.size, rateToKrwX10000 = rate,
                openingRateX10000 = openingRate,
                createdAt = existing?.createdAt ?: 0, colorArgb = color,
                billingDay = if (type.isLiability && billingOn) billingDayText.toIntOrNull() else null,
                billingStartDay = billingStart, billingAccountId = if (type.isLiability && billingOn) billingAccount else null,
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
            if (type.isLiability) {
                // 카드 결제일 관리: 이용 기간의 카드 지출을 모아 결제일에 대금 이체 예정을 자동으로 만든다
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    FieldGroup { ToggleRow("카드 결제일 관리", "이용액을 모아 결제일에 대금 이체 예정을 자동으로 만들어요", billingOn, { billingOn = it }) }
                    if (billingOn) {
                        UnderlineField(billingDayText, { v -> billingDayText = v.filter { it.isDigit() }.take(2) }, "결제일 (1~31)", keyboardType = KeyboardType.Number,
                            isError = billingDayText.toIntOrNull() !in 1..31)
                        SmallLabel("이용 기간")
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(1, 12, 15, 25).forEach { d ->
                                ChipPill(if (d == 1) "전월 1일~말일" else "전월 ${d}일~당월 ${d - 1}일", billingStart == d, { billingStart = d })
                            }
                        }
                        PickerField("대금을 낼 계좌", state.data.accounts.filter { !it.archived && !it.type.isLiability && it.id != existing?.id }
                            .map { PickItem(it.id, it.name, accountColor(it)) }, billingAccount, emptyList(), { billingAccount = it })
                        val pay = billingDayText.toIntOrNull()
                        if (pay != null && pay in 1..31) SmallLabel(
                            "매월 ${pay}일에 " + (if (billingStart == 1) "전월 1일~말일" else "전월 ${billingStart}일~당월 ${billingStart - 1}일") +
                                " 이용액을 " + (state.data.accountName(billingAccount).takeIf { billingAccount != null } ?: "고른 계좌") + "에서 내는 예정 이체가 생겨요. 이용액이 바뀌면 금액도 따라 바뀌어요.",
                            color = c.textSecondary)
                    }
                }
            }
            // 통장 색: 목록·선택 칸·예산에 쓰인다. "기본"은 종류별 색
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SmallLabel("통장 색")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    val def = defaultAccountColor(type)
                    Box(Modifier.size(34.dp).clip(CircleShape).background(Color(def).copy(alpha = 0.25f))
                        .then(if (color == 0L) Modifier.border(3.dp, c.text, CircleShape) else Modifier)
                        .clickable { color = 0L }.semantics { contentDescription = "기본 색" }, contentAlignment = Alignment.Center) {
                        Text("기본", style = LooinType.tiny, color = Color(def))
                    }
                    com.looin.finance.ui.settings.CATEGORY_PALETTE.forEach { argb ->
                        Box(Modifier.size(34.dp).clip(CircleShape).background(Color(argb))
                            .then(if (argb == color) Modifier.border(3.dp, c.text, CircleShape) else Modifier)
                            .clickable { color = argb }.semantics { contentDescription = "색 ${hexOf(argb)}" })
                    }
                }
                HexColorField(if (color == 0L) defaultAccountColor(type) else color, { color = it }, "색 코드 직접 입력 (예: #12A594)")
            }
            Column {
                SmallLabel("종류")
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AccountType.entries.forEach { t ->
                        val enabled = !hasTx || (t.isLiability == type.isLiability && (t == AccountType.FOREIGN) == (type == AccountType.FOREIGN))
                        ChipPill(t.label, type == t, { type = t }, enabled = enabled)
                    }
                }
                if (hasTx) { Spacer(Modifier.height(6.dp)); SmallLabel("거래가 있는 계좌는 자산↔부채 종류를 바꿀 수 없어요.") }
                // 거래가 있는 원화 계좌 → 외화 계좌: 거래마다 당시 환율을 적는 화면으로
                if (hasTx && existing != null && existing.currency == KRW && !existing.type.isLiability) {
                    Spacer(Modifier.height(8.dp))
                    ChipPill("외화 계좌로 바꾸기 (거래별 환율 기입)", false, { onConvert(existing.id) })
                }
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
                UnderlineField(openingRateText, { v -> openingRateText = v.filter { it.isDigit() || it == '.' } }, "초기 잔고 당시 환율 (1 $effectiveCurrency 당 원)",
                    placeholder = "예: 9.12", keyboardType = KeyboardType.Decimal)
                UnderlineField(rateText, { v -> rateText = v.filter { it.isDigit() || it == '.' } }, "현재 환율 직접 입력 (선택)",
                    placeholder = "비워 두면 실시간 환율", keyboardType = KeyboardType.Decimal)
                SmallLabel("잔고는 ${effectiveCurrency}로 기록하고, 원화는 실시간 환율로 함께 보여 줘요. 실시간 환율을 받을 수 없을 때만 직접 적은 현재 환율 → 최근 기록 환율을 써요. 거래마다 당시 환율을 함께 적어요.")
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



/** 외화 계좌 머리: 원화 평가액(실시간 환율), 쓴 환율, 기록 환율 기준 원화와 환율 변동, 비어 있는 환율 안내. */
@Composable
private fun ForeignSummary(account: Account, balance: Long, txs: List<Transaction>, live: Map<String, Long>, onRates: () -> Unit) {
    val c = Looin.colors
    val src = AccountFx.valuationRate(account, txs, live)
    val quote = com.looin.finance.ui.platform.ExchangeRates.quotes.collectAsState().value[account.currency]
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (src == null) SmallLabel("원화 환산: 환율 정보가 없어요", color = c.danger)
        else {
            val krw = MoneyFormat.toKrw(balance, account.currency, src.rateX10000)
            Text("≈ ${MoneyFormat.format(krw)}", style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            val when_ = if (src.kind == com.looin.finance.core.money.RateKind.LIVE && quote != null) " · ${quote.source}${if (quote.date.isNotEmpty()) " ${quote.date}" else ""}" else ""
            SmallLabel("${Fx.rateLabel(account.currency, src.rateX10000)} · ${src.kind.label}$when_")
            AccountFx.bookValueKrw(account, txs)?.let { book ->
                val diff = krw - book
                Row {
                    SmallLabel("기록 환율 기준 ${MoneyFormat.format(book)} · 환율 변동 ")
                    SmallLabel(MoneyFormat.format(diff, signed = true), color = if (diff >= 0) c.income else c.expense)
                }
            }
        }
        val missing = AccountFx.missingRates(account, txs).size + if (AccountFx.openingRateMissing(account)) 1 else 0
        if (missing > 0) {
            Text("당시 환율이 비어 있는 기록 ${missing}건 · 눌러서 채우기 ›", style = LooinType.body, color = c.danger,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.danger.copy(alpha = 0.10f)).clickable(onClick = onRates).padding(10.dp))
        } else TextAction("거래별 환율 보기·고치기", onRates, color = c.textSecondary)
    }
}
