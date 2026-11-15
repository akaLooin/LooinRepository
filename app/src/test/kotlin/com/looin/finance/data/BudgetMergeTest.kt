package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.limit.LimitTarget
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 지출 한도 → 예산 합치기: 계좌 예산·경고 비율 저장 규칙, 예전 한도(DB·백업)를 이번 기간 예산으로 옮기기. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BudgetMergeTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val today = LocalDate(2026, 11, 15)
    private val opened = mutableListOf<FinanceDatabase>()
    private fun open(name: String): Pair<FinanceRepository, FinanceDatabase> {
        context.deleteDatabase(name)
        val db = FinanceDatabase.build(context, name).also { opened += it }
        return FinanceRepository(db, now = { 1 }, today = { today }) to db
    }
    @After fun tearDown() { opened.forEach { it.close() }; listOf("merge-a.db", "merge-b.db").forEach { context.deleteDatabase(it) } }
    private val p = PeriodCalculator.periodContaining(today, PeriodBasis.CALENDAR, 25)
    private fun budget(cat: Long? = null, acc: Long? = null, amount: Long = 100_000, warn: Int = 80) =
        Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = cat, amount = amount, accountId = acc, warnPercent = warn)

    @Test fun accountBudgetRules() = runTest {
        val (repo, _) = open("merge-a.db")
        repo.ensureInitialized()
        val card = repo.saveAccount(Account(name = "카드", type = AccountType.LIABILITY, openingBalance = 0))
        val food = repo.snapshot().categories.first { it.name == "식비" }.id
        repo.saveBudget(budget())                    // 전체
        repo.saveBudget(budget(acc = card, warn = 90)) // 계좌 예산(전체와 구분)
        repo.saveBudget(budget(cat = food))
        for (bad in listOf(budget(acc = card), budget(cat = food, acc = card), budget(acc = 9999), budget(warn = 100)))
            try { repo.saveBudget(bad); fail("저장됨: $bad") } catch (_: FinanceException) {}
        // 지난 기간 예산 가져오기에도 계좌 예산·경고 비율이 따라온다
        val next = PeriodCalculator.next(p, 25)
        assertEquals(3, repo.copyBudgets(p, next))
        assertEquals(90, repo.snapshot().budgets.single { it.periodStart == next.start && it.accountId == card }.warnPercent)
    }

    @Test fun legacyLimitsBecomeBudgets() = runTest {
        val (repo, db) = open("merge-b.db")
        repo.ensureInitialized()
        val card = repo.saveAccount(Account(name = "카드", type = AccountType.LIABILITY, openingBalance = 0))
        val food = repo.snapshot().categories.first { it.name == "식비" }.id
        repo.saveBudget(budget(cat = food, amount = 400_000)) // 이미 있는 식비 예산: 금액은 두고 경고 비율만
        db.dao().insertLimits(listOf(
            SpendingLimitEntity(target = LimitTarget.CATEGORY, targetId = food, amount = 300_000, warnPercent = 70, active = true, createdAt = 0, updatedAt = 0),
            SpendingLimitEntity(target = LimitTarget.ACCOUNT, targetId = card, amount = 500_000, warnPercent = 90, active = true, createdAt = 0, updatedAt = 0),
            SpendingLimitEntity(target = LimitTarget.ALL, targetId = null, amount = 1_500_000, warnPercent = 80, active = true, createdAt = 0, updatedAt = 0),
        ))
        assertEquals(3, repo.convertLegacyLimits())
        val b = repo.snapshot().budgets
        assertEquals(400_000L, b.single { it.categoryId == food }.amount)
        assertEquals(70, b.single { it.categoryId == food }.warnPercent)
        assertEquals(500_000L, b.single { it.accountId == card }.amount)
        assertEquals(1_500_000L, b.single { it.isOverall }.amount)
        assertEquals(0, db.dao().limits().size)

        // 예전 백업 파일의 "spendingLimits" 도 복원하면 예산이 된다
        val json = repo.exportBackup("t").replace("\"summary\":", "\"spendingLimits\": [{\"id\": 1, \"target\": \"CATEGORY\", \"targetId\": " +
            repo.snapshot().categories.first { it.name == "교통" }.id + ", \"amount\": 50000, \"warnPercent\": 80}], \"summary\":")
        repo.restoreBackup(json)
        assertEquals(50_000L, repo.snapshot().budgets.single { it.categoryId == repo.snapshot().categories.first { c -> c.name == "교통" }.id }.amount)
    }
}
