package com.looin.finance.core.limit

/**
 * 예전(DB v5, 2026-11-15 미리보기) "지출 한도". 지금은 예산에 합쳐졌다(경고 비율·계좌 예산).
 * 남아 있는 한도와 백업 파일의 한도를 이번 기간 예산으로 옮길 때만 쓴다.
 */
enum class LimitTarget { ALL, CATEGORY, ACCOUNT }

data class SpendingLimit(
    val id: Long = 0,
    val target: LimitTarget,
    val targetId: Long? = null,
    val amount: Long,
    val warnPercent: Int = 80,
    val active: Boolean = true,
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)
