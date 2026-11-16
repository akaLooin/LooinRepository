package com.looin.finance.ui.assets

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.money.Currencies
import com.looin.finance.core.money.Fx
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.platform.ExchangeRates
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.coroutines.launch

/** 초기 잔고 줄의 키. */
private const val OPENING = -1L

/**
 * 거래별 당시 환율 적기.
 *  - 외화 계좌([convert] = false): 완료 거래마다 그때 환율(이미 적은 것도 고칠 수 있음)
 *  - 원화 계좌 → 외화 계좌로 바꾸기([convert] = true): 모든 거래와 초기 잔고에 당시 환율을 적어야 바꿀 수 있다
 * "기록 날짜 환율로 채우기"는 유럽중앙은행 기준 환율을 날짜별로 받아 빈 칸만 채운다(실제 환전 환율과 다르면 고쳐 쓰기).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AccountRatesScreen(state: UiState, vm: MainViewModel, accountId: Long, convert: Boolean, onDone: () -> Unit) {
    val c = Looin.colors
    val data = state.data
    if (!data.loaded) return
    val account = data.accountById[accountId]
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        ScreenHeader(if (convert) "외화 계좌로 바꾸기" else "거래별 환율", onDone)
        if (account == null) { EmptyHint("계좌를 찾을 수 없습니다."); return@Column }
        var target by rememberSaveable { mutableStateOf(Currencies.all.first { it.code != KRW }.code) }
        // 그동안 적은 숫자가 무엇인지: null = 아직 안 고름
        var asForeign by rememberSaveable { mutableStateOf<Boolean?>(null) }
        val cur = if (convert) target else account.currency
        val rows = remember(data.transactions, convert) {
            data.transactions.filter { it.touches(account.id) && (convert || it.status == TransactionStatus.COMPLETED) }
                .sortedWith(compareBy<Transaction> { it.effectiveDate }.thenBy { it.id })
        }
        val texts = remember(account.id) {
            mutableStateMapOf<Long, String>().apply {
                if (!convert) {
                    account.openingRateX10000?.let { put(OPENING, Fx.formatRate(it).replace(",", "")) }
                    rows.forEach { t -> t.rateToKrwX10000?.let { put(t.id, Fx.formatRate(it).replace(",", "")) } }
                }
            }
        }
        var bulk by remember { mutableStateOf("") }
        var status by remember { mutableStateOf<String?>(null) }
        var busy by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val hasOpening = account.openingBalance != 0L
        val keys = (if (hasOpening) listOf(OPENING) else emptyList()) + rows.map { it.id }
        fun rate(k: Long) = texts[k]?.let(Fx::parseRate)
        val filled = keys.count { rate(it) != null }

        fun fillByDate() {
            if (busy) return
            busy = true; status = "환율을 받아 오는 중…"
            scope.launch {
                runCatching {
                    val dates = rows.map { it.effectiveDate }
                    val first = dates.minOrNull() ?: state.today
                    val series = ExchangeRates.history(cur, first, state.today)
                    if (series.isEmpty()) error("받은 환율이 없어요")
                    var n = 0
                    if (hasOpening && rate(OPENING) == null) Fx.rateOn(series, first)?.let { texts[OPENING] = Fx.formatRate(it).replace(",", ""); n++ }
                    rows.forEach { t -> if (rate(t.id) == null) Fx.rateOn(series, t.effectiveDate)?.let { texts[t.id] = Fx.formatRate(it).replace(",", ""); n++ } }
                    n
                }.onSuccess { n -> status = "유럽중앙은행 기준 환율로 빈 칸 ${n}개를 채웠어요. 실제로 바꾼 환율과 다르면 고쳐 주세요." }
                    .onFailure { status = "환율을 받아 오지 못했어요(인터넷 연결 또는 지원하지 않는 통화). 직접 입력해 주세요." }
                busy = false
            }
        }

        fun save() {
            error = null
            val rates = rows.mapNotNull { t -> rate(t.id)?.let { t.id to it } }.toMap()
            val bad = keys.count { k -> !texts[k].isNullOrBlank() && rate(k) == null }
            if (bad > 0) { error = "환율 형식이 잘못된 칸이 ${bad}개 있어요(예: 9.1234)."; return }
            if (convert) {
                if (asForeign == null) { error = "그동안 적은 금액이 원화인지 ${cur}인지 골라 주세요."; return }
                if (filled < keys.size) { error = "모든 거래(${keys.size - filled}칸 남음)에 당시 환율을 적어야 바꿀 수 있어요."; return }
                vm.convertAccount(account.id, cur, asForeign!!, rate(OPENING), rates, onDone)
            } else vm.setRates(account.id, rate(OPENING), rates, onDone)
        }

        LazyColumn(Modifier.weight(1f).padding(horizontal = GUTTER), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SmallLabel(
                        if (convert) "‘${account.name}’을 외화 계좌로 바꿔요. 정확한 원화 계산을 위해 거래마다 그때 환율(1 $cur 당 원)을 모두 적어 주세요. 다른 원화 계좌와 오간 이체는 그 계좌 쪽 금액은 그대로 두고 환전 기록이 돼요."
                        else "거래마다 그때 환율(1 $cur 당 원)을 적으면 기록 환율 기준 원화와 환율 변동 손익을 정확하게 계산해요.",
                        color = c.textSecondary,
                    )
                    if (convert) {
                        SmallLabel("바꿀 통화")
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Currencies.all.filter { it.code != KRW }.forEach { ci -> ChipPill("${ci.code} ${ci.label}", target == ci.code, { target = ci.code }) }
                        }
                        SmallLabel("그동안 적은 금액은")
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            ChipPill("원화로 적었어요 → 환율로 $cur 계산", asForeign == false, { asForeign = false })
                            ChipPill("이미 $cur 숫자예요 → 그대로", asForeign == true, { asForeign = true })
                        }
                    }
                    if (ExchangeRates.supported) ChipPill(if (busy) "받아 오는 중…" else "기록 날짜 환율로 빈 칸 채우기", false, ::fillByDate, enabled = !busy)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        UnderlineField(bulk, { v -> bulk = v.filter { it.isDigit() || it == '.' } }, "같은 환율 한꺼번에", Modifier.weight(1f),
                            placeholder = "예: 9.12", keyboardType = KeyboardType.Decimal)
                        Spacer(Modifier.width(8.dp))
                        ChipPill("빈 칸에 넣기", false, {
                            Fx.parseRate(bulk)?.let { r -> keys.forEach { k -> if (rate(k) == null) texts[k] = Fx.formatRate(r).replace(",", "") } }
                        }, enabled = Fx.parseRate(bulk) != null)
                    }
                    status?.let { SmallLabel(it, color = c.textSecondary) }
                    Text("${keys.size}칸 중 ${filled}칸 입력", style = LooinType.body.copy(fontWeight = FontWeight.SemiBold),
                        color = if (filled == keys.size) c.income else c.text)
                }
            }
            if (hasOpening) item(key = "opening") {
                RateRow("초기 잔고", "계좌를 만들 때 잔고", account.openingBalance, if (convert) KRW else cur, cur, convert && asForeign == false,
                    texts[OPENING] ?: "", { texts[OPENING] = it })
            }
            items(rows, key = { it.id }) { t ->
                val label = listOf(t.type.label + if (t.isPlanned) " · 예정" else if (t.isCancelled) " · 취소" else "",
                    t.memo.ifBlank { data.categoryName(t.categoryId).takeIf { t.categoryId != null } ?: "" }).filter { it.isNotBlank() }.joinToString(" · ")
                val delta = t.deltaFor(account.id)
                RateRow(t.effectiveDate.korean(true), label, delta, if (convert) KRW else cur, cur, convert && asForeign == false,
                    texts[t.id] ?: "", { texts[t.id] = it })
            }
            if (rows.isEmpty() && !hasOpening) item { EmptyHint("환율을 적을 기록이 없어요.") }
            item { Spacer(Modifier.height(8.dp)) }
        }
        error?.let { Text(it, color = c.danger, style = LooinType.body, modifier = Modifier.padding(horizontal = GUTTER)) }
        PrimaryButton(if (convert) "$cur 계좌로 바꾸기" else "저장", ::save, Modifier.padding(horizontal = GUTTER, vertical = 12.dp),
            enabled = if (convert) filled == keys.size && asForeign != null else true, strong = true)
    }
}

/** 한 줄: 날짜·내용·금액 + 환율 칸. 원화로 적은 기록을 바꾸는 중이면 환율로 계산한 외화 금액을 미리 보여 준다. */
@Composable
private fun RateRow(title: String, sub: String, amount: Long, amountCurrency: String, target: String, previewConvert: Boolean, text: String, onChange: (String) -> Unit) {
    val c = Looin.colors
    val r = Fx.parseRate(text)
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(c.card).padding(horizontal = 14.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, style = LooinType.body, color = c.text)
                if (sub.isNotBlank()) SmallLabel(sub, modifier = Modifier, color = c.textSecondary)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(MoneyFormat.format(amount, amountCurrency, signed = true), style = LooinType.body.copy(fontWeight = FontWeight.SemiBold), color = c.text,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                when {
                    r == null -> {}
                    previewConvert -> SmallLabel("→ ${MoneyFormat.format(Fx.fromKrw(amount, target, r), target, signed = true)}")
                    amountCurrency != KRW -> SmallLabel("≈ ${MoneyFormat.format(Fx.toKrw(amount, amountCurrency, r), signed = true)}")
                }
            }
        }
        UnderlineField(text, { v -> onChange(v.filter { it.isDigit() || it == '.' }) }, "1 $target 당 원", placeholder = "예: 9.1234",
            keyboardType = KeyboardType.Decimal, isError = text.isNotBlank() && r == null)
    }
}
