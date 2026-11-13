package com.looin.finance.ui.tx

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
        var confirmDelete by remember { mutableStateOf(false) }
        val focus = remember { FocusRequester() }

        val showActualDate = existing?.completedDate != null && existing.completedDate != existing.date
        val currency = data.accountById[if (type == TransactionType.INCOME) toId else fromId]?.currency ?: KRW
        val accent = categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: typeColor(type)

        fun build(): Transaction? {
            val amount = MoneyFormat.parse(amountText, currency) ?: run { errors = listOf("금액을 입력하세요."); return null }
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
            )
        }

        fun submit() {
            val tx = build() ?: return
            vm.validate(tx) { r ->
                errors = r.errors
                if (r.isValid) {
                    if (r.warnings.isEmpty()) vm.saveTransaction(tx, onClose) else { warnings = r.warnings; pending = tx }
                }
            }
        }

        ScreenHeader(if (existing == null) "거래 추가" else "거래 수정", onClose) {
            if (existing != null) TextAction("삭제", { confirmDelete = true }, color = c.danger)
        }
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = GUTTER),
            verticalArrangement = Arrangement.spacedBy(20.dp),
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
            AmountField(amountText, { amountText = it }, "금액", Modifier.focusRequester(focus), currency = currency, accent = accent)
            UnderlineField(memo, { memo = it }, "메모", placeholder = "무엇에 썼나요? (선택)", accent = accent)

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
            when (type) {
                TransactionType.INCOME -> AccountChips("입금 계좌", activeAccounts, toId) { toId = it }
                TransactionType.EXPENSE -> AccountChips("출금 계좌", activeAccounts, fromId) { fromId = it }
                else -> {
                    AccountChips("출금 계좌", activeAccounts, fromId) { fromId = it }
                    AccountChips("입금 계좌", activeAccounts.filter { it.id != fromId }, toId) { toId = it }
                    SmallLabel("계좌 간 이체·저축은 소비로 계산하지 않아요.")
                }
            }
            if (type != TransactionType.TRANSFER) {
                val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SmallLabel("카테고리")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        data.categories.filter { it.kind == kind && (!it.archived || it.id == categoryId) }.forEach { cat ->
                            ChipPill(cat.name, cat.id == categoryId, { categoryId = if (categoryId == cat.id) null else cat.id }, dot = Color(cat.colorArgb))
                        }
                    }
                }
            }
            errors.forEach { Text(it, color = c.danger, style = LooinType.body) }
            if (existing != null) SmallLabel("상태 ${existing.status.label} · 출처 ${existing.source.label}")
            Spacer(Modifier.height(16.dp))
        }
        PrimaryButton(if (existing == null) "저장" else "수정 저장", ::submit, Modifier.padding(horizontal = GUTTER, vertical = 12.dp), strong = true)

        pending?.let { tx ->
            ConfirmDialog("확인이 필요해요", warnings.joinToString("\n") + "\n\n그래도 저장할까요?", "저장", { pending = null }, dismiss = "돌아가기") {
                vm.saveTransaction(tx, onClose)
            }
        }
        if (confirmDelete && existing != null) {
            ConfirmDialog("거래 삭제", "삭제하면 관련 잔고와 통계가 다시 계산돼요. 기록을 남기려면 '취소' 상태를 쓰세요.", "삭제",
                { confirmDelete = false }, danger = true) { vm.deleteTransaction(existing.id, onClose) }
        }
        LaunchedEffect(Unit) { if (existing == null && source == null) runCatching { focus.requestFocus() } }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AccountChips(label: String, accounts: List<Account>, selected: Long?, onSelect: (Long) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SmallLabel(label)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            accounts.forEach { a ->
                ChipPill(if (a.currency == KRW) a.name else "${a.name} (${a.currency})", a.id == selected, { onSelect(a.id) })
            }
        }
    }
}

private val DateSaver = Saver<LocalDate, Int>(save = { it.toEpochDays() }, restore = { LocalDate.fromEpochDays(it) })
private val NullableDateSaver = Saver<LocalDate?, Int>(
    save = { it?.toEpochDays() ?: Int.MIN_VALUE }, restore = { if (it == Int.MIN_VALUE) null else LocalDate.fromEpochDays(it) },
)
