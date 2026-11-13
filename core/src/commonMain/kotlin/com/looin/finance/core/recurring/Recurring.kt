package com.looin.finance.core.recurring

import com.looin.finance.core.model.KRW
import kotlinx.datetime.number
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.plus

enum class Frequency(val label: String) { MONTHLY("매월"), WEEKLY("매주") }

/**
 * 반복 거래 규칙(월세·급여·통신비 등). 규칙 자체는 거래가 아니며, 발생일마다 "예정" 거래를 만든다.
 *
 * - 매월: [dayOfMonth] 일(1~31). 그 달에 없는 날짜면 말일 (급여 기준일과 같은 규칙)
 * - 매주: [dayOfWeek] 요일
 * - [interval]: N개월/N주마다 (기본 1). 시작일이 속한 달/주를 기준으로 센다.
 * - [generatedThrough]: 이 날짜까지는 이미 예정 거래를 만들었음. 사용자가 지운 발생분을 다시 만들지 않기 위한 기록.
 */
data class RecurringRule(
    val id: Long = 0,
    val name: String,
    val type: TransactionType,
    val amount: Long,
    val currency: String = KRW,
    val fromAccountId: Long? = null,
    val toAccountId: Long? = null,
    val categoryId: Long? = null,
    val frequency: Frequency = Frequency.MONTHLY,
    val interval: Int = 1,
    val dayOfMonth: Int? = null,
    val dayOfWeek: DayOfWeek? = null,
    val startDate: LocalDate,
    val endDate: LocalDate? = null,
    val active: Boolean = true,
    val generatedThrough: LocalDate? = null,
    val memo: String = "",
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
) {
    val scheduleLabel: String
        get() = when (frequency) {
            Frequency.MONTHLY -> (if (interval == 1) "매월" else "${interval}개월마다") + " ${dayOfMonth}일"
            Frequency.WEEKLY -> (if (interval == 1) "매주" else "${interval}주마다") + " ${dayOfWeek?.let { KOREAN_DAY[it] } ?: ""}요일"
        }

    companion object {
        val KOREAN_DAY = mapOf(
            DayOfWeek.MONDAY to "월", DayOfWeek.TUESDAY to "화", DayOfWeek.WEDNESDAY to "수", DayOfWeek.THURSDAY to "목",
            DayOfWeek.FRIDAY to "금", DayOfWeek.SATURDAY to "토", DayOfWeek.SUNDAY to "일",
        )
    }
}

object RecurrenceCalculator {

    fun validate(rule: RecurringRule): List<String> = buildList {
        if (rule.name.isBlank()) add("이름을 입력하세요.")
        if (rule.amount <= 0) add("금액은 0보다 커야 합니다.")
        if (rule.interval !in 1..12) add("반복 간격은 1~12 사이여야 합니다.")
        if (rule.type !in setOf(TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER)) add("수입·지출·이체만 반복할 수 있습니다.")
        when (rule.frequency) {
            Frequency.MONTHLY -> if (rule.dayOfMonth == null || rule.dayOfMonth !in 1..31) add("매월 반복일은 1~31일이어야 합니다.")
            Frequency.WEEKLY -> if (rule.dayOfWeek == null) add("반복 요일을 선택하세요.")
        }
        if (rule.endDate != null && rule.endDate < rule.startDate) add("종료일은 시작일보다 앞설 수 없습니다.")
    }

    /** [from]~[to](둘 다 포함) 사이의 발생일. 시작일 이전·종료일 이후는 제외. */
    fun occurrences(rule: RecurringRule, from: LocalDate, to: LocalDate): List<LocalDate> {
        val lo = maxOf(from, rule.startDate)
        val hi = rule.endDate?.let { minOf(it, to) } ?: to
        if (lo > hi) return emptyList()
        val out = mutableListOf<LocalDate>()
        when (rule.frequency) {
            Frequency.MONTHLY -> {
                val day = rule.dayOfMonth ?: return emptyList()
                val startMonth = rule.startDate.year * 12 + (rule.startDate.month.number - 1)
                var m = lo.year * 12 + (lo.month.number - 1)
                // 간격 맞추기: 시작 달에서 interval 배수만큼 떨어진 달만
                val offset = ((m - startMonth) % rule.interval + rule.interval) % rule.interval
                if (offset != 0) m += rule.interval - offset
                while (true) {
                    val d = PeriodCalculator.paydayIn(m / 12, m % 12 + 1, day)
                    if (d > hi) break
                    if (d >= lo) out += d
                    m += rule.interval
                }
            }
            Frequency.WEEKLY -> {
                val dow = rule.dayOfWeek ?: return emptyList()
                // 시작일 이후 첫 해당 요일
                var first = rule.startDate
                while (first.dayOfWeek != dow) first = first.plus(DatePeriod(days = 1))
                val step = 7 * rule.interval
                var d = first
                if (d < lo) {
                    val gap = lo.toEpochDays() - d.toEpochDays()
                    d = d.plus(DatePeriod(days = ((gap + step - 1) / step * step).toInt()))
                }
                while (d <= hi) { out += d; d = d.plus(DatePeriod(days = step)) }
            }
        }
        return out
    }

    /** 다음 발생일(오늘 포함). 없으면 null. */
    fun nextOccurrence(rule: RecurringRule, today: LocalDate): LocalDate? =
        occurrences(rule, today, today.plus(DatePeriod(years = 2))).firstOrNull()

    /**
     * 새로 만들 예정 거래와 갱신된 generatedThrough.
     * - 아직 만들지 않은 날짜(generatedThrough 다음 날부터)만 대상
     * - 과거는 채우지 않는다: 오늘 이전 발생일은 만들지 않음(밀린 예정 거래 폭주 방지)
     * - [horizon] 까지 만든다
     */
    fun plan(rule: RecurringRule, today: LocalDate, horizon: LocalDate, now: Long): Pair<List<Transaction>, LocalDate?> {
        if (!rule.active || horizon < today) return emptyList<Transaction>() to rule.generatedThrough
        val from = maxOf(today, rule.generatedThrough?.plus(DatePeriod(days = 1)) ?: today)
        val dates = occurrences(rule, from, horizon)
        val txs = dates.map { d ->
            Transaction(
                type = rule.type, status = TransactionStatus.PLANNED, amount = rule.amount, currency = rule.currency,
                date = d, fromAccountId = rule.fromAccountId, toAccountId = rule.toAccountId, categoryId = rule.categoryId,
                memo = rule.name, source = TransactionSource.RECURRING, recurringId = rule.id, recurringOccurrence = d,
                createdAt = now, updatedAt = now,
            )
        }
        val through = maxOf(horizon, rule.generatedThrough ?: horizon.minus(DatePeriod(days = 1)))
        return txs to through
    }

    /** 규칙의 거래 모양(검증용). */
    fun template(rule: RecurringRule): Transaction = Transaction(
        type = rule.type, status = TransactionStatus.PLANNED, amount = rule.amount, currency = rule.currency,
        date = rule.startDate, fromAccountId = rule.fromAccountId, toAccountId = rule.toAccountId,
        categoryId = rule.categoryId, memo = rule.name, source = TransactionSource.RECURRING,
    )
}
