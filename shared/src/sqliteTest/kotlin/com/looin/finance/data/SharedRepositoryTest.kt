package com.looin.finance.data

import com.looin.finance.core.calc.BalanceCalculator
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * PC(JVM)·iOS 공용 저장소 시나리오. 번들 SQLite 위에서 Room KMP 트랜잭션·마이그레이션 없는 새 DB·백업을 검증한다.
 * (Android 는 app 모듈의 Robolectric 테스트가 같은 저장소 코드를 검증)
 */
class SharedRepositoryTest {
    private val today = LocalDate(2026, 11, 13)
    private val opened = mutableListOf<FinanceDatabase>()
    private fun repo(): FinanceRepository = FinanceRepository(testDatabase().also { opened += it }, now = { 1_000L }, today = { today })

    @AfterTest fun close() = opened.forEach { it.close() }

    private suspend fun FinanceRepository.setup(): Long {
        ensureInitialized()
        return saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true))
    }

    @Test fun seedSaveAndBalance() = runTest {
        val r = repo()
        r.ensureInitialized(); r.ensureInitialized()
        assertEquals(18, r.snapshot().categories.size)
        val acc = r.setup()
        val food = r.snapshot().categories.first { it.name == "식비" }.id
        r.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 10_000,
            date = today, completedDate = today, fromAccountId = acc, categoryId = food))
        val s = r.snapshot()
        assertEquals(990_000, BalanceCalculator.actualBalance(s.accountById.getValue(acc), s.transactions))
    }

    @Test fun failedTransactionRollsBackEverything() = runTest {
        val r = repo()
        val acc = r.setup()
        // 0원 거래는 검증 오류 → 아무것도 저장되지 않음
        assertFailsWith<FinanceException> {
            r.saveTransaction(Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 0, date = today, fromAccountId = acc))
        }
        // 잘못된 규칙도 저장되지 않음(규칙 저장 → 반복 생성 중첩 트랜잭션 포함)
        assertFailsWith<FinanceException> {
            r.saveRule(RecurringRule(name = "월세", type = TransactionType.EXPENSE, amount = 1, fromAccountId = 999,
                frequency = Frequency.MONTHLY, dayOfMonth = 25, startDate = today))
        }
        val s = r.snapshot()
        assertTrue(s.transactions.isEmpty())
        assertTrue(s.rules.isEmpty())
    }

    @Test fun recurringGenerationIsIdempotentWithNestedTransactions() = runTest {
        val r = repo()
        val acc = r.setup()
        r.saveRule(RecurringRule(name = "월세", type = TransactionType.EXPENSE, amount = 500_000, fromAccountId = acc,
            frequency = Frequency.MONTHLY, dayOfMonth = 31, startDate = today))
        assertEquals(listOf(LocalDate(2026, 11, 30), LocalDate(2026, 12, 31)), r.snapshot().transactions.map { it.date }.sorted())
        assertEquals(0, r.generateRecurring())
        assertEquals(2, r.snapshot().transactions.size)
    }

    @Test fun backupRoundTripBetweenDatabases() = runTest {
        val a = repo()
        val acc = a.setup()
        a.saveRule(RecurringRule(name = "월세", type = TransactionType.EXPENSE, amount = 500_000, fromAccountId = acc,
            frequency = Frequency.MONTHLY, dayOfMonth = 25, startDate = today))
        val json = a.exportBackup("test")
        val original = a.snapshot()

        val b = repo()
        b.ensureInitialized()
        b.restoreBackup(json)
        val restored = b.snapshot()
        assertEquals(original.accounts, restored.accounts)
        assertEquals(original.transactions.sortedBy { it.id }, restored.transactions.sortedBy { it.id })
        assertEquals(original.rules, restored.rules)
        assertEquals(0, b.generateRecurring())

        // 손상된 파일은 거부하고 기존 데이터 유지
        assertFailsWith<FinanceException> { b.restoreBackup(json.replace("\"openingBalance\": 1000000", "\"openingBalance\": 1")) }
        assertEquals(restored, b.snapshot())
    }

    /** 1.0.0(Android, org.json)으로 만든 백업 파일 모양: 들여쓰기 2칸, 키 순서 다름, 반복 규칙 항목 없음. */
    @Test fun readsLegacyAndroidBackupFormat() = runTest {
        val legacy = """
            {
              "summary": {"transactions": 1, "accounts": 1, "categories": 1, "budgets": 0, "openingBalanceSum": 500000, "transactionAmountSum": 12000},
              "formatVersion": 1,
              "exportedAt": 1763000000000,
              "format": "looin-finance-backup",
              "appVersion": "0.2.0",
              "settings": {"primaryBasis": "PAYDAY", "paydayDay": 25},
              "categories": [{"kind": "EXPENSE", "id": 1, "name": "식비", "colorArgb": 4293227379, "sortOrder": 0, "archived": false}],
              "accounts": [{"id": 1, "name": "통장", "type": "CHECKING", "currency": "KRW", "openingBalance": 500000,
                "includeInAvailable": true, "archived": false, "memo": "", "sortOrder": 0, "createdAt": 0, "updatedAt": 0}],
              "transactions": [{"id": 7, "type": "EXPENSE", "status": "COMPLETED", "amount": 12000, "currency": "KRW",
                "date": "2026-11-03", "completedDate": "2026-11-03", "fromAccountId": 1, "categoryId": 1, "memo": "점심",
                "source": "MANUAL", "createdAt": 0, "updatedAt": 0}],
              "budgets": []
            }
        """.trimIndent()
        val r = repo()
        r.ensureInitialized()
        val summary = r.restoreBackup(legacy)
        assertEquals(1, summary.transactions)
        val s = r.snapshot()
        assertEquals("점심", s.transactions.single().memo)
        assertEquals(25, s.settings.paydayDay)
        assertEquals(488_000, BalanceCalculator.actualBalance(s.accounts.single(), s.transactions))
    }
}
