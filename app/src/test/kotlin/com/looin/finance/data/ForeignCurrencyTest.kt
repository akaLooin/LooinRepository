package com.looin.finance.data

import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.money.AccountFx
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 외화: 환전 이체, 환율 채우기, 원화 계좌 → 외화 계좌 바꾸기(저장까지). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ForeignCurrencyTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private val db = run { context.deleteDatabase("fx.db"); FinanceDatabase.build(context, "fx.db") }
    private val today = LocalDate(2026, 11, 16)
    private val repo = FinanceRepository(db, now = { 1 }, today = { today })
    @After fun tearDown() { db.close(); context.deleteDatabase("fx.db") }

    @Test fun exchangeAndFillRates() = runBlocking {
        repo.ensureInitialized()
        val krw = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        val yen = repo.saveAccount(Account(name = "엔화", type = AccountType.FOREIGN, currency = "JPY", openingBalance = 0))
        // 원화 90,000원으로 ¥10,000 환전
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 90_000, date = today,
            fromAccountId = krw, toAccountId = yen, toAmount = 10_000, rateToKrwX10000 = 90_000))
        // 환율 없는 외화 지출은 저장되지 않는다
        try {
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 1_000, currency = "JPY", date = today, fromAccountId = yen))
            fail()
        } catch (e: FinanceException) { assertTrue(e.message!!.contains("환율")) }
        val s = repo.snapshot()
        val acc = s.accounts.first { it.id == yen }
        assertEquals(10_000L, BalanceCalculator.actualBalance(acc, s.transactions))
        assertEquals(910_000L, BalanceCalculator.actualBalance(s.accounts.first { it.id == krw }, s.transactions))
        assertEquals(90_000L, AccountFx.bookValueKrw(acc, s.transactions))
        // 실시간 ¥1 = 8.5원 → 평가액 85,000원
        assertEquals(85_000L, BalanceCalculator.assetSummary(listOf(acc), s.transactions, mapOf("JPY" to 85_000)).totalAssets)
    }

    @Test fun convertKrwAccountToYen() = runBlocking {
        repo.ensureInitialized()
        val main = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        val trip = repo.saveAccount(Account(name = "여행", type = AccountType.CHECKING, openingBalance = 0, includeInAvailable = true))
        val t1 = repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 180_000, date = LocalDate(2026, 11, 2),
            fromAccountId = main, toAccountId = trip))
        val t2 = repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 19_000, date = LocalDate(2026, 11, 3), fromAccountId = trip))
        // 환율이 하나라도 비면 안 바뀐다
        try { repo.convertAccountCurrency(trip, "JPY", false, null, mapOf(t1 to 90_000)); fail() } catch (_: FinanceException) {}
        repo.convertAccountCurrency(trip, "JPY", false, null, mapOf(t1 to 90_000, t2 to 95_000))
        val s = repo.snapshot()
        val acc = s.accounts.first { it.id == trip }
        assertEquals("JPY", acc.currency); assertEquals(AccountType.FOREIGN, acc.type)
        assertEquals(18_000L, BalanceCalculator.actualBalance(acc, s.transactions)) // ¥20,000 − ¥2,000
        assertEquals(820_000L, BalanceCalculator.actualBalance(s.accounts.first { it.id == main }, s.transactions)) // 주거래는 그대로
        assertEquals(0, AccountFx.missingRates(acc, s.transactions).size)
        // 나중에 환율 고치기
        repo.setRates(trip, null, mapOf(t2 to 96_000))
        assertEquals(96_000L, repo.snapshot().transactions.first { it.id == t2 }.rateToKrwX10000)
    }

    /** 엔화 계좌 → 원화 계좌로 되돌리기: 기록 환율로 원화 금액, 환전 이체는 원화 계좌 쪽과 같은 원화 이체가 된다. */
    @Test fun convertYenBackToKrw() = runBlocking {
        repo.ensureInitialized()
        val krw = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        val yen = repo.saveAccount(Account(name = "엔화", type = AccountType.FOREIGN, currency = "JPY", openingBalance = 0))
        val ex = repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 90_000, date = today,
            fromAccountId = krw, toAccountId = yen, toAmount = 10_000, rateToKrwX10000 = 90_000))
        val sp = repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 1_000, currency = "JPY", date = today,
            fromAccountId = yen, rateToKrwX10000 = 90_000))
        repo.convertAccountCurrency(yen, "KRW", false, null, mapOf(ex to 90_000, sp to 90_000))
        val s = repo.snapshot()
        val acc = s.accounts.first { it.id == yen }
        assertEquals("KRW", acc.currency)
        assertEquals(81_000L, BalanceCalculator.actualBalance(acc, s.transactions)) // 90,000 − 9,000
        assertEquals(910_000L, BalanceCalculator.actualBalance(s.accounts.first { it.id == krw }, s.transactions))
        // 원화 지출로 통계에 9,000원
        assertEquals(9_000L, s.transactions.first { it.id == sp }.amount)
    }
}
