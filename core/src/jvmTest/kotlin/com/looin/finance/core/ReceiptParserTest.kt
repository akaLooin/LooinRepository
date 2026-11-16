package com.looin.finance.core

import com.looin.finance.core.receipt.ReceiptParser
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReceiptParserTest {
    private val today = LocalDate(2026, 11, 16)

    @Test fun cafeReceipt() {
        val text = """
            스타벅스 강남역점
            사업자번호 123-45-67890
            대표 홍길동  TEL 02-123-4567
            2026-11-15 08:42:10
            아메리카노 T          4,500
            카페라떼 T            5,000
            합계                  9,500
            부가세                  864
            결제금액              9,500원
            신용카드 승인 ****1234
        """.trimIndent()
        val g = ReceiptParser.parse(text, today)
        assertEquals(9_500L, g.amount)
        assertEquals(LocalDate(2026, 11, 15), g.date)
        assertEquals("스타벅스 강남역점", g.merchant)
        assertEquals("카페·간식", g.categoryHint)
    }

    /** "상호:" 표기, 2자리 연도, 합계가 다음 줄에, OCR 이 쉼표를 점으로 읽은 경우 */
    @Test fun marketReceiptVariants() {
        val text = """
            [영수증]
            상호: 행복한 정육점
            26/11/14 19:20
            돼지고기 앞다리 600g
            총 액
            23.800
            받은 금액 30,000
            거스름돈 6,200
        """.trimIndent()
        val g = ReceiptParser.parse(text, today)
        assertEquals(23_800L, g.amount)
        assertEquals(LocalDate(2026, 11, 14), g.date)
        assertEquals("행복한 정육점", g.merchant)
        assertEquals("식비", g.categoryHint)
    }

    /** 키워드가 없으면 '원'이 붙은 가장 큰 금액, 미래·너무 옛날 날짜는 버림, 모르는 가게는 카테고리 없음 */
    @Test fun fallbacks() {
        val text = "동네 철물점? 아님\n2027년 1월 1일\n못 12,000원\n망치 8,000원\n010-1234-5678"
        val g = ReceiptParser.parse(text, today)
        assertEquals(12_000L, g.amount)
        assertNull(g.date)
        val g2 = ReceiptParser.parse("알 수 없는 가게\n물건 3,000원", today)
        assertNull(g2.categoryHint)
        assertEquals("알 수 없는 가게", g2.merchant)
    }
}
