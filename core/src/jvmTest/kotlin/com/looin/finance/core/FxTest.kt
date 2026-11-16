package com.looin.finance.core

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.AccountFx
import com.looin.finance.core.money.CurrencyConversion
import com.looin.finance.core.money.Fx
import com.looin.finance.core.money.RateKind
import com.looin.finance.core.validation.TransactionValidator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FxTest {
    private val d = LocalDate(2026, 11, 1)
    private val krw = Account(id = 1, name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000)
    private val yen = Account(id = 2, name = "엔화", type = AccountType.FOREIGN, currency = "JPY", openingBalance = 10_000, openingRateX10000 = 90_000)

    @Test fun conversions() {
        assertEquals(9_000L, Fx.toKrw(1_000, "JPY", 90_000)) // ¥1,000 × 9원
        assertEquals(1_000L, Fx.fromKrw(9_000, "JPY", 90_000))
        assertEquals(1_000L, Fx.fromKrw(13_800, "USD", 13_800_000)) // 13,800원 → $10.00
        assertEquals(90_000L, Fx.rateOf(9_000, 1_000, "JPY"))
        assertEquals(83_638L, Fx.parseRate("8.3638"))
        assertNull(Fx.parseRate("0"))
        assertEquals("1,380.5", Fx.formatRate(13_805_000))
        assertEquals(83_640L, Fx.parseKrwRate("""{"amount":1.0,"base":"JPY","date":"2026-11-16","rates":{"KRW":8.364}}"""))
        val series = Fx.parseKrwSeries("""{"rates":{"2026-10-30":{"KRW":9.1},"2026-11-02":{"KRW":9.2}}}""")
        assertEquals(91_000L, Fx.rateOn(series, LocalDate(2026, 11, 1))) // 주말 → 직전 영업일
        assertEquals(92_000L, Fx.rateOn(series, LocalDate(2026, 11, 2)))
    }

    /** 외화 잔고의 기록 환율 기준 원화와 평가 환율 우선순위(실시간 > 직접 적은 값 > 최근 기록). */
    @Test fun bookValueAndValuationRate() {
        val spend = Transaction(id = 10, type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 2_000, currency = "JPY",
            date = d, fromAccountId = 2, rateToKrwX10000 = 95_000)
        // 초기 ¥10,000 × 9 = 90,000 − ¥2,000 × 9.5 = 19,000 → 71,000
        assertEquals(71_000L, AccountFx.bookValueKrw(yen, listOf(spend)))
        assertNull(AccountFx.bookValueKrw(yen, listOf(spend.copy(rateToKrwX10000 = null))))
        assertEquals(listOf(spend.copy(rateToKrwX10000 = null)), AccountFx.missingRates(yen, listOf(spend.copy(rateToKrwX10000 = null))))
        assertEquals(RateKind.LIVE, AccountFx.valuationRate(yen, listOf(spend), mapOf("JPY" to 84_000))!!.kind)
        assertEquals(95_000L, AccountFx.valuationRate(yen, listOf(spend), emptyMap())!!.rateX10000)
        assertEquals(RateKind.MANUAL, AccountFx.valuationRate(yen.copy(rateToKrwX10000 = 1), listOf(spend), emptyMap())!!.kind)
    }

    /** 원화↔외화 이체(환전): 받은 금액·환율이 있어야 하고, 입금 계좌는 자기 통화 금액만큼 늘어난다. 외화 거래는 환율 필수. */
    @Test fun validation() {
        val ex = Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 90_000, date = d,
            fromAccountId = 1, toAccountId = 2, toAmount = 10_000, rateToKrwX10000 = 90_000)
        assertTrue(TransactionValidator.validate(ex, listOf(krw, yen), emptyList(), emptyList(), d).isValid)
        assertEquals(10_000L, ex.deltaFor(2)); assertEquals(-90_000L, ex.deltaFor(1))
        assertTrue(TransactionValidator.validate(ex.copy(toAmount = null), listOf(krw, yen), emptyList(), emptyList(), d).errors.any { "받은 금액" in it })
        val spend = Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 500, currency = "JPY", date = d, fromAccountId = 2)
        assertTrue(TransactionValidator.validate(spend, listOf(krw, yen), emptyList(), emptyList(), d).errors.any { "환율" in it })
        assertTrue(TransactionValidator.validate(spend.copy(rateToKrwX10000 = 90_000), listOf(krw, yen), emptyList(), emptyList(), d).isValid)
        // 자동으로 만든 거래(고정 비용 등)는 막지 않고 나중에 채운다
        assertTrue(TransactionValidator.validate(spend.copy(source = TransactionSource.RECURRING), listOf(krw, yen), emptyList(), emptyList(), d).isValid)
    }

    /** 원화 계좌 → 엔화 계좌: 원화로 적은 금액은 환율로 나누고, 원화 계좌와의 이체는 상대 쪽 숫자를 그대로 둔다. */
    @Test fun convertKrwAccount() {
        val acc = Account(id = 3, name = "여행", type = AccountType.CHECKING, openingBalance = 90_000, includeInAvailable = true)
        val inTx = Transaction(id = 20, type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 180_000, date = d, fromAccountId = 1, toAccountId = 3)
        val spend = Transaction(id = 21, type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 19_000, date = d, fromAccountId = 3)
        val accounts = mapOf(1L to krw, 3L to acc)
        val missing = CurrencyConversion.convert(acc, "JPY", false, 90_000, mapOf(20L to 90_000), listOf(inTx, spend), accounts)
        assertTrue(missing.errors.any { "1건" in it })
        val r = CurrencyConversion.convert(acc, "JPY", false, 90_000, mapOf(20L to 90_000, 21L to 95_000), listOf(inTx, spend), accounts)
        assertTrue(r.errors.isEmpty())
        assertEquals("JPY", r.account.currency); assertEquals(AccountType.FOREIGN, r.account.type)
        assertEquals(10_000L, r.account.openingBalance)
        val t20 = r.transactions.first { it.id == 20L }
        assertEquals(180_000L, t20.amount); assertEquals("KRW", t20.currency); assertEquals(20_000L, t20.toAmount)
        val t21 = r.transactions.first { it.id == 21L }
        assertEquals(2_000L, t21.amount); assertEquals("JPY", t21.currency)
        // 바꾼 뒤 잔고: 10,000 + 20,000 − 2,000 = ¥28,000, 주거래 쪽 출금 180,000원은 그대로
        val bal = r.account.openingBalance + r.transactions.sumOf { it.deltaFor(3) }
        assertEquals(28_000L, bal)
        assertEquals(-180_000L, t20.deltaFor(1))
        // 금액이 이미 엔화였다면 숫자는 그대로
        val same = CurrencyConversion.convert(acc, "JPY", true, 90_000, mapOf(20L to 90_000, 21L to 95_000), listOf(inTx, spend), accounts)
        assertEquals(19_000L, same.transactions.first { it.id == 21L }.amount)
    }
}
