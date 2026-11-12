package com.looin.finance.core.calc

import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.Period
import com.looin.finance.core.period.PeriodCalculator

/**
 * 기간 통계. 같은 원본 거래 목록을 어떤 기간 기준(달력/월급일)으로든 조회할 수 있다.
 * 이체·잔고 조정·환전은 수입/소비에 포함하지 않는다. 원화 거래만 집계한다.
 */
object StatisticsCalculator {

    data class PeriodStats(
        val period: Period,
        val income: Long,
        val expense: Long,
        val plannedIncome: Long,
        val plannedExpense: Long,
        val expenseByCategory: Map<Long?, Long>,
        val incomeByCategory: Map<Long?, Long>,
    ) {
        val net: Long get() = income - expense
    }

    data class PlanVsActual(
        val categoryId: Long?,
        val budget: Long,
        val actual: Long,
        val planned: Long,
    ) {
        val difference: Long get() = budget - actual
    }

    fun transactionsIn(period: Period, transactions: List<Transaction>): List<Transaction> =
        transactions.filter { !it.isCancelled && it.effectiveDate in period }

    fun stats(period: Period, transactions: List<Transaction>): PeriodStats {
        val inPeriod = transactionsIn(period, transactions).filter { it.currency == KRW }
        val completed = inPeriod.filter { it.isCompleted }
        val planned = inPeriod.filter { it.isPlanned }
        fun List<Transaction>.sumType(t: TransactionType) = filter { it.type == t }.sumOf { it.amount }
        return PeriodStats(
            period = period,
            income = completed.sumType(TransactionType.INCOME),
            expense = completed.sumType(TransactionType.EXPENSE),
            plannedIncome = planned.sumType(TransactionType.INCOME),
            plannedExpense = planned.sumType(TransactionType.EXPENSE),
            expenseByCategory = completed.filter { it.type == TransactionType.EXPENSE }
                .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.amount } },
            incomeByCategory = completed.filter { it.type == TransactionType.INCOME }
                .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.amount } },
        )
    }

    /** 최근 [count]개 기간 추이(오래된 순). */
    fun trend(current: Period, count: Int, paydayDay: Int, transactions: List<Transaction>): List<PeriodStats> =
        PeriodCalculator.recent(current, count, paydayDay).map { stats(it, transactions) }

    /** 계획(예산) 대비 실제 — 카테고리 예산 기준. 예산이 없는 카테고리의 지출도 포함. */
    fun planVsActual(period: Period, budgets: List<Budget>, transactions: List<Transaction>): List<PlanVsActual> {
        val periodBudgets = BudgetCalculator.budgetsFor(budgets, period).filter { it.categoryId != null }
        val s = stats(period, transactions)
        val plannedByCategory = transactions
            .filter { it.isPlanned && it.type == TransactionType.EXPENSE && it.currency == KRW && it.date in period }
            .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.amount } }
        val categoryIds = (periodBudgets.map { it.categoryId } + s.expenseByCategory.keys + plannedByCategory.keys).distinct()
        return categoryIds.map { id ->
            PlanVsActual(
                categoryId = id,
                budget = periodBudgets.filter { it.categoryId == id }.sumOf { it.amount },
                actual = s.expenseByCategory[id] ?: 0,
                planned = plannedByCategory[id] ?: 0,
            )
        }.sortedByDescending { maxOf(it.budget, it.actual + it.planned) }
    }

    fun incomeBreakdown(s: PeriodStats, categoryName: (Long?) -> String) = Breakdown(
        title = "수입 합계",
        total = s.income,
        lines = s.incomeByCategory.entries.sortedByDescending { it.value }
            .map { BreakdownLine(categoryName(it.key), it.value) } +
            BreakdownLine("참고: 예정 수입(미포함)", s.plannedIncome, 0),
        formula = "${s.period.label} 완료된 수입 거래의 합 (이체·조정 제외)",
    )

    fun expenseBreakdown(s: PeriodStats, categoryName: (Long?) -> String) = Breakdown(
        title = "확정 소비",
        total = s.expense,
        lines = s.expenseByCategory.entries.sortedByDescending { it.value }
            .map { BreakdownLine(categoryName(it.key), it.value) },
        formula = "${s.period.label} 완료된 지출 거래의 합 (이체·저축·조정 제외)",
    )
}
