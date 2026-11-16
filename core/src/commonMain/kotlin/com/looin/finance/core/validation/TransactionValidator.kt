package com.looin.finance.core.validation

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import kotlinx.datetime.LocalDate

/**
 * [errors]가 있으면 저장 불가. [warnings]는 사용자 확인 후 저장 가능(예: 잔액 부족·음수 잔고).
 */
data class ValidationResult(val errors: List<String>, val warnings: List<String>) {
    val isValid get() = errors.isEmpty()
}

object TransactionValidator {

    fun validate(
        tx: Transaction,
        accounts: List<Account>,
        categories: List<Category>,
        existing: List<Transaction>,
        today: LocalDate,
    ): ValidationResult {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        val byId = accounts.associateBy { it.id }
        val from = tx.fromAccountId?.let { byId[it] }
        val to = tx.toAccountId?.let { byId[it] }

        if (tx.amount <= 0) errors += "금액은 0보다 커야 합니다."
        if (tx.fromAccountId != null && from == null) errors += "출금 계좌를 찾을 수 없습니다."
        if (tx.toAccountId != null && to == null) errors += "입금 계좌를 찾을 수 없습니다."

        when (tx.type) {
            TransactionType.INCOME -> {
                if (to == null) errors += "입금 계좌를 선택하세요."
                if (tx.fromAccountId != null) errors += "수입에는 출금 계좌를 지정할 수 없습니다."
            }
            TransactionType.EXPENSE -> {
                if (from == null) errors += "출금 계좌를 선택하세요."
                if (tx.toAccountId != null) errors += "지출에는 입금 계좌를 지정할 수 없습니다."
            }
            TransactionType.TRANSFER -> {
                if (from == null) errors += "출금 계좌를 선택하세요."
                if (to == null) errors += "입금 계좌를 선택하세요."
                if (from != null && from.id == to?.id) errors += "같은 계좌로는 이체할 수 없습니다."
                if (from != null && to != null && from.currency != to.currency) {
                    // 원화↔외화 이체(환전): 받은 금액(입금 계좌 통화)과 환율이 있어야 한다. 외화끼리는 원화를 거쳐 기록
                    if (from.currency != KRW && to.currency != KRW) errors += "외화끼리 바로 옮기는 기록은 지원하지 않아요. 원화 계좌를 거쳐 기록하세요."
                    else {
                        if ((tx.toAmount ?: 0) <= 0) errors += "받은 금액(${to.currency})을 입력하세요."
                        if (tx.rateToKrwX10000 == null) errors += "환율을 입력하세요."
                    }
                }
            }
            TransactionType.EXCHANGE -> errors += "환전은 아직 지원하지 않습니다."
            TransactionType.ADJUSTMENT -> {
                if ((from == null) == (to == null)) errors += "잔고 조정은 한 계좌만 지정해야 합니다."
                if (tx.status != TransactionStatus.COMPLETED) errors += "잔고 조정은 완료 상태여야 합니다."
            }
        }

        // 거래 통화 = 출금 계좌 통화(수입은 입금 계좌). 통화가 다른 이체의 입금 쪽은 toAmount 로 따로 적는다
        val crossTransfer = tx.type == TransactionType.TRANSFER && from != null && to != null && from.currency != to.currency
        (if (crossTransfer) listOf(from!!) else listOfNotNull(from, to)).forEach { acc ->
            if (acc.currency != tx.currency) errors += "'${acc.name}' 계좌 통화(${acc.currency})와 거래 통화가 다릅니다."
        }
        // 외화가 오간 거래는 당시 환율을 적어야 한다(직접 입력한 완료 거래). 자동으로 만든 거래는 계좌 화면에서 나중에 채운다
        val foreign = listOfNotNull(from, to).any { it.currency != KRW }
        if (foreign && tx.rateToKrwX10000 == null && tx.status == TransactionStatus.COMPLETED && tx.source == TransactionSource.MANUAL &&
            tx.type in setOf(TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER) && !crossTransfer) {
            errors += "외화 거래는 당시 환율을 입력하세요."
        }
        if (tx.rateToKrwX10000 != null && tx.rateToKrwX10000 <= 0) errors += "환율은 0보다 커야 합니다."

        // 새 거래·수정 시 보관 계좌는 사용할 수 없다(취소는 허용).
        if (tx.status != TransactionStatus.CANCELLED) {
            listOfNotNull(from, to).filter { it.archived }.forEach { errors += "보관된 계좌 '${it.name}'는 사용할 수 없습니다." }
        }

        val category = tx.categoryId?.let { id -> categories.firstOrNull { it.id == id } }
        if (tx.categoryId != null && category == null) errors += "카테고리를 찾을 수 없습니다."
        if (category != null) {
            val expected = when (tx.type) {
                TransactionType.INCOME -> CategoryKind.INCOME
                TransactionType.EXPENSE -> CategoryKind.EXPENSE
                else -> null
            }
            if (expected == null) errors += "${tx.type.label} 거래에는 카테고리를 지정하지 않습니다."
            else if (category.kind != expected) errors += "'${category.name}'는 ${category.kind.label} 카테고리입니다."
        }

        if (tx.status == TransactionStatus.COMPLETED && tx.effectiveDate > today) {
            errors += "미래 날짜의 거래는 '예정'으로 등록하세요. 실제로 처리된 날에 완료 처리합니다."
        }
        if (tx.status == TransactionStatus.PLANNED && tx.completedDate != null) {
            errors += "예정 거래에는 실제 처리일을 둘 수 없습니다."
        }

        // 잔액 부족 / 음수 잔고 경고(부채 계좌 제외).
        if (errors.isEmpty() && from != null && !from.type.isLiability && tx.status != TransactionStatus.CANCELLED) {
            val others = existing.filter { it.id != tx.id || tx.id == 0L }
            val after = when (tx.status) {
                TransactionStatus.COMPLETED -> BalanceCalculator.actualBalance(from, others) + tx.deltaFor(from.id)
                else -> BalanceCalculator.projectedBalance(from, others, tx.date) + tx.deltaFor(from.id)
            }
            if (after < 0) {
                val label = if (tx.status == TransactionStatus.COMPLETED) "처리 후 잔고" else "${tx.date} 예상 잔고"
                warnings += "잔액 부족: '${from.name}' $label ${MoneyFormat.format(after, from.currency)}"
            }
        }
        return ValidationResult(errors, warnings)
    }
}

object AccountRules {
    /** 보관은 잔액 0, 미처리 예정 거래가 없을 때만 허용한다(자산 합계·예상 잔고 무결성 보존). */
    fun canArchive(account: Account, transactions: List<Transaction>): String? {
        val balance = BalanceCalculator.actualBalance(account, transactions)
        if (balance != 0L) return "잔액이 ${MoneyFormat.format(balance, account.currency)} 남아 있어 보관할 수 없습니다. 이체 또는 잔고 조정 후 보관하세요."
        if (transactions.any { it.isPlanned && it.touches(account.id) }) return "처리되지 않은 예정 거래가 있어 보관할 수 없습니다."
        return null
    }

    /**
     * 잔고 조정 거래 생성. 현재 실제 잔고와 목표 잔고의 차이만큼 조정 거래를 만든다(차이가 0이면 null).
     * 조정 거래 자체가 변경 이력으로 보존된다(메모에 조정 전/후 잔고 기록).
     */
    fun adjustment(
        account: Account,
        transactions: List<Transaction>,
        targetBalance: Long,
        date: LocalDate,
        memo: String,
        now: Long,
    ): Transaction? {
        val current = BalanceCalculator.actualBalance(account, transactions)
        val diff = targetBalance - current
        if (diff == 0L) return null
        val history = "잔고 조정: ${MoneyFormat.format(current, account.currency)} → ${MoneyFormat.format(targetBalance, account.currency)}"
        return Transaction(
            type = TransactionType.ADJUSTMENT,
            status = TransactionStatus.COMPLETED,
            amount = kotlin.math.abs(diff),
            currency = account.currency,
            date = date,
            completedDate = date,
            fromAccountId = if (diff < 0) account.id else null,
            toAccountId = if (diff > 0) account.id else null,
            memo = if (memo.isBlank()) history else "$history · $memo",
            source = com.looin.finance.core.model.TransactionSource.ADJUSTMENT,
            createdAt = now,
            updatedAt = now,
        )
    }
}
