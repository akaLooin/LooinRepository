package com.looin.finance.core.calc

import kotlinx.datetime.LocalDate
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.money.krwAmount
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
        // 외화 거래는 기록한 당시 환율로 원화 환산해서 합친다(환율이 없는 외화 거래는 빠짐)
        val inPeriod = transactionsIn(period, transactions).filter { it.krwAmount() != null }
        val completed = inPeriod.filter { it.isCompleted }
        val planned = inPeriod.filter { it.isPlanned }
        fun List<Transaction>.sumType(t: TransactionType) = filter { it.type == t }.sumOf { it.krwAmount()!! }
        return PeriodStats(
            period = period,
            income = completed.sumType(TransactionType.INCOME),
            expense = completed.sumType(TransactionType.EXPENSE),
            plannedIncome = planned.sumType(TransactionType.INCOME),
            plannedExpense = planned.sumType(TransactionType.EXPENSE),
            expenseByCategory = completed.filter { it.type == TransactionType.EXPENSE }
                .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.krwAmount()!! } },
            incomeByCategory = completed.filter { it.type == TransactionType.INCOME }
                .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.krwAmount()!! } },
        )
    }

    /**
     * 기간 안 소비 흐름(완료된 원화 지출, 실제 처리일 기준).
     * [cumulative] 는 기간 첫날부터 오늘(지난 기간이면 마지막 날)까지 날마다 누적 소비.
     * 예산이 있으면 고르게 쓴다고 가정한 "오늘까지 예상 사용액"과 차이를 함께 준다(+ = 예상보다 빨리 씀).
     * 예산: 전체 생활비 예산이 있으면 그것, 없으면 카테고리 예산 합계.
     */
    data class SpendingPace(
        val days: Int,
        val cumulative: List<Long>,
        val budget: Long?,
        val expectedByNow: Long?,
        val diff: Long?,
    )

    fun pace(period: Period, transactions: List<Transaction>, budgets: List<Budget>, today: LocalDate): SpendingPace {
        val days = (period.endExclusive.toEpochDays() - period.start.toEpochDays()).toInt()
        val elapsed = (today.toEpochDays() - period.start.toEpochDays() + 1).toInt().coerceIn(0, days)
        val byDay = LongArray(days)
        transactionsIn(period, transactions)
            .filter { it.isCompleted && it.type == TransactionType.EXPENSE && it.krwAmount() != null }
            .forEach { byDay[(it.effectiveDate.toEpochDays() - period.start.toEpochDays()).toInt()] += it.krwAmount()!! }
        var run = 0L
        val cumulative = (0 until elapsed).map { run += byDay[it]; run }
        val st = BudgetCalculator.statuses(budgets, period, transactions).filter { !it.budget.isAccount }
        val budget = (st.firstOrNull { it.budget.isOverall }?.effective ?: st.sumOf { it.effective }).takeIf { it > 0 }
        val expected = budget?.let { it * elapsed / days }
        return SpendingPace(days, cumulative, budget, expected, expected?.let { (cumulative.lastOrNull() ?: 0) - it })
    }

    /** 카테고리별 소비 변화(이번 − 지난). 이번이나 지난 기간에 쓴 카테고리 모두, 많이 는 순. */
    data class CategoryChange(val categoryId: Long?, val now: Long, val before: Long) {
        val diff: Long get() = now - before
        val isNew: Boolean get() = before == 0L && now > 0
    }

    fun categoryChanges(current: PeriodStats, previous: PeriodStats): List<CategoryChange> =
        (current.expenseByCategory.keys + previous.expenseByCategory.keys).distinct()
            .map { CategoryChange(it, current.expenseByCategory[it] ?: 0, previous.expenseByCategory[it] ?: 0) }
            .sortedByDescending { it.diff }

    /** 기간 안 통화별 외화 소비(완료 지출): 외화 합계, 기록 환율로 바꾼 원화, 환율이 없어 원화 통계에서 빠진 건수. */
    data class ForeignSpend(val currency: String, val amount: Long, val krw: Long, val count: Int, val missingRate: Int)

    fun foreignSpending(period: Period, transactions: List<Transaction>): List<ForeignSpend> =
        transactionsIn(period, transactions).filter { it.isCompleted && it.type == TransactionType.EXPENSE && it.currency != KRW }
            .groupBy { it.currency }.map { (cur, l) ->
                ForeignSpend(cur, l.sumOf { it.amount }, l.sumOf { it.krwAmount() ?: 0 }, l.size, l.count { it.rateToKrwX10000 == null })
            }.sortedByDescending { it.krw }

    /** 최근 [count]개 기간 추이(오래된 순). */
    fun trend(current: Period, count: Int, paydayDay: Int, transactions: List<Transaction>): List<PeriodStats> =
        PeriodCalculator.recent(current, count, paydayDay).map { stats(it, transactions) }

    /** 계획(예산) 대비 실제 — 카테고리 예산 기준. 예산이 없는 카테고리의 지출도 포함. */
    fun planVsActual(period: Period, budgets: List<Budget>, transactions: List<Transaction>): List<PlanVsActual> {
        val periodBudgets = BudgetCalculator.budgetsFor(budgets, period).filter { it.categoryId != null && !it.isAccount }
        val s = stats(period, transactions)
        val plannedByCategory = transactions
            .filter { it.isPlanned && it.type == TransactionType.EXPENSE && it.krwAmount() != null && it.date in period }
            .groupBy { it.categoryId }.mapValues { (_, v) -> v.sumOf { it.krwAmount()!! } }
        val categoryIds = (periodBudgets.map { it.categoryId } + s.expenseByCategory.keys + plannedByCategory.keys).distinct()
        return categoryIds.map { id ->
            PlanVsActual(
                categoryId = id,
                budget = periodBudgets.filter { it.categoryId == id }.sumOf { BudgetCalculator.status(it, period, transactions).effective }, // 고정 비용 포함
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
