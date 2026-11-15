package com.looin.finance.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.data.FinanceData
import com.looin.finance.ui.calendar.CalendarGrouping
import com.looin.finance.ui.calendar.GroupedTransactions
import com.looin.finance.ui.theme.LooinTheme
import kotlinx.datetime.LocalDate
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 캘린더 모아 보기: 유형별·카테고리별 묶음과 합계, 머리를 누르면 펼침, 취소 거래는 제외. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w400dp-h860dp")
class CalendarGroupingTest {
    @get:Rule val rule = createComposeRule()

    private val d = LocalDate(2026, 11, 10)
    private fun tx(id: Long, type: TransactionType, amount: Long, cat: Long? = null, memo: String = "", status: TransactionStatus = TransactionStatus.COMPLETED) =
        Transaction(id = id, type = type, status = status, amount = amount, date = d, completedDate = if (status == TransactionStatus.COMPLETED) d else null,
            fromAccountId = if (type == TransactionType.INCOME) null else 1, toAccountId = if (type == TransactionType.EXPENSE) null else 2, categoryId = cat, memo = memo)

    private val data = FinanceData(
        accounts = listOf(Account(id = 1, name = "주거래", type = AccountType.CHECKING), Account(id = 2, name = "적금", type = AccountType.SAVINGS)),
        categories = listOf(Category(id = 10, name = "식비", kind = CategoryKind.EXPENSE), Category(id = 11, name = "교통", kind = CategoryKind.EXPENSE),
            Category(id = 20, name = "급여", kind = CategoryKind.INCOME)),
        transactions = listOf(
            tx(1, TransactionType.EXPENSE, 12_000, 10, "점심"), tx(2, TransactionType.EXPENSE, 3_000, 10, "커피"),
            tx(3, TransactionType.EXPENSE, 1_500, 11, "버스"), tx(4, TransactionType.INCOME, 3_000_000, 20, "월급"),
            tx(5, TransactionType.TRANSFER, 300_000, memo = "저축"), tx(6, TransactionType.EXPENSE, 99_000, 10, "취소됨", TransactionStatus.CANCELLED),
            tx(7, TransactionType.EXPENSE, 500_000, 10, "예정 회식", TransactionStatus.PLANNED),
        ),
        loaded = true,
    )

    @Test fun byTypeAndByCategory() {
        var mode by mutableStateOf(CalendarGrouping.TYPE)
        rule.setContent { LooinTheme { GroupedTransactions(data.transactions, data, mode, {}) } }
        rule.onNodeWithText("지출").assertExists()
        rule.onNodeWithText("4건  ").assertExists()            // 지출 4건(취소 제외, 예정 포함)
        rule.onNodeWithText("-16,500원").assertExists()        // 합계는 확정만
        rule.onNodeWithText("예정 -500,000원").assertExists()   // 예정은 따로
        rule.onNodeWithText("저축 및 이체").assertExists()
        rule.onNodeWithText("점심").assertDoesNotExist()        // 접힌 상태
        rule.onNodeWithText("지출").performClick()
        rule.onNodeWithText("점심").assertExists()
        rule.onNodeWithText("취소됨").assertDoesNotExist()

        mode = CalendarGrouping.CATEGORY
        rule.onNodeWithText("식비").assertExists()
        rule.onNodeWithText("-15,000원").assertExists()
        rule.onNodeWithText("교통").assertExists()
        rule.onNodeWithText("급여 (수입)").assertExists()
        rule.onNodeWithText("식비").performClick()
        rule.onNodeWithText("커피").assertExists()
        rule.onNodeWithText("버스").assertDoesNotExist()
    }
}
