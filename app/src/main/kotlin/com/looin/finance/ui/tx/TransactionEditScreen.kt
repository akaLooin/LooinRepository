package com.looin.finance.ui.tx

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.Segmented
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.korean
import kotlinx.datetime.LocalDate

/**
 * 거래 추가·수정. 새 거래는 가장 많이 쓰는 값(지출·완료·오늘·생활비 대상 계좌)으로 채워 빠르게 입력한다.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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
) {
    val data = state.data
    if (!data.loaded) return // 데이터 로드 전에 입력값을 초기화하지 않도록 대기
    val existing = txId?.let { id -> data.transactions.firstOrNull { it.id == id } }
    if (txId != null && existing == null) {
        // 삭제 직후 등 거래가 없어진 경우
        Scaffold(topBar = { TopAppBar(title = { Text("거래") }, navigationIcon = { BackButton(onClose) }) }) { p ->
            Text("거래를 찾을 수 없습니다.", Modifier.padding(p).padding(16.dp))
        }
        return
    }
    if (existing?.type == TransactionType.ADJUSTMENT || existing?.type == TransactionType.EXCHANGE) {
        ReadOnlyTransaction(existing, state, vm, onClose)
        return
    }

    val activeAccounts = data.accounts.filter { !it.archived || it.id == existing?.fromAccountId || it.id == existing?.toAccountId }
    val defaultAccount = initialAccountId ?: activeAccounts.firstOrNull { it.includeInAvailable && it.currency == KRW }?.id
        ?: activeAccounts.firstOrNull()?.id

    var type by rememberSaveable { mutableStateOf(existing?.type ?: initialType ?: TransactionType.EXPENSE) }
    var status by rememberSaveable {
        mutableStateOf(existing?.status ?: initialStatus
            ?: if ((initialDate ?: state.today) > state.today) TransactionStatus.PLANNED else TransactionStatus.COMPLETED)
    }
    var amountText by rememberSaveable { mutableStateOf(existing?.let { amountToInput(it.amount, it.currency) } ?: "") }
    var date by rememberSaveable(stateSaver = DateSaver) { mutableStateOf(existing?.date ?: initialDate ?: state.today) }
    var completedDate by rememberSaveable(stateSaver = NullableDateSaver) { mutableStateOf(existing?.completedDate) }
    var fromId by rememberSaveable { mutableStateOf(existing?.fromAccountId ?: defaultAccount) }
    var toId by rememberSaveable {
        mutableStateOf(existing?.toAccountId ?: if (type == TransactionType.INCOME) defaultAccount else null)
    }
    var categoryId by rememberSaveable { mutableStateOf(existing?.categoryId) }
    var memo by rememberSaveable { mutableStateOf(existing?.memo ?: "") }
    var errors by remember { mutableStateOf<List<String>>(emptyList()) }
    var warnings by remember { mutableStateOf<List<String>>(emptyList()) }
    var pending by remember { mutableStateOf<Transaction?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val focus = remember { FocusRequester() }

    // 예정일과 실제 처리일이 다른 완료 거래만 실제 처리일을 따로 편집한다.
    val showActualDate = existing?.completedDate != null && existing.completedDate != existing.date
    val currency = data.accountById[if (type == TransactionType.INCOME) toId else fromId]?.currency ?: KRW

    fun build(): Transaction? {
        val amount = MoneyFormat.parse(amountText, currency)
        if (amount == null) {
            errors = listOf("금액을 입력하세요."); return null
        }
        val isCompleted = status == TransactionStatus.COMPLETED
        return Transaction(
            id = existing?.id ?: 0,
            type = type,
            status = status,
            amount = amount,
            currency = currency,
            date = date,
            completedDate = if (isCompleted) (if (showActualDate) completedDate ?: date else date) else if (status == TransactionStatus.CANCELLED) existing?.completedDate else null,
            fromAccountId = if (type == TransactionType.INCOME) null else fromId,
            toAccountId = if (type == TransactionType.EXPENSE) null else toId,
            categoryId = if (type == TransactionType.TRANSFER) null else categoryId,
            memo = memo.trim(),
            source = existing?.source ?: com.looin.finance.core.model.TransactionSource.MANUAL,
            linkedPlannedId = existing?.linkedPlannedId,
            createdAt = existing?.createdAt ?: 0,
        )
    }

    fun submit() {
        val tx = build() ?: return
        vm.validate(tx) { r ->
            errors = r.errors
            if (r.isValid) {
                if (r.warnings.isEmpty()) vm.saveTransaction(tx, onClose)
                else { warnings = r.warnings; pending = tx }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "거래 추가" else "거래 수정") },
                navigationIcon = { BackButton(onClose) },
                actions = {
                    if (existing != null) IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Outlined.Delete, "삭제") }
                },
            )
        },
        bottomBar = {
            Button(onClick = ::submit, modifier = Modifier.fillMaxWidth().imePadding().padding(16.dp).height(52.dp)) {
                Text(if (existing == null) "저장" else "수정 저장")
            }
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (data.accounts.isEmpty()) {
                Text("먼저 자산 탭에서 계좌를 등록하세요.", color = MaterialTheme.colorScheme.error)
            }
            Segmented(
                listOf(TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER), type, { it.label },
                onSelect = {
                    if (it != type) {
                        // 유형이 바뀌면 방향·카테고리를 맞춘다.
                        val single = if (type == TransactionType.INCOME) toId else fromId
                        type = it
                        categoryId = null
                        when (it) {
                            TransactionType.INCOME -> { toId = single; fromId = null }
                            TransactionType.EXPENSE -> { fromId = single; toId = null }
                            else -> { fromId = single; toId = null }
                        }
                    }
                },
            )
            AmountField(amountText, { amountText = it }, "금액", Modifier.focusRequester(focus), currency = currency)

            val statusOptions = if (existing != null) TransactionStatus.entries.toList()
            else listOf(TransactionStatus.COMPLETED, TransactionStatus.PLANNED)
            Segmented(statusOptions, status, { it.label }, onSelect = { status = it })

            DateField(if (status == TransactionStatus.PLANNED) "예정일" else "날짜", date, {
                date = it
                if (existing == null && it > state.today) status = TransactionStatus.PLANNED
            }, Modifier.fillMaxWidth())
            if (status == TransactionStatus.COMPLETED && showActualDate) {
                DateField("실제 처리일", completedDate ?: date, { completedDate = it }, Modifier.fillMaxWidth())
            }
            if (status == TransactionStatus.PLANNED) SmallLabel("예정 거래는 실제 잔고에 반영되지 않고 예상 잔고에만 반영됩니다.")

            when (type) {
                TransactionType.INCOME -> AccountChips("입금 계좌", activeAccounts, toId) { toId = it }
                TransactionType.EXPENSE -> AccountChips("출금 계좌", activeAccounts, fromId) { fromId = it }
                else -> {
                    AccountChips("출금 계좌", activeAccounts, fromId) { fromId = it }
                    AccountChips("입금 계좌", activeAccounts.filter { it.id != fromId }, toId) { toId = it }
                    SmallLabel("계좌 간 이체·저축은 소비로 계산하지 않습니다.")
                }
            }

            if (type != TransactionType.TRANSFER) {
                val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
                Text("카테고리", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    data.categories.filter { it.kind == kind && (!it.archived || it.id == categoryId) }.forEach { c ->
                        FilterChip(selected = c.id == categoryId, onClick = { categoryId = if (categoryId == c.id) null else c.id },
                            label = { Text(c.name) })
                    }
                }
            }
            OutlinedTextField(memo, { memo = it }, label = { Text("메모") }, modifier = Modifier.fillMaxWidth(), singleLine = true)

            errors.forEach { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            if (existing != null) {
                SmallLabel("상태: ${existing.status.label} · 출처: ${existing.source.label}" +
                    (existing.completedDate?.let { " · 실제 처리일 ${it.korean()}" } ?: ""))
            }
            Spacer(Modifier.height(16.dp))
        }
    }

    pending?.let { tx ->
        AlertDialog(
            onDismissRequest = { pending = null },
            title = { Text("확인이 필요합니다") },
            text = { Column { warnings.forEach { Text(it) }; Spacer(Modifier.height(8.dp)); Text("그래도 저장할까요?") } },
            confirmButton = { TextButton(onClick = { pending = null; vm.saveTransaction(tx, onClose) }) { Text("저장") } },
            dismissButton = { TextButton(onClick = { pending = null }) { Text("돌아가기") } },
        )
    }
    if (confirmDelete && existing != null) {
        DeleteDialog({ confirmDelete = false }) { vm.deleteTransaction(existing.id, onClose) }
    }
    androidx.compose.runtime.LaunchedEffect(Unit) { if (existing == null) runCatching { focus.requestFocus() } }
}

@Composable
private fun BackButton(onClick: () -> Unit) {
    IconButton(onClick = onClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "뒤로") }
}

@Composable
private fun DeleteDialog(onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("거래 삭제") },
        text = { Text("이 거래를 삭제하면 관련 잔고와 통계가 다시 계산됩니다. 기록을 남기려면 삭제 대신 '취소' 상태를 사용하세요.") },
        confirmButton = { TextButton(onClick = { onDismiss(); onConfirm() }) { Text("삭제", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("닫기") } },
    )
}

@Composable
private fun AccountChips(label: String, accounts: List<Account>, selected: Long?, onSelect: (Long) -> Unit) {
    Column {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            accounts.forEach { a ->
                FilterChip(selected = a.id == selected, onClick = { onSelect(a.id) },
                    label = { Text(if (a.currency == KRW) a.name else "${a.name} (${a.currency})") })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReadOnlyTransaction(tx: Transaction, state: UiState, vm: MainViewModel, onClose: () -> Unit) {
    var confirmDelete by remember { mutableStateOf(false) }
    Scaffold(topBar = {
        TopAppBar(title = { Text(tx.type.label) }, navigationIcon = { BackButton(onClose) },
            actions = { IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Outlined.Delete, "삭제") } })
    }) { p ->
        Column(Modifier.padding(p).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("계좌: ${state.data.accountName(tx.fromAccountId ?: tx.toAccountId)}")
            Text("금액: ${if (tx.toAccountId != null) "+" else "−"}${MoneyFormat.format(tx.amount, tx.currency)}")
            Text("날짜: ${tx.effectiveDate.korean(withYear = true)}")
            Text(tx.memo)
            SmallLabel("잔고 조정 기록은 수정할 수 없습니다. 잘못 입력했다면 삭제 후 다시 조정하세요.")
        }
    }
    if (confirmDelete) DeleteDialog({ confirmDelete = false }) { vm.deleteTransaction(tx.id, onClose) }
}

private val DateSaver = androidx.compose.runtime.saveable.Saver<LocalDate, Int>(
    save = { it.toEpochDays() }, restore = { LocalDate.fromEpochDays(it) },
)
private val NullableDateSaver = androidx.compose.runtime.saveable.Saver<LocalDate?, Int>(
    save = { it?.toEpochDays() ?: Int.MIN_VALUE }, restore = { if (it == Int.MIN_VALUE) null else LocalDate.fromEpochDays(it) },
)
