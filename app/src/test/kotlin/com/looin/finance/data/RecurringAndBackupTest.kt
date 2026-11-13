package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RecurringAndBackupTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private var today = LocalDate(2026, 11, 13)
    private lateinit var db: FinanceDatabase
    private lateinit var repo: FinanceRepository
    private val opened = mutableListOf<FinanceDatabase>()

    private fun open(name: String): FinanceRepository {
        context.deleteDatabase(name)
        val d = FinanceDatabase.build(context, name).also { opened += it }
        return FinanceRepository(d, now = { 1_000L }, today = { today })
    }

    @Before fun setUp() { repo = open("recurring.db"); db = opened.last() }
    @After fun tearDown() { opened.forEach { it.close() }; listOf("recurring.db", "restore.db").forEach { context.deleteDatabase(it) } }

    private suspend fun setup(): Pair<Long, Long> {
        repo.ensureInitialized()
        val acc = repo.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 2_000_000, includeInAvailable = true))
        val food = repo.snapshot().categories.first { it.name == "주거·관리비" }.id
        return acc to food
    }

    private fun rent(acc: Long, cat: Long, day: Int = 25) = RecurringRule(
        name = "월세", type = TransactionType.EXPENSE, amount = 500_000, fromAccountId = acc, categoryId = cat,
        frequency = Frequency.MONTHLY, dayOfMonth = day, startDate = LocalDate(2026, 11, 1),
    )

    /** 규칙 저장 → 이번·다음 기간 말까지 예정 거래 생성, 여러 번 생성해도 중복 없음 */
    @Test fun generatesUpToNextPeriodWithoutDuplicates() = runTest {
        val (acc, cat) = setup()
        repo.saveRule(rent(acc, cat))
        var s = repo.snapshot()
        // 달력 기준: 이번 기간 11월, 다음 기간 12월 → 11/25, 12/25
        assertEquals(listOf(LocalDate(2026, 11, 25), LocalDate(2026, 12, 25)), s.transactions.map { it.date }.sorted())
        assertTrue(s.transactions.all { it.isPlanned && it.memo == "월세" })
        assertEquals(0, repo.generateRecurring())
        assertEquals(0, repo.generateRecurring())
        assertEquals(2, repo.snapshot().transactions.size)

        // 실제 잔고는 그대로, 11월 말 예상 잔고에는 한 번만 반영
        s = repo.snapshot()
        assertEquals(2_000_000, BalanceCalculator.actualBalance(s.accounts[0], s.transactions))
        assertEquals(1_500_000, BalanceCalculator.projectedBalance(s.accounts[0], s.transactions, LocalDate(2026, 11, 30)))

        // 날짜가 지나 다음 달이 되면 그다음 기간분이 추가된다
        today = LocalDate(2026, 12, 2)
        assertEquals(1, repo.generateRecurring())
        assertEquals(LocalDate(2027, 1, 25), repo.snapshot().transactions.maxOf { it.date })
    }

    /** 사용자가 지운 발생분은 다시 생기지 않는다 */
    @Test fun deletedOccurrenceIsNotRecreated() = runTest {
        val (acc, cat) = setup()
        repo.saveRule(rent(acc, cat))
        val nov = repo.snapshot().transactions.first { it.date == LocalDate(2026, 11, 25) }
        repo.deleteTransaction(nov.id)
        repo.generateRecurring()
        assertEquals(listOf(LocalDate(2026, 12, 25)), repo.snapshot().transactions.map { it.date })
    }

    /** 규칙 수정: 미처리 미래 예정분만 새 규칙으로 바뀌고, 완료한 거래는 보존 */
    @Test fun editingRuleReplacesOnlyFuturePlanned() = runTest {
        val (acc, cat) = setup()
        val id = repo.saveRule(rent(acc, cat, day = 10))
        // 11/10 은 과거라 안 만들어짐 → 12/10 하나. 완료 처리할 거래를 하나 직접 만든다(오늘 완료)
        val done = repo.snapshot().transactions.first()
        assertEquals(LocalDate(2026, 12, 10), done.date)
        today = LocalDate(2026, 12, 10)
        repo.completeTransaction(done.id, today, 480_000)
        // 규칙 수정: 금액 550,000, 매월 15일
        repo.saveRule(rent(acc, cat, day = 15).copy(id = id, amount = 550_000))
        val txs = repo.snapshot().transactions.sortedBy { it.date }
        val completed = txs.single { it.isCompleted }
        assertEquals(480_000, completed.amount)
        assertEquals(listOf(LocalDate(2026, 12, 15), LocalDate(2027, 1, 15)), txs.filter { it.isPlanned }.map { it.date })
        assertTrue(txs.filter { it.isPlanned }.all { it.amount == 550_000L })
    }

    /** 규칙 삭제: 미래 예정분은 지우고 완료 기록은 남김. 활성 규칙이 쓰는 계좌는 보관 불가 */
    @Test fun deleteRuleAndArchiveGuard() = runTest {
        val (acc, cat) = setup()
        val id = repo.saveRule(rent(acc, cat))
        repo.adjustBalance(acc, 0, today, "")
        try { repo.setArchived(acc, true); fail("반복 규칙이 쓰는 계좌가 보관됨") } catch (_: FinanceException) {}
        repo.deleteRule(id)
        val s = repo.snapshot()
        assertEquals(0, s.rules.size)
        assertEquals(listOf(TransactionType.ADJUSTMENT), s.transactions.map { it.type })
        repo.setArchived(acc, true)
    }

    /** 잘못된 규칙은 저장되지 않는다 */
    @Test fun invalidRuleRejected() = runTest {
        val (acc, cat) = setup()
        try { repo.saveRule(rent(acc, cat, day = 0)); fail() } catch (e: FinanceException) { assertTrue(e.message!!.contains("1~31")) }
        try { repo.saveRule(rent(999, cat)); fail() } catch (_: FinanceException) {}
        assertEquals(0, repo.snapshot().rules.size)
    }

    /** 백업 → 다른 DB 로 복원 → 모든 데이터와 잔고가 같다 */
    @Test fun backupRoundTrip() = runTest {
        val (acc, cat) = setup()
        val savings = repo.saveAccount(Account(name = "적금", type = AccountType.SAVINGS, openingBalance = 0))
        repo.saveRule(rent(acc, cat))
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 300_000,
            date = today, completedDate = today, fromAccountId = acc, toAccountId = savings, memo = "저축"))
        val p = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)
        repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = null, amount = 1_000_000))
        val original = repo.snapshot()
        val json = repo.exportBackup("test")

        val other = open("restore.db")
        other.ensureInitialized()
        other.saveAccount(Account(name = "지워질 계좌", type = AccountType.CASH, openingBalance = 1))
        val summary = other.restoreBackup(json)
        val restored = other.snapshot()

        assertEquals(original.accounts, restored.accounts)
        assertEquals(original.categories, restored.categories)
        assertEquals(original.transactions.sortedBy { it.id }, restored.transactions.sortedBy { it.id })
        assertEquals(original.budgets, restored.budgets)
        assertEquals(original.rules, restored.rules)
        assertEquals(original.settings, restored.settings)
        assertEquals(4, summary.transactions + summary.accounts - 1) // 거래 3(월세 2 + 이체 1) + 계좌 2 - 1
        assertEquals(
            original.accounts.map { BalanceCalculator.actualBalance(it, original.transactions) },
            restored.accounts.map { BalanceCalculator.actualBalance(it, restored.transactions) },
        )
        // 복원 후 다시 생성해도 반복 거래가 중복되지 않는다
        assertEquals(0, other.generateRecurring())
    }

    /** 손상·편집된 백업은 거부하고 기존 데이터는 그대로 둔다 */
    @Test fun corruptedBackupRejectedAndDataKept() = runTest {
        val (acc, _) = setup()
        val json = repo.exportBackup("test")
        val before = repo.snapshot()
        val bad = listOf(
            "not json",
            """{"format":"other"}""",
            json.replace("\"openingBalance\": 2000000", "\"openingBalance\": 9000000"), // 요약값 불일치
            json.replace("\"formatVersion\": 1", "\"formatVersion\": 99"),
        )
        for (b in bad) {
            try { repo.restoreBackup(b); fail("손상된 백업이 복원됨: ${b.take(30)}") } catch (_: FinanceException) {}
        }
        assertEquals(before, repo.snapshot())
        assertEquals(acc, repo.snapshot().accounts.single().id)
    }
}
