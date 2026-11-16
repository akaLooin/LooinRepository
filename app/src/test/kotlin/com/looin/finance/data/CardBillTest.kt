package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 카드 결제일 관리: 이용액을 모은 대금 예정 이체가 생기고, 이용액을 따라 바뀌고, 끄면 사라진다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CardBillTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private var today = LocalDate(2026, 11, 16)
    private lateinit var db: FinanceDatabase
    private fun repo(): FinanceRepository {
        context.deleteDatabase("card.db")
        db = FinanceDatabase.build(context, "card.db")
        return FinanceRepository(db, now = { 1 }, today = { today })
    }
    @After fun tearDown() { db.close(); context.deleteDatabase("card.db") }

    private fun spend(card: Long, amount: Long, date: LocalDate) = Transaction(type = TransactionType.EXPENSE,
        status = TransactionStatus.COMPLETED, amount = amount, date = date, completedDate = date, fromAccountId = card, memo = "카드")

    @Test fun billFollowsUsage() = runTest {
        val r = repo()
        r.ensureInitialized()
        val main = r.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        // 결제 계좌가 부채면 안 됨
        try { r.saveAccount(Account(name = "카드", type = AccountType.LIABILITY, billingDay = 14, billingAccountId = 9999)); fail() } catch (_: FinanceException) {}
        val card = r.saveAccount(Account(name = "카드", type = AccountType.LIABILITY, billingDay = 14, billingStartDay = 1, billingAccountId = main))
        fun bills() = kotlinx.coroutines.runBlocking { r.snapshot().transactions.filter { it.source == TransactionSource.CARD_BILL } }

        assertTrue(bills().isEmpty()) // 이용액 0 → 대금 없음
        r.saveTransaction(spend(card, 30_000, LocalDate(2026, 11, 3)))
        val id = r.saveTransaction(spend(card, 20_000, LocalDate(2026, 11, 10)))
        val bill = bills().single()
        assertEquals(LocalDate(2026, 12, 14), bill.date)       // 11월 이용분 → 12월 14일
        assertEquals(50_000L, bill.amount)
        assertEquals(main, bill.fromAccountId); assertEquals(card, bill.toAccountId)
        assertEquals(TransactionType.TRANSFER, bill.type); assertTrue(bill.isPlanned)

        r.deleteTransaction(id)                                // 이용액이 줄면 대금도
        assertEquals(30_000L, bills().single().amount)

        // 결제일이 되어 완료 처리하면 그 뒤로는 건드리지 않는다
        today = LocalDate(2026, 12, 14)
        r.completeTransaction(bills().single().id, today, 30_000)
        r.saveTransaction(spend(card, 5_000, LocalDate(2026, 11, 20)))   // 지난 이용 기간에 늦게 입력
        assertEquals(listOf(30_000L to true), bills().filter { it.date == LocalDate(2026, 12, 14) }.map { it.amount to it.isCompleted })

        // 결제일 관리를 끄면 남은 예정 대금은 지운다
        r.saveTransaction(spend(card, 7_000, LocalDate(2026, 12, 14)))
        assertEquals(1, bills().count { it.isPlanned })        // 1월 14일 결제분
        r.saveAccount(r.snapshot().accounts.first { it.id == card }.copy(billingDay = null, billingAccountId = null))
        assertEquals(0, bills().count { it.isPlanned })
    }
}
