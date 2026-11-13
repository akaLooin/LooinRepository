package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** CSV 내보내기 → 다른 기기로 가져오기, 다시 가져와도 중복 없음, 기존 데이터 보존. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CsvImportTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val today = LocalDate(2026, 11, 13)
    private val opened = mutableListOf<FinanceDatabase>()
    private fun open(name: String): FinanceRepository {
        context.deleteDatabase(name)
        return FinanceRepository(FinanceDatabase.build(context, name).also { opened += it }, now = { 5 }, today = { today })
    }
    private lateinit var repo: FinanceRepository

    @Before fun setUp() { repo = open("csv-a.db") }
    @After fun tearDown() { opened.forEach { it.close() }; listOf("csv-a.db", "csv-b.db").forEach { context.deleteDatabase(it) } }

    private suspend fun accounts(r: FinanceRepository): Pair<Long, Long> {
        r.ensureInitialized()
        val main = r.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
        val save = r.saveAccount(Account(name = "적금", type = AccountType.SAVINGS, openingBalance = 0))
        return main to save
    }

    @Test fun exportImportRoundTripWithoutDuplicates() = runTest {
        val (main, save) = accounts(repo)
        val food = repo.snapshot().categories.first { it.name == "식비" }.id
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 12_000,
            date = today, completedDate = today, fromAccountId = main, categoryId = food, memo = "점심, 회사"))
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 300_000,
            date = today, completedDate = today, fromAccountId = main, toAccountId = save, memo = "저축"))
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED, amount = 500_000,
            date = LocalDate(2026, 11, 25), fromAccountId = main, memo = "월세"))
        val csv = repo.exportCsv()

        // 다른 기기(같은 계좌 이름) 로 가져오기
        val other = open("csv-b.db")
        val (m2, _) = accounts(other)
        assertEquals(3, other.previewCsv(csv, m2).newItems.size)
        assertEquals(3, other.importCsv(csv, m2))
        val s = other.snapshot()
        assertTrue(s.transactions.all { it.source == TransactionSource.IMPORT })
        assertEquals("식비", s.categoryName(s.transactions.first { it.amount == 12_000L }.categoryId))
        val a = repo.snapshot()
        assertEquals(
            a.accounts.map { BalanceCalculator.actualBalance(it, a.transactions) },
            s.accounts.map { BalanceCalculator.actualBalance(it, s.transactions) },
        )
        // 다시 가져오면 0건 (원래 기기에서도 0건)
        assertEquals(0, other.importCsv(csv, m2))
        assertEquals(0, repo.importCsv(csv, main))
        assertEquals(3, other.snapshot().transactions.size)
    }

    @Test fun bankStatementGoesToChosenAccount() = runTest {
        val (_, save) = accounts(repo)
        val csv = "거래일자,적요,출금액,입금액\n2026-11-01,편의점,\"3,500\",\n2026-11-02,이자,,120\n잘못된 줄,,,"
        val p = repo.previewCsv(csv, save)
        assertEquals(2, p.newItems.size)
        assertEquals(1, p.items.count { it.status == com.looin.finance.core.csv.ImportStatus.ERROR })
        assertEquals(2, repo.importCsv(csv, save))
        val s = repo.snapshot()
        val acc = s.accounts.first { it.id == save }
        assertEquals(-3_500 + 120L, BalanceCalculator.actualBalance(acc, s.transactions))
    }

    /** 중복으로 보인 줄도 사용자가 "중복 아님"으로 확인하면 저장된다 */
    @Test fun confirmedDuplicateIsKept() = runTest {
        val (main, _) = accounts(repo)
        val csv = "날짜,금액,메모\n2026-11-01,-4500,커피\n2026-11-01,-4500,커피"
        val p = repo.previewCsv(csv, main)
        assertEquals(1, p.newItems.size)
        val dup = p.items.single { it.status == com.looin.finance.core.csv.ImportStatus.DUPLICATE }.line
        assertEquals(2, repo.importCsv(csv, main, keepDuplicateLines = setOf(dup)))
        assertEquals(2, repo.snapshot().transactions.size)
    }

    /** 카테고리 삭제: 거래는 미분류로 남고(잔고 그대로) 그 카테고리 예산은 함께 삭제 */
    @Test fun deleteCategoryKeepsTransactions() = runTest {
        val (main, _) = accounts(repo)
        val cat = repo.saveCategory(com.looin.finance.core.model.Category(name = "반려동물", kind = com.looin.finance.core.model.CategoryKind.EXPENSE, colorArgb = 0xFF12A594))
        repo.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 30_000,
            date = today, completedDate = today, fromAccountId = main, categoryId = cat))
        val p = com.looin.finance.core.period.PeriodCalculator.periodContaining(today, com.looin.finance.core.period.PeriodBasis.CALENDAR, 25)
        repo.saveBudget(com.looin.finance.core.model.Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = cat, amount = 100_000))
        assertEquals(FinanceRepository.CategoryUsage(1, 1, 0), repo.categoryUsage(cat))
        repo.deleteCategory(cat)
        val s = repo.snapshot()
        assertTrue(s.categories.none { it.id == cat })
        assertEquals(null, s.transactions.single().categoryId)
        assertEquals(0, s.budgets.size)
        assertEquals(970_000L, BalanceCalculator.actualBalance(s.accounts.first { it.id == main }, s.transactions))
    }
}
