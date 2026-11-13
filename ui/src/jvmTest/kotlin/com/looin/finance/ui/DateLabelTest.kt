package com.looin.finance.ui

import com.looin.finance.ui.components.korean
import com.looin.finance.ui.components.short
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

/** 화면 날짜 표기 회귀 테스트 (kotlinx-datetime 0.7 이전 때 "NOVEMBER.number.30" 으로 깨진 적 있음). */
class DateLabelTest {
    @Test fun shortAndKoreanLabels() {
        assertEquals("11.30", LocalDate(2026, 11, 30).short())
        assertEquals("1.5", LocalDate(2027, 1, 5).short())
        assertEquals("11월 13일 (금)", LocalDate(2026, 11, 13).korean())
        assertEquals("2026년 11월 13일 (금)", LocalDate(2026, 11, 13).korean(withYear = true))
    }
}
