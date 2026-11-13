package com.looin.finance.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
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
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
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
import com.looin.finance.ui.theme.FinanceTheme
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

// ── 날짜 표시 ───────────────────────────────────────────────

private val dayNames = mapOf(
    DayOfWeek.MONDAY to "월", DayOfWeek.TUESDAY to "화", DayOfWeek.WEDNESDAY to "수", DayOfWeek.THURSDAY to "목",
    DayOfWeek.FRIDAY to "금", DayOfWeek.SATURDAY to "토", DayOfWeek.SUNDAY to "일",
)

fun LocalDate.korean(withYear: Boolean = false): String =
    (if (withYear) "${year}년 " else "") + "${monthNumber}월 ${dayOfMonth}일 (${dayNames[dayOfWeek]})"

fun LocalDate.short(): String = "$monthNumber.$dayOfMonth"

fun LocalDate.toUtcMillis(): Long = toEpochDays().toLong() * 86_400_000L
fun localDateFromUtcMillis(ms: Long): LocalDate = LocalDate.fromEpochDays((ms / 86_400_000L).toInt())

// ── 금액 ────────────────────────────────────────────────────

@Composable
fun AmountText(
    amount: Long,
    modifier: Modifier = Modifier,
    currency: String = KRW,
    color: Color = Color.Unspecified,
    style: TextStyle = MaterialTheme.typography.bodyLarge,
    signed: Boolean = false,
    strike: Boolean = false,
) {
    Text(
        MoneyFormat.format(amount, currency, signed),
        modifier = modifier,
        color = color,
        style = style.merge(AmountStyle).copy(textDecoration = if (strike) TextDecoration.LineThrough else null),
        maxLines = 1,
    )
}

@Composable
fun typeColor(type: TransactionType): Color = when (type) {
    TransactionType.INCOME -> FinanceTheme.colors.income
    TransactionType.EXPENSE -> FinanceTheme.colors.expense
    else -> FinanceTheme.colors.transfer
}

/** 천 단위 쉼표를 표시하는 입력 변환(정수부만). */
object ThousandsTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val raw = text.text
        val dot = raw.indexOf('.')
        val intPart = if (dot >= 0) raw.substring(0, dot) else raw
        val rest = if (dot >= 0) raw.substring(dot) else ""
        val sb = StringBuilder()
        val originalToTransformed = IntArray(raw.length + 1)
        for (i in intPart.indices) {
            originalToTransformed[i] = sb.length
            sb.append(intPart[i])
            val remaining = intPart.length - i - 1
            if (remaining > 0 && remaining % 3 == 0) sb.append(',')
        }
        originalToTransformed[intPart.length] = sb.length
        for (i in rest.indices) {
            originalToTransformed[intPart.length + i] = sb.length
            sb.append(rest[i])
        }
        originalToTransformed[raw.length] = sb.length
        val out = sb.toString()
        // 변환 위치 t 앞에 놓인 원본 문자 수
        val transformedToOriginal = IntArray(out.length + 1) { t -> (0 until raw.length).count { originalToTransformed[it] < t } }
        return TransformedText(AnnotatedString(out), object : OffsetMapping {
            override fun originalToTransformed(offset: Int) = originalToTransformed[offset.coerceIn(0, raw.length)]
            override fun transformedToOriginal(offset: Int) = transformedToOriginal[offset.coerceIn(0, out.length)]
        })
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
) {
    val decimals = Currencies.of(currency).decimals
    OutlinedTextField(
        value = text,
        onValueChange = { v ->
            val filtered = v.filterIndexed { i, c -> c.isDigit() || (c == '.' && decimals > 0) || (c == '-' && allowNegative && i == 0) }
            if (filtered.count { it == '.' } <= 1 && filtered.length <= 16) onTextChange(filtered)
        },
        label = { Text(label) },
        suffix = { Text(Currencies.of(currency).symbol) },
        singleLine = true,
        isError = isError,
        textStyle = MaterialTheme.typography.titleLarge.merge(AmountStyle),
        visualTransformation = ThousandsTransformation,
        keyboardOptions = KeyboardOptions(keyboardType = if (decimals > 0) KeyboardType.Decimal else KeyboardType.Number),
        modifier = modifier.fillMaxWidth(),
    )
}

/** 최소 통화 단위 → 입력창 문자열(쉼표 없이). */
fun amountToInput(amount: Long, currency: String): String =
    MoneyFormat.number(amount, currency).replace(",", "")

// ── 카드·행 ─────────────────────────────────────────────────

@Composable
fun SectionCard(
    title: String? = null,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            if (title != null || action != null) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    if (title != null) Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    action?.invoke()
                }
                Spacer(Modifier.height(8.dp))
            }
            content()
        }
    }
}

/** 금액 지표 한 줄. [breakdown] 이 있으면 눌러서 계산 근거를 볼 수 있다. */
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
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .then(if (breakdown != null) Modifier.clickable { show = true } else Modifier)
            .padding(vertical = 8.dp, horizontal = 4.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(label, style = if (emphasize) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium)
                if (breakdown != null) {
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Outlined.Info, contentDescription = "계산 근거", modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        AmountText(amount, color = color, style = if (emphasize) MaterialTheme.typography.titleLarge else MaterialTheme.typography.bodyLarge)
    }
    if (show && breakdown != null) BreakdownDialog(breakdown) { show = false }
}

@Composable
fun BreakdownDialog(b: Breakdown, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("닫기") } },
        title = { Text("${b.title} 계산 근거") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                if (b.formula.isNotEmpty()) {
                    Text(b.formula, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                }
                b.lines.forEach { line ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                (when (line.sign) { 1 -> "+ "; -1 -> "− "; else -> "· " }) + line.label,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (line.sign == 0) MaterialTheme.colorScheme.onSurfaceVariant else Color.Unspecified,
                            )
                            if (line.note.isNotEmpty()) Text(line.note, style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AmountText(line.amount, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                if (b.lines.isEmpty()) Text("해당 항목 없음", style = MaterialTheme.typography.bodyMedium)
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                Row(Modifier.fillMaxWidth()) {
                    Text("= ${b.title}", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    AmountText(b.total, style = MaterialTheme.typography.titleSmall)
                }
                b.notes.forEach {
                    Spacer(Modifier.height(6.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
    )
}

@Composable
fun StatusBadge(status: TransactionStatus) {
    val c = FinanceTheme.colors
    val (fg, filled) = when (status) {
        TransactionStatus.PLANNED -> c.planned to false
        TransactionStatus.COMPLETED -> MaterialTheme.colorScheme.onSurfaceVariant to false
        TransactionStatus.CANCELLED -> c.cancelled to false
    }
    if (status == TransactionStatus.COMPLETED) return // 완료는 기본 상태라 배지 생략(정보 밀도 우선)
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = if (filled) fg else Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(1.dp, fg),
    ) {
        Text(status.label, color = fg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
    }
}

/** 거래 한 줄. 예정 거래는 바로 '완료' 버튼을 제공한다. */
@Composable
fun TransactionRow(
    tx: Transaction,
    data: FinanceData,
    onClick: () -> Unit,
    showDate: Boolean = false,
    perspectiveAccountId: Long? = null,
    onComplete: (() -> Unit)? = null,
) {
    val cancelled = tx.isCancelled
    val color = if (cancelled) FinanceTheme.colors.cancelled else typeColor(tx.type)
    val title = when (tx.type) {
        TransactionType.TRANSFER -> "${data.accountName(tx.fromAccountId)} → ${data.accountName(tx.toAccountId)}"
        TransactionType.ADJUSTMENT -> "잔고 조정"
        else -> data.categoryName(tx.categoryId)
    }
    val subtitle = buildList {
        if (showDate) add(tx.effectiveDate.short())
        when (tx.type) {
            TransactionType.INCOME -> add(data.accountName(tx.toAccountId))
            TransactionType.EXPENSE -> add(data.accountName(tx.fromAccountId))
            TransactionType.ADJUSTMENT -> add(data.accountName(tx.fromAccountId ?: tx.toAccountId))
            else -> {}
        }
        if (tx.memo.isNotBlank()) add(tx.memo)
    }.joinToString(" · ")
    val signedAmount = when {
        perspectiveAccountId != null -> tx.deltaFor(perspectiveAccountId)
        tx.type == TransactionType.INCOME -> tx.amount
        tx.type == TransactionType.EXPENSE -> -tx.amount
        tx.type == TransactionType.ADJUSTMENT -> if (tx.toAccountId != null) tx.amount else -tx.amount
        else -> tx.amount
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp, horizontal = 4.dp),
    ) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    textDecoration = if (cancelled) TextDecoration.LineThrough else null, modifier = Modifier.weight(1f, fill = false))
                Spacer(Modifier.width(6.dp))
                Text(tx.type.label, style = MaterialTheme.typography.labelSmall, color = color)
                Spacer(Modifier.width(4.dp))
                StatusBadge(tx.status)
            }
            if (subtitle.isNotEmpty()) Text(subtitle, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            AmountText(signedAmount, currency = tx.currency, color = color, signed = tx.type != TransactionType.TRANSFER || perspectiveAccountId != null,
                strike = cancelled)
            if (onComplete != null && tx.isPlanned) {
                TextButton(onClick = onComplete, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    modifier = Modifier.height(28.dp)) { Text("완료", style = MaterialTheme.typography.labelMedium) }
            }
        }
    }
}

// ── 입력 보조 ───────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateField(label: String, date: LocalDate, onChange: (LocalDate) -> Unit, modifier: Modifier = Modifier) {
    var open by rememberSaveable { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }, modifier = modifier) {
        Text("$label  ${date.korean(withYear = true)}")
    }
    if (open) {
        val state = rememberDatePickerState(initialSelectedDateMillis = date.toUtcMillis())
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onChange(localDateFromUtcMillis(it)) }
                    open = false
                }) { Text("확인") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("취소") } },
        ) { DatePicker(state = state, showModeToggle = false) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> Segmented(options: List<T>, selected: T, label: (T) -> String, onSelect: (T) -> Unit, modifier: Modifier = Modifier) {
    SingleChoiceSegmentedButtonRow(modifier.fillMaxWidth()) {
        options.forEachIndexed { i, o ->
            SegmentedButton(
                selected = o == selected,
                onClick = { onSelect(o) },
                shape = SegmentedButtonDefaults.itemShape(i, options.size),
                label = { Text(label(o), maxLines = 1) },
            )
        }
    }
}

@Composable
fun PeriodSwitcher(title: String, subtitle: String?, onPrev: () -> Unit, onNext: () -> Unit, onToday: (() -> Unit)? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = onPrev) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "이전") }
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (onToday != null) TextButton(onClick = onToday) { Text("오늘") }
        IconButton(onClick = onNext) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "다음") }
    }
}

@Composable
fun BudgetBar(ratioSpent: Float, ratioPlanned: Float, over: Boolean) {
    val c = FinanceTheme.colors
    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) {
        Box(Modifier.fillMaxWidth((ratioSpent + ratioPlanned).coerceIn(0f, 1f)).height(8.dp).background(c.planned.copy(alpha = 0.45f)))
        Box(Modifier.fillMaxWidth(ratioSpent.coerceIn(0f, 1f)).height(8.dp).background(if (over) c.warning else MaterialTheme.colorScheme.primary))
    }
}

/** 단순 가로 막대(분석용). */
@Composable
fun HBar(fraction: Float, color: Color) {
    LinearProgressIndicator(
        progress = { fraction.coerceIn(0f, 1f) },
        color = color,
        trackColor = MaterialTheme.colorScheme.surfaceVariant,
        drawStopIndicator = {},
        gapSize = 0.dp,
        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
    )
}

/** 예정 거래 완료 처리: 실제 처리일·실제 금액 확인. */
@Composable
fun CompleteDialog(tx: Transaction, today: LocalDate, onDismiss: () -> Unit, onConfirm: (LocalDate, Long) -> Unit) {
    var date by remember { mutableStateOf(if (tx.date < today) tx.date else today) }
    var text by remember { mutableStateOf(amountToInput(tx.amount, tx.currency)) }
    val amount = MoneyFormat.parse(text, tx.currency)
    val error = when {
        amount == null || amount <= 0 -> "금액을 확인하세요"
        date > today -> "실제 처리일은 오늘 이후일 수 없습니다"
        else -> null
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("완료 처리") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("예정일: ${tx.date.korean()}", style = MaterialTheme.typography.bodyMedium)
                AmountField(text, { text = it }, "실제 금액", currency = tx.currency, isError = amount == null)
                DateField("실제 처리일", date, { date = it }, Modifier.fillMaxWidth())
                if (error != null) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { TextButton(enabled = error == null, onClick = { onConfirm(date, amount!!) }) { Text("완료") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
    )
}

@Composable
fun EmptyHint(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 12.dp))
}

@Composable
fun SmallLabel(text: String, color: Color = MaterialTheme.colorScheme.onSurfaceVariant, weight: FontWeight? = null) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = color, fontWeight = weight)
}
