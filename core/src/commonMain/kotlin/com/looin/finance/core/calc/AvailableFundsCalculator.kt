package com.looin.finance.core.calc

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.savings.GoalStatus
import com.looin.finance.core.savings.SavingsCalculator
import com.looin.finance.core.period.Period

/**
 * 생활비로 사용 가능한 금액(여유 금액).
 *
 * ※ 기획서에 정확한 공식이 없어 아래 기본 규칙을 제안값으로 사용한다(확인 항목, docs/PHASE1_PLAN.md 참조).
 *
 * 사용 가능 금액 = A − B − C − D
 *  A. 생활비 계산 대상 계좌(원화·비부채·보관 아님)의 실제 잔고 합
 *  B. 현재 기간 예산 확보액
 *     - 전체 생활비 예산이 있으면: max(전체 예산 − 기간 확정 지출, 기간 예정 지출, 0)
 *       (카테고리 예산은 전체 예산의 하위 한도로만 보고 따로 더하지 않음 → 이중 차감 방지)
 *     - 없으면: 카테고리 예산별 max(예산 잔액, 예정 지출, 0)의 합
 *       (예정 지출은 예산 잔액 안에 포함되므로 별도로 다시 빼지 않음)
 *  C. 예산 밖의 예정 지출: 대상 계좌에서 나가는 예정 지출 중
 *     기간 종료 전이면서 (B에 포함되지 않은 카테고리 / 카테고리 없음 / 지난 기간에서 밀린 것)
 *  D. 대상 계좌 → 비대상 계좌 예정 이체(저축 이체, 카드 대금 등), 기간 종료 전
 *
 * 예정 수입은 실제 입금 전까지 반영하지 않는다(참고 정보로만 표시).
 */
object AvailableFundsCalculator {

    data class Result(
        val amount: Long,
        val cash: Long,
        val budgetReserve: Long,
        val unbudgetedPlanned: Long,
        val plannedTransfersOut: Long,
        val plannedIncomeNotCounted: Long,
        val breakdown: Breakdown,
        val savingsReserved: Long = 0,
        /** 예산별 확보액 나눔(전체 생활비 예산이 있으면 그것 하나, 없으면 카테고리 예산들). */
        val shares: List<BudgetShare> = emptyList(),
    ) {
        /** 아직 쓰지 않은(예정 지출도 아닌) 예산의 합. */
        val budgetLeft: Long get() = shares.sumOf { it.left }

        /**
         * 지금까지 쓴 예산만 반영한 사용 가능 금액: 남은 예산을 따로 떼어 두지 않았을 때.
         * (예정 지출·예정 이체·저축 목표는 그대로 뺀다) = [amount] + [budgetLeft]
         */
        val withoutBudgetLeft: Long get() = amount + budgetLeft

        /** 예산대로 다 쓰면 모자랄 때, 예산을 얼마나 줄여야 하는지. 모자라지 않거나 예산이 없으면 null. */
        val adjust: BudgetAdjust? get() {
            if (amount >= 0 || shares.isEmpty()) return null
            val deficit = -amount
            // 고정 비용이 들어간 카테고리 예산(월세·통신비 등)은 줄이기 어려우므로 제안에서 뺀다
            val (fixedShares, flexible) = shares.partition { it.status.budget.categoryId != null && it.status.fixed > 0 }
            val reducible = flexible.sumOf { it.left }
            val target = minOf(deficit, reducible)
            // 남은 예산에 비례해서 나누고 1,000원 단위로 올림(각 예산의 남은 금액을 넘지 않게), 모자라면 남은 예산이 큰 순으로 채움
            val open = flexible.filter { it.left > 0 }.sortedByDescending { it.left }
            val cut = LongArray(open.size) { i ->
                val raw = if (reducible == 0L) 0L else (target * open[i].left + reducible - 1) / reducible
                ((raw + 999) / 1000 * 1000).coerceAtMost(open[i].left)
            }
            var over = cut.sum() - target
            for (i in open.indices.reversed()) { if (over <= 0) break; val d = minOf(over, cut[i]); cut[i] -= d; over -= d }
            var rest = target - cut.sum()
            for (i in open.indices) { if (rest <= 0) break; val d = minOf(rest, open[i].left - cut[i]); cut[i] += d; rest -= d }
            val cuts = open.indices.filter { cut[it] > 0 }.map { open[it].status to cut[it] }
            val total = shares.sumOf { it.status.effective }
            return BudgetAdjust(deficit, reducible, total, total - cuts.sumOf { it.second }, cuts, maxOf(deficit - reducible, 0),
                excluded = fixedShares.filter { it.left > 0 }.map { it.status })
        }
    }

    /** 예산 하나의 확보액: [left] 아직 안 쓴 예산, [planned] 예산 안 예정 지출. */
    data class BudgetShare(val status: BudgetStatus, val left: Long, val planned: Long)

    /**
     * 예산 조정 안내. [suggestedTotal] 이하로 예산 합계를 줄이면 예산대로 다 써도 모자라지 않는다.
 * 고정 비용이 들어간 카테고리 예산은 줄이지 않는다([excluded]).
     * [shortAfterAll] > 0 이면 남은 예산을 모두 줄여도 그만큼 모자란다(예정 지출·이체를 줄이거나 돈을 넣어야 함).
     */
    data class BudgetAdjust(
        val deficit: Long,
        val reducible: Long,
        val currentTotal: Long,
        val suggestedTotal: Long,
        val cuts: List<Pair<BudgetStatus, Long>>,
        val shortAfterAll: Long,
        /** 고정 비용이 들어 있어 줄이기 제안에서 뺀 예산. */
        val excluded: List<BudgetStatus> = emptyList(),
    )

    fun includedAccounts(accounts: List<Account>) = accounts.filter {
        it.includeInAvailable && !it.archived && it.currency == KRW && !it.type.isLiability
    }

    fun calculate(
        accounts: List<Account>,
        transactions: List<Transaction>,
        budgets: List<Budget>,
        period: Period,
        goals: List<GoalStatus> = emptyList(),
    ): Result {
        val included = includedAccounts(accounts)
        val ids = included.map { it.id }.toSet()
        val cash = included.sumOf { BalanceCalculator.actualBalance(it, transactions) }

        // 계좌 예산은 경고용(카테고리와 겹침) → 사용 가능 금액 계산에서 제외
        val statuses = BudgetCalculator.statuses(budgets, period, transactions).filter { !it.budget.isAccount }
        val overall = statuses.firstOrNull { it.budget.isOverall }
        val categoryStatuses = statuses.filter { it.budget.categoryId != null }

        val pendingExpenses = transactions.filter {
            it.isPlanned && it.type == TransactionType.EXPENSE && it.currency == KRW && it.date < period.endExclusive
        }

        val reserveLines = mutableListOf<BreakdownLine>()
        val budgetReserve: Long
        val coveredByBudget: (Transaction) -> Boolean
        if (overall != null) {
            budgetReserve = overall.reserve
            reserveLines += BreakdownLine("전체 생활비 예산 확보액", overall.reserve, -1,
                "예산 ${MoneyFormat.format(overall.effective)}" + (if (overall.fixed > 0) "(고정 비용 ${MoneyFormat.format(overall.fixed)} 포함)" else "") +
                    " − 사용 ${MoneyFormat.format(overall.spent)}, 예정 ${MoneyFormat.format(overall.planned)} 포함")
            coveredByBudget = { it.date in period }
        } else {
            budgetReserve = categoryStatuses.sumOf { it.reserve }
            if (categoryStatuses.isNotEmpty()) {
                reserveLines += BreakdownLine("카테고리 예산 확보액 (${categoryStatuses.size}개)", budgetReserve, -1,
                    "예산별 max(잔액, 예정 지출)의 합")
            }
            val budgetedCategories = categoryStatuses.map { it.budget.categoryId }.toSet()
            coveredByBudget = { it.date in period && it.categoryId != null && it.categoryId in budgetedCategories }
        }

        val unbudgetedPlanned = pendingExpenses
            .filter { it.fromAccountId in ids && !coveredByBudget(it) }
            .sumOf { it.amount }

        val plannedTransfersOut = transactions
            .filter {
                it.isPlanned && it.type == TransactionType.TRANSFER && it.date < period.endExclusive &&
                    it.fromAccountId in ids && it.toAccountId !in ids
            }
            .sumOf { it.amount }

        val plannedIncome = transactions
            .filter {
                it.isPlanned && it.type == TransactionType.INCOME && it.currency == KRW &&
                    it.date < period.endExclusive && it.toAccountId in ids
            }
            .sumOf { it.amount }

        // 저축 목표 배정액: 생활비 계좌 안에서 떼어 둔 것만(사용자 결정 2026-11-13: 저축 목표는 빼 둔다)
        val reservedGoals = SavingsCalculator.reserveForAvailable(goals, included)
        val savingsReserved = reservedGoals.sumOf { it.allocated }

        val amount = cash - budgetReserve - unbudgetedPlanned - plannedTransfersOut - savingsReserved

        val breakdown = Breakdown(
            title = "생활비로 사용 가능한 금액",
            total = amount,
            lines = buildList {
                add(BreakdownLine("대상 계좌 실제 잔고", cash, 1))
                addAll(reserveLines)
                add(BreakdownLine("예산 밖 예정 지출", unbudgetedPlanned, -1, "기간 종료 전·밀린 예정 지출 포함"))
                add(BreakdownLine("예정 이체(대상 밖 계좌로)", plannedTransfersOut, -1, "저축·카드 대금 등"))
                if (savingsReserved > 0) add(BreakdownLine("저축 목표 배정", savingsReserved, -1, reservedGoals.joinToString { it.goal.name }))
                add(BreakdownLine("참고: 예정 수입(미반영)", plannedIncome, 0, "입금 전까지 반영하지 않음"))
            },
            formula = "사용 가능 금액 = 대상 계좌 잔고 − 예산 확보액 − 예산 밖 예정 지출 − 예정 이체 − 저축 목표 배정",
            notes = listOf(
                "대상 계좌: " + included.joinToString { it.name }.ifEmpty { "없음 (자산 화면에서 지정)" },
                "기준 기간: ${period.label}",
            ),
        )
        val shares = (if (overall != null) listOf(overall) else categoryStatuses).map { st ->
            val planned = minOf(st.planned, st.reserve)
            BudgetShare(st, st.reserve - planned, planned)
        }
        return Result(amount, cash, budgetReserve, unbudgetedPlanned, plannedTransfersOut, plannedIncome, breakdown, savingsReserved, shares)
    }
}
