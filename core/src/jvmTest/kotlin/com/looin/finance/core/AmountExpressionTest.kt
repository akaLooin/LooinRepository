package com.looin.finance.core

import com.looin.finance.core.money.AmountExpression
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AmountExpressionTest {
    @Test fun arithmeticWithPrecedence() {
        assertEquals(15_500L, AmountExpression.parse("12000+3500"))
        assertEquals(12_000L, AmountExpression.parse("48,000÷4"))
        assertEquals(35_500L, AmountExpression.parse("12000×3-500"))
        assertEquals(35_500L, AmountExpression.parse("12000*3-500"))
        assertEquals(14_000L, AmountExpression.parse("2000+3000×4"))
        assertEquals(3_333L, AmountExpression.parse("10000/3"))   // 원 단위 반올림
        assertEquals(3_334L, AmountExpression.parse("10003/3")) // 3334.33 → 3334
        assertEquals(1_250L, AmountExpression.parse("12.5×100", "USD") ?.let { it / 100 })
    }

    @Test fun plainNumbersAndErrors() {
        assertEquals(12_000L, AmountExpression.parse("12,000"))
        assertFalse(AmountExpression.isExpression("-500"))
        assertTrue(AmountExpression.isExpression("1+1"))
        assertNull(AmountExpression.parse("1000+"))
        assertNull(AmountExpression.parse("1000÷0"))
        assertNull(AmountExpression.parse("1000++2"))
        assertNull(AmountExpression.parse("abc"))
    }
}
