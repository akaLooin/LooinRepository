package com.looin.finance.ui.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.BudgetLevel
import com.looin.finance.core.calc.BudgetStatus
import com.looin.finance.core.model.Budget
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/** 예산 이름: 전체 생활비 / 카테고리 / 계좌. */
fun budgetName(b: Budget, data: FinanceData): String = when {
    b.accountId != null -> data.accountName(b.accountId) + " (계좌)"
    b.categoryId != null -> data.categoryName(b.categoryId)
    else -> "전체 생활비"
}

@Composable
fun levelColor(level: BudgetLevel): Color = when (level) {
    BudgetLevel.OK -> Looin.colors.accent
    BudgetLevel.WARN -> Looin.colors.planned
    BudgetLevel.OVER -> Looin.colors.danger
}

/**
 * 예산 막대: 확정 지출은 진한 색(단계 색), 예정 지출은 그 뒤에 연한 색으로 이어서, 경고 비율 자리에 눈금.
 * 예정 지출은 확정과 같은 것으로 보지 않는다(색으로 구분).
 */
@Composable
fun BudgetMeter(s: BudgetStatus) {
    val c = Looin.colors
    val total = s.effective.coerceAtLeast(1).toFloat()
    val spent = (s.spent / total).coerceIn(0f, 1f)
    val withPlanned = ((s.spent + s.planned) / total).coerceIn(0f, 1f)
    val col = levelColor(s.level)
    val plannedCol = levelColor(s.forecastLevel).copy(alpha = 0.35f)
    BoxWithConstraints(Modifier.fillMaxWidth().height(10.dp)) {
        Box(Modifier.fillMaxWidth().height(8.dp).align(Alignment.Center).clip(CircleShape).background(c.markerEmpty)) {
            Box(Modifier.fillMaxWidth(withPlanned).fillMaxHeight().clip(CircleShape).background(plannedCol))
            Box(Modifier.fillMaxWidth(spent).fillMaxHeight().clip(CircleShape).background(col))
        }
        // 경고 눈금
        Box(Modifier.offset(x = maxWidth * (s.budget.warnPercent / 100f)).width(2.dp).fillMaxHeight().background(c.textMuted))
    }
}

/** 예산 한 줄: 이름 · 단계 · 잔액, 막대, 예산 구성(직접 + 고정 비용), 경고 문장. */
@Composable
fun BudgetRow(s: BudgetStatus, data: FinanceData, onClick: (() -> Unit)? = null) {
    val c = Looin.colors
    val dot = s.budget.categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) }
        ?: if (s.budget.isAccount) c.transfer else c.primary
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
        .padding(horizontal = 4.dp, vertical = 9.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(9.dp).clip(CircleShape).background(dot))
            Spacer(Modifier.width(8.dp))
            Text(budgetName(s.budget, data), Modifier.weight(1f), style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            if (s.level != BudgetLevel.OK) {
                val col = levelColor(s.level)
                Box(Modifier.clip(RoundedCornerShape(6.dp)).background(col.copy(alpha = 0.14f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                    Text(s.level.label, style = LooinType.tiny, color = col)
                }
                Spacer(Modifier.width(6.dp))
            }
            SmallLabel("잔액 ")
            AmountText(s.remaining, color = if (s.isOver) c.danger else c.text, style = LooinType.bodyLg)
        }
        Spacer(Modifier.height(8.dp))
        BudgetMeter(s)
        Spacer(Modifier.height(4.dp))
        SmallLabel(
            "예산 ${MoneyFormat.format(s.effective)}" + (if (s.fixed > 0) " (직접 ${MoneyFormat.format(s.budget.amount)} + 고정 비용 ${MoneyFormat.format(s.fixed)})" else "") +
                " · 사용 ${MoneyFormat.format(s.spent)} · 예정 ${MoneyFormat.format(s.planned)}",
        )
        s.message { MoneyFormat.format(it) }?.let { msg ->
            Spacer(Modifier.height(2.dp))
            SmallLabel(msg, color = if (s.level == BudgetLevel.OVER) c.danger else c.planned, weight = FontWeight.SemiBold)
        }
        if (s.budget.isAccount) SmallLabel("계좌 예산은 경고용이에요(사용 가능 금액 계산에는 들어가지 않아요).")
    }
}
