package com.looin.finance.core

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.validation.TransactionValidator
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ValidationAndMoneyTest {
    private fun validate(tx: Transaction, existing: List<Transaction> = emptyList()) =
        TransactionValidator.validate(tx, F.accounts + F.usd, F.categories, existing, F.today)

    @Test fun `정상 지출은 통과`() {
        val r = validate(F.expense(10_000))
        assertTrue(r.isValid)
        assertTrue(r.warnings.isEmpty())
    }

    @Test fun `잔액 부족이면 경고하지만 저장은 허용(음수 잔고)`() {
        val r = validate(F.expense(60_000, from = F.cash.id))
        assertTrue(r.isValid)
        assertEquals(1, r.warnings.size)
        assertTrue(r.warnings[0].contains("-10,000원"))
    }

    @Test fun `예정 지출은 예정일 예상 잔고로 잔액 부족을 판단한다`() {
        val existing = listOf(F.expense(40_000, date = LocalDate(2026, 11, 15), status = TransactionStatus.PLANNED, from = F.cash.id))
        val r = validate(F.expense(20_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED, from = F.cash.id), existing)
        assertEquals(1, r.warnings.size)
    }

    @Test fun `부채 계좌(카드) 지출은 잔액 부족 경고를 하지 않는다`() {
        assertTrue(validate(F.expense(1_000_000, from = F.card.id)).warnings.isEmpty())
    }

    @Test fun `수정 중인 거래 자신은 잔액 계산에서 제외한다`() {
        val tx = F.expense(40_000, from = F.cash.id)
        assertTrue(validate(tx.copy(amount = 45_000), listOf(tx)).warnings.isEmpty())
    }

    @Test fun `오류 케이스`() {
        assertFalse(validate(F.expense(0)).isValid)
        assertFalse(validate(F.expense(-5)).isValid)
        assertFalse(validate(F.transfer(1_000, F.checking.id, F.checking.id)).isValid)
        assertFalse(validate(F.transfer(1_000, F.checking.id, F.usd.id)).isValid)
        // 미래 날짜를 완료로 등록할 수 없음
        assertFalse(validate(F.expense(1_000, date = LocalDate(2026, 12, 1))).isValid)
        // 지출에 수입 카테고리
        assertFalse(validate(F.expense(1_000, category = F.salary.id)).isValid)
        // 이체에는 카테고리를 두지 않음
        assertFalse(validate(F.transfer(1_000, F.checking.id, F.savings.id).copy(categoryId = F.food.id)).isValid)
        // 보관 계좌
        val archived = F.checking.copy(archived = true)
        val r = TransactionValidator.validate(F.expense(1_000), listOf(archived), F.categories, emptyList(), F.today)
        assertFalse(r.isValid)
        // 없는 계좌
        assertFalse(validate(F.expense(1_000, from = 777)).isValid)
        // 수입 계좌 미지정
        assertFalse(validate(Transaction(type = TransactionType.INCOME, status = TransactionStatus.COMPLETED, amount = 1, date = F.today)).isValid)
    }

    @Test fun `취소 거래는 잔액 경고 없이 저장 가능`() {
        val r = validate(F.expense(999_999_999, status = TransactionStatus.CANCELLED))
        assertTrue(r.isValid)
        assertTrue(r.warnings.isEmpty())
    }

    @Test fun `원화 천 단위 구분 표시`() {
        assertEquals("1,234,567원", MoneyFormat.format(1_234_567))
        assertEquals("-10,000원", MoneyFormat.format(-10_000))
        assertEquals("0원", MoneyFormat.format(0))
        assertEquals("+3,000원", MoneyFormat.format(3_000, signed = true))
        assertEquals("$1,234.50", MoneyFormat.format(123_450, "USD"))
        assertEquals("-$0.05", MoneyFormat.format(-5, "USD"))
    }

    @Test fun `금액 입력 파싱`() {
        assertEquals(1_234_567L, MoneyFormat.parse("1,234,567"))
        assertEquals(10_000L, MoneyFormat.parse("10000원"))
        assertNull(MoneyFormat.parse(""))
        assertNull(MoneyFormat.parse("12.5")) // 원화는 소수 불가
        assertNull(MoneyFormat.parse("abc"))
        assertEquals(1_250L, MoneyFormat.parse("12.5", "USD"))
        assertNull(MoneyFormat.parse("1.234", "USD"))
    }
}
