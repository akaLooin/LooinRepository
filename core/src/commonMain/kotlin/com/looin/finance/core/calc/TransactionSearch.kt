package com.looin.finance.core.calc

import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.LocalDate

/**
 * 거래 검색 조건. 비어 있는 조건은 "제한 없음".
 * 날짜는 기간 집계와 같은 기준일(완료 = 실제 처리일, 예정 = 예정일)로 비교하며 [from]·[to] 모두 포함.
 */
data class TransactionQuery(
    val text: String = "",
    val types: Set<TransactionType> = emptySet(),
    val statuses: Set<TransactionStatus> = emptySet(),
    val accountId: Long? = null,
    val categoryId: Long? = null,
    val from: LocalDate? = null,
    val to: LocalDate? = null,
    val minAmount: Long? = null,
    val maxAmount: Long? = null,
) {
    val isEmpty: Boolean
        get() = text.isBlank() && types.isEmpty() && statuses.isEmpty() && accountId == null && categoryId == null &&
            from == null && to == null && minAmount == null && maxAmount == null
}

object TransactionSearch {

    data class Result(
        val items: List<Transaction>,
        /** 결과 중 취소 제외·원화·완료 거래의 합계(검색 결과 확인용). */
        val completedIncome: Long,
        val completedExpense: Long,
        val plannedExpense: Long,
    )

    /**
     * @param categoryName 카테고리 이름 조회(검색어가 카테고리 이름과 맞는지 확인)
     * @param accountName 계좌 이름 조회
     */
    fun search(
        txs: List<Transaction>,
        q: TransactionQuery,
        categoryName: (Long?) -> String,
        accountName: (Long?) -> String,
    ): Result {
        val words = q.text.trim().lowercase().split(' ').filter { it.isNotBlank() }
        val items = txs.asSequence()
            .filter { q.types.isEmpty() || it.type in q.types }
            .filter { q.statuses.isEmpty() || it.status in q.statuses }
            .filter { q.accountId == null || it.touches(q.accountId) }
            .filter { q.categoryId == null || it.categoryId == q.categoryId }
            .filter { q.from == null || it.effectiveDate >= q.from }
            .filter { q.to == null || it.effectiveDate <= q.to }
            .filter { q.minAmount == null || it.amount >= q.minAmount }
            .filter { q.maxAmount == null || it.amount <= q.maxAmount }
            .filter { tx ->
                if (words.isEmpty()) return@filter true
                val haystack = listOf(
                    tx.memo, categoryName(tx.categoryId), accountName(tx.fromAccountId), accountName(tx.toAccountId),
                    tx.type.label, tx.status.label, tx.amount.toString(),
                ).joinToString(" ").lowercase()
                // 모든 단어가 들어 있어야 일치(AND). 금액은 쉼표 없이 비교한다.
                words.all { w -> haystack.contains(w.replace(",", "")) }
            }
            .sortedWith(compareByDescending<Transaction> { it.effectiveDate }.thenByDescending { it.id })
            .toList()
        val krw = items.filter { !it.isCancelled && it.currency == KRW }
        return Result(
            items = items,
            completedIncome = krw.filter { it.isCompleted && it.type == TransactionType.INCOME }.sumOf { it.amount },
            completedExpense = krw.filter { it.isCompleted && it.type == TransactionType.EXPENSE }.sumOf { it.amount },
            plannedExpense = krw.filter { it.isPlanned && it.type == TransactionType.EXPENSE }.sumOf { it.amount },
        )
    }
}
