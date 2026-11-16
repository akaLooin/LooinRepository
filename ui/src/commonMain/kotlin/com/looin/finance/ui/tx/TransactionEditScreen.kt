package com.looin.finance.ui.tx

import com.looin.finance.core.calc.MemoSuggest
import com.looin.finance.core.receipt.ReceiptParser
import com.looin.finance.ui.platform.LocalReceiptScanner
import com.looin.finance.ui.platform.ReceiptScan
import com.looin.finance.ui.components.korean
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Row
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.BudgetLevel
import com.looin.finance.core.calc.BudgetStatus
import com.looin.finance.ui.plan.levelColor
import com.looin.finance.ui.plan.budgetName
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.font.FontWeight
import com.looin.finance.core.calc.RecentPicks
import com.looin.finance.ui.components.PickerField
import com.looin.finance.ui.components.PickItem
import com.looin.finance.ui.components.accountColor
import com.looin.finance.core.money.AmountExpression
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.AccountType
import com.looin.finance.ui.components.InputDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.FieldDivider
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TextAction
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.typeColor
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.LocalDate

/**
 * 거래 추가·수정. 새 거래는 가장 많이 쓰는 값(지출·완료·오늘·생활비 대상 계좌)으로 채워 빠르게 입력한다.
 * [copyFromId] 가 있으면 그 거래 내용을 복사한 새 거래로 시작한다.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TransactionEditScreen(
    state: UiState,
    vm: MainViewModel,
    txId: Long?,
    initialDate: LocalDate?,
    initialType: TransactionType?,
    initialStatus: TransactionStatus?,
    initialAccountId: Long?,
    onClose: () -> Unit,
    copyFromId: Long? = null,
    /** 열자마자 영수증 촬영(홈·앱 바로가기의 '영수증 스캔'). */
    autoScan: Boolean = false,
) {
    val c = Looin.colors
    val data = state.data
    if (!data.loaded) return // 데이터 로드 전에 입력값을 초기화하지 않도록 대기
    val existing = txId?.let { id -> data.transactions.firstOrNull { it.id == id } }
    val source = existing ?: copyFromId?.let { id -> data.transactions.firstOrNull { it.id == id } }
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        if (txId != null && existing == null) {
            ScreenHeader("거래", onClose)
            EmptyHint("거래를 찾을 수 없습니다.")
            return@Column
        }
        val activeAccounts = data.accounts.filter { !it.archived || it.id == existing?.fromAccountId || it.id == existing?.toAccountId }
        val defaultAccount = initialAccountId ?: activeAccounts.firstOrNull { it.includeInAvailable && it.currency == KRW }?.id
            ?: activeAccounts.firstOrNull()?.id
        val startDate = existing?.date ?: initialDate ?: state.today

        var type by rememberSaveable { mutableStateOf(source?.type ?: initialType ?: TransactionType.EXPENSE) }
        var status by rememberSaveable {
            mutableStateOf(existing?.status ?: initialStatus ?: if (startDate > state.today) TransactionStatus.PLANNED else TransactionStatus.COMPLETED)
        }
        var amountText by rememberSaveable { mutableStateOf(source?.let { amountToInput(it.amount, it.currency) } ?: "") }
        var date by rememberSaveable(stateSaver = DateSaver) { mutableStateOf(startDate) }
        var completedDate by rememberSaveable(stateSaver = NullableDateSaver) { mutableStateOf(existing?.completedDate) }
        var fromId by rememberSaveable { mutableStateOf(source?.fromAccountId ?: if (type == TransactionType.INCOME) null else defaultAccount) }
        var toId by rememberSaveable { mutableStateOf(source?.toAccountId ?: if (type == TransactionType.INCOME) defaultAccount else null) }
        var categoryId by rememberSaveable { mutableStateOf(source?.categoryId) }
        var memo by rememberSaveable { mutableStateOf(source?.memo ?: "") }
        var errors by remember { mutableStateOf<List<String>>(emptyList()) }
        var warnings by remember { mutableStateOf<List<String>>(emptyList()) }
        var pending by remember { mutableStateOf<Transaction?>(null) }
        var pendingNotice by remember { mutableStateOf<String?>(null) }
        var confirmDelete by remember { mutableStateOf(false) }
        var newAccountFor by remember { mutableStateOf<String?>(null) }
        var newCategory by remember { mutableStateOf(false) }
        var memoEdited by remember { mutableStateOf(false) }
        // 영수증 사진(앱 안 저장소 경로). 복사한 새 거래는 사진을 가져오지 않는다
        var attachment by rememberSaveable { mutableStateOf(existing?.attachment) }
        var scanNotice by rememberSaveable { mutableStateOf<String?>(null) }
        var viewPhoto by remember { mutableStateOf(false) }
        val scanner = LocalReceiptScanner.current
        val focus = remember { FocusRequester() }

        fun recentAccounts(side: RecentPicks.Side) = RecentPicks.accounts(data.transactions, type, side)
        val showActualDate = existing?.completedDate != null && existing.completedDate != existing.date
        val currency = data.accountById[if (type == TransactionType.INCOME) toId else fromId]?.currency ?: KRW
        val accent = categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: typeColor(type)

        fun build(): Transaction? {
            val amount = AmountExpression.parse(amountText, currency) ?: run { errors = listOf("금액을 확인하세요."); return null }
            val isCompleted = status == TransactionStatus.COMPLETED
            return Transaction(
                id = existing?.id ?: 0, type = type, status = status, amount = amount, currency = currency, date = date,
                completedDate = if (isCompleted) (if (showActualDate) completedDate ?: date else date)
                else if (status == TransactionStatus.CANCELLED) existing?.completedDate else null,
                fromAccountId = if (type == TransactionType.INCOME) null else fromId,
                toAccountId = if (type == TransactionType.EXPENSE) null else toId,
                categoryId = if (type == TransactionType.TRANSFER) null else categoryId,
                memo = memo.trim(),
                source = existing?.source ?: TransactionSource.MANUAL,
                linkedPlannedId = existing?.linkedPlannedId,
                createdAt = existing?.createdAt ?: 0,
                recurringId = existing?.recurringId, recurringOccurrence = existing?.recurringOccurrence,
                toAmount = existing?.toAmount,
                attachment = attachment,
            )
        }

        /**
         * 영수증에서 읽은 값으로 빈칸을 채운다. 금액·날짜는 읽은 값으로 바꾸고, 메모·카테고리는 비어 있을 때만 채운다.
         * 사용자가 확인하고 저장하도록 무엇을 채웠는지 안내한다(못 읽은 값은 그대로 둠).
         */
        fun applyScan(r: ReceiptScan) {
            if (r.path == null && r.text.isBlank()) { scanNotice = r.error ?: "사진을 불러오지 못했어요."; return }
            r.path?.let { attachment = it }
            if (r.text.isBlank()) {
                scanNotice = "글자를 읽지 못해 사진만 첨부했어요" + (r.error?.let { " ($it)" } ?: "") + ". 금액을 직접 입력해 주세요."
                return
            }
            val g = ReceiptParser.parse(r.text, state.today)
            val filled = mutableListOf<String>()
            if (type != TransactionType.EXPENSE) {
                fromId = (if (type == TransactionType.INCOME) toId else fromId) ?: defaultAccount
                toId = null; categoryId = null; type = TransactionType.EXPENSE
            }
            g.amount?.takeIf { currency == KRW }?.let { amountText = amountToInput(it, KRW); filled += MoneyFormat.format(it) }
            g.date?.let {
                date = it
                if (existing == null && status == TransactionStatus.PLANNED) status = TransactionStatus.COMPLETED
                filled += it.korean(true)
            }
            g.merchant?.let { m ->
                if (memo.isBlank()) { memo = m; memoEdited = false }
                filled += m
            }
            if (categoryId == null) {
                val active = data.categories.filter { it.kind == CategoryKind.EXPENSE && !it.archived }
                // 같은 가게를 전에 기록했으면 그때 카테고리, 아니면 가게 이름으로 짐작한 기본 카테고리
                val past = g.merchant?.let { m -> MemoSuggest.suggest(data.transactions, m, TransactionType.EXPENSE).firstOrNull { it.memo == m }?.categoryId }
                    ?.takeIf { id -> active.any { it.id == id } }
                val guess = past ?: g.categoryHint?.let { h -> active.firstOrNull { it.name == h }?.id }
                guess?.let { id -> categoryId = id; filled += data.categoryById[id]?.name ?: "" }
            }
            scanNotice = if (g.amount == null && g.date == null) "금액·날짜를 찾지 못해 사진만 첨부했어요. 직접 입력해 주세요."
            else "영수증에서 읽었어요 · ${filled.filter { it.isNotBlank() }.joinToString(" · ")}\n맞는지 확인하고 저장하세요."
        }

        /** 지금 입력값으로 저장하면 경고·초과에 걸리는 예산(지출일 때만). */
        fun budgetImpact(): List<BudgetStatus> {
            if (type != TransactionType.EXPENSE || status == TransactionStatus.CANCELLED || data.budgets.isEmpty()) return emptyList()
            val amount = AmountExpression.parse(amountText, currency)?.takeIf { it > 0 } ?: return emptyList()
            val probe = Transaction(id = existing?.id ?: 0, type = type, status = status, amount = amount, currency = currency, date = date,
                completedDate = if (status == TransactionStatus.COMPLETED) date else null, fromAccountId = fromId, categoryId = categoryId,
                recurringId = existing?.recurringId)
            return BudgetCalculator.impact(data.budgets, state.periodOf(probe.effectiveDate), data.transactions, probe)
        }

        fun submit() {
            val tx = build() ?: return
            vm.validate(tx) { r ->
                errors = r.errors
                if (r.isValid) {
                    // 예산 경고는 막지 않고, 저장 뒤 안내로 한 번 더 알려 경각심을 준다
                    val notice = budgetImpact().firstOrNull()?.let { st -> "저장했어요 · ${budgetName(st.budget, data)} ${st.message { MoneyFormat.format(it) }}" }
                    if (r.warnings.isEmpty()) vm.saveTransaction(tx, onClose, notice) else { warnings = r.warnings; pending = tx; pendingNotice = notice }
                }
            }
        }

        ScreenHeader(if (existing == null) "거래 추가" else "거래 수정", onClose) {
            if (existing != null) TextAction("삭제", { confirmDelete = true }, color = c.danger)
        }
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = GUTTER),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            if (data.accounts.isEmpty()) Text("먼저 자산 탭에서 계좌를 등록하세요.", color = c.danger, style = LooinType.body)
            PillTabs(listOf(TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER), type, { it.label }, onSelect = {
                if (it != type) {
                    val single = if (type == TransactionType.INCOME) toId else fromId
                    type = it
                    categoryId = null
                    when (it) {
                        TransactionType.INCOME -> { toId = single; fromId = null }
                        else -> { fromId = single; toId = null }
                    }
                }
            })
            if (scanner.supported || attachment != null) ReceiptRow(
                attachment, scanNotice, canScan = scanner.supported && type != TransactionType.TRANSFER,
                onScan = { camera -> scanner.scan(camera, ::applyScan) },
                onView = { viewPhoto = true }, onRemove = { attachment = null; scanNotice = null },
            )
            AmountField(amountText, { amountText = it }, "금액", Modifier.focusRequester(focus), currency = currency, accent = accent, calculator = true)
            // 예산: 이 거래를 저장하면 경고·초과(예정 포함)에 걸리는지 바로 보여 준다. 저장은 막지 않는다(기록 앱)
            budgetImpact().forEach { st ->
                val lvl = if (st.level != BudgetLevel.OK) st.level else st.forecastLevel
                val col = levelColor(lvl)
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(col.copy(alpha = 0.12f)).padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Text(if (st.level != BudgetLevel.OK) lvl.label else "주의", style = LooinType.helper.copy(fontWeight = FontWeight.Bold), color = col)
                    Spacer(Modifier.width(8.dp))
                    Text("${budgetName(st.budget, data)} ${st.message { MoneyFormat.format(it) } ?: ""}", style = LooinType.body, color = c.text)
                }
            }
            if (type != TransactionType.TRANSFER) {
                val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
                PickerField(
                    "카테고리",
                    data.categories.filter { it.kind == kind && (!it.archived || it.id == categoryId) }.map { PickItem(it.id, it.name, Color(it.colorArgb)) },
                    categoryId, RecentPicks.categories(data.transactions, type), { categoryId = it },
                    addLabel = "새 ${kind.label} 카테고리", onAdd = { newCategory = true }, noneLabel = "미분류",
                )
            }
            when (type) {
                TransactionType.INCOME -> AccountChips("입금 계좌", activeAccounts, toId, recentAccounts(RecentPicks.Side.TO), { newAccountFor = "to" }) { toId = it }
                TransactionType.EXPENSE -> AccountChips("출금 계좌", activeAccounts, fromId, recentAccounts(RecentPicks.Side.FROM), { newAccountFor = "from" }) { fromId = it }
                else -> {
                    AccountChips("출금 계좌", activeAccounts, fromId, recentAccounts(RecentPicks.Side.FROM), { newAccountFor = "from" }) { fromId = it; if (toId == it) toId = null }
                    AccountChips("입금 계좌 (넣을 자산)", activeAccounts.filter { it.id != fromId }, toId, recentAccounts(RecentPicks.Side.TO), { newAccountFor = "to" }) { toId = it }
                    SmallLabel("계좌 간 저축·이체는 소비로 계산하지 않아요. 넣을 자산이 없으면 '+ 새 계좌'로 바로 만들 수 있어요.")
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SmallLabel("상태")
                val statusOptions = if (existing != null) TransactionStatus.entries.toList() else listOf(TransactionStatus.COMPLETED, TransactionStatus.PLANNED)
                PillTabs(statusOptions, status, { it.label }, onSelect = { status = it })
                if (status == TransactionStatus.PLANNED) SmallLabel("예정 거래는 실제 잔고에 반영되지 않고 예상 잔고에만 반영돼요.")
            }
            FieldGroup {
                DateField(if (status == TransactionStatus.PLANNED) "예정일" else "날짜", date, {
                    date = it
                    if (existing == null && it > state.today) status = TransactionStatus.PLANNED
                })
                if (status == TransactionStatus.COMPLETED && showActualDate) {
                    FieldDivider()
                    DateField("실제 처리일", completedDate ?: date, { completedDate = it })
                }
            }
            UnderlineField(memo, { memo = it; memoEdited = true }, "메모", placeholder = "무엇에 썼나요? (선택)", accent = accent)
            // 예전에 쓴 메모 추천: 누르면 메모와 그때의 카테고리·계좌(금액이 비어 있으면 금액도)를 채운다
            val suggestions = if (memoEdited) MemoSuggest.suggest(data.transactions, memo, type) else emptyList()
            if (suggestions.isNotEmpty()) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                suggestions.forEach { sug ->
                    val cat = sug.categoryId?.let { data.categoryById[it] }?.takeIf { !it.archived }
                    ChipPill(sug.memo + (cat?.let { " · ${it.name}" } ?: ""), false, {
                        memo = sug.memo; memoEdited = false
                        if (type != TransactionType.TRANSFER && cat != null) categoryId = cat.id
                        val acc = sug.accountId?.takeIf { id -> activeAccounts.any { it.id == id && !it.archived } }
                        if (acc != null) { if (type == TransactionType.INCOME) toId = acc else fromId = acc }
                        if (amountText.isBlank()) amountText = amountToInput(sug.lastAmount, currency)
                    }, dot = cat?.let { Color(it.colorArgb) })
                }
            }

            errors.forEach { Text(it, color = c.danger, style = LooinType.body) }
            if (existing != null) SmallLabel("상태 ${existing.status.label} · 출처 ${existing.source.label}")
            Spacer(Modifier.height(16.dp))
        }
        PrimaryButton(if (existing == null) "저장" else "수정 저장", ::submit, Modifier.padding(horizontal = GUTTER, vertical = 12.dp), strong = true)

        pending?.let { tx ->
            ConfirmDialog("확인이 필요해요", warnings.joinToString("\n") + "\n\n그래도 저장할까요?", "저장", { pending = null }, dismiss = "돌아가기") {
                vm.saveTransaction(tx, onClose, pendingNotice)
            }
        }
        if (confirmDelete && existing != null) {
            ConfirmDialog("거래 삭제", "삭제하면 관련 잔고와 통계가 다시 계산돼요. 기록을 남기려면 '취소' 상태를 쓰세요.", "삭제",
                { confirmDelete = false }, danger = true) { vm.deleteTransaction(existing.id, onClose) }
        }
        newAccountFor?.let { which ->
            val savingsDest = which == "to" && type == TransactionType.TRANSFER
            InputDialog("새 계좌", "계좌 이름", "추가", { newAccountFor = null },
                help = if (savingsDest) "저축 계좌로 만들어요(생활비 계산 제외, 잔고 0원). 자세한 설정은 자산 탭에서 바꿀 수 있어요."
                else "입출금 계좌로 만들어요(잔고 0원). 자세한 설정은 자산 탭에서 바꿀 수 있어요.") { name ->
                vm.addAccount(Account(name = name, type = if (savingsDest) AccountType.SAVINGS else AccountType.CHECKING,
                    openingBalance = 0, includeInAvailable = !savingsDest)) { id -> if (which == "to") toId = id else fromId = id }
            }
        }
        if (newCategory) {
            val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
            InputDialog("새 ${kind.label} 카테고리", "카테고리 이름", "추가", { newCategory = false }) { name ->
                vm.addCategory(Category(name = name, kind = kind, colorArgb = nextCategoryColor(data.categories.size))) { categoryId = it }
            }
        }
        if (viewPhoto) attachment?.let { ReceiptViewer(it) { viewPhoto = false } }
        // 영수증 스캔으로 열었으면 바로 카메라(한 번만 — 화면 회전 등으로 다시 열리지 않게)
        var autoScanned by rememberSaveable { mutableStateOf(false) }
        LaunchedEffect(Unit) {
            if (autoScan && !autoScanned && scanner.supported) { autoScanned = true; scanner.scan(true, ::applyScan) }
            else if (existing == null && source == null) runCatching { focus.requestFocus() }
        }
    }
}

@Composable
private fun AccountChips(label: String, accounts: List<Account>, selected: Long?, recent: List<Long>, onAddNew: () -> Unit, onSelect: (Long) -> Unit) {
    PickerField(
        label, accounts.map { a -> PickItem(a.id, if (a.currency == KRW) a.name else "${a.name} (${a.currency})", accountColor(a)) },
        selected, recent, { id -> id?.let(onSelect) }, addLabel = "새 계좌", onAdd = onAddNew,
    )
}

private val DateSaver = Saver<LocalDate, Long>(save = { it.toEpochDays() }, restore = { LocalDate.fromEpochDays(it) })
private val NullableDateSaver = Saver<LocalDate?, Long>(
    save = { it?.toEpochDays() ?: Long.MIN_VALUE }, restore = { if (it == Long.MIN_VALUE) null else LocalDate.fromEpochDays(it) },
)

/** 새 카테고리 기본 색: 정해 둔 팔레트를 차례로 쓴다(카테고리 관리에서 바꿀 수 있음). */
fun nextCategoryColor(index: Int): Long = com.looin.finance.ui.settings.CATEGORY_PALETTE.let { it[(index * 7) % it.size] }

