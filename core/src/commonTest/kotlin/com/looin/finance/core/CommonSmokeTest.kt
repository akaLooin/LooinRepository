package com.looin.finance.core

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * 모든 플랫폼(JVM·iOS·데스크톱)에서 똑같이 돌아야 하는 핵심 계산 시나리오.
 * iOS 에서는 macOS CI 의 `:core:iosSimulatorArm64Test` 로 실행된다. (자세한 시나리오는 jvmTest)
 */
class CommonSmokeTest {
    private val today = LocalDate(2026, 11, 13)
    private val a = Account(id = 1, name = "A", type = AccountType.CHECKING, openingBalance = 1_000_000)
    private val b = Account(id = 2, name = "B", type = AccountType.SAVINGS, openingBalance = 0)

    private fun expense(amount: Long, status: TransactionStatus, date: LocalDate = today) = Transaction(
        id = amount, type = TransactionType.EXPENSE, status = status, amount = amount, date = date,
        completedDate = if (status == TransactionStatus.COMPLETED) date else null, fromAccountId = 1, categoryId = 10,
    )

    @Test fun budgetRemainingAndUnreservedWithoutDoubleCounting() {
        val p = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)
        val s = BudgetCalculator.status(
            Budget(1, PeriodBasis.CALENDAR, p.start, p.endExclusive, 10, 400_000), p,
            listOf(expense(100_000, TransactionStatus.COMPLETED), expense(50_000, TransactionStatus.PLANNED, LocalDate(2026, 11, 20))),
        )
        assertEquals(300_000, s.remaining)
        assertEquals(250_000, s.unreserved)
    }

    @Test fun paydayThirtyFirstFallsBackToMonthEnd() {
        assertEquals(LocalDate(2026, 2, 28), PeriodCalculator.paydayIn(2026, 2, 31))
        val p = PeriodCalculator.periodContaining(LocalDate(2026, 2, 10), PeriodBasis.PAYDAY, 31)
        assertEquals(LocalDate(2026, 1, 31), p.start)
        assertEquals(LocalDate(2026, 2, 28), p.endExclusive)
    }

    @Test fun transferKeepsNetWorthAndPlannedDoesNotTouchActual() {
        val t = Transaction(id = 9, type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 100_000,
            date = today, completedDate = today, fromAccountId = 1, toAccountId = 2)
        val before = BalanceCalculator.assetSummary(listOf(a, b), emptyList()).netWorth
        assertEquals(before, BalanceCalculator.assetSummary(listOf(a, b), listOf(t)).netWorth)
        assertEquals(1_000_000, BalanceCalculator.actualBalance(a, listOf(expense(10_000, TransactionStatus.PLANNED))))
    }

    @Test fun moneyFormatting() {
        assertEquals("1,234,567원", MoneyFormat.format(1_234_567))
        assertEquals(10_000L, MoneyFormat.parse("10,000"))
    }
}
