package com.looin.finance.core.calc

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType

/**
 * 거래 입력의 "최근 사용" 추천: 같은 유형의 거래에서 가장 최근에 쓴 카테고리·계좌(중복 없이, 최대 [limit]개).
 * 최근 = 입력한 순서(나중에 만든 거래가 먼저). 취소한 거래도 "쓴 것"으로 본다(입력 습관이므로).
 */
object RecentPicks {
    private fun recentFirst(txs: List<Transaction>, type: TransactionType) =
        txs.filter { it.type == type }.sortedWith(compareByDescending<Transaction> { it.createdAt }.thenByDescending { it.id })

    fun categories(txs: List<Transaction>, type: TransactionType, limit: Int = 3): List<Long> =
        recentFirst(txs, type).mapNotNull { it.categoryId }.distinct().take(limit)

    /** [side]: 출금(from) 또는 입금(to) 계좌. */
    fun accounts(txs: List<Transaction>, type: TransactionType, side: Side, limit: Int = 3): List<Long> =
        recentFirst(txs, type).mapNotNull { if (side == Side.FROM) it.fromAccountId else it.toAccountId }.distinct().take(limit)

    enum class Side { FROM, TO }
}
