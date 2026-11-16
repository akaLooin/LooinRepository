package com.looin.finance.core.calc

import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.money.krwAmount
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.Period

/** 예산 상태 단계: 여유 → 경고(경고 비율 이상) → 초과(예산에 닿거나 넘음). */
enum class BudgetLevel(val label: String) { OK("여유"), WARN("경고"), OVER("초과") }

/**
 * 예산 1건의 상태.
 *
 * 예산 금액 = 직접 정한 금액 + 범위 안의 **고정 비용**(반복 거래로 생긴 지출, 자동 포함).
 * 예: 식비 예산 400,000 (+ 고정 비용 0) / 확정 지출 100,000 / 예정 지출 50,000
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
    /** 이 기간 범위 안의 고정 비용(완료 + 예정). 예산 금액에 자동으로 더해진다. */
    val fixed: Long = 0,
) {
    /** 실제 예산 = 직접 정한 금액 + 고정 비용. */
    val effective: Long get() = budget.amount + fixed
    val remaining: Long get() = effective - spent
    val unreserved: Long get() = effective - spent - planned
    val isOver: Boolean get() = spent > effective
    val isOverWithPlanned: Boolean get() = spent + planned > effective

    /** 이 예산을 위해 아직 확보해 둬야 하는 금액. 초과 상태라도 예정 지출은 확보한다. */
    val reserve: Long get() = maxOf(remaining, planned, 0L)

    val usageRatio: Float get() = if (effective <= 0) 0f else spent.toFloat() / effective

    private fun levelOf(used: Long) = when {
        effective <= 0 -> if (used > 0) BudgetLevel.OVER else BudgetLevel.OK
        used >= effective -> BudgetLevel.OVER
        used * 100 >= effective * budget.warnPercent -> BudgetLevel.WARN
        else -> BudgetLevel.OK
    }

    /** 확정 지출 기준 단계. */
    val level: BudgetLevel get() = levelOf(spent)

    /** 예정 지출까지 더했을 때의 단계(확정과 따로 본다). */
    val forecastLevel: BudgetLevel get() = levelOf(spent + planned)

    /**
     * 사람이 읽는 경고 문장. 확정 지출이 먼저, 그다음 "이대로면"(예정 포함) 경고. 여유면 null.
     * [won] 은 금액 표시 함수(예: 12,000원).
     */
    fun message(won: (Long) -> String): String? = when {
        level == BudgetLevel.OVER && spent > effective -> "예산을 ${won(spent - effective)} 넘었어요"
        level == BudgetLevel.OVER -> "예산을 다 썼어요"
        forecastLevel == BudgetLevel.OVER && planned > 0 ->
            "예정 지출까지 더하면 예산을 ${won(spent + planned - effective)} 넘어요 · 이대로면 과소비예요"
        level == BudgetLevel.WARN -> "예산의 ${(usageRatio * 100).toInt()}%를 썼어요 · 남은 ${won(remaining)}"
        forecastLevel == BudgetLevel.WARN && planned > 0 ->
            "예정 지출까지 더하면 예산의 ${((spent + planned) * 100 / effective)}%예요 · 아껴 쓰는 게 좋아요"
        else -> null
    }
}

object BudgetCalculator {

    /** 예산·통계 집계 대상: 지출(이체·조정·환전 제외). 외화 지출은 기록한 당시 환율로 원화 환산(환율이 없으면 제외). */
    private fun Transaction.isKrwExpense() = type == TransactionType.EXPENSE && krwAmount() != null

    /** 이 예산 범위에 드는 지출인지: 전체 / 카테고리 / 출금 계좌. */
    fun inScope(budget: Budget, tx: Transaction): Boolean =
        tx.isKrwExpense() && when {
            budget.accountId != null -> tx.fromAccountId == budget.accountId
            budget.categoryId != null -> tx.categoryId == budget.categoryId
            else -> true
        }

    fun spentIn(period: Period, transactions: List<Transaction>, categoryId: Long?): Long =
        spent(Budget(basis = period.basis, periodStart = period.start, periodEndExclusive = period.endExclusive, categoryId = categoryId, amount = 0), period, transactions)

    fun plannedIn(period: Period, transactions: List<Transaction>, categoryId: Long?): Long =
        planned(Budget(basis = period.basis, periodStart = period.start, periodEndExclusive = period.endExclusive, categoryId = categoryId, amount = 0), period, transactions)

    private fun spent(b: Budget, period: Period, txs: List<Transaction>) =
        txs.asSequence().filter { it.isCompleted && it.effectiveDate in period && inScope(b, it) }.sumOf { it.krwAmount()!! }

    private fun planned(b: Budget, period: Period, txs: List<Transaction>) =
        txs.asSequence().filter { it.isPlanned && it.date in period && inScope(b, it) }.sumOf { it.krwAmount()!! }

    /** 범위 안의 고정 비용(반복 거래로 생긴 지출): 완료는 실제 금액, 예정은 예정 금액. */
    fun fixedIn(b: Budget, period: Period, txs: List<Transaction>): Long =
        txs.asSequence().filter {
            it.recurringId != null && !it.isCancelled && inScope(b, it) &&
                ((it.isCompleted && it.effectiveDate in period) || (it.isPlanned && it.date in period))
        }.sumOf { it.krwAmount()!! }

    fun status(budget: Budget, period: Period, transactions: List<Transaction>): BudgetStatus =
        BudgetStatus(
            budget = budget,
            spent = spent(budget, period, transactions),
            planned = planned(budget, period, transactions),
            fixed = fixedIn(budget, period, transactions),
        )

    /** 해당 기간에 속한 예산들의 상태. 전체 생활비가 맨 앞, 그다음 카테고리, 계좌. */
    fun statuses(budgets: List<Budget>, period: Period, transactions: List<Transaction>): List<BudgetStatus> =
        budgetsFor(budgets, period)
            .sortedBy { if (it.isOverall) 0 else if (it.accountId == null) 1 else 2 }
            .map { status(it, period, transactions) }

    /** 저장된 예산 중 해당 기간(같은 기준·같은 시작일)에 속한 것. */
    fun budgetsFor(budgets: List<Budget>, period: Period): List<Budget> =
        budgets.filter { it.basis == period.basis && it.periodStart == period.start }

    /**
     * 입력 중인 거래 [tx] 를 저장하면 각 예산이 어떻게 되는지(수정이면 원래 거래는 빼고).
     * 경고·초과(예정 포함 포함)에 걸리는 예산만 돌려준다. 저장을 막지는 않는다(기록 앱).
     */
    fun impact(budgets: List<Budget>, period: Period, transactions: List<Transaction>, tx: Transaction): List<BudgetStatus> {
        val others = transactions.filter { it.id != tx.id || tx.id == 0L }
        return budgetsFor(budgets, period).filter { inScope(it, tx) }
            .map { status(it, period, others + tx) }
            .filter { it.level != BudgetLevel.OK || it.forecastLevel != BudgetLevel.OK }
    }

    /**
     * 기간 예산 요약(돈 관리 머리·홈 예산 막대): **예산이 정해진 범위의 지출만** 센다.
     *  - 전체 생활비 예산이 있으면 그것 하나(모든 지출이 범위 안)
     *  - 없으면 카테고리 예산들의 합 — 예산 없는 카테고리·미분류 지출은 여기서 빼고 [outsideSpent]·[outsidePlanned] 로 따로
     *  - 계좌 예산은 경고용이라 넣지 않는다
     * 예산 밖 예정 지출은 사용 가능 금액 계산에서 따로 확보되므로(이중 차감 없음) 예산 여유를 깎지 않는다.
     */
    data class Summary(
        val effective: Long,
        val spent: Long,
        val planned: Long,
        val outsideSpent: Long,
        val outsidePlanned: Long,
        val hasOverall: Boolean,
    ) {
        /** 예정 지출까지 확보하고 남는 예산. */
        val left: Long get() = effective - spent - planned
        val usage: Float? get() = if (effective > 0) spent.toFloat() / effective else null
    }

    fun summary(statuses: List<BudgetStatus>, period: Period, transactions: List<Transaction>): Summary? {
        val main = statuses.filter { !it.budget.isAccount }
        if (main.isEmpty()) return null
        val overall = main.firstOrNull { it.budget.isOverall }
        val scoped = if (overall != null) listOf(overall) else main.filter { it.budget.categoryId != null }
        val spentIn = scoped.sumOf { it.spent }
        val plannedIn = scoped.sumOf { it.planned }
        // 기간 전체 원화 지출 − 예산 범위 안 = 예산 밖
        val allSpent = spentIn(period, transactions, null)
        val allPlanned = plannedIn(period, transactions, null)
        return Summary(scoped.sumOf { it.effective }, spentIn, plannedIn,
            (allSpent - spentIn).coerceAtLeast(0), (allPlanned - plannedIn).coerceAtLeast(0), overall != null)
    }
}
