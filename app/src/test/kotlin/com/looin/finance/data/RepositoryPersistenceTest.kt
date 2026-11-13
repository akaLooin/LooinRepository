package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.calc.BudgetCalculator
import com.looin.finance.core.calc.StatisticsCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RepositoryPersistenceTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val dbName = "test_finance.db"
    private val today = LocalDate(2026, 11, 12)
    private lateinit var db: FinanceDatabase
    private lateinit var repo: FinanceRepository

    private fun open() {
        db = FinanceDatabase.build(context, dbName)
        repo = FinanceRepository(db, now = { 1_000L }, today = { today })
    }

    @Before fun setUp() {
        context.deleteDatabase(dbName)
        open()
    }

    @After fun tearDown() {
        db.close()
        context.deleteDatabase(dbName)
    }

    private suspend fun foodId() = repo.snapshot().categories.first { it.name == "식비" }.id

    private suspend fun newAccount(name: String = "주거래", opening: Long = 1_000_000, type: AccountType = AccountType.CHECKING) =
        repo.saveAccount(Account(name = name, type = type, openingBalance = opening, includeInAvailable = true))

    /** 최초 실행 시 기본 카테고리와 설정만 생성되고 샘플 거래는 없다 */
    @Test fun firstLaunchSeedsOnlyDefaultCategoriesNoSampleData() = runTest {
        repo.ensureInitialized()
        repo.ensureInitialized() // 두 번 호출해도 중복 생성 없음
        val s = repo.snapshot()
        assertTrue(s.categories.any { it.kind == CategoryKind.EXPENSE && it.name == "식비" })
        assertEquals(18, s.categories.size)
        assertTrue(s.accounts.isEmpty())
        assertTrue(s.transactions.isEmpty())
    }

    /** 앱 재시작(DB 재오픈) 후에도 계좌·거래·예산·설정이 유지된다 */
    @Test fun dataSurvivesAppRestart() = runTest {
        repo.ensureInitialized()
        val acc = newAccount()
        val food = foodId()
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 10_000,
            date = today, completedDate = today, fromAccountId = acc, categoryId = food, memo = "점심"))
        val p = PeriodCalculator.periodContaining(today, PeriodBasis.PAYDAY, 31)
        repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = food, amount = 400_000))
        repo.updateSettings(FinanceSettings(paydayDay = 31, primaryBasis = PeriodBasis.PAYDAY))
        repo.adjustBalance(acc, 980_000, today, "")

        db.close()
        open() // 재시작

        val s = repo.data.first()
        assertEquals(1, s.accounts.size)
        assertEquals(2, s.transactions.size)
        assertEquals("점심", s.transactions.first { it.type == TransactionType.EXPENSE }.memo)
        assertEquals(980_000, BalanceCalculator.actualBalance(s.accounts[0], s.transactions))
        assertEquals(31, s.settings.paydayDay)
        assertEquals(PeriodBasis.PAYDAY, s.settings.primaryBasis)
        assertEquals(300_000 + 90_000, BudgetCalculator.status(s.budgets[0], p, s.transactions).remaining)
    }

    /** 거래 수정·삭제 후 잔고와 통계가 다시 계산된다 */
    @Test fun editAndDeleteRecalculateBalancesAndStats() = runTest {
        repo.ensureInitialized()
        val a = newAccount("A")
        val b = newAccount("B", 0)
        val food = foodId()
        val id = repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 10_000,
            date = today, completedDate = today, fromAccountId = a, categoryId = food))
        val period = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)

        var s = repo.snapshot()
        assertEquals(990_000, BalanceCalculator.actualBalance(s.accountById[a]!!, s.transactions))

        val tx = s.transactions.first { it.id == id }
        repo.saveTransaction(tx.copy(amount = 25_000))
        s = repo.snapshot()
        assertEquals(975_000, BalanceCalculator.actualBalance(s.accountById[a]!!, s.transactions))
        assertEquals(25_000, StatisticsCalculator.stats(period, s.transactions).expense)

        repo.deleteTransaction(id)
        s = repo.snapshot()
        assertEquals(1_000_000, BalanceCalculator.actualBalance(s.accountById[a]!!, s.transactions))
        assertEquals(0, StatisticsCalculator.stats(period, s.transactions).expense)

        // 이체: 총자산 불변
        val before = BalanceCalculator.assetSummary(s.accounts, s.transactions).totalAssets
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 100_000,
            date = today, completedDate = today, fromAccountId = a, toAccountId = b))
        s = repo.snapshot()
        assertEquals(before, BalanceCalculator.assetSummary(s.accounts, s.transactions).totalAssets)
        assertEquals(100_000, BalanceCalculator.actualBalance(s.accountById[b]!!, s.transactions))
    }

    /** 예정 → 완료 → 취소 → 예정 상태 전이 */
    @Test fun plannedCompletedCancelledReopenedTransitions() = runTest {
        repo.ensureInitialized()
        val a = newAccount()
        val id = repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED, amount = 50_000,
            date = LocalDate(2026, 11, 20), fromAccountId = a, categoryId = foodId()))
        fun bal(s: FinanceData) = BalanceCalculator.actualBalance(s.accounts[0], s.transactions)
        assertEquals(1_000_000, bal(repo.snapshot()))

        repo.completeTransaction(id, today, 48_000)
        var s = repo.snapshot()
        assertEquals(952_000, bal(s))
        assertEquals(952_000, BalanceCalculator.projectedBalance(s.accounts[0], s.transactions, LocalDate(2026, 11, 30)))

        repo.cancelTransaction(id)
        s = repo.snapshot()
        assertEquals(1_000_000, bal(s))
        assertEquals(TransactionStatus.CANCELLED, s.transactions[0].status)

        repo.reopenTransaction(id)
        assertEquals(TransactionStatus.PLANNED, repo.snapshot().transactions[0].status)
    }

    /** 잘못된 거래와 보관 규칙은 저장소에서 거부된다 */
    @Test fun invalidTransactionsAndArchiveRulesRejected() = runTest {
        repo.ensureInitialized()
        val a = newAccount()
        try {
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 0,
                date = today, fromAccountId = a))
            fail("0원 거래가 저장됨")
        } catch (e: FinanceException) { assertTrue(e.message!!.contains("금액")) }
        try {
            repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 1_000,
                date = LocalDate(2026, 12, 1), fromAccountId = a))
            fail("미래 완료 거래가 저장됨")
        } catch (_: FinanceException) {}
        try {
            repo.setArchived(a, true)
            fail("잔액 있는 계좌가 보관됨")
        } catch (_: FinanceException) {}
        // 잔액을 0으로 조정하면 보관 가능, 조정 이력 유지
        assertNotNull(repo.adjustBalance(a, 0, today, "정리"))
        repo.setArchived(a, true)
        val s = repo.snapshot()
        assertTrue(s.accounts[0].archived)
        assertEquals(1, s.transactions.count { it.type == TransactionType.ADJUSTMENT })
        assertTrue(s.transactions[0].memo.contains("1,000,000원 → 0원"))
    }

    /** 같은 기간·같은 항목의 예산은 중복 생성되지 않는다 */
    @Test fun duplicateBudgetsRejectedAndCopyWorks() = runTest {
        repo.ensureInitialized()
        val food = foodId()
        val p = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)
        val b = Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = food, amount = 1)
        repo.saveBudget(b)
        try { repo.saveBudget(b); fail() } catch (_: FinanceException) {}
        repo.saveBudget(b.copy(categoryId = null))
        try { repo.saveBudget(b.copy(categoryId = null)); fail() } catch (_: FinanceException) {}
        val next = PeriodCalculator.next(p, 25)
        assertEquals(2, repo.copyBudgets(p, next))
        assertEquals(0, repo.copyBudgets(p, next))
    }
}
