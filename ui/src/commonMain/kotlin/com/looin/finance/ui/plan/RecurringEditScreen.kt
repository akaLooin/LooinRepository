package com.looin.finance.ui.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurrenceCalculator
import com.looin.finance.core.recurring.RecurringRule
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.AmountField
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.DangerButton
import com.looin.finance.ui.components.DateField
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.FieldDivider
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.ToggleRow
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.amountToInput
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.components.typeColor
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus

/** 반복 거래(정기 결제·급여) 규칙 추가·수정. 저장하면 다음 기간 말까지 예정 거래가 자동으로 생긴다. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RecurringEditScreen(state: UiState, vm: MainViewModel, ruleId: Long?, onClose: () -> Unit) {
    val c = Looin.colors
    val data = state.data
    if (!data.loaded) return
    val existing = ruleId?.let { id -> data.rules.firstOrNull { it.id == id } }
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        if (ruleId != null && existing == null) {
            ScreenHeader("반복 거래", onClose); EmptyHint("반복 거래를 찾을 수 없습니다."); return@Column
        }
        val accounts = data.accounts.filter { !it.archived }
        val defaultAccount = accounts.firstOrNull { it.includeInAvailable }?.id ?: accounts.firstOrNull()?.id

        var name by rememberSaveable { mutableStateOf(existing?.name ?: "") }
        var type by rememberSaveable { mutableStateOf(existing?.type ?: TransactionType.EXPENSE) }
        var amountText by rememberSaveable { mutableStateOf(existing?.let { amountToInput(it.amount, it.currency) } ?: "") }
        var frequency by rememberSaveable { mutableStateOf(existing?.frequency ?: Frequency.MONTHLY) }
        var interval by rememberSaveable { mutableStateOf(existing?.interval ?: 1) }
        var dayText by rememberSaveable { mutableStateOf((existing?.dayOfMonth ?: state.today.day).toString()) }
        var dayOfWeek by rememberSaveable { mutableStateOf(existing?.dayOfWeek ?: state.today.dayOfWeek) }
        var startDays by rememberSaveable { mutableStateOf((existing?.startDate ?: state.today).toEpochDays()) }
        var endDays by rememberSaveable { mutableStateOf(existing?.endDate?.toEpochDays()) }
        var fromId by rememberSaveable { mutableStateOf(existing?.fromAccountId ?: if (type == TransactionType.INCOME) null else defaultAccount) }
        var toId by rememberSaveable { mutableStateOf(existing?.toAccountId ?: if (type == TransactionType.INCOME) defaultAccount else null) }
        var categoryId by rememberSaveable { mutableStateOf(existing?.categoryId) }
        var active by rememberSaveable { mutableStateOf(existing?.active ?: true) }
        var error by remember { mutableStateOf<String?>(null) }
        var confirmDelete by remember { mutableStateOf(false) }

        val currency = data.accountById[if (type == TransactionType.INCOME) toId else fromId]?.currency ?: KRW
        val accent = categoryId?.let { data.categoryById[it]?.colorArgb }?.let { Color(it) } ?: typeColor(type)

        fun build(): RecurringRule? {
            val amount = MoneyFormat.parse(amountText, currency) ?: run { error = "금액을 입력하세요."; return null }
            return RecurringRule(
                id = existing?.id ?: 0, name = name.trim(), type = type, amount = amount, currency = currency,
                fromAccountId = if (type == TransactionType.INCOME) null else fromId,
                toAccountId = if (type == TransactionType.EXPENSE) null else toId,
                categoryId = if (type == TransactionType.TRANSFER) null else categoryId,
                frequency = frequency, interval = interval,
                dayOfMonth = if (frequency == Frequency.MONTHLY) dayText.toIntOrNull() ?: 0 else null,
                dayOfWeek = if (frequency == Frequency.WEEKLY) dayOfWeek else null,
                startDate = LocalDate.fromEpochDays(startDays), endDate = endDays?.let { LocalDate.fromEpochDays(it) },
                active = active, generatedThrough = existing?.generatedThrough, memo = existing?.memo ?: "",
                createdAt = existing?.createdAt ?: 0,
            )
        }
        val preview = build().let { r ->
            if (r == null || RecurrenceCalculator.validate(r).isNotEmpty()) emptyList()
            else RecurrenceCalculator.occurrences(r, state.today, state.today.plus(DatePeriod(years = 1))).take(3)
        }

        ScreenHeader(if (existing == null) "반복 거래 추가" else "반복 거래 수정", onClose)
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = GUTTER),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            PillTabs(listOf(TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER), type, { it.label }, onSelect = {
                if (it != type) {
                    val single = if (type == TransactionType.INCOME) toId else fromId
                    type = it; categoryId = null
                    if (it == TransactionType.INCOME) { toId = single; fromId = null } else { fromId = single; toId = null }
                }
            })
            UnderlineField(name, { name = it }, "이름", placeholder = "예: 월세, 통신비, 급여", accent = accent,
                textStyle = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold))
            AmountField(amountText, { amountText = it }, "금액", currency = currency, accent = accent)

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SmallLabel("반복")
                PillTabs(Frequency.entries, frequency, { it.label }, { frequency = it; interval = 1 })
                val intervals = if (frequency == Frequency.MONTHLY) listOf(1 to "1개월", 2 to "2개월", 3 to "3개월", 6 to "6개월", 12 to "12개월(매년)")
                else listOf(1 to "1주", 2 to "2주(격주)")
                PillTabs(intervals.map { it.first }, interval, { v -> intervals.first { it.first == v }.second }, { interval = it })
            }
            if (frequency == Frequency.MONTHLY) {
                UnderlineField(dayText, { v -> dayText = v.filter { it.isDigit() }.take(2) }, "반복일 (1~31)", keyboardType = KeyboardType.Number,
                    isError = dayText.toIntOrNull()?.let { it !in 1..31 } ?: true, suffix = "일")
                SmallLabel("그 달에 없는 날짜(예: 31일)는 그 달 말일에 생겨요.")
            } else {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY)
                        .forEach { d -> ChipPill(RecurringRule.KOREAN_DAY[d]!!, dayOfWeek == d, { dayOfWeek = d }) }
                }
            }
            FieldGroup {
                DateField("시작일", LocalDate.fromEpochDays(startDays), { startDays = it.toEpochDays() })
                FieldDivider()
                ToggleRow("종료일 지정", null, endDays != null, { on -> endDays = if (on) startDays + 365 else null })
                endDays?.let { e ->
                    FieldDivider()
                    DateField("종료일", LocalDate.fromEpochDays(e), { endDays = it.toEpochDays() })
                }
                FieldDivider()
                ToggleRow("사용 중", "끄면 새 예정 거래를 더 만들지 않아요", active, { active = it })
            }
            when (type) {
                TransactionType.INCOME -> RuleAccountChips("입금 계좌", accounts.map { it.id to it.name }, toId) { toId = it }
                TransactionType.EXPENSE -> RuleAccountChips("출금 계좌", accounts.map { it.id to it.name }, fromId) { fromId = it }
                else -> {
                    RuleAccountChips("출금 계좌", accounts.map { it.id to it.name }, fromId) { fromId = it }
                    RuleAccountChips("입금 계좌", accounts.filter { it.id != fromId }.map { it.id to it.name }, toId) { toId = it }
                }
            }
            if (type != TransactionType.TRANSFER) {
                val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SmallLabel("카테고리")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        data.categories.filter { it.kind == kind && !it.archived }.forEach { cat ->
                            ChipPill(cat.name, cat.id == categoryId, { categoryId = if (categoryId == cat.id) null else cat.id }, dot = Color(cat.colorArgb))
                        }
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                SmallLabel("다음 발생일")
                if (preview.isEmpty()) Text("-", style = LooinType.body, color = c.textMuted)
                preview.forEach { Text(it.korean(withYear = true), style = LooinType.body, color = c.text) }
                SmallLabel("저장하면 다음 기간 말까지 '예정' 거래가 자동으로 생겨요. 실제로 나가면 완료 처리하세요. 지난 날짜는 만들지 않아요.")
                if (existing != null) SmallLabel("수정하면 오늘 이후 아직 처리하지 않은 예정 거래가 새 내용으로 바뀌어요. 완료·취소한 기록은 그대로예요.", color = c.planned)
            }
            error?.let { Text(it, color = c.danger, style = LooinType.body) }
            if (existing != null) DangerButton("반복 거래 삭제", { confirmDelete = true })
            Spacer(Modifier.height(16.dp))
        }
        PrimaryButton("저장", {
            error = null
            build()?.let { r ->
                val problems = RecurrenceCalculator.validate(r)
                if (problems.isNotEmpty()) error = problems.joinToString("\n") else vm.saveRule(r, onClose)
            }
        }, Modifier.padding(horizontal = GUTTER, vertical = 12.dp), strong = true)

        if (confirmDelete && existing != null) {
            ConfirmDialog("반복 거래 삭제", "규칙과 오늘 이후의 미처리 예정 거래를 지워요. 완료한 거래 기록은 남아요.", "삭제",
                { confirmDelete = false }, danger = true) { vm.deleteRule(existing.id, onClose) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RuleAccountChips(label: String, accounts: List<Pair<Long, String>>, selected: Long?, onSelect: (Long) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SmallLabel(label)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            accounts.forEach { (id, name) -> ChipPill(name, id == selected, { onSelect(id) }) }
        }
    }
}
