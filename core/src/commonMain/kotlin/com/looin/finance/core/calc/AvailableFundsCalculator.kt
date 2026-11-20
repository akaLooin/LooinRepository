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
import com.looin.finance.core.money.krwAmount
import kotlinx.datetime.LocalDate
import kotlinx.datetime.number
import kotlinx.datetime.plus
import kotlinx.datetime.minus

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
        /** 지금 쓸 수 있는 금액([withoutBudgetLeft])의 계산 근거. */
        val currentBreakdown: Breakdown? = null,
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
        val budgetPlanned = shares.sumOf { it.planned }
        val current = cash - budgetPlanned - unbudgetedPlanned - plannedTransfersOut - savingsReserved
        val currentBreakdown = Breakdown(
            title = "지금 쓸 수 있는 금액",
            total = current,
            lines = buildList {
                add(BreakdownLine("대상 계좌 실제 잔고", cash, 1))
                add(BreakdownLine("예정 지출(기간 끝까지)", budgetPlanned + unbudgetedPlanned, -1, "아직 처리하지 않은 예정 지출·밀린 예정 지출"))
                add(BreakdownLine("예정 이체(대상 밖 계좌로)", plannedTransfersOut, -1, "저축·카드 대금 등"))
                if (savingsReserved > 0) add(BreakdownLine("저축 목표 배정", savingsReserved, -1, reservedGoals.joinToString { it.goal.name }))
                add(BreakdownLine("참고: 예정 수입(미반영)", plannedIncome, 0, "입금 전까지 반영하지 않음"))
            },
            formula = "지금 쓸 수 있는 금액 = 대상 계좌 잔고 − 예정 지출 − 예정 이체 − 저축 목표 배정 (남은 예산은 떼어 두지 않음)",
            notes = listOf("대상 계좌: " + included.joinToString { it.name }.ifEmpty { "없음 (자산 화면에서 지정)" }, "기준 기간: ${period.label}"),
        )
        return Result(amount, cash, budgetReserve, unbudgetedPlanned, plannedTransfersOut, plannedIncome, breakdown, savingsReserved, shares, currentBreakdown)
    }

    /** 평소 생활비 하루 평균을 어느 기간으로 낼지. */
    enum class DailyBasis(val label: String) { LAST_PAY_PERIOD("지난 월급 기간 전체"), RECENT_30("최근 30일") }

    /**
     * 다음 월급 전날까지 예상: 지금 잔고에서 월급날 전까지의 예정 지출·예정 이체·저축 목표 배정을 빼고,
     * (켜져 있으면) 평소 생활비(고정 비용이 아닌 지출의 하루 평균 × 남은 날 수)도 뺀 금액.
     * 예정 수입은 들어오기 전까지 넣지 않는다(참고로만). 하루 평균은 추정치다.
     */
    data class PaydayForecast(
        /** 이번에 쓰는 월급날(사용자가 다른 날이라고 답했으면 그날). */
        val nextPayday: LocalDate,
        /** 설정의 급여일로 계산한 월급날(물어보기·답 저장의 기준). */
        val regularPayday: LocalDate,
        val days: Int,
        val amount: Long,
        val dailyAverage: Long,
        val estimatedSpending: Long,
        val includeDaily: Boolean,
        /** 하루 평균을 낸 기간 설명(예: "지난 월급 기간 10.25~11.24"). */
        val basisLabel: String,
        val breakdown: Breakdown,
    )

    /** 설정 급여일 기준 다음 월급날(오늘보다 뒤). */
    fun nextRegularPayday(today: LocalDate, paydayDay: Int): LocalDate {
        val thisMonth = com.looin.finance.core.period.PeriodCalculator.paydayIn(today.year, today.month.number, paydayDay)
        if (thisMonth > today) return thisMonth
        val n = today.plus(kotlinx.datetime.DatePeriod(months = 1))
        return com.looin.finance.core.period.PeriodCalculator.paydayIn(n.year, n.month.number, paydayDay)
    }

    private fun paydayMonthsBefore(payday: LocalDate, months: Int, paydayDay: Int): LocalDate {
        val m = payday.minus(kotlinx.datetime.DatePeriod(months = months))
        return com.looin.finance.core.period.PeriodCalculator.paydayIn(m.year, m.month.number, paydayDay)
    }

    fun untilPayday(
        accounts: List<Account>,
        transactions: List<Transaction>,
        today: LocalDate,
        paydayDay: Int,
        goals: List<GoalStatus> = emptyList(),
        basis: DailyBasis = DailyBasis.LAST_PAY_PERIOD,
        includeDaily: Boolean = true,
        /** 이번 월급이 다른 날 들어온다고 답했으면 그날(오늘 이후일 때만 씀). */
        paydayOverride: LocalDate? = null,
    ): PaydayForecast {
        val regular = nextRegularPayday(today, paydayDay)
        val nextPayday = paydayOverride?.takeIf { it > today } ?: regular
        val days = (nextPayday.toEpochDays() - today.toEpochDays()).toInt()
        val included = includedAccounts(accounts)
        val ids = included.map { it.id }.toSet()
        val cash = included.sumOf { BalanceCalculator.actualBalance(it, transactions) }
        val plannedExpense = transactions.filter {
            it.isPlanned && it.type == TransactionType.EXPENSE && it.fromAccountId in ids && it.date < nextPayday
        }.sumOf { it.amount }
        val plannedTransfers = transactions.filter {
            it.isPlanned && it.type == TransactionType.TRANSFER && it.date < nextPayday && it.fromAccountId in ids && it.toAccountId !in ids
        }.sumOf { it.amount }
        val plannedIncome = transactions.filter {
            it.isPlanned && it.type == TransactionType.INCOME && it.toAccountId in ids && it.date < nextPayday
        }.sumOf { it.amount }
        val reservedGoals = SavingsCalculator.reserveForAvailable(goals, included)
        val savings = reservedGoals.sumOf { it.allocated }

        // 평소 생활비: 고정 비용이 아닌 완료 지출(외화는 기록 환율로)의 하루 평균
        fun spentIn(from: LocalDate, toInclusive: LocalDate) = transactions.filter {
            it.isCompleted && it.type == TransactionType.EXPENSE && it.recurringId == null && it.effectiveDate in from..toInclusive
        }.sumOf { it.krwAmount() ?: 0 }
        fun short(d: LocalDate) = "${d.month.number}.${d.day}"
        val recent30From = LocalDate.fromEpochDays(today.toEpochDays() - 29)
        var (spent, spanDays, basisLabel) = Triple(spentIn(recent30From, today), 30, "최근 30일")
        if (basis == DailyBasis.LAST_PAY_PERIOD) {
            // 지난 월급 기간 전체: 지난 월급날의 한 달 전 월급날 ~ 지난 월급날 전날
            val lastPayday = paydayMonthsBefore(regular, 1, paydayDay)
            val before = paydayMonthsBefore(regular, 2, paydayDay)
            val end = LocalDate.fromEpochDays(lastPayday.toEpochDays() - 1)
            val hasData = transactions.any { it.effectiveDate <= end }
            if (hasData) {
                spent = spentIn(before, end); spanDays = (lastPayday.toEpochDays() - before.toEpochDays()).toInt()
                basisLabel = "지난 월급 기간 ${short(before)}~${short(end)}"
            } else basisLabel = "지난 월급 기간 기록이 없어 최근 30일"
        }
        // 하루 평균은 10원 단위, 예상 생활비는 100원 단위로 올림(넉넉하게)
        val daily = (spent + spanDays * 10L - 1) / (spanDays * 10L) * 10
        val estimated = if (!includeDaily) 0L else (spent * days + spanDays * 100L - 1) / (spanDays * 100L) * 100
        val amount = cash - plannedExpense - plannedTransfers - savings - estimated
        val label = "${nextPayday.month.number}월 ${nextPayday.day}일"
        val breakdown = Breakdown(
            title = "다음 월급($label) 전까지 예상",
            total = amount,
            lines = buildList {
                add(BreakdownLine("대상 계좌 실제 잔고", cash, 1))
                add(BreakdownLine("월급 전까지 예정 지출", plannedExpense, -1, "$label 전날까지·밀린 예정 지출 포함(고정 비용 포함)"))
                add(BreakdownLine("월급 전까지 예정 이체", plannedTransfers, -1, "저축·카드 대금 등"))
                if (savings > 0) add(BreakdownLine("저축 목표 배정", savings, -1, reservedGoals.joinToString { it.goal.name }))
                if (includeDaily) add(BreakdownLine("예상 생활비 (${days}일)", estimated, -1,
                    "$basisLabel 하루 평균 ${MoneyFormat.format(daily)} × ${days}일 (고정 비용 제외, 추정)"))
                add(BreakdownLine("참고: 월급 전 예정 수입(미반영)", plannedIncome, 0, "입금 전까지 반영하지 않음"))
            },
            formula = if (includeDaily) "월급 전까지 예상 = 잔고 − 월급 전 예정 지출 − 예정 이체 − 저축 목표 − 하루 평균 생활비 × 남은 날"
                else "월급 전까지 예상 = 잔고 − 월급 전 예정 지출 − 예정 이체 − 저축 목표 (하루 평균 생활비는 넣지 않음 · 설정에서 바꿀 수 있어요)",
            notes = listOfNotNull(
                if (nextPayday != regular) "이번 월급날: $label (설정 급여일 ${regular.month.number}월 ${regular.day}일 대신 직접 알려 준 날)"
                else "급여일: 매월 ${paydayDay}일(짧은 달은 말일) · 설정에서 바꿀 수 있어요",
                "남은 날: 오늘부터 월급 전날까지 ${days}일",
            ),
        )
        return PaydayForecast(nextPayday, regular, days, amount, daily, estimated, includeDaily, basisLabel, breakdown)
    }
}
