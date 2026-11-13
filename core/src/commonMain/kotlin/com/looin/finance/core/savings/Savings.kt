package com.looin.finance.core.savings

import com.looin.finance.core.model.Account
import kotlinx.datetime.LocalDate

/**
 * 저축 목표. 목표에 "배정"한 돈은 실제로 옮기지 않아도 쓰지 않을 돈으로 따로 떼어 둔다.
 *
 * @property accountId 목표의 돈이 있는 계좌. null 이면 "생활비 계좌에서 떼어 둠"(생활비 계산 대상 계좌 안에 있음).
 *   생활비 계산 대상이 아닌 계좌(예: 적금 통장)를 고르면 그 돈은 이미 사용 가능 금액에 들어가지 않으므로 다시 빼지 않는다.
 * @property archived 보관(완료·포기)하면 배정을 풀어 사용 가능 금액에서 더 이상 빼지 않는다. 배정 기록은 남는다.
 */
data class SavingsGoal(
    val id: Long = 0,
    val name: String,
    val targetAmount: Long,
    val targetDate: LocalDate? = null,
    val accountId: Long? = null,
    val colorArgb: Long = 0xFF00C072,
    val archived: Boolean = false,
    val memo: String = "",
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)

/** 배정 기록. [amount] 양수 = 더 떼어 둠, 음수 = 배정 해제(꺼내 씀). 기록은 지우지 않고 쌓는다(이력). */
data class SavingsAllocation(
    val id: Long = 0,
    val goalId: Long,
    val amount: Long,
    val date: LocalDate,
    val memo: String = "",
    val createdAt: Long = 0,
)

data class GoalStatus(val goal: SavingsGoal, val allocated: Long) {
    val remaining: Long get() = (goal.targetAmount - allocated).coerceAtLeast(0)
    val achieved: Boolean get() = allocated >= goal.targetAmount
    val progress: Float get() = if (goal.targetAmount <= 0) 0f else (allocated.toFloat() / goal.targetAmount).coerceIn(0f, 1f)
}

object SavingsCalculator {

    fun validate(goal: SavingsGoal): List<String> = buildList {
        if (goal.name.isBlank()) add("목표 이름을 입력하세요.")
        if (goal.targetAmount <= 0) add("목표 금액은 0보다 커야 합니다.")
    }

    fun allocated(goalId: Long, allocations: List<SavingsAllocation>): Long =
        allocations.filter { it.goalId == goalId }.sumOf { it.amount }

    fun statuses(goals: List<SavingsGoal>, allocations: List<SavingsAllocation>): List<GoalStatus> =
        goals.map { GoalStatus(it, allocated(it.id, allocations)) }

    /** 배정·해제 검증: 해제는 배정된 금액까지만. */
    fun validateAllocation(status: GoalStatus, amount: Long): String? = when {
        amount == 0L -> "금액을 입력하세요."
        status.allocated + amount < 0 -> "배정된 금액(${status.allocated})보다 많이 해제할 수 없습니다."
        status.goal.archived -> "보관된 목표에는 배정할 수 없습니다."
        else -> null
    }

    /**
     * 사용 가능 금액에서 뺄 저축 배정액.
     * 보관하지 않은 목표 중, 돈이 생활비 계산 대상 계좌에 있는 것(accountId 가 null 이거나 대상 계좌)만 더한다.
     * 대상이 아닌 계좌(적금 등)에 있는 목표는 이미 대상 잔고에 없으므로 빼지 않는다(이중 차감 방지).
     */
    fun reserveForAvailable(statuses: List<GoalStatus>, includedAccounts: List<Account>): List<GoalStatus> {
        val ids = includedAccounts.map { it.id }.toSet()
        return statuses.filter { !it.goal.archived && it.allocated > 0 && (it.goal.accountId == null || it.goal.accountId in ids) }
    }
}
