package com.looin.finance.ui.tx

import androidx.compose.foundation.layout.Arrangement
import kotlinx.datetime.number
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.outlined.Block
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.TextAction
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.components.CompleteForm
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.MenuRow
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TileButton
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.Looin
import kotlinx.datetime.LocalDate
import kotlin.time.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * 거래를 누르면 뜨는 메뉴 시트 (투두메이트 할 일 메뉴 모양):
 * [수정하기][삭제하기] 타일 + 색 원 메뉴(완료 처리 / 취소 처리 / 예정으로 되돌리기 / 복사해서 새로 입력 / 정보 보기).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TransactionActionSheet(
    tx: Transaction,
    data: FinanceData,
    today: LocalDate,
    vm: MainViewModel,
    onDismiss: () -> Unit,
    onEdit: (Transaction) -> Unit,
    onCopy: (Transaction) -> Unit,
    onOpenRule: (Long) -> Unit = {},
) {
    val c = Looin.colors
    var mode by remember { mutableStateOf("menu") }
    var confirmDelete by remember { mutableStateOf(false) }
    val title = when (tx.type) {
        TransactionType.TRANSFER -> "저축 및 이체 ${MoneyFormat.format(tx.amount, tx.currency)}"
        TransactionType.ADJUSTMENT -> "잔고 조정"
        else -> tx.memo.ifBlank { data.categoryName(tx.categoryId) }
    }
    // 유형 바꾸기: 지출 ↔ 수입 ↔ 저축 및 이체. 원래 쓰던 계좌는 그대로 두고, 이체는 넣을 자산을 고른다.
    val baseAccount = tx.fromAccountId ?: tx.toAccountId
    fun convert(to: TransactionType, dest: Long? = null) {
        vm.saveTransaction(convertType(tx, to, dest)) { mode = "menu" }
    }
    LooinSheet(onDismiss, when (mode) { "complete" -> "완료 처리"; "transferTo" -> "어느 자산으로 넣을까요?"; else -> title }) {
        when (mode) {
            "transferTo" -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val source = if (tx.type == TransactionType.TRANSFER) tx.fromAccountId else baseAccount
                SmallLabel("${data.accountName(source)}에서 ${MoneyFormat.format(tx.amount, tx.currency)}을 옮겨요. 저축·이체는 소비로 계산하지 않아요.")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    data.accounts.filter { !it.archived && it.id != source && it.currency == tx.currency }.forEach { a ->
                        ChipPill(a.name, a.id == tx.toAccountId && tx.type == TransactionType.TRANSFER, { convert(TransactionType.TRANSFER, a.id) })
                    }
                }
                if (data.accounts.count { !it.archived && it.id != source && it.currency == tx.currency } == 0) {
                    SmallLabel("옮길 수 있는 다른 계좌가 없어요. 자산 탭에서 저축 계좌를 먼저 추가하세요.", color = c.danger)
                }
                TextAction("돌아가기", { mode = "menu" })
            }
            "complete" -> CompleteForm(tx, today) { d, a -> onDismiss(); vm.completeTransaction(tx.id, d, a) }
            "info" -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SmallLabel("유형 ${tx.type.label} · 상태 ${tx.status.label} · 출처 ${tx.source.label}", color = c.textSecondary)
                SmallLabel("금액 ${MoneyFormat.format(tx.amount, tx.currency)}", color = c.textSecondary)
                SmallLabel((if (tx.isPlanned) "예정일 " else "발생일 ") + tx.date.korean(true), color = c.textSecondary)
                tx.completedDate?.let { SmallLabel("실제 처리일 ${it.korean(true)}", color = c.textSecondary) }
                tx.fromAccountId?.let { SmallLabel("출금 ${data.accountName(it)}", color = c.textSecondary) }
                tx.toAccountId?.let { SmallLabel("입금 ${data.accountName(it)}", color = c.textSecondary) }
                if (tx.memo.isNotBlank()) SmallLabel("메모 ${tx.memo}", color = c.textSecondary)
                SmallLabel("만든 시각 ${stamp(tx.createdAt)} · 고친 시각 ${stamp(tx.updatedAt)}")
            }
            else -> Column {
                val editable = tx.type != TransactionType.ADJUSTMENT && tx.type != TransactionType.EXCHANGE
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    if (editable) TileButton(Icons.Outlined.Edit, "수정하기", c.menuEdit, { onDismiss(); onEdit(tx) }, Modifier.weight(1f))
                    TileButton(Icons.Outlined.Delete, "삭제하기", c.menuDelete, { confirmDelete = true }, Modifier.weight(1f))
                }
                Spacer(Modifier.height(12.dp))
                if (editable) {
                    SmallLabel("유형")
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER).forEach { t ->
                            ChipPill(t.label, tx.type == t, {
                                if (t == TransactionType.TRANSFER) mode = "transferTo" else if (t != tx.type) convert(t)
                            })
                        }
                    }
                    if (tx.type == TransactionType.TRANSFER) {
                        Spacer(Modifier.height(4.dp))
                        MenuRow(Icons.Outlined.SwapHoriz, "넣을 자산: ${data.accountName(tx.toAccountId)}", c.transfer, { mode = "transferTo" },
                            "${data.accountName(tx.fromAccountId)} → ${data.accountName(tx.toAccountId)} · 눌러서 바꾸기")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                if (tx.isPlanned) MenuRow(Icons.Outlined.CheckCircle, "완료 처리", c.menuDone, { mode = "complete" }, "실제 처리일과 금액을 기록합니다")
                if (!tx.isCancelled && tx.type != TransactionType.ADJUSTMENT) {
                    MenuRow(Icons.Outlined.Block, "취소 처리", c.menuRepeat, { onDismiss(); vm.cancelTransaction(tx.id) }, "기록은 남기고 계산에서 뺍니다")
                }
                if (!tx.isPlanned && tx.type != TransactionType.ADJUSTMENT) {
                    MenuRow(Icons.AutoMirrored.Filled.Undo, "예정으로 되돌리기", c.menuMove, { onDismiss(); vm.reopenTransaction(tx.id) })
                }
                if (editable) MenuRow(Icons.Outlined.ContentCopy, "복사해서 새로 입력", c.menuSoft, { onDismiss(); onCopy(tx) })
                val rule = tx.recurringId?.let { id -> data.rules.firstOrNull { it.id == id } }
                if (rule != null) MenuRow(Icons.Outlined.Repeat, "반복 규칙 보기", c.menuMove, { onDismiss(); onOpenRule(rule.id) }, rule.scheduleLabel)
                MenuRow(Icons.Outlined.Info, "정보 보기", c.menuInfo, { mode = "info" })
            }
        }
    }
    if (confirmDelete) {
        ConfirmDialog("거래 삭제", "삭제하면 관련 잔고와 통계가 다시 계산됩니다. 기록을 남기려면 '취소 처리'를 쓰세요.", "삭제",
            { confirmDelete = false }, danger = true) { onDismiss(); vm.deleteTransaction(tx.id) }
    }
}

private fun stamp(ms: Long): String {
    if (ms <= 0) return "-"
    val t = Instant.fromEpochMilliseconds(ms).toLocalDateTime(TimeZone.currentSystemDefault())
    return "${t.date.short2()} ${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}"
}

private fun LocalDate.short2() = "$year.${month.number}.$day"

/**
 * 거래 유형 바꾸기. 원래 쓰던 계좌는 유지한다.
 *  - 지출로: 그 계좌에서 나간 돈 / 수입으로: 그 계좌로 들어온 돈(이체였다면 입금 계좌)
 *  - 저축 및 이체로: 원래 계좌(이체였다면 출금 계좌)에서 [dest] 로
 * 카테고리는 수입·지출 종류가 달라지므로 비운다(미분류).
 */
fun convertType(tx: Transaction, to: TransactionType, dest: Long? = null): Transaction {
    val base = tx.fromAccountId ?: tx.toAccountId
    return when (to) {
        TransactionType.EXPENSE -> tx.copy(type = to, fromAccountId = base, toAccountId = null, categoryId = null)
        TransactionType.INCOME -> tx.copy(type = to, fromAccountId = null,
            toAccountId = if (tx.type == TransactionType.TRANSFER) tx.toAccountId else base, categoryId = null)
        TransactionType.TRANSFER -> tx.copy(type = to, fromAccountId = if (tx.type == TransactionType.TRANSFER) tx.fromAccountId else base,
            toAccountId = dest, categoryId = null)
        else -> tx
    }
}
