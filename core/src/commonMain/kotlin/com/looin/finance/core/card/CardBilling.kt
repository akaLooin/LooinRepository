package com.looin.finance.core.card

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.number
import kotlinx.datetime.plus

/**
 * 신용카드 결제일 관리: 이용 기간에 카드로 쓴 금액을 모아 결제일에 "결제 계좌 → 카드" 예정 이체를 만든다.
 *
 * 이용 기간(결제월 M 기준): M-1월 [billingStartDay]일 ~ M월 [billingStartDay]일 전날.
 *  - 시작일 1 → 전월 1일 ~ 전월 말일(가장 흔한 형태)
 *  - 시작일 12 → 전월 12일 ~ 당월 11일
 * 날짜가 그 달에 없으면 말일(급여 기준일과 같은 규칙).
 *
 * 금액 = 이용 기간 안의 카드 지출(완료+예정) − 카드로 들어온 환불·수입. 이체(결제 등)는 빼고 센다.
 */
object CardBilling {
    data class Statement(val paymentDate: LocalDate, val start: LocalDate, val endExclusive: LocalDate)

    private fun dayIn(year: Int, month: Int, day: Int): LocalDate =
        LocalDate(year, month, minOf(day, PeriodCalculator.lengthOfMonth(year, month)))

    /** 결제월 [year]-[month] 의 명세. */
    fun statement(card: Account, year: Int, month: Int): Statement? {
        val pay = card.billingDay ?: return null
        val first = LocalDate(year, month, 1)
        val prev = first.minus(DatePeriod(months = 1))
        val s = card.billingStartDay.coerceIn(1, 31)
        val start = dayIn(prev.year, prev.month.number, s)
        val end = if (s == 1) first else dayIn(year, month, s)
        return Statement(dayIn(year, month, pay), start, end)
    }

    /**
     * 지금 관리할 명세: 결제일이 오늘 이후이고 이용이 이미 시작된 것(최대 2개 — 이번 결제분, 다음 결제분).
     */
    fun activeStatements(card: Account, today: LocalDate): List<Statement> {
        if (card.billingDay == null || card.billingAccountId == null || card.archived) return emptyList()
        return (-1..2).mapNotNull { k ->
            val m = LocalDate(today.year, today.month, 1).plus(DatePeriod(months = k))
            statement(card, m.year, m.month.number)
        }.filter { it.paymentDate >= today && it.start <= today }
    }

    /** 명세 금액: 이용 기간 안의 카드 지출 − 환불·수입(취소 제외, 이체 제외). */
    fun amount(card: Account, txs: List<Transaction>, st: Statement): Long =
        txs.filter { !it.isCancelled && it.type != TransactionType.TRANSFER && it.source != TransactionSource.CARD_BILL }
            .filter { val d = if (it.isCompleted) it.effectiveDate else it.date; d >= st.start && d < st.endExclusive }
            .sumOf { t ->
                when {
                    t.type == TransactionType.EXPENSE && t.fromAccountId == card.id -> t.amount
                    t.type == TransactionType.INCOME && t.toAccountId == card.id -> -t.amount
                    else -> 0L
                }
            }.coerceAtLeast(0)

    /** 이 명세의 예정 이체 모양(저장소가 있으면 금액만 고치고, 없으면 새로 만든다). */
    fun billTransaction(card: Account, st: Statement, amount: Long, now: Long): Transaction = Transaction(
        type = TransactionType.TRANSFER, status = TransactionStatus.PLANNED, amount = amount, date = st.paymentDate,
        fromAccountId = card.billingAccountId, toAccountId = card.id, memo = "${card.name} 대금",
        source = TransactionSource.CARD_BILL, recurringOccurrence = st.paymentDate, createdAt = now, updatedAt = now,
    )
}
