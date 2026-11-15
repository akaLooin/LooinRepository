package com.looin.finance.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.looin.finance.core.limit.LimitTarget
import com.looin.finance.core.limit.SpendingLimit
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 지출 한도 저장 규칙, 백업·복원, 카테고리 삭제 시 함께 삭제. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SpendingLimitRepoTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val opened = mutableListOf<FinanceDatabase>()
    private fun open(name: String): FinanceRepository {
        context.deleteDatabase(name)
        return FinanceRepository(FinanceDatabase.build(context, name).also { opened += it }, now = { 1 }, today = { LocalDate(2026, 11, 15) })
    }
    @After fun tearDown() { opened.forEach { it.close() }; listOf("lim-a.db", "lim-b.db").forEach { context.deleteDatabase(it) } }

    @Test fun saveRulesBackupAndCategoryDelete() = runTest {
        val repo = open("lim-a.db")
        repo.ensureInitialized()
        val card = repo.saveAccount(Account(name = "카드", type = AccountType.LIABILITY, openingBalance = 0))
        val food = repo.snapshot().categories.first { it.name == "식비" }.id
        repo.saveLimit(SpendingLimit(target = LimitTarget.ALL, amount = 1_500_000))
        val foodLimit = repo.saveLimit(SpendingLimit(target = LimitTarget.CATEGORY, targetId = food, amount = 300_000, warnPercent = 70))
        repo.saveLimit(SpendingLimit(target = LimitTarget.ACCOUNT, targetId = card, amount = 500_000))
        // 같은 대상에 두 번째 한도는 안 됨, 없는 대상·잘못된 값도 안 됨
        for (bad in listOf(
            SpendingLimit(target = LimitTarget.CATEGORY, targetId = food, amount = 1),
            SpendingLimit(target = LimitTarget.CATEGORY, targetId = 9999, amount = 1),
            SpendingLimit(target = LimitTarget.ACCOUNT, targetId = null, amount = 1),
            SpendingLimit(target = LimitTarget.ACCOUNT, targetId = card, amount = 0),
        )) try { repo.saveLimit(bad); fail("저장됨: $bad") } catch (_: FinanceException) {}
        // 고치기
        repo.saveLimit(repo.snapshot().limits.first { it.id == foodLimit }.copy(amount = 350_000))
        assertEquals(350_000L, repo.snapshot().limits.first { it.id == foodLimit }.amount)

        // 백업 → 다른 DB 복원: 한도 그대로
        val other = open("lim-b.db")
        other.ensureInitialized()
        other.restoreBackup(repo.exportBackup("test"))
        assertEquals(repo.snapshot().limits, other.snapshot().limits)

        // 카테고리를 지우면 그 카테고리 한도도 삭제
        repo.deleteCategory(food)
        assertTrue(repo.snapshot().limits.none { it.target == LimitTarget.CATEGORY })
        assertEquals(2, repo.snapshot().limits.size)
    }
}
