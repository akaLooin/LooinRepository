package com.looin.finance.core.calc

import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.Period

/**
 * 예산 1건의 상태.
 *
 * 예: 식비 예산 400,000 / 확정 지출 100,000 / 예정 지출 50,000
 *  - [remaining] (예산 잔액)            = 400,000 − 100,000           = 300,000
 *  - [unreserved] (예정 지출 확보 후 잔액) = 400,000 − 100,000 − 50,000 = 250,000
 *
 * 예정 지출은 예산 "안에서" 확보되는 금액이다. 예산 합계에 예정 지출을 더하거나
 * 사용 가능 금액에서 예산 잔액과 예정 지출을 둘 다 빼는 이중 차감은 하지 않는다.
 */
data class BudgetStatus(
    val budget: Budget,
    val spent: Long,
    val planned: Long,
) {
    val remaining: Long get() = budget.amount - spent
    val unreserved: Long get() = budget.amount - spent - planned
    val isOver: Boolean get() = spent > budget.amount
    val isOverWithPlanned: Boolean get() = spent + planned > budget.amount

    /** 이 예산을 위해 아직 확보해 둬야 하는 금액. 초과 상태라도 예정 지출은 확보한다. */
    val reserve: Long get() = maxOf(remaining, planned, 0L)

    val usageRatio: Float get() = if (budget.amount <= 0) 0f else spent.toFloat() / budget.amount
}

object BudgetCalculator {

    /** 예산·통계 집계 대상: 원화 지출(이체·조정·환전 제외). */
    private fun Transaction.isKrwExpense() = type == TransactionType.EXPENSE && currency == KRW

    fun spentIn(period: Period, transactions: List<Transaction>, categoryId: Long?): Long =
        transactions.asSequence()
            .filter { it.isCompleted && it.isKrwExpense() && it.effectiveDate in period }
            .filter { categoryId == null || it.categoryId == categoryId }
            .sumOf { it.amount }

    fun plannedIn(period: Period, transactions: List<Transaction>, categoryId: Long?): Long =
        transactions.asSequence()
            .filter { it.isPlanned && it.isKrwExpense() && it.date in period }
            .filter { categoryId == null || it.categoryId == categoryId }
            .sumOf { it.amount }

    fun status(budget: Budget, period: Period, transactions: List<Transaction>): BudgetStatus =
        BudgetStatus(
            budget = budget,
            spent = spentIn(period, transactions, budget.categoryId),
            planned = plannedIn(period, transactions, budget.categoryId),
        )

    /** 해당 기간에 속한 예산들의 상태. 전체 생활비 예산(categoryId=null)이 맨 앞. */
    fun statuses(budgets: List<Budget>, period: Period, transactions: List<Transaction>): List<BudgetStatus> =
        budgetsFor(budgets, period)
            .sortedBy { if (it.categoryId == null) 0 else 1 }
            .map { status(it, period, transactions) }

    /** 저장된 예산 중 해당 기간(같은 기준·같은 시작일)에 속한 것. */
    fun budgetsFor(budgets: List<Budget>, period: Period): List<Budget> =
        budgets.filter { it.basis == period.basis && it.periodStart == period.start }
}
