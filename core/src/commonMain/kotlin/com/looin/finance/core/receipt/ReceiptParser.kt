package com.looin.finance.core.receipt

import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus

/** 영수증 글자(OCR 결과)에서 읽어 낸 값. 못 찾은 것은 null — 화면은 찾은 것만 채운다. */
data class ReceiptGuess(
    val amount: Long?,
    val date: LocalDate?,
    val merchant: String?,
    /** 기본 카테고리 이름(예: "카페·간식"). 사용자가 가진 카테고리와 이름이 같을 때만 쓴다. */
    val categoryHint: String?,
)

/**
 * 영수증 글자 읽기(기기 안 OCR 결과를 받아 규칙으로 추정). 확실하지 않으면 비워 두고, 사용자가 확인 후 저장한다.
 *  - 금액: "결제금액·받을금액·승인금액" > "합계·총액" 줄의 금액, 없으면 '원'·쉼표가 붙은 가장 큰 금액
 *  - 날짜: 2026.11.16 / 2026-11-16 / 26/11/16 / 2026년 11월 16일 — 오늘 이후·1년보다 오래된 날짜는 버림
 *  - 가게: "상호·가맹점명" 다음 값, 없으면 맨 위쪽의 가게 이름처럼 보이는 줄
 *  - 카테고리: 가게 이름·글자에 든 낱말(스타벅스→카페·간식, 약국→의료·건강 …)
 */
object ReceiptParser {
    private val PAY_KEYS = listOf("결제금액", "결제 금액", "받을금액", "받을 금액", "승인금액", "승인 금액", "청구금액", "카드결제", "총결제", "총 결제")
    private val TOTAL_KEYS = listOf("합계", "합 계", "총액", "총 액", "총금액", "판매금액", "TOTAL", "Total", "total")
    private val SKIP_KEYS = listOf("부가세", "과세", "면세", "공급가", "할인", "거스름", "잔돈", "포인트", "적립", "VAT", "받은금액", "받은 금액")
    private val MONEY = Regex("""(?<![\d-])(\d{1,3}(?:[,.]\d{3})+|\d{3,8})(?![\d-])\s*(원)?""")
    private val DATE_LONG = Regex("""(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})""")
    private val DATE_SHORT = Regex("""(?<!\d)(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?!\d)""")

    private val CATEGORY_WORDS = listOf(
        "카페·간식" to listOf("스타벅스", "STARBUCKS", "커피", "COFFEE", "카페", "이디야", "투썸", "메가MGC", "메가커피", "빽다방", "컴포즈", "베이커리", "파리바게뜨", "뚜레쥬르", "던킨", "배스킨"),
        "의료·건강" to listOf("약국", "병원", "의원", "치과", "한의원", "PHARMACY"),
        "교통" to listOf("택시", "TAXI", "주유", "GS칼텍스", "SK에너지", "S-OIL", "에쓰오일", "현대오일", "주차", "하이패스", "고속도로", "카카오T"),
        "문화·여가" to listOf("CGV", "메가박스", "롯데시네마", "영화", "교보문고", "영풍문고", "서점", "노래", "PC방"),
        "생활용품" to listOf("다이소", "DAISO", "올리브영", "OLIVE", "철물"),
        "쇼핑" to listOf("백화점", "아울렛", "무신사", "유니클로", "UNIQLO", "자라", "ZARA"),
        "식비" to listOf("식당", "김밥", "치킨", "피자", "버거", "맥도날드", "롯데리아", "국밥", "분식", "반점", "GS25", "CU ", "씨유", "세븐일레븐", "이마트24", "이마트", "홈플러스", "롯데마트", "마트", "정육", "편의점", "푸드"),
        "통신" to listOf("SKT", "KT ", "LG U+", "LGU+"),
    )

    fun parse(text: String, today: LocalDate): ReceiptGuess {
        val lines = text.lines().map { it.trim() }.filter { it.isNotEmpty() }
        return ReceiptGuess(amount(lines), date(lines, today), merchant(lines), category(text))
    }

    private fun moneyIn(line: String): List<Long> = MONEY.findAll(line)
        .filter { m -> m.groupValues[2].isNotEmpty() || m.groupValues[1].contains(',') || m.groupValues[1].contains('.') }
        .mapNotNull { it.groupValues[1].replace(",", "").replace(".", "").toLongOrNull() }
        .filter { it in 100..100_000_000 }.toList()

    private fun amountNear(lines: List<String>, keys: List<String>): Long? {
        for (i in lines.indices) {
            val l = lines[i]
            if (keys.none { l.contains(it) } || SKIP_KEYS.any { l.contains(it) }) continue
            (moneyIn(l).lastOrNull() ?: lines.getOrNull(i + 1)?.let { moneyIn(it).lastOrNull() })?.let { return it }
        }
        return null
    }

    private fun amount(lines: List<String>): Long? =
        amountNear(lines, PAY_KEYS) ?: amountNear(lines, TOTAL_KEYS)
            ?: lines.filter { l -> SKIP_KEYS.none { l.contains(it) } && !l.contains("-") }.flatMap { moneyIn(it) }.maxOrNull()

    private fun date(lines: List<String>, today: LocalDate): LocalDate? {
        val oldest = today.minus(DatePeriod(years = 1))
        fun ok(y: Int, m: Int, d: Int) = runCatching { LocalDate(y, m, d) }.getOrNull()?.takeIf { it <= today && it >= oldest }
        for (l in lines) {
            DATE_LONG.find(l)?.let { m -> ok(m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toInt())?.let { return it } }
            DATE_SHORT.find(l)?.let { m -> ok(2000 + m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toInt())?.let { return it } }
        }
        return null
    }

    private val NOT_NAME = listOf("영수증", "RECEIPT", "사업자", "대표", "전화", "TEL", "주소", "카드", "승인", "번호", "일시", "POS", "매출", "고객", "*", "#")

    private fun merchant(lines: List<String>): String? {
        lines.forEachIndexed { i, l ->
            val key = listOf("상호", "가맹점명", "가맹점", "매장명", "점포명").firstOrNull { l.startsWith(it) }
            if (key != null) {
                val v = l.removePrefix(key).trimStart(':', ' ', '：').trim().ifEmpty { lines.getOrNull(i + 1) ?: "" }
                if (v.isNotBlank()) return v.take(20)
            }
        }
        return lines.take(6).firstOrNull { l ->
            l.length in 2..20 && l.any { it.isLetter() } && NOT_NAME.none { l.contains(it, ignoreCase = true) } &&
                l.count { it.isDigit() } <= 2 && MONEY.find(l) == null
        }
    }

    private fun category(text: String): String? =
        CATEGORY_WORDS.firstOrNull { (_, words) -> words.any { text.contains(it, ignoreCase = true) } }?.first
}
