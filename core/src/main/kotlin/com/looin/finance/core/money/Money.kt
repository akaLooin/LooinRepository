package com.looin.finance.core.money

import kotlin.math.abs
import kotlin.math.roundToLong

/** 통화별 소수 자릿수와 표시 기호. 금액은 항상 최소 통화 단위의 Long 으로 저장한다(부동소수점 금지). */
data class CurrencyInfo(val code: String, val decimals: Int, val symbol: String, val label: String)

object Currencies {
    val KRW = CurrencyInfo("KRW", 0, "원", "대한민국 원")
    val USD = CurrencyInfo("USD", 2, "$", "미국 달러")
    val JPY = CurrencyInfo("JPY", 0, "¥", "일본 엔")
    val EUR = CurrencyInfo("EUR", 2, "€", "유로")
    val CNY = CurrencyInfo("CNY", 2, "元", "중국 위안")

    val all = listOf(KRW, USD, JPY, EUR, CNY)

    fun of(code: String): CurrencyInfo = all.firstOrNull { it.code == code } ?: CurrencyInfo(code, 2, code, code)
}

object MoneyFormat {

    private fun groupThousands(digits: String): String {
        val sb = StringBuilder()
        val len = digits.length
        for (i in 0 until len) {
            sb.append(digits[i])
            val remaining = len - i - 1
            if (remaining > 0 && remaining % 3 == 0) sb.append(',')
        }
        return sb.toString()
    }

    /** 천 단위 구분 숫자만(통화 기호 없음). 예: 1234567 → "1,234,567" */
    fun number(amountMinor: Long, currency: String = "KRW"): String {
        val info = Currencies.of(currency)
        val negative = amountMinor < 0
        val absValue = if (amountMinor == Long.MIN_VALUE) Long.MAX_VALUE else abs(amountMinor)
        val text = if (info.decimals == 0) {
            groupThousands(absValue.toString())
        } else {
            var factor = 1L
            repeat(info.decimals) { factor *= 10 }
            val major = absValue / factor
            val minor = (absValue % factor).toString().padStart(info.decimals, '0')
            groupThousands(major.toString()) + "." + minor
        }
        return if (negative) "-$text" else text
    }

    /** 예: KRW → "1,234,567원", USD → "$1,234.50" */
    fun format(amountMinor: Long, currency: String = "KRW", signed: Boolean = false): String {
        val info = Currencies.of(currency)
        val n = number(amountMinor, currency)
        val sign = if (signed && amountMinor > 0) "+" else ""
        return when (info.code) {
            "KRW" -> "$sign${n}원"
            else -> if (n.startsWith("-")) "-${info.symbol}${n.substring(1)}" else "$sign${info.symbol}$n"
        }
    }

    /**
     * 사용자 입력 문자열을 최소 통화 단위로 변환. 쉼표·공백 허용, 소수 자릿수 초과·잘못된 입력은 null.
     */
    fun parse(text: String, currency: String = "KRW"): Long? {
        val info = Currencies.of(currency)
        val cleaned = text.replace(",", "").replace(" ", "").replace("원", "").trim()
        if (cleaned.isEmpty()) return null
        val negative = cleaned.startsWith("-")
        val body = cleaned.removePrefix("-")
        val parts = body.split(".")
        if (parts.size > 2) return null
        val major = parts[0].ifEmpty { "0" }
        val minor = if (parts.size == 2) parts[1] else ""
        if (!major.all { it.isDigit() } || !minor.all { it.isDigit() }) return null
        if (minor.length > info.decimals) return null
        if (major.length > 15) return null
        var factor = 1L
        repeat(info.decimals) { factor *= 10 }
        val value = major.toLong() * factor + (minor.padEnd(info.decimals, '0').ifEmpty { "0" }).toLong()
        return if (negative) -value else value
    }

    /** 외화 금액의 원화 평가액(추정치). rateX10000 = 외화 1단위당 원 × 10,000. */
    fun toKrw(amountMinor: Long, currency: String, rateX10000: Long): Long {
        val info = Currencies.of(currency)
        var factor = 1.0
        repeat(info.decimals) { factor *= 10.0 }
        return (amountMinor / factor * rateX10000 / 10_000.0).roundToLong()
    }
}
