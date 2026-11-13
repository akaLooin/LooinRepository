package com.looin.finance.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.Breakdown
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.Currencies
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.theme.AmountStyle
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinShape
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

// ── 날짜 ────────────────────────────────────────────────────

private val dayNames = mapOf(
    DayOfWeek.MONDAY to "월", DayOfWeek.TUESDAY to "화", DayOfWeek.WEDNESDAY to "수", DayOfWeek.THURSDAY to "목",
    DayOfWeek.FRIDAY to "금", DayOfWeek.SATURDAY to "토", DayOfWeek.SUNDAY to "일",
)

fun LocalDate.korean(withYear: Boolean = false): String =
    (if (withYear) "${year}년 " else "") + "${monthNumber}월 ${dayOfMonth}일 (${dayNames[dayOfWeek]})"

fun LocalDate.short(): String = "$monthNumber.$dayOfMonth"
fun LocalDate.toUtcMillis(): Long = toEpochDays().toLong() * 86_400_000L
fun localDateFromUtcMillis(ms: Long): LocalDate = LocalDate.fromEpochDays((ms / 86_400_000L).toInt())

val GUTTER = LooinShape.GUTTER.dp

// ── 글자·금액 ───────────────────────────────────────────────

@Composable
fun AmountText(
    amount: Long,
    modifier: Modifier = Modifier,
    currency: String = KRW,
    color: Color = Color.Unspecified,
    style: TextStyle = LooinType.bodyLg,
    signed: Boolean = false,
    strike: Boolean = false,
) {
    Text(
        MoneyFormat.format(amount, currency, signed),
        modifier = modifier,
        color = if (color == Color.Unspecified) Looin.colors.text else color,
        style = style.merge(AmountStyle).copy(textDecoration = if (strike) TextDecoration.LineThrough else null),
        maxLines = 1,
    )
}

@Composable
fun typeColor(type: TransactionType): Color = when (type) {
    TransactionType.INCOME -> Looin.colors.income
    TransactionType.EXPENSE -> Looin.colors.expense
    else -> Looin.colors.transfer
}

/** 색 위에 올릴 글자·체크 색: 흰색이 충분히 읽히면 흰색, 아니면 검정 (투두메이트 onColor 규칙). */
fun onColor(c: Color): Color = if (c.luminance() > 0.35f) Color.Black else Color.White

@Composable
fun SmallLabel(text: String, color: Color = Looin.colors.textMuted, weight: FontWeight? = null, modifier: Modifier = Modifier) {
    Text(text, style = LooinType.helper, color = color, fontWeight = weight, modifier = modifier)
}

@Composable
fun EmptyHint(text: String) {
    Text(text, style = LooinType.body, color = Looin.colors.textMuted, modifier = Modifier.padding(vertical = 10.dp))
}

// ── 알약(Pill) ──────────────────────────────────────────────

/**
 * 섹션 머리 알약: [아이콘·점][굵은 제목][+ 원]. 투두메이트의 카테고리 알약("To Do +") 모양.
 */
@Composable
fun SectionPill(
    title: String,
    modifier: Modifier = Modifier,
    dot: Color? = null,
    titleColor: Color = Color.Unspecified,
    onAdd: (() -> Unit)? = null,
    addLabel: String = "$title 추가",
    onClick: (() -> Unit)? = null,
) {
    val c = Looin.colors
    Row(
        modifier.height(40.dp).clip(CircleShape).background(c.surface)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(start = 14.dp, end = if (onAdd != null) 5.dp else 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (dot != null) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(dot))
            Spacer(Modifier.width(8.dp))
        }
        Text(title, style = LooinType.pill, color = if (titleColor == Color.Unspecified) c.text else titleColor, maxLines = 1)
        if (onAdd != null) {
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier.size(30.dp).clip(CircleShape).background(c.bg).clickable(onClick = onAdd)
                    .semantics { contentDescription = addLabel },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, null, tint = c.text, modifier = Modifier.size(20.dp)) }
        }
    }
}

/** 섹션: 알약 머리 + 카드 없는 내용(배경 위에 바로). */
@Composable
fun Section(
    title: String,
    modifier: Modifier = Modifier,
    dot: Color? = null,
    onAdd: (() -> Unit)? = null,
    addLabel: String = "$title 추가",
    trailing: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SectionPill(title, dot = dot, onAdd = onAdd, addLabel = addLabel)
            Spacer(Modifier.weight(1f))
            trailing?.invoke(this)
        }
        Spacer(Modifier.height(6.dp))
        Column(Modifier.padding(start = 4.dp)) { content() }
    }
}

/** 칩 알약: 선택되면 흰 배경·검정 글자(다크) / 검정 배경·흰 글자(라이트). */
@Composable
fun ChipPill(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, dot: Color? = null, enabled: Boolean = true) {
    val c = Looin.colors
    Row(
        modifier.height(36.dp).clip(CircleShape)
            .background(if (selected) c.selectedBg else c.surface)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (dot != null) {
            Box(Modifier.size(9.dp).clip(CircleShape).background(dot))
            Spacer(Modifier.width(6.dp))
        }
        Text(text, style = LooinType.body.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium),
            color = when { !enabled -> c.textMuted; selected -> c.onSelected; else -> c.text }, maxLines = 1)
    }
}

/** 탭처럼 쓰는 알약 줄(한 개 선택). */
@Composable
fun <T> PillTabs(options: List<T>, selected: T, label: (T) -> String, onSelect: (T) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { o -> ChipPill(label(o), o == selected, { onSelect(o) }) }
    }
}

@Composable
fun <T> Segmented(options: List<T>, selected: T, label: (T) -> String, onSelect: (T) -> Unit, modifier: Modifier = Modifier) =
    PillTabs(options, selected, label, onSelect, modifier)

/** 테두리 알약 버튼("주", "오늘")과 원형 아이콘 버튼(‹ ›). */
@Composable
fun OutlinePill(text: String, onClick: () -> Unit) {
    val c = Looin.colors
    Box(
        Modifier.height(36.dp).widthIn(min = 44.dp).clip(CircleShape).border(1.dp, c.surfaceStrong, CircleShape)
            .clickable(onClick = onClick).padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = LooinType.body, color = c.text) }
}

@Composable
fun OutlineIcon(icon: ImageVector, description: String, onClick: () -> Unit) {
    val c = Looin.colors
    Box(
        Modifier.size(36.dp).clip(CircleShape).border(1.dp, c.surfaceStrong, CircleShape).clickable(onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = c.text, modifier = Modifier.size(20.dp)) }
}

/** 월 제목 + [오늘] [‹] [›] 머리 (투두메이트 캘린더 머리). */
@Composable
fun PeriodSwitcher(
    title: String,
    subtitle: String?,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToday: (() -> Unit)? = null,
    leading: (@Composable () -> Unit)? = null,
    extra: (@Composable () -> Unit)? = null,
) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        leading?.let { it(); Spacer(Modifier.width(10.dp)) }
        Column(Modifier.weight(1f)) {
            Text(title, style = LooinType.monthTitle, color = Looin.colors.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (subtitle != null) SmallLabel(subtitle)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            extra?.invoke()
            if (onToday != null) OutlinePill("오늘", onToday)
            OutlineIcon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "이전", onPrev)
            OutlineIcon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "다음", onNext)
        }
    }
}

// ── 원형 마커 (투두메이트 클로버 자리에 쓰는 동전 모양) ───────────

/**
 * 동전 마커.
 *  - empty: 회색 원 (거래 없음)
 *  - count: 회색 원 + 남은 예정 수
 *  - done: 강조색 원 + 체크 (모두 완료)
 *  - doneCount: 강조색 원 + 남은 예정 수 (완료와 예정 섞임)
 */
@Composable
fun CoinMarker(size: Dp, fill: Color?, check: Boolean = false, number: Int? = null, cross: Boolean = false, modifier: Modifier = Modifier) {
    val c = Looin.colors
    val bg = fill ?: c.markerEmpty
    val fg = if (fill == null) c.markerNumber else onColor(fill)
    Box(modifier.size(size).clip(CircleShape).background(bg), contentAlignment = Alignment.Center) {
        when {
            check -> Icon(Icons.Filled.Check, null, tint = fg, modifier = Modifier.size(size * 0.66f))
            cross -> Icon(Icons.Filled.Close, null, tint = fg, modifier = Modifier.size(size * 0.6f))
            number != null -> Text("$number", style = LooinType.date.copy(fontWeight = FontWeight.Bold), color = fg)
        }
    }
}

// ── 지표 줄 ─────────────────────────────────────────────────

/** 금액 지표 한 줄. [breakdown] 이 있으면 눌러서 계산 근거 시트를 연다. */
@Composable
fun MetricRow(
    label: String,
    amount: Long,
    breakdown: Breakdown? = null,
    color: Color = Color.Unspecified,
    emphasize: Boolean = false,
    sub: String? = null,
) {
    var show by remember { mutableStateOf(false) }
    val c = Looin.colors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(LooinShape.md))
            .then(if (breakdown != null) Modifier.clickable { show = true } else Modifier)
            .padding(vertical = 8.dp, horizontal = 4.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(label, style = if (emphasize) LooinType.bodyLg.copy(fontWeight = FontWeight.Bold) else LooinType.bodyLg, color = c.text)
                if (breakdown != null) {
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Outlined.Info, contentDescription = "계산 근거", modifier = Modifier.size(14.dp), tint = c.textMuted)
                }
            }
            if (sub != null) SmallLabel(sub)
        }
        AmountText(amount, color = color, style = if (emphasize) LooinType.monthTitle else LooinType.bodyLg)
    }
    if (show && breakdown != null) BreakdownSheet(breakdown) { show = false }
}

// ── 바텀 시트 ──────────────────────────────────────────────

/** 투두메이트 바텀 시트: surface-raised, 위 모서리 24, 손잡이 40×4, 가운데 제목. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LooinSheet(onDismiss: () -> Unit, title: String? = null, content: @Composable ColumnScope.() -> Unit) {
    val c = Looin.colors
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = c.surfaceRaised,
        contentColor = c.text,
        scrimColor = c.scrim,
        shape = RoundedCornerShape(topStart = LooinShape.sheet, topEnd = LooinShape.sheet),
        dragHandle = {
            Box(Modifier.padding(top = 12.dp, bottom = 8.dp).size(40.dp, 4.dp).clip(CircleShape).background(c.grabber))
        },
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = GUTTER).padding(bottom = 24.dp).navigationBarsPadding()) {
            if (title != null) {
                Text(title, style = LooinType.sheetTitle, color = c.text, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp))
            }
            content()
        }
    }
}

@Composable
fun BreakdownSheet(b: Breakdown, onDismiss: () -> Unit) {
    LooinSheet(onDismiss, "${b.title} 계산 근거") { BreakdownContent(b) }
}

@Composable
fun BreakdownContent(b: Breakdown) {
    val c = Looin.colors
    Column(Modifier.verticalScroll(rememberScrollState())) {
        if (b.formula.isNotEmpty()) {
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(LooinShape.md)).background(c.surfaceInput).padding(12.dp)) {
                SmallLabel(b.formula, color = c.textSecondary)
            }
            Spacer(Modifier.height(12.dp))
        }
        b.lines.forEach { line ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                val (sym, col) = when (line.sign) { 1 -> "+" to c.income; -1 -> "−" to c.expense; else -> "·" to c.textMuted }
                Text(sym, style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), color = col, modifier = Modifier.width(18.dp))
                Column(Modifier.weight(1f)) {
                    Text(line.label, style = LooinType.body, color = if (line.sign == 0) c.textMuted else c.text)
                    if (line.note.isNotEmpty()) SmallLabel(line.note)
                }
                AmountText(line.amount, style = LooinType.body, color = if (line.sign == 0) c.textMuted else c.text)
            }
        }
        if (b.lines.isEmpty()) EmptyHint("해당 항목 없음")
        Box(Modifier.fillMaxWidth().padding(vertical = 10.dp).height(1.dp).background(c.surfaceStrong))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(b.title, style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), modifier = Modifier.weight(1f), color = c.text)
            AmountText(b.total, style = LooinType.monthTitle)
        }
        b.notes.forEach { Spacer(Modifier.height(6.dp)); SmallLabel(it) }
    }
}

/** 시트 메뉴 줄: 색 원(30) 안 흰 아이콘 + 글자 (투두메이트 할 일 메뉴). */
@Composable
fun MenuRow(icon: ImageVector, label: String, color: Color, onClick: () -> Unit, sub: String? = null) {
    val c = Looin.colors
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(LooinShape.md)).clickable(onClick = onClick).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(32.dp).clip(CircleShape).background(color), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(16.dp))
        Column {
            Text(label, style = LooinType.bodyLg, color = c.text)
            if (sub != null) SmallLabel(sub)
        }
    }
}

/** 큰 타일 버튼(수정하기·삭제하기). */
@Composable
fun TileButton(icon: ImageVector, label: String, tint: Color, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = Looin.colors
    Column(
        modifier.height(88.dp).clip(RoundedCornerShape(LooinShape.md)).background(c.surfaceButton).clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(26.dp))
        Spacer(Modifier.height(8.dp))
        Text(label, style = LooinType.bodyLg, color = c.text)
    }
}

// ── 버튼·입력 ───────────────────────────────────────────────

/** 시트·화면 주 버튼: surface-strong 알약 54. */
@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, strong: Boolean = false) {
    val c = Looin.colors
    val bg = if (strong) c.selectedBg else c.surfaceStrong
    val fg = if (strong) c.onSelected else c.text
    Box(
        modifier.fillMaxWidth().height(54.dp).clip(CircleShape).background(if (enabled) bg else c.surface)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = LooinType.bodyLg.copy(fontWeight = FontWeight.Bold), color = if (enabled) fg else c.textMuted) }
}

@Composable
fun DangerButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = Looin.colors
    Box(
        modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(LooinShape.sm)).background(c.surfaceInput).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = LooinType.bodyLg, color = c.danger) }
}

@Composable
fun TextAction(text: String, onClick: () -> Unit, color: Color = Color.Unspecified, enabled: Boolean = true) {
    val c = Looin.colors
    Box(Modifier.heightIn(min = 44.dp).clip(CircleShape).clickable(enabled = enabled, onClick = onClick).padding(horizontal = 10.dp), contentAlignment = Alignment.Center) {
        Text(text, style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold),
            color = if (!enabled) c.textMuted else if (color == Color.Unspecified) c.text else color)
    }
}

/** 화면 머리: 높이 56, ‹ + 가운데 제목 + 오른쪽 동작. */
@Composable
fun ScreenHeader(title: String, onBack: () -> Unit, actions: @Composable RowScope.() -> Unit = {}) {
    val c = Looin.colors
    Box(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp)) {
        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "뒤로", tint = c.text)
        }
        Text(title, style = LooinType.screenTitle, color = c.text, modifier = Modifier.align(Alignment.Center))
        Row(Modifier.align(Alignment.CenterEnd), verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}

/** 편집 칸 묶음: surface-input, 모서리 20. */
@Composable
fun FieldGroup(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(LooinShape.lg)).background(Looin.colors.surfaceInput), content = content)
}

@Composable
fun FieldDivider() = Box(Modifier.fillMaxWidth().height(1.dp).background(Looin.colors.bg))

/** 값 줄: 왼쪽 이름, 오른쪽 값 + ›. */
@Composable
fun ValueRow(label: String, value: String, onClick: (() -> Unit)?, valueColor: Color = Color.Unspecified) {
    val c = Looin.colors
    Row(
        Modifier.fillMaxWidth().height(60.dp).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = LooinType.bodyLg, color = c.text, modifier = Modifier.weight(1f))
        Text(value, style = LooinType.body, color = if (valueColor == Color.Unspecified) c.text else valueColor)
        if (onClick != null) {
            Spacer(Modifier.width(6.dp))
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = c.textMuted, modifier = Modifier.size(18.dp))
        }
    }
}

/** ON/OFF 토글 54×30 (투두메이트). */
@Composable
fun LooinToggle(checked: Boolean, onChange: (Boolean) -> Unit, enabled: Boolean = true, description: String? = null) {
    val c = Looin.colors
    Box(
        Modifier.size(54.dp, 30.dp).clip(CircleShape).background(if (checked) c.toggleOn else c.toggleOff)
            .clickable(enabled = enabled) { onChange(!checked) }
            .semantics { if (description != null) contentDescription = description }
            .then(if (enabled) Modifier else Modifier.background(c.bg.copy(alpha = 0.5f))),
    ) {
        Text(if (checked) "ON" else "OFF", style = LooinType.toggleLabel, color = Color.White,
            modifier = Modifier.align(if (checked) Alignment.CenterStart else Alignment.CenterEnd).padding(horizontal = 7.dp))
        Box(Modifier.align(if (checked) Alignment.CenterEnd else Alignment.CenterStart).padding(2.dp).size(26.dp).clip(CircleShape).background(c.toggleThumb))
    }
}

@Composable
fun ToggleRow(label: String, sub: String?, checked: Boolean, onChange: (Boolean) -> Unit, enabled: Boolean = true) {
    Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = LooinType.bodyLg, color = Looin.colors.text)
            if (sub != null) SmallLabel(sub)
        }
        Spacer(Modifier.width(12.dp))
        LooinToggle(checked, onChange, enabled, label)
    }
}

/** 천 단위 쉼표를 표시하는 입력 변환(정수부만). */
object ThousandsTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val raw = text.text
        val dot = raw.indexOf('.')
        val intPart = if (dot >= 0) raw.substring(0, dot) else raw
        val rest = if (dot >= 0) raw.substring(dot) else ""
        val sb = StringBuilder()
        val o2t = IntArray(raw.length + 1)
        for (i in intPart.indices) {
            o2t[i] = sb.length
            sb.append(intPart[i])
            val remaining = intPart.length - i - 1
            if (remaining > 0 && remaining % 3 == 0 && intPart[i] != '-') sb.append(',')
        }
        o2t[intPart.length] = sb.length
        for (i in rest.indices) { o2t[intPart.length + i] = sb.length; sb.append(rest[i]) }
        o2t[raw.length] = sb.length
        val out = sb.toString()
        val t2o = IntArray(out.length + 1) { t -> (0 until raw.length).count { o2t[it] < t } }
        return TransformedText(AnnotatedString(out), object : OffsetMapping {
            override fun originalToTransformed(offset: Int) = o2t[offset.coerceIn(0, raw.length)]
            override fun transformedToOriginal(offset: Int) = t2o[offset.coerceIn(0, out.length)]
        })
    }
}

/** 밑줄 입력칸(투두메이트 TitleInput). 레이블은 위에 작게, 밑줄은 [accent] 색. 접근성 이름 = 레이블. */
@Composable
fun UnderlineField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    accent: Color = Color.Unspecified,
    textStyle: TextStyle = LooinType.bodyLg,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    suffix: String? = null,
    isError: Boolean = false,
    singleLine: Boolean = true,
) {
    val c = Looin.colors
    val line = when { isError -> c.danger; accent != Color.Unspecified -> accent; else -> c.surfaceStrong }
    Column(modifier.fillMaxWidth()) {
        SmallLabel(label)
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 8.dp)) {
            Box(Modifier.weight(1f)) {
                if (value.isEmpty() && placeholder.isNotEmpty()) Text(placeholder, style = textStyle, color = c.textPlaceholder)
                BasicTextField(
                    value = value, onValueChange = onValueChange, singleLine = singleLine,
                    textStyle = textStyle.copy(color = c.text), cursorBrush = SolidColor(c.text),
                    keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                    visualTransformation = visualTransformation,
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = label },
                )
            }
            if (suffix != null) Text(suffix, style = LooinType.bodyLg, color = c.textMuted)
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(line))
    }
}

/** 금액 입력. 숫자(및 소수 통화의 '.')만 받는다. */
@Composable
fun AmountField(
    text: String,
    onTextChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    currency: String = KRW,
    allowNegative: Boolean = false,
    isError: Boolean = false,
    accent: Color = Color.Unspecified,
) {
    val decimals = Currencies.of(currency).decimals
    UnderlineField(
        value = text,
        onValueChange = { v ->
            val filtered = v.filterIndexed { i, ch -> ch.isDigit() || (ch == '.' && decimals > 0) || (ch == '-' && allowNegative && i == 0) }
            if (filtered.count { it == '.' } <= 1 && filtered.length <= 16) onTextChange(filtered)
        },
        label = label, modifier = modifier, placeholder = "0",
        textStyle = LooinType.bigAmount.copy(fontSize = LooinType.bigAmount.fontSize),
        keyboardType = if (decimals > 0) KeyboardType.Decimal else KeyboardType.Number,
        visualTransformation = ThousandsTransformation,
        suffix = Currencies.of(currency).symbol, isError = isError, accent = accent,
    )
}

fun amountToInput(amount: Long, currency: String): String = MoneyFormat.number(amount, currency).replace(",", "")

/** 날짜 값 줄(FieldGroup 안). 누르면 달력 선택. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateField(label: String, date: LocalDate, onChange: (LocalDate) -> Unit, modifier: Modifier = Modifier) {
    var open by rememberSaveable { mutableStateOf(false) }
    Box(modifier) { ValueRow(label, date.korean(withYear = true), onClick = { open = true }) }
    if (open) {
        val c = Looin.colors
        val state = rememberDatePickerState(initialSelectedDateMillis = date.toUtcMillis())
        DatePickerDialog(
            onDismissRequest = { open = false },
            colors = DatePickerDefaults.colors(containerColor = c.surfaceRaised),
            confirmButton = {
                TextButton(onClick = { state.selectedDateMillis?.let { onChange(localDateFromUtcMillis(it)) }; open = false }) { Text("확인", color = c.text) }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("취소", color = c.textMuted) } },
        ) {
            DatePicker(state = state, showModeToggle = false, colors = DatePickerDefaults.colors(
                containerColor = c.surfaceRaised, selectedDayContainerColor = c.selectedBg, selectedDayContentColor = c.onSelected,
                todayDateBorderColor = c.text, todayContentColor = c.text,
            ))
        }
    }
}

// ── 막대 ────────────────────────────────────────────────────

@Composable
fun BudgetBar(ratioSpent: Float, ratioPlanned: Float, over: Boolean) {
    val c = Looin.colors
    Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(c.markerEmpty)) {
        Box(Modifier.fillMaxWidth((ratioSpent + ratioPlanned).coerceIn(0f, 1f)).height(8.dp).clip(CircleShape).background(c.planned.copy(alpha = 0.55f)))
        Box(Modifier.fillMaxWidth(ratioSpent.coerceIn(0f, 1f)).height(8.dp).clip(CircleShape).background(if (over) c.danger else c.positive))
    }
}

@Composable
fun HBar(fraction: Float, color: Color) {
    Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Looin.colors.markerEmpty)) {
        Box(Modifier.fillMaxWidth(fraction.coerceIn(0f, 1f)).height(6.dp).clip(CircleShape).background(color))
    }
}

// ── 거래 줄 ─────────────────────────────────────────────────

@Composable
fun StatusBadge(status: TransactionStatus) {
    val c = Looin.colors
    val color = when (status) {
        TransactionStatus.PLANNED -> c.planned
        TransactionStatus.CANCELLED -> c.cancelled
        TransactionStatus.COMPLETED -> return
    }
    Box(Modifier.border(BorderStroke(1.dp, color), CircleShape).padding(horizontal = 6.dp, vertical = 1.dp)) {
        Text(status.label, color = color, style = LooinType.tiny)
    }
}

/** 거래 줄의 앞 마커 색: 카테고리 색(없으면 유형 색). */
@Composable
fun markerColor(tx: Transaction, data: FinanceData): Color =
    tx.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: typeColor(tx.type)

/**
 * 거래 한 줄 (투두메이트 할 일 줄 모양).
 * 앞 동전: 완료 = 카테고리 색 + 체크, 예정 = 빈 동전(누르면 완료 처리), 취소 = 회색 ×.
 */
@Composable
fun TransactionRow(
    tx: Transaction,
    data: FinanceData,
    onClick: () -> Unit,
    showDate: Boolean = false,
    perspectiveAccountId: Long? = null,
    onComplete: (() -> Unit)? = null,
) {
    val c = Looin.colors
    val cancelled = tx.isCancelled
    val amountColor = if (cancelled) c.cancelled else typeColor(tx.type)
    val title = when (tx.type) {
        TransactionType.TRANSFER -> "${data.accountName(tx.fromAccountId)} → ${data.accountName(tx.toAccountId)}"
        TransactionType.ADJUSTMENT -> "잔고 조정"
        else -> tx.memo.ifBlank { data.categoryName(tx.categoryId) }
    }
    val subtitle = buildList {
        if (showDate) add(tx.effectiveDate.short())
        if (tx.type == TransactionType.INCOME || tx.type == TransactionType.EXPENSE) {
            if (tx.memo.isNotBlank()) add(data.categoryName(tx.categoryId))
            add(data.accountName(if (tx.type == TransactionType.INCOME) tx.toAccountId else tx.fromAccountId))
        } else if (tx.type == TransactionType.ADJUSTMENT) add(data.accountName(tx.fromAccountId ?: tx.toAccountId))
        else if (tx.memo.isNotBlank()) add(tx.memo)
    }.joinToString(" · ")
    val signed = when {
        perspectiveAccountId != null -> tx.deltaFor(perspectiveAccountId)
        tx.type == TransactionType.INCOME -> tx.amount
        tx.type == TransactionType.EXPENSE -> -tx.amount
        tx.type == TransactionType.ADJUSTMENT -> if (tx.toAccountId != null) tx.amount else -tx.amount
        else -> tx.amount
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(LooinShape.md)).clickable(onClick = onClick).padding(vertical = 8.dp),
    ) {
        val markerMod = if (tx.isPlanned && onComplete != null)
            Modifier.clip(CircleShape).clickable(onClick = onComplete).semantics { contentDescription = "완료 처리" }.padding(6.dp)
        else Modifier.padding(6.dp)
        Box(markerMod) {
            when {
                cancelled -> CoinMarker(25.dp, null, cross = true)
                tx.isPlanned -> CoinMarker(25.dp, if (c.isDark) Color.White else c.markerEmpty)
                else -> CoinMarker(25.dp, markerColor(tx, data), check = true)
            }
        }
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = LooinType.bodyLg, color = if (cancelled) c.textMuted else c.text, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    textDecoration = if (cancelled) TextDecoration.LineThrough else null, modifier = Modifier.weight(1f, fill = false))
                Spacer(Modifier.width(6.dp))
                StatusBadge(tx.status)
            }
            if (subtitle.isNotEmpty()) Text(subtitle, style = LooinType.helper, color = c.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.width(8.dp))
        AmountText(signed, currency = tx.currency, color = amountColor,
            signed = tx.type != TransactionType.TRANSFER || perspectiveAccountId != null, strike = cancelled, style = LooinType.bodyLg)
    }
}

// ── 완료 처리 시트 ──────────────────────────────────────────

@Composable
fun CompleteSheet(tx: Transaction, today: LocalDate, onDismiss: () -> Unit, onConfirm: (LocalDate, Long) -> Unit) {
    LooinSheet(onDismiss, "완료 처리") { CompleteForm(tx, today, onConfirm) }
}

@Composable
fun CompleteDialog(tx: Transaction, today: LocalDate, onDismiss: () -> Unit, onConfirm: (LocalDate, Long) -> Unit) =
    CompleteSheet(tx, today, onDismiss, onConfirm)

@Composable
fun CompleteForm(tx: Transaction, today: LocalDate, onConfirm: (LocalDate, Long) -> Unit) {
    var date by remember { mutableStateOf(if (tx.date < today) tx.date else today) }
    var text by remember { mutableStateOf(amountToInput(tx.amount, tx.currency)) }
    val amount = MoneyFormat.parse(text, tx.currency)
    val error = when {
        amount == null || amount <= 0 -> "금액을 확인하세요"
        date > today -> "실제 처리일은 오늘 이후일 수 없습니다"
        else -> null
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SmallLabel("예정일 ${tx.date.korean()} · 실제 금액과 날짜가 다르면 고쳐 주세요")
        AmountField(text, { text = it }, "실제 금액", currency = tx.currency, isError = amount == null, accent = typeColor(tx.type))
        FieldGroup { DateField("실제 처리일", date, { date = it }) }
        if (error != null) SmallLabel(error, color = Looin.colors.danger)
        PrimaryButton("완료", { onConfirm(date, amount!!) }, enabled = error == null, strong = true)
    }
}

/** 확인 대화상자(투두메이트 ConfirmDialog 색). */
@Composable
fun ConfirmDialog(title: String, text: String, confirm: String, onDismiss: () -> Unit, danger: Boolean = false, dismiss: String = "닫기", onConfirm: () -> Unit) {
    val c = Looin.colors
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = c.surfaceRaised, titleContentColor = c.text, textContentColor = c.textSecondary,
        shape = RoundedCornerShape(LooinShape.lg),
        title = { Text(title, style = LooinType.sheetTitle) },
        text = { Text(text, style = LooinType.body) },
        confirmButton = { TextAction(confirm, { onDismiss(); onConfirm() }, color = if (danger) c.danger else c.text) },
        dismissButton = { TextAction(dismiss, onDismiss, color = c.textMuted) },
    )
}

