package com.looin.finance.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.looin.finance.core.calc.TransactionQuery
import com.looin.finance.core.calc.TransactionSearch
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.EmptyHint
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PillTabs
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TransactionRow
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.theme.Looin
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus

private enum class TypeFilter(val label: String, val types: Set<TransactionType>) {
    ALL("전체", emptySet()), EXPENSE("지출", setOf(TransactionType.EXPENSE)), INCOME("수입", setOf(TransactionType.INCOME)),
    TRANSFER("이체·조정", setOf(TransactionType.TRANSFER, TransactionType.ADJUSTMENT)),
}

private enum class StatusFilter(val label: String, val statuses: Set<TransactionStatus>) {
    ALL("모든 상태", emptySet()), COMPLETED("완료", setOf(TransactionStatus.COMPLETED)),
    PLANNED("예정", setOf(TransactionStatus.PLANNED)), CANCELLED("취소", setOf(TransactionStatus.CANCELLED)),
}

private enum class RangeFilter(val label: String) { ALL("전체 기간"), PERIOD("이번 기간"), DAYS30("최근 30일"), YEAR("올해") }

/** 거래 검색: 메모·카테고리·계좌 이름·금액 검색어 + 유형·상태·기간 필터. 결과를 누르면 거래 메뉴 시트. */
@Composable
fun SearchScreen(state: UiState, onBack: () -> Unit, onOpenTx: (Transaction) -> Unit) {
    val c = Looin.colors
    val data = state.data
    var text by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf(TypeFilter.ALL) }
    var status by rememberSaveable { mutableStateOf(StatusFilter.ALL) }
    var range by rememberSaveable { mutableStateOf(RangeFilter.ALL) }
    val focus = remember { FocusRequester() }

    val (from, to) = when (range) {
        RangeFilter.ALL -> null to null
        RangeFilter.PERIOD -> state.currentPeriod.start to state.currentPeriod.lastDay
        RangeFilter.DAYS30 -> state.today.minus(DatePeriod(days = 29)) to state.today
        RangeFilter.YEAR -> LocalDate(state.today.year, 1, 1) to LocalDate(state.today.year, 12, 31)
    }
    val q = TransactionQuery(text = text, types = type.types, statuses = status.statuses, from = from, to = to)
    val result = remember(q, data.transactions, data.categories, data.accounts) {
        TransactionSearch.search(data.transactions, q, data::categoryName, data::accountName)
    }

    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        ScreenHeader("거래 검색", onBack)
        Column(Modifier.padding(horizontal = GUTTER), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            UnderlineField(text, { text = it }, "검색어", Modifier.focusRequester(focus), placeholder = "메모, 카테고리, 계좌, 금액")
            PillTabs(TypeFilter.entries, type, { it.label }, { type = it })
            PillTabs(StatusFilter.entries, status, { it.label }, { status = it })
            PillTabs(RangeFilter.entries, range, { it.label }, { range = it })
            Row(Modifier.fillMaxWidth().clip(CircleShape).background(c.surfaceInput).padding(horizontal = 16.dp, vertical = 10.dp)) {
                SmallLabel("${result.items.size}건", color = c.text, modifier = Modifier.weight(1f))
                SmallLabel("수입 ${MoneyFormat.format(result.completedIncome)}", color = c.income)
                Spacer(Modifier.padding(4.dp))
                SmallLabel("지출 ${MoneyFormat.format(result.completedExpense)}", color = c.expense)
            }
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = GUTTER, vertical = 8.dp)) {
            if (result.items.isEmpty()) item { EmptyHint(if (q.isEmpty) "거래가 없어요." else "조건에 맞는 거래가 없어요.") }
            items(result.items, key = { it.id }) { tx -> TransactionRow(tx, data, onClick = { onOpenTx(tx) }, showDate = true) }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
}
