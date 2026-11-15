package com.looin.finance.ui.plan

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.limit.LimitCalculator
import com.looin.finance.core.limit.LimitLevel
import com.looin.finance.core.limit.LimitStatus
import com.looin.finance.core.limit.LimitTarget
import com.looin.finance.core.limit.SpendingLimit
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.money.AmountExpression
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.Period
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.DangerButton
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.HBar
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.PickItem
import com.looin.finance.ui.components.PickerField
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 한도 이름: 전체 지출 / 카테고리 이름 / 계좌 이름. */
fun limitName(l: SpendingLimit, data: FinanceData): String = when (l.target) {
    LimitTarget.ALL -> "전체 지출"
    LimitTarget.CATEGORY -> data.categoryName(l.targetId)
    LimitTarget.ACCOUNT -> data.accountName(l.targetId) + " (계좌)"
}

@Composable
fun levelColor(level: LimitLevel): Color = when (level) {
    LimitLevel.OK -> Looin.colors.accent
    LimitLevel.WARN -> Looin.colors.planned
    LimitLevel.OVER -> Looin.colors.danger
}

/** 한도 한 줄: 이름 · 상태 배지 · 사용/한도 · 막대. */
@Composable
fun LimitRow(s: LimitStatus, data: FinanceData, onClick: (() -> Unit)? = null) {
    val c = Looin.colors
    val col = levelColor(s.level)
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
        .padding(horizontal = 4.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(limitName(s.limit, data), style = LooinType.bodyLg, color = c.text, modifier = Modifier.weight(1f))
            Box(Modifier.clip(RoundedCornerShape(6.dp)).background(col.copy(alpha = 0.14f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                Text(s.level.label, style = LooinType.tiny, color = col)
            }
            Spacer(Modifier.width(8.dp))
            Text("${MoneyFormat.format(s.used)} / ${MoneyFormat.format(s.limit.amount)}", style = LooinType.body, color = c.textSecondary)
        }
        Spacer(Modifier.height(6.dp))
        HBar(s.ratio, col)
        Spacer(Modifier.height(3.dp))
        SmallLabel(if (s.remaining >= 0) "남은 한도 ${MoneyFormat.format(s.remaining)} · ${s.limit.warnPercent}%부터 경고"
            else "한도를 ${MoneyFormat.format(-s.remaining)} 넘었어요", color = if (s.remaining < 0) c.danger else c.textMuted)
    }
}

/**
 * 돈 관리 → 지출 한도. 매 기간 반복되는 경고선(전체·카테고리·출금 계좌별).
 * 예산과 달리 사용 가능 금액 계산에는 영향이 없다.
 */
@Composable
fun SpendingLimitsSection(data: FinanceData, period: Period, vm: MainViewModel) {
    val c = Looin.colors
    var editing by remember { mutableStateOf<SpendingLimit?>(null) }
    val statuses = LimitCalculator.statuses(data.limits, period, data.transactions)
    Section("지출 한도", dot = c.danger, onAdd = { editing = SpendingLimit(target = LimitTarget.CATEGORY, amount = 0) }, addLabel = "지출 한도 추가") {
        if (statuses.isEmpty()) EmptyHint("카테고리·계좌별로 한도를 정하면 가까워질 때 경고, 넘으면 제한 표시를 보여 줘요.")
        statuses.forEach { s -> LimitRow(s, data) { editing = s.limit } }
        SmallLabel("매 기간 자동으로 반복돼요. 예산과 달리 '사용 가능한 금액' 계산에는 영향이 없어요. 거래를 입력할 때 한도에 걸리면 바로 알려 줘요.")
    }
    editing?.let { l ->
        LooinSheet({ editing = null }, if (l.id == 0L) "지출 한도 추가" else "지출 한도 수정") {
            LimitForm(l, data, onSave = { vm.saveLimit(it) { editing = null } },
                onDelete = if (l.id == 0L) null else ({ vm.deleteLimit(l.id); editing = null }))
        }
    }
}

@Composable
private fun LimitForm(limit: SpendingLimit, data: FinanceData, onSave: (SpendingLimit) -> Unit, onDelete: (() -> Unit)?) {
    var target by remember { mutableStateOf(limit.target) }
    var targetId by remember { mutableStateOf(limit.targetId) }
    var text by remember { mutableStateOf(if (limit.amount > 0) amountToInput(limit.amount, "KRW") else "") }
    var warn by remember { mutableStateOf(limit.warnPercent) }
    val amount = AmountExpression.parse(text)
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        PillTabs(LimitTarget.entries, target, { it.label }, { if (it != target) { target = it; targetId = null } })
        when (target) {
            LimitTarget.CATEGORY -> PickerField("카테고리",
                data.categories.filter { it.kind == CategoryKind.EXPENSE && !it.archived }.map { PickItem(it.id, it.name, Color(it.colorArgb)) },
                targetId, emptyList(), { targetId = it })
            LimitTarget.ACCOUNT -> PickerField("출금 계좌", data.accounts.filter { !it.archived }.map { PickItem(it.id, it.name) },
                targetId, emptyList(), { targetId = it })
            LimitTarget.ALL -> SmallLabel("모든 지출(이체·저축 제외)을 합해서 봐요.")
        }
        AmountField(text, { text = it }, "기간마다 한도", calculator = true)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SmallLabel("경고를 보여 줄 시점")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(70, 80, 90).forEach { p -> ChipPill("$p%", warn == p, { warn = p }) }
            }
            if (amount != null && amount > 0) SmallLabel("${MoneyFormat.format(amount * warn / 100)}부터 경고, ${MoneyFormat.format(amount)}부터 제한",
                color = Looin.colors.textSecondary, weight = FontWeight.SemiBold)
        }
        PrimaryButton("저장", { onSave(limit.copy(target = target, targetId = if (target == LimitTarget.ALL) null else targetId, amount = amount!!, warnPercent = warn)) },
            enabled = amount != null && amount > 0 && (target == LimitTarget.ALL || targetId != null), strong = true)
        if (onDelete != null) DangerButton("한도 삭제", onDelete)
    }
}
