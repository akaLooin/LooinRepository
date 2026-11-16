package com.looin.finance.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 고를 수 있는 항목 하나(카테고리·계좌). */
data class PickItem(val id: Long, val label: String, val dot: Color? = null)

/**
 * 많아져도 복잡하지 않은 선택 칸.
 *  - 위: 최근 쓴 항목(최대 3개)을 한 줄 칩으로, 길면 옆으로 밀어서 본다
 *  - 아래: 고른 항목 한 줄. 누르면 전체 목록이 펼쳐지고, 고르면 다시 접힌다
 *  - 처음 쓰는 사람(최근 기록·선택 없음)은 목록이 펼쳐진 채로 시작
 */
@Composable
fun PickerField(
    label: String,
    items: List<PickItem>,
    selectedId: Long?,
    recentIds: List<Long>,
    onSelect: (Long?) -> Unit,
    addLabel: String? = null,
    onAdd: (() -> Unit)? = null,
    noneLabel: String? = null,
) {
    val c = Looin.colors
    val recent = recentIds.mapNotNull { id -> items.firstOrNull { it.id == id } }.take(3)
    var expanded by rememberSaveable(label) { mutableStateOf(recent.isEmpty() && selectedId == null) }
    val selected = items.firstOrNull { it.id == selectedId }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SmallLabel(label)
        if (recent.isNotEmpty()) {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Text("최근", style = LooinType.helper, color = c.textMuted)
                recent.forEach { item -> ChipPill(item.label, item.id == selectedId, { onSelect(item.id); expanded = false }, dot = item.dot) }
            }
        }
        FieldGroup {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable { expanded = !expanded }
                    .semantics(mergeDescendants = true) { contentDescription = "$label 목록"; stateDescription = if (expanded) "펼침" else "접힘" }
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                selected?.dot?.let { Box(Modifier.size(10.dp).clip(CircleShape).background(it)); Spacer(Modifier.width(10.dp)) }
                Text(selected?.label ?: noneLabel ?: "선택하세요", style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold),
                    color = if (selected == null) c.textMuted else c.text, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                Text(if (expanded) "접기" else "전체 ${items.size}", style = LooinType.helper, color = c.textMuted)
                Icon(if (expanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown, null, tint = c.textMuted)
            }
            if (expanded) {
                val rows = buildList {
                    if (noneLabel != null) add(PickItem(-1, noneLabel))
                    addAll(items)
                }
                rows.forEach { item ->
                    FieldDivider()
                    val isSel = if (item.id == -1L) selectedId == null else item.id == selectedId
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable { onSelect(if (item.id == -1L) null else item.id); expanded = false }
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (item.dot != null) { Box(Modifier.size(10.dp).clip(CircleShape).background(item.dot)); Spacer(Modifier.width(10.dp)) }
                        Text(item.label, style = LooinType.bodyLg.copy(fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal),
                            color = if (isSel) c.primary else c.text, modifier = Modifier.weight(1f))
                        if (isSel) Icon(Icons.Filled.Check, null, tint = c.primary, modifier = Modifier.size(20.dp))
                    }
                }
                if (onAdd != null && addLabel != null) {
                    FieldDivider()
                    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(onClick = onAdd).padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Add, null, tint = c.primary, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(addLabel, style = LooinType.body.copy(fontWeight = FontWeight.SemiBold), color = c.primary)
                    }
                }
            }
        }
    }
}

/** 계좌 종류별 기본 색(사용자가 통장 색을 정하지 않았을 때). */
fun defaultAccountColor(type: com.looin.finance.core.model.AccountType): Long = when (type) {
    com.looin.finance.core.model.AccountType.CHECKING -> 0xFF2F6FED
    com.looin.finance.core.model.AccountType.CASH -> 0xFFD9861C
    com.looin.finance.core.model.AccountType.SAVINGS -> 0xFF0E9F8A
    com.looin.finance.core.model.AccountType.FOREIGN -> 0xFF7C5CDB
    com.looin.finance.core.model.AccountType.OTHER_ASSET -> 0xFF677080
    com.looin.finance.core.model.AccountType.LIABILITY -> 0xFFE0484D
}

/** 통장 색: 정한 색이 있으면 그것, 없으면 종류별 기본 색. */
fun accountColor(a: com.looin.finance.core.model.Account?): Color =
    Color(a?.let { if (it.colorArgb != 0L) it.colorArgb else defaultAccountColor(it.type) } ?: 0xFF677080)
