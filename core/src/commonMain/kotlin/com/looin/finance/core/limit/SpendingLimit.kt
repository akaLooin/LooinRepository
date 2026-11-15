package com.looin.finance.core.limit

import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.Period

/** 지출 한도의 대상: 전체 지출 / 카테고리 하나 / 출금 계좌 하나(예: 신용카드). */
enum class LimitTarget(val label: String) { ALL("전체 지출"), CATEGORY("카테고리"), ACCOUNT("출금 계좌") }

/**
 * 지출 한도(경고선). 한 번 정하면 매 기간(주 회계 기간) 반복된다.
 * 예산과 달리 **사용 가능 금액 계산에는 영향이 없다** — 많이 쓰고 있다고 알려 주는 선일 뿐이다.
 *  - [warnPercent]% 에 닿으면 "경고", 한도([amount])에 닿거나 넘으면 "제한"
 */
data class SpendingLimit(
    val id: Long = 0,
    val target: LimitTarget,
    val targetId: Long? = null,
    val amount: Long,
    val warnPercent: Int = 80,
    val active: Boolean = true,
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)

enum class LimitLevel(val label: String) { OK("여유"), WARN("경고"), OVER("제한") }

data class LimitStatus(val limit: SpendingLimit, val used: Long) {
    val ratio: Float get() = if (limit.amount <= 0) 0f else used.toFloat() / limit.amount
    val remaining: Long get() = limit.amount - used
    val level: LimitLevel
        get() = when {
            used >= limit.amount -> LimitLevel.OVER
            used * 100 >= limit.amount * limit.warnPercent -> LimitLevel.WARN
            else -> LimitLevel.OK
        }
}

/** 한도 판단: 이번 기간의 완료된 원화 지출(실제 처리일 기준)만 센다. 이체·수입·취소·예정은 제외. */
object LimitCalculator {
    fun matches(limit: SpendingLimit, tx: Transaction): Boolean =
        tx.type == TransactionType.EXPENSE && tx.currency == KRW && !tx.isCancelled && when (limit.target) {
            LimitTarget.ALL -> true
            LimitTarget.CATEGORY -> tx.categoryId == limit.targetId
            LimitTarget.ACCOUNT -> tx.fromAccountId == limit.targetId
        }

    fun used(limit: SpendingLimit, period: Period, txs: List<Transaction>, excludeId: Long? = null): Long =
        txs.filter { it.isCompleted && it.effectiveDate in period && it.id != excludeId && matches(limit, it) }.sumOf { it.amount }

    fun statuses(limits: List<SpendingLimit>, period: Period, txs: List<Transaction>): List<LimitStatus> =
        limits.filter { it.active }.map { LimitStatus(it, used(it, period, txs)) }

    /**
     * 입력 중인 거래 [tx] 를 저장하면 어떻게 되는지(예정 거래도 "쓸 돈"으로 보고 포함).
     * 수정이면 원래 거래는 빼고 계산한다. 경고·제한에 걸리는 한도만 돌려준다.
     */
    fun impact(limits: List<SpendingLimit>, period: Period, txs: List<Transaction>, tx: Transaction): List<LimitStatus> =
        limits.filter { it.active && matches(it, tx) }
            .map { LimitStatus(it, used(it, period, txs, excludeId = tx.id.takeIf { id -> id != 0L }) + tx.amount) }
            .filter { it.level != LimitLevel.OK }

    fun validate(limit: SpendingLimit): List<String> = buildList {
        if (limit.amount <= 0) add("한도 금액을 입력하세요.")
        if (limit.warnPercent !in 1..99) add("경고 시점은 1~99% 사이여야 합니다.")
        if (limit.target != LimitTarget.ALL && limit.targetId == null) add("${limit.target.label}을 고르세요.")
    }
}
