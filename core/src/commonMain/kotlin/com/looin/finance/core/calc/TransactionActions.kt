package com.looin.finance.core.calc

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import kotlinx.datetime.LocalDate

/**
 * 거래 상태 전이. 상태를 바꿀 때는 새 거래를 만들지 않고 같은 레코드를 갱신한다.
 * → 예정 거래를 완료해도 예상 잔고와 실제 잔고에 중복 반영되지 않는다.
 */
object TransactionActions {

    /** 예정 → 완료. 실제 처리일과(필요하면) 실제 금액을 기록한다. 예정일(date)은 보존한다. */
    fun complete(tx: Transaction, actualDate: LocalDate, actualAmount: Long? = null, now: Long): Transaction {
        require(tx.status == TransactionStatus.PLANNED) { "예정 거래만 완료 처리할 수 있습니다." }
        return tx.copy(
            status = TransactionStatus.COMPLETED,
            completedDate = actualDate,
            amount = actualAmount ?: tx.amount,
            updatedAt = now,
        )
    }

    /** 예정 또는 완료 → 취소. 취소 거래는 잔고·예산·통계에서 모두 제외된다. */
    fun cancel(tx: Transaction, now: Long): Transaction {
        require(tx.status != TransactionStatus.CANCELLED) { "이미 취소된 거래입니다." }
        return tx.copy(status = TransactionStatus.CANCELLED, updatedAt = now)
    }

    /** 취소 또는 완료 → 예정으로 되돌림. 실제 처리일은 지운다. */
    fun reopen(tx: Transaction, now: Long): Transaction {
        require(tx.status != TransactionStatus.PLANNED) { "이미 예정 상태입니다." }
        return tx.copy(status = TransactionStatus.PLANNED, completedDate = null, updatedAt = now)
    }
}
