package com.looin.finance.core.money

import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * 금액 칸의 간단한 계산식: `12000+3500`, `48000÷4`, `12,000×3-500`.
 *  - 연산자: + − × ÷ (키보드의 - * / 도 받음), 곱셈·나눗셈 먼저
 *  - 결과는 통화의 최소 단위로 반올림(원화는 1원). 0 으로 나누기·잘못된 식은 null
 *  - 연산자가 없으면 [MoneyFormat.parse] 와 같다
 */
object AmountExpression {
    private val OPS = setOf('+', '-', '×', '÷')

    fun normalize(text: String): String =
        text.replace('*', '×').replace('x', '×').replace('X', '×').replace('/', '÷').replace('−', '-').replace(",", "").replace(" ", "")

    /** 연산자가 들어 있는 계산식인지(맨 앞의 - 는 부호로 본다). */
    fun isExpression(text: String): Boolean = normalize(text).drop(1).any { it in OPS }

    /** 금액 칸 글자 → 최소 단위 금액. */
    fun parse(text: String, currency: String = "KRW"): Long? {
        val s = normalize(text)
        if (!isExpression(s)) return MoneyFormat.parse(s, currency)
        val value = evaluate(s) ?: return null
        val decimals = Currencies.of(currency).decimals
        var factor = 1.0
        repeat(decimals) { factor *= 10 }
        val minor = value * factor
        if (minor.isNaN() || minor.isInfinite() || abs(minor) > 9e15) return null
        return minor.roundToLong()
    }

    /** 숫자와 연산자를 나눠 계산(곱셈·나눗셈 먼저). */
    fun evaluate(expr: String): Double? {
        val s = normalize(expr)
        if (s.isEmpty()) return null
        val nums = mutableListOf<Double>()
        val ops = mutableListOf<Char>()
        var i = 0
        var expectNumber = true
        while (i < s.length) {
            val c = s[i]
            if (expectNumber) {
                var j = i
                if (s[j] == '-') j++ // 음수
                val start = j
                while (j < s.length && (s[j].isDigit() || s[j] == '.')) j++
                val token = s.substring(start, j)
                if (token.isEmpty() || token.count { it == '.' } > 1) return null
                val v = token.toDoubleOrNull() ?: return null
                nums += if (s[i] == '-') -v else v
                i = j
                expectNumber = false
            } else {
                if (c !in OPS) return null
                ops += c
                i++
                expectNumber = true
            }
        }
        if (expectNumber) return null // 연산자로 끝남
        // 곱셈·나눗셈 먼저
        val n2 = mutableListOf(nums[0])
        val o2 = mutableListOf<Char>()
        for (k in ops.indices) {
            val b = nums[k + 1]
            when (ops[k]) {
                '×' -> n2[n2.lastIndex] = n2.last() * b
                '÷' -> { if (b == 0.0) return null; n2[n2.lastIndex] = n2.last() / b }
                else -> { o2 += ops[k]; n2 += b }
            }
        }
        var r = n2[0]
        for (k in o2.indices) r = if (o2[k] == '+') r + n2[k + 1] else r - n2[k + 1]
        return r
    }
}
