package com.looin.finance.core.calc

/** 계산 근거 한 줄. [sign] 은 합계에 더해지는 방향(+1/-1), 0 이면 참고용. */
data class BreakdownLine(val label: String, val amount: Long, val sign: Int = 1, val note: String = "")

/** 화면의 모든 핵심 금액은 이 객체로 계산 근거를 함께 제공한다. */
data class Breakdown(
    val title: String,
    val total: Long,
    val lines: List<BreakdownLine>,
    val formula: String = "",
    val notes: List<String> = emptyList(),
)
