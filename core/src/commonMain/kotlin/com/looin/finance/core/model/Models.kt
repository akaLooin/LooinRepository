package com.looin.finance.core.model

import kotlinx.datetime.LocalDate

/** 원화 기본 통화 코드. */
const val KRW = "KRW"

enum class AccountType(val label: String, val isLiability: Boolean = false) {
    CHECKING("입출금"),
    CASH("현금"),
    SAVINGS("저축"),
    FOREIGN("외화"),
    OTHER_ASSET("기타 자산"),
    LIABILITY("부채", isLiability = true),
}

/**
 * 계좌·자산·부채.
 *
 * 잔액은 모두 "계좌 관점의 부호 있는 금액(최소 통화 단위)"으로 저장한다.
 * 부채는 갚아야 할 금액만큼 음수다. (예: 카드 미결제 50만 원 → -500,000)
 * 이렇게 하면 모든 계좌 잔액의 합이 곧 순자산이 되고, 이체·지출 계산 규칙이 계좌 종류와 무관해진다.
 */
data class Account(
    val id: Long = 0,
    val name: String,
    val type: AccountType,
    val currency: String = KRW,
    /** 초기 잔고(최소 통화 단위, 부호 있음). */
    val openingBalance: Long = 0,
    /** 생활비로 사용 가능한 금액 계산 대상 여부. */
    val includeInAvailable: Boolean = false,
    val archived: Boolean = false,
    val memo: String = "",
    val sortOrder: Int = 0,
    /**
     * 외화 계좌 평가 환율: 외화 1단위(예: 1 USD)당 원화 금액 × 10,000.
     * null이면 평가액을 계산하지 않는다(원 잔액은 그대로 보존).
     */
    val rateToKrwX10000: Long? = null,
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)

enum class TransactionType(val label: String) {
    INCOME("수입"),
    EXPENSE("지출"),
    TRANSFER("이체"),
    /** 외화 환전 — 구조만 준비(Phase 1 UI 미지원). */
    EXCHANGE("환전"),
    ADJUSTMENT("잔고 조정"),
}

enum class TransactionStatus(val label: String) {
    PLANNED("예정"),
    COMPLETED("완료"),
    CANCELLED("취소"),
}

enum class TransactionSource(val label: String) {
    MANUAL("직접 입력"),
    ADJUSTMENT("잔고 조정"),
    IMPORT("가져오기"),
    BANK_SYNC("금융 연동"),
    RECURRING("반복 거래"),
}

/**
 * 거래: 실제 또는 예정된 자금 이동. (예산과는 별개의 객체)
 *
 * - [amount]는 항상 양수. 방향은 [type]과 [fromAccountId]/[toAccountId]로 결정한다.
 * - 수입: toAccount 로 입금 / 지출: fromAccount 에서 출금 / 이체: from → to
 * - 잔고 조정: 증가면 toAccount, 감소면 fromAccount 하나만 지정.
 */
data class Transaction(
    val id: Long = 0,
    val type: TransactionType,
    val status: TransactionStatus,
    val amount: Long,
    val currency: String = KRW,
    /** 발생일(완료 거래) 또는 예정일(예정 거래). */
    val date: LocalDate,
    /** 실제 처리일. 완료 처리 시 기록한다. */
    val completedDate: LocalDate? = null,
    val fromAccountId: Long? = null,
    val toAccountId: Long? = null,
    val categoryId: Long? = null,
    val memo: String = "",
    val source: TransactionSource = TransactionSource.MANUAL,
    /** 관련 예정 거래 식별자(향후 금융 연동 거래와 예정 거래 자동 연결용). */
    val linkedPlannedId: Long? = null,
    /** 환전 시 입금 계좌 통화 기준 금액(Phase 1 미사용). */
    val toAmount: Long? = null,
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
    /** 이 거래를 만든 반복 규칙(없으면 직접 입력). */
    val recurringId: Long? = null,
    /** 반복 규칙상의 원래 발생일. 사용자가 예정일을 옮겨도 그대로 둔다(중복 생성 방지). */
    val recurringOccurrence: LocalDate? = null,
) {
    /**
     * 기간 집계·잔고 기준일.
     * 완료 거래는 실제 처리일(없으면 발생일), 예정 거래는 예정일을 사용한다.
     */
    val effectiveDate: LocalDate
        get() = if (status == TransactionStatus.COMPLETED) completedDate ?: date else date

    val isCompleted get() = status == TransactionStatus.COMPLETED
    val isPlanned get() = status == TransactionStatus.PLANNED
    val isCancelled get() = status == TransactionStatus.CANCELLED

    /** 이 거래가 [accountId] 계좌 잔액에 주는 변화량(취소·상태 무관한 "명목" 변화량). */
    fun deltaFor(accountId: Long): Long {
        var delta = 0L
        if (fromAccountId == accountId) delta -= amount
        if (toAccountId == accountId) {
            delta += if (type == TransactionType.EXCHANGE) (toAmount ?: amount) else amount
        }
        return delta
    }

    fun touches(accountId: Long) = fromAccountId == accountId || toAccountId == accountId
}

enum class CategoryKind(val label: String) { INCOME("수입"), EXPENSE("지출") }

data class Category(
    val id: Long = 0,
    val name: String,
    val kind: CategoryKind,
    val colorArgb: Long = 0xFF9E9E9E,
    val sortOrder: Int = 0,
    val archived: Boolean = false,
)

/**
 * 예산: 특정 회계 기간에 사용할 수 있는 금액의 "한도". 거래가 아니다.
 *
 * 기간은 생성 당시의 시작·종료일을 그대로 저장한다. 그래서 나중에 급여일 설정이 바뀌어도
 * 기존 예산 기록은 보존된다.
 *
 * @property categoryId null 이면 전체 생활비 예산.
 */
data class Budget(
    val id: Long = 0,
    val basis: com.looin.finance.core.period.PeriodBasis,
    val periodStart: LocalDate,
    val periodEndExclusive: LocalDate,
    val categoryId: Long?,
    val amount: Long,
    val memo: String = "",
)

data class FinanceSettings(
    /** 급여 기준일(1~31). 해당 월에 없는 날짜면 그 달 말일을 적용한다. */
    val paydayDay: Int = 25,
    /** 예산 관리에 쓰는 주 회계 기간 기준(하나만 활성). */
    val primaryBasis: com.looin.finance.core.period.PeriodBasis = com.looin.finance.core.period.PeriodBasis.CALENDAR,
)
