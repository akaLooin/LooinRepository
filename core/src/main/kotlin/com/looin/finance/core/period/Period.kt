package com.looin.finance.core.period

import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.Month
import kotlinx.datetime.minus
import kotlinx.datetime.number
import kotlinx.datetime.plus

enum class PeriodBasis(val label: String) {
    /** 매월 1일 ~ 말일. */
    CALENDAR("달력 기준"),
    /** 급여 기준일 ~ 다음 기준일 전날. */
    PAYDAY("월급일 기준"),
}

/**
 * 회계 기간. 내부적으로 [start] 포함, [endExclusive] 미포함인 반열린 구간이다.
 */
data class Period(
    val basis: PeriodBasis,
    val start: LocalDate,
    val endExclusive: LocalDate,
) {
    init {
        require(start < endExclusive) { "기간 시작은 종료보다 앞서야 합니다: $start ~ $endExclusive" }
    }

    operator fun contains(date: LocalDate): Boolean = date >= start && date < endExclusive

    /** 화면 표시용 마지막 날(포함). */
    val lastDay: LocalDate get() = endExclusive.minus(DatePeriod(days = 1))

    val label: String
        get() = when (basis) {
            PeriodBasis.CALENDAR -> "${start.year}년 ${start.monthNumber}월"
            PeriodBasis.PAYDAY -> "${start.year}.${start.monthNumber}.${start.dayOfMonth} ~ " +
                "${lastDay.year}.${lastDay.monthNumber}.${lastDay.dayOfMonth}"
        }

    val rangeLabel: String
        get() = "${start.monthNumber}.${start.dayOfMonth} ~ ${lastDay.monthNumber}.${lastDay.dayOfMonth}"
}

object PeriodCalculator {

    fun lengthOfMonth(year: Int, month: Int): Int {
        val first = LocalDate(year, month, 1)
        val nextFirst = first.plus(DatePeriod(months = 1))
        return (nextFirst.toEpochDays() - first.toEpochDays())
    }

    /** 해당 연·월의 급여 기준일. 그 달에 없는 날짜(예: 2월 31일)면 말일. */
    fun paydayIn(year: Int, month: Int, paydayDay: Int): LocalDate {
        require(paydayDay in 1..31) { "급여 기준일은 1~31 사이여야 합니다: $paydayDay" }
        return LocalDate(year, month, minOf(paydayDay, lengthOfMonth(year, month)))
    }

    fun periodContaining(date: LocalDate, basis: PeriodBasis, paydayDay: Int): Period = when (basis) {
        PeriodBasis.CALENDAR -> {
            val start = LocalDate(date.year, date.month, 1)
            Period(basis, start, start.plus(DatePeriod(months = 1)))
        }
        PeriodBasis.PAYDAY -> {
            val thisMonthPayday = paydayIn(date.year, date.monthNumber, paydayDay)
            val startMonth = if (date >= thisMonthPayday) {
                LocalDate(date.year, date.month, 1)
            } else {
                LocalDate(date.year, date.month, 1).minus(DatePeriod(months = 1))
            }
            val nextMonth = startMonth.plus(DatePeriod(months = 1))
            Period(
                basis,
                paydayIn(startMonth.year, startMonth.monthNumber, paydayDay),
                paydayIn(nextMonth.year, nextMonth.monthNumber, paydayDay),
            )
        }
    }

    fun next(period: Period, paydayDay: Int): Period =
        periodContaining(period.endExclusive, period.basis, paydayDay)

    fun previous(period: Period, paydayDay: Int): Period =
        periodContaining(period.start.minus(DatePeriod(days = 1)), period.basis, paydayDay)

    /** [period]를 포함해 과거로 [count]개 기간(오래된 순). */
    fun recent(period: Period, count: Int, paydayDay: Int): List<Period> {
        val result = ArrayDeque<Period>()
        var p = period
        repeat(count) {
            result.addFirst(p)
            p = previous(p, paydayDay)
        }
        return result.toList()
    }

    /** 월 이동용: 달력 월의 1일. */
    fun firstOfMonth(year: Int, month: Month) = LocalDate(year, month.number, 1)
}
