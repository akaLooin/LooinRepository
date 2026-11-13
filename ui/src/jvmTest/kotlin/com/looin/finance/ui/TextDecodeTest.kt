package com.looin.finance.ui.platform

import kotlin.test.Test
import kotlin.test.assertEquals

/** 은행·엑셀 CSV 는 CP949 인 경우가 많다: UTF-8(BOM 포함)·CP949 모두 한글이 깨지지 않아야 한다. */
class TextDecodeTest {
    private val text = "날짜,적요\n2026-11-01,스타벅스"

    @Test fun utf8WithAndWithoutBom() {
        assertEquals(text, decodeKoreanText(text.toByteArray(Charsets.UTF_8)))
        assertEquals(text, decodeKoreanText(("﻿" + text).toByteArray(Charsets.UTF_8)))
    }

    @Test fun cp949Fallback() {
        assertEquals(text, decodeKoreanText(text.toByteArray(charset("MS949"))))
    }

    @Test fun desktopAddsExtension() {
        assertEquals("a.csv", DesktopFileActions.targetName("a", FileKind.CSV))
        assertEquals("a.CSV", DesktopFileActions.targetName("a.CSV", FileKind.CSV))
        assertEquals("b.json", DesktopFileActions.targetName("b", FileKind.JSON))
    }
}
