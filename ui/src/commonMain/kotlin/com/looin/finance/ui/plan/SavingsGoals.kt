package com.looin.finance.ui.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.AvailableFundsCalculator
import com.looin.finance.core.model.KRW
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.savings.GoalStatus
import com.looin.finance.core.savings.SavingsGoal
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.AmountText
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.DangerButton
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.HBar
import com.looin.finance.ui.components.LooinSheet
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.Section
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.home.fmt
import com.looin.finance.ui.settings.CATEGORY_PALETTE
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.LocalDate

/** 돈 관리 탭의 "저축 목표" 영역: 목록 + 추가/배정/편집 시트. */
@Composable
fun SavingsGoalsSection(data: FinanceData, today: LocalDate, vm: MainViewModel) {
    val c = Looin.colors
    var editing by remember { mutableStateOf<SavingsGoal?>(null) }
    var openGoalId by remember { mutableStateOf<Long?>(null) }
    val statuses = data.goalStatuses.sortedWith(compareBy<GoalStatus> { it.goal.archived }.thenBy { it.goal.id })
    var showArchived by remember { mutableStateOf(false) }
    val reservedIds = AvailableFundsCalculator.includedAccounts(data.accounts).let { inc ->
        com.looin.finance.core.savings.SavingsCalculator.reserveForAvailable(statuses, inc).map { it.goal.id }.toSet()
    }

    Section("저축 목표", dot = c.menuDone, onAdd = { editing = SavingsGoal(name = "", targetAmount = 0) }, addLabel = "저축 목표 추가") {
        val visible = statuses.filter { showArchived || !it.goal.archived }
        if (visible.isEmpty()) EmptyHint("여행·비상금처럼 모을 돈을 목표로 만들고 떼어 두면, 생활비로 쓸 수 있는 돈에서 빼고 계산해요.")
        visible.forEach { st ->
            val color = Color(st.goal.colorArgb)
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { openGoalId = st.goal.id }.padding(vertical = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(9.dp).clip(CircleShape).background(color))
                    Spacer(Modifier.width(8.dp))
                    Text(st.goal.name + if (st.goal.archived) " (보관)" else "", Modifier.weight(1f),
                        style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold), color = if (st.goal.archived) c.textMuted else c.text)
                    AmountText(st.allocated, style = LooinType.bodyLg, color = if (st.goal.archived) c.textMuted else c.text)
                }
                Spacer(Modifier.height(8.dp))
                HBar(st.progress, if (st.achieved) c.positive else color)
                Spacer(Modifier.height(4.dp))
                Row {
                    SmallLabel("목표 ${fmt(st.goal.targetAmount)} · ${(st.progress * 100).toInt()}%" +
                        (st.goal.targetDate?.let { " · ${it.korean()}까지" } ?: ""), modifier = Modifier.weight(1f))
                    SmallLabel(when {
                        st.goal.archived -> "배정 해제됨"
                        st.goal.id in reservedIds -> "생활비에서 빼 둠"
                        st.goal.accountId != null -> data.accountName(st.goal.accountId) + "에 보관"
                        else -> ""
                    }, color = if (st.goal.id in reservedIds) c.planned else c.textMuted)
                }
            }
        }
        if (statuses.any { it.goal.archived }) ChipPill(if (showArchived) "보관한 목표 숨기기" else "보관한 목표 보기", showArchived, { showArchived = !showArchived })
    }

    editing?.let { g ->
        LooinSheet({ editing = null }, if (g.id == 0L) "저축 목표 추가" else "저축 목표 편집") {
            GoalForm(g, data) { vm.saveGoal(it) { editing = null } }
        }
    }
    openGoalId?.let { id ->
        val st = data.goalStatuses.firstOrNull { it.goal.id == id }
        if (st == null) openGoalId = null
        else LooinSheet({ openGoalId = null }, st.goal.name) {
            GoalDetail(st, data, today, vm,
                onEdit = { openGoalId = null; editing = st.goal },
                onClose = { openGoalId = null })
        }
    }
}

/** 목표 상세: 진행률, 떼어 두기/해제, 배정 기록, 편집·보관. */
@Composable
private fun GoalDetail(st: GoalStatus, data: FinanceData, today: LocalDate, vm: MainViewModel, onEdit: () -> Unit, onClose: () -> Unit) {
    val c = Looin.colors
    var mode by remember { mutableStateOf(AllocMode.ADD) }
    var text by remember { mutableStateOf("") }
    var memo by remember { mutableStateOf("") }
    val amount = MoneyFormat.parse(text)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            AmountText(st.allocated, style = LooinType.bigAmount.copy(fontSize = LooinType.monthTitle.fontSize * 1.3f))
            Spacer(Modifier.width(8.dp))
            SmallLabel("/ ${fmt(st.goal.targetAmount)}", modifier = Modifier.padding(bottom = 4.dp))
        }
        HBar(st.progress, if (st.achieved) c.positive else Color(st.goal.colorArgb))
        SmallLabel(if (st.achieved) "목표를 채웠어요! 다 쓰면 보관해서 배정을 풀어 주세요." else "남은 금액 ${fmt(st.remaining)}")
        if (!st.goal.archived) {
            PillTabs(AllocMode.entries, mode, { it.label }, { mode = it })
            AmountField(text, { text = it }, if (mode == AllocMode.ADD) "떼어 둘 금액" else "해제할 금액", accent = Color(st.goal.colorArgb))
            UnderlineField(memo, { memo = it }, "메모 (선택)")
            PrimaryButton(if (mode == AllocMode.ADD) "떼어 두기" else "배정 해제", {
                vm.allocate(st.goal.id, if (mode == AllocMode.ADD) amount!! else -amount!!, today, memo) { text = ""; memo = "" }
            }, enabled = amount != null && amount > 0, strong = true)
            SmallLabel(
                if (st.goal.accountId == null || AvailableFundsCalculator.includedAccounts(data.accounts).any { it.id == st.goal.accountId })
                    "떼어 둔 돈은 '생활비로 사용 가능한 금액'에서 빠져요. 실제 계좌 잔고는 그대로예요."
                else "이 목표의 돈은 ${data.accountName(st.goal.accountId)}에 있어 사용 가능 금액에서 다시 빼지 않아요.",
            )
        }
        val history = data.allocations.filter { it.goalId == st.goal.id }
        if (history.isNotEmpty()) {
            Text("배정 기록", style = LooinType.sheetTitle.copy(fontSize = LooinType.bodyLg.fontSize), color = c.text)
            history.take(20).forEach { a ->
                Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                    SmallLabel(a.date.korean() + if (a.memo.isNotBlank()) " · ${a.memo}" else "", modifier = Modifier.weight(1f))
                    AmountText(a.amount, signed = true, style = LooinType.body, color = if (a.amount >= 0) c.positive else c.expense)
                }
            }
        }
        ChipPill("목표 편집", false, onEdit)
        if (st.goal.archived) ChipPill("보관 해제(다시 떼어 두기)", false, { vm.setGoalArchived(st.goal.id, false); onClose() })
        else DangerButton("보관 — 배정을 풀고 목록에서 숨기기", { vm.setGoalArchived(st.goal.id, true); onClose() })
    }
}

private enum class AllocMode(val label: String) { ADD("떼어 두기"), RELEASE("배정 해제") }

/** 목표 추가·편집 폼(시트 내용). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GoalForm(goal: SavingsGoal, data: FinanceData, onSave: (SavingsGoal) -> Unit) {
    val c = Looin.colors
    var name by remember { mutableStateOf(goal.name) }
    var target by remember { mutableStateOf(if (goal.targetAmount > 0) amountToInput(goal.targetAmount, KRW) else "") }
    var accountId by remember { mutableStateOf(goal.accountId) }
    var color by remember { mutableStateOf(goal.colorArgb) }
    val amount = MoneyFormat.parse(target)
    val holders = data.accounts.filter { !it.archived && !it.type.isLiability && it.currency == KRW }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        UnderlineField(name, { name = it.take(20) }, "목표 이름", placeholder = "예: 여름 여행, 비상금", accent = Color(color),
            textStyle = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold))
        AmountField(target, { target = it }, "목표 금액", accent = Color(color))
        SmallLabel("돈을 어디에 둘까요?")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ChipPill("생활비 계좌에서 떼어 두기", accountId == null, { accountId = null })
            holders.filter { !it.includeInAvailable }.forEach { a -> ChipPill(a.name, accountId == a.id, { accountId = a.id }) }
        }
        SmallLabel(if (accountId == null) "생활비 계좌 안에 두고, 쓸 수 있는 돈에서만 빼 둬요."
            else "이 계좌는 생활비 계산 대상이 아니라서 사용 가능 금액에서 다시 빼지 않아요.")
        SmallLabel("색")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            CATEGORY_PALETTE.forEach { argb ->
                Box(Modifier.size(30.dp).clip(CircleShape).background(Color(argb))
                    .then(if (argb == color) Modifier.border(3.dp, c.text, CircleShape) else Modifier)
                    .clickable { color = argb }.semantics { contentDescription = "색 선택" })
            }
        }
        PrimaryButton("저장", { onSave(goal.copy(name = name, targetAmount = amount!!, accountId = accountId, colorArgb = color)) },
            enabled = name.isNotBlank() && amount != null && amount > 0, strong = true)
    }
}
