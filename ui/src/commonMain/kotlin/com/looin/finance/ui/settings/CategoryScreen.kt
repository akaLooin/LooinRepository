package com.looin.finance.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.ToggleRow
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 카테고리 색 팔레트 (투두메이트 메뉴 색 + 기본 카테고리 색). */
val CATEGORY_PALETTE = listOf(
    0xFFE57373, 0xFFFC5A5A, 0xFFFC7812, 0xFFFFB74D, 0xFFFCD218, 0xFF81C784, 0xFF00C072, 0xFF4DB6AC,
    0xFF64B5F6, 0xFF0C78ED, 0xFF4E7EFC, 0xFF666CF0, 0xFF9575CD, 0xFFBA68C8, 0xFFF060E4, 0xFFF06292,
    0xFFA1887F, 0xFF90A4AE, 0xFFBDBDBD, 0xFF757575,
)

@Composable
fun CategoryScreen(state: UiState, vm: MainViewModel, onBack: () -> Unit) {
    val c = Looin.colors
    var kind by rememberSaveable { mutableStateOf(CategoryKind.EXPENSE) }
    var editing by remember { mutableStateOf<Category?>(null) }
    val list = state.data.categories.filter { it.kind == kind }.sortedWith(compareBy<Category> { it.archived }.thenBy { it.sortOrder }.thenBy { it.id })
    val used = remember(state.data.transactions) { state.data.transactions.groupingBy { it.categoryId }.eachCount() }

    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding()) {
        ScreenHeader("카테고리 관리", onBack)
        Column(Modifier.padding(horizontal = GUTTER)) {
            PillTabs(listOf(CategoryKind.EXPENSE, CategoryKind.INCOME), kind, { it.label }, { kind = it })
            Spacer(Modifier.size(6.dp))
            SmallLabel("지우는 대신 '보관'하면 새 거래 선택 목록에서만 빠지고, 지난 기록은 그대로 남아요.")
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = GUTTER, vertical = 12.dp)) {
            items(list, key = { it.id }) { cat ->
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { editing = cat }.padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(22.dp).clip(CircleShape).background(Color(cat.colorArgb).copy(alpha = if (cat.archived) 0.4f else 1f)))
                    Spacer(Modifier.width(14.dp))
                    Text(cat.name, style = LooinType.bodyLg, color = if (cat.archived) c.textMuted else c.text, modifier = Modifier.weight(1f))
                    SmallLabel((if (cat.archived) "보관됨 · " else "") + "거래 ${used[cat.id] ?: 0}건")
                }
            }
        }
        PrimaryButton("+ ${kind.label} 카테고리 추가", {
            editing = Category(name = "", kind = kind, colorArgb = CATEGORY_PALETTE[(list.size * 7) % CATEGORY_PALETTE.size])
        }, Modifier.padding(horizontal = GUTTER, vertical = 12.dp), strong = true)
    }

    editing?.let { cat ->
        LooinSheet({ editing = null }, if (cat.id == 0L) "카테고리 추가" else "카테고리 편집") {
            CategoryForm(cat) { updated -> vm.saveCategory(updated) { editing = null } }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryForm(cat: Category, onSave: (Category) -> Unit) {
    val c = Looin.colors
    var name by remember { mutableStateOf(cat.name) }
    var color by remember { mutableStateOf(cat.colorArgb) }
    var archived by remember { mutableStateOf(cat.archived) }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        UnderlineField(name, { name = it.take(20) }, "${cat.kind.label} 카테고리 이름", placeholder = "예: 반려동물", accent = Color(color),
            textStyle = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold))
        SmallLabel("색")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            CATEGORY_PALETTE.forEach { argb ->
                val sel = argb == color
                Box(
                    Modifier.size(34.dp).clip(CircleShape).background(Color(argb))
                        .then(if (sel) Modifier.border(3.dp, c.text, CircleShape) else Modifier)
                        .clickable { color = argb }.semantics { contentDescription = "색 선택" },
                )
            }
        }
        if (cat.id != 0L) FieldGroup { ToggleRow("보관", "새 거래·예산 선택 목록에서 숨겨요", archived, { archived = it }) }
        PrimaryButton("저장", { onSave(cat.copy(name = name, colorArgb = color, archived = archived)) }, enabled = name.isNotBlank(), strong = true)
    }
}
