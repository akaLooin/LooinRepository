package com.looin.finance.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.looin.finance.core.csv.ImportItem
import com.looin.finance.core.csv.ImportStatus
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.components.typeColor
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 화면에 한 번에 보여 줄 최대 줄 수(큰 파일에서도 가볍게). 개수 요약은 전체 기준. */
private const val MAX_ROWS = 300

/**
 * CSV 가져오기 미리보기. 파일을 읽어 새 거래·중복·오류로 나눠 보여 주고,
 * 사용자가 확인해야 새 거래만 저장한다(중복·오류 줄은 건너뜀).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CsvImportScreen(state: UiState, vm: MainViewModel, onClose: () -> Unit) {
    val c = Looin.colors
    val import by vm.csvImport.collectAsState()
    val close = { vm.cancelCsvImport(); onClose() }
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding()) {
        ScreenHeader("CSV 가져오기", close)
        val cur = import
        if (cur == null) { EmptyHint("가져올 파일이 없어요. 설정 → CSV 가져오기에서 파일을 골라 주세요."); return@Column }
        val p = cur.preview
        val dupCount = p.duplicates
        val newCount = p.newItems.size + cur.keepDuplicates.size
        val errors = p.items.count { it.status == ImportStatus.ERROR }
        LazyColumn(Modifier.weight(1f).padding(horizontal = GUTTER), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SmallLabel("${p.format} · ${p.items.size}줄")
                    Text("새 거래 ${newCount}건", style = LooinType.sheetTitle, color = c.text)
                    SmallLabel("중복 ${dupCount - cur.keepDuplicates.size}건 · 오류 ${errors}건은 건너뛰어요", color = c.textSecondary)
                }
            }
            if (dupCount > 0) item {
                // 중복 재확인: 같은 날 같은 금액을 실제로 두 번 쓴 경우가 있으니 사용자가 직접 확인한다
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.planned.copy(alpha = 0.12f)).padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("중복으로 보이는 거래 ${dupCount}건을 확인해 주세요", style = LooinType.body.copy(fontWeight = FontWeight.Bold), color = c.text)
                    SmallLabel("이미 있는 거래와 날짜·금액·유형·계좌가 같아요. 같은 날 같은 금액을 실제로 두 번 쓴 경우라면 '중복 아님'을 눌러 남겨 두세요.",
                        color = c.textSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ChipPill("모두 중복 아님", cur.keepDuplicates.size == dupCount, { vm.setKeepAllDuplicates(true) })
                        ChipPill("모두 건너뛰기", cur.keepDuplicates.isEmpty(), { vm.setKeepAllDuplicates(false) })
                    }
                }
            }
            if (p.usedDefaultAccount) item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Spacer(Modifier.height(4.dp))
                    Text("계좌가 적혀 있지 않은 거래를 넣을 계좌", style = LooinType.body, color = c.text)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        state.data.accounts.filter { !it.archived }.forEach { a ->
                            ChipPill(a.name, a.id == cur.accountId, { vm.setCsvAccount(a.id) })
                        }
                    }
                }
            }
            item { SmallLabel("오늘 이후 날짜는 예정 거래로 들어가요. 기존 데이터는 지우지 않아요.") }
            // 확인이 필요한 중복을 맨 위에, 그다음 새 거래, 오류 순
            val ordered = p.items.sortedBy { when (it.status) { ImportStatus.DUPLICATE -> 0; ImportStatus.NEW -> 1; ImportStatus.ERROR -> 2 } }
            items(ordered.take(MAX_ROWS), key = { it.line }) { item ->
                ImportRow(item, state, kept = item.line in cur.keepDuplicates, onToggleKeep = { vm.toggleKeepDuplicate(item.line) })
            }
            if (p.items.size > MAX_ROWS) item { SmallLabel("… 외 ${p.items.size - MAX_ROWS}줄") }
            item { Spacer(Modifier.height(8.dp)) }
        }
        PrimaryButton(if (newCount > 0) "${newCount}건 가져오기" else "가져올 거래가 없어요",
            { vm.confirmCsvImport(onClose) },
            Modifier.padding(horizontal = GUTTER, vertical = 12.dp), enabled = newCount > 0, strong = true)
    }
}

@Composable
private fun ImportRow(item: ImportItem, state: UiState, kept: Boolean, onToggleKeep: () -> Unit) {
    val c = Looin.colors
    val tx = item.tx
    val statusColor = when (item.status) {
        ImportStatus.NEW -> c.text
        ImportStatus.DUPLICATE -> if (kept) c.text else c.planned
        ImportStatus.ERROR -> c.danger
    }
    FieldGroup {
        Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SmallLabel("${item.line}행 · " + if (item.status == ImportStatus.DUPLICATE) (if (kept) "중복 아님 · 가져옴" else "중복 의심 · 건너뜀") else item.status.label,
                    color = statusColor)
                Spacer(Modifier.weight(1f))
                if (tx != null) AmountText(tx.amount, currency = tx.currency, style = LooinType.body,
                    color = if (item.status == ImportStatus.NEW || kept) typeColor(tx.type) else c.textMuted,
                    signed = tx.type != TransactionType.TRANSFER)
            }
            if (tx != null) {
                val account = when (tx.type) {
                    TransactionType.TRANSFER -> "${state.data.accountName(tx.fromAccountId)} → ${state.data.accountName(tx.toAccountId)}"
                    TransactionType.INCOME -> state.data.accountName(tx.toAccountId)
                    else -> state.data.accountName(tx.fromAccountId)
                }
                val planned = if (tx.status == TransactionStatus.PLANNED) " · 예정" else if (tx.status == TransactionStatus.CANCELLED) " · 취소" else ""
                Row {
                    Text("${tx.date.korean(true)} · ${tx.type.label}$planned", style = LooinType.body, color = c.text)
                    Spacer(Modifier.width(8.dp))
                    Text(listOf(account, tx.memo).filter { it.isNotBlank() }.joinToString(" · "), style = LooinType.body,
                        color = c.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                }
            } else if (item.raw.isNotEmpty()) {
                SmallLabel(item.raw.joinToString(", "), color = c.textMuted)
            }
            if (item.status == ImportStatus.ERROR && item.message.isNotEmpty()) SmallLabel(item.message, color = statusColor)
            if (item.status == ImportStatus.DUPLICATE && tx != null) {
                Spacer(Modifier.height(4.dp))
                ChipPill(if (kept) "✓ 중복 아님 · 가져오기" else "중복 아님 · 가져오기", kept, onToggleKeep)
            }
        }
    }
}
