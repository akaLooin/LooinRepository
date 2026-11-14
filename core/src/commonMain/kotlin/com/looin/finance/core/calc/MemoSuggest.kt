package com.looin.finance.core.calc

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType

/** 메모 추천 하나: 예전에 쓴 메모와, 그 메모로 가장 최근에 쓴 카테고리·계좌·금액. */
data class MemoSuggestion(
    val memo: String,
    val count: Int,
    val categoryId: Long?,
    val accountId: Long?,
    val lastAmount: Long,
)

/**
 * 거래 입력 중 메모 자동 완성. 같은 유형(지출/수입)의 지난 거래에서 찾는다.
 *  - 입력한 글자로 시작하는 메모를 먼저, 그다음 글자를 포함하는 메모(대소문자·공백 무시)
 *  - 같은 그룹 안에서는 자주 쓴 순, 같으면 최근 순
 *  - 입력과 똑같은 메모 하나뿐이면 추천하지 않는다(이미 다 쳤음)
 *  - 취소한 거래는 제외
 */
object MemoSuggest {
    fun suggest(transactions: List<Transaction>, query: String, type: TransactionType, limit: Int = 5): List<MemoSuggestion> {
        val q = norm(query)
        if (q.isEmpty() || type == TransactionType.ADJUSTMENT) return emptyList()
        val groups = transactions.asSequence()
            .filter { it.type == type && !it.isCancelled && it.memo.isNotBlank() }
            .groupBy { norm(it.memo) }
            .filterKeys { it.contains(q) }
        if (groups.size == 1 && groups.keys.single() == q) return emptyList()
        return groups.values.map { txs ->
            val latest = txs.maxWith(compareBy<Transaction> { it.date }.thenBy { it.id })
            MemoSuggestion(
                memo = latest.memo.trim(), count = txs.size, categoryId = latest.categoryId,
                accountId = if (type == TransactionType.INCOME) latest.toAccountId else latest.fromAccountId,
                lastAmount = latest.amount,
            ) to latest
        }.sortedWith(
            compareBy<Pair<MemoSuggestion, Transaction>> { if (norm(it.first.memo).startsWith(q)) 0 else 1 }
                .thenByDescending { it.first.count }
                .thenByDescending { it.second.date }
                .thenByDescending { it.second.id },
        ).filter { norm(it.first.memo) != q }.take(limit).map { it.first }
    }

    private fun norm(s: String) = s.trim().lowercase().replace(Regex("\\s+"), " ")
}
