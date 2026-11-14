package com.looin.finance.data

import androidx.room.testing.MigrationTestHelper
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.looin.finance.core.calc.BalanceCalculator
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** v1(Phase 1) 사용자의 데이터가 v2(반복 거래 추가)로 올라가도 그대로 남는지 확인. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MigrationTest {
    private val name = "migration-test.db"

    @get:Rule val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FinanceDatabase::class.java)

    /** v1 스키마에 계좌·카테고리·거래를 넣은 뒤 v2 로 올리고, 앱 저장소로 다시 읽는다. */
    @Test fun v1DataSurvivesUpgradeToV2() = runTest {
        helper.createDatabase(name, 1).apply {
            val day = LocalDate(2026, 11, 1).toEpochDays()
            execSQL("INSERT INTO settings (id, payday_day, primary_basis) VALUES (1, 25, 'CALENDAR')")
            execSQL("INSERT INTO categories (id, name, kind, color_argb, sort_order, archived) VALUES (1, '식비', 'EXPENSE', 0, 0, 0)")
            execSQL("INSERT INTO accounts (id, name, type, currency, opening_balance, include_in_available, archived, memo, sort_order, rate_to_krw_x10000, created_at, updated_at) " +
                "VALUES (1, '주거래', 'CHECKING', 'KRW', 1000000, 1, 0, '', 0, NULL, 0, 0)")
            execSQL("INSERT INTO transactions (id, type, status, amount, currency, date, completed_date, from_account_id, to_account_id, category_id, memo, source, linked_planned_id, to_amount, created_at, updated_at) " +
                "VALUES (1, 'EXPENSE', 'COMPLETED', 30000, 'KRW', $day, $day, 1, NULL, 1, '점심', 'MANUAL', NULL, NULL, 0, 0)")
            close()
        }
        // 스키마 검증 포함 마이그레이션 실행
        helper.runMigrationsAndValidate(name, 2, true).close()

        val db = FinanceDatabase.build(ApplicationProvider.getApplicationContext(), name)
        try {
            val repo = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 13) })
            val s = repo.snapshot()
            assertEquals(1, s.transactions.size)
            assertEquals("점심", s.transactions[0].memo)
            assertNull(s.transactions[0].recurringId)
            assertEquals(970_000, BalanceCalculator.actualBalance(s.accounts[0], s.transactions))
            assertEquals(0, s.rules.size)
        } finally {
            db.close()
        }
    }

    /** v2(반복 거래) → v3(저축 목표): 기존 데이터 유지, 새 테이블은 비어 있음 */
    @Test fun v2DataSurvivesUpgradeToV3() = runTest {
        val n = "migration-v2.db"
        helper.createDatabase(n, 2).apply {
            val day = LocalDate(2026, 11, 1).toEpochDays()
            execSQL("INSERT INTO settings (id, payday_day, primary_basis) VALUES (1, 25, 'CALENDAR')")
            execSQL("INSERT INTO accounts (id, name, type, currency, opening_balance, include_in_available, archived, memo, sort_order, rate_to_krw_x10000, created_at, updated_at) " +
                "VALUES (1, '주거래', 'CHECKING', 'KRW', 500000, 1, 0, '', 0, NULL, 0, 0)")
            execSQL("INSERT INTO recurring_rules (id, name, type, amount, currency, from_account_id, to_account_id, category_id, frequency, interval, day_of_month, day_of_week, start_date, end_date, active, generated_through, memo, created_at, updated_at) " +
                "VALUES (1, '월세', 'EXPENSE', 300000, 'KRW', 1, NULL, NULL, 'MONTHLY', 1, 25, NULL, $day, NULL, 1, NULL, '', 0, 0)")
            close()
        }
        helper.runMigrationsAndValidate(n, 3, true).close()
        val db = FinanceDatabase.build(ApplicationProvider.getApplicationContext(), n)
        try {
            val s = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 13) }).snapshot()
            assertEquals("월세", s.rules.single().name)
            assertEquals(500_000, s.accounts.single().openingBalance)
            assertEquals(0, s.goals.size)
        } finally {
            db.close()
        }
    }

    /** v3 → v4(자동이체 열): 기존 규칙은 자동이체 꺼짐으로 남는다 */
    @Test fun v3RulesGetAutopayOff() = runTest {
        val n = "migration-v3.db"
        helper.createDatabase(n, 3).apply {
            val day = LocalDate(2026, 11, 1).toEpochDays()
            execSQL("INSERT INTO settings (id, payday_day, primary_basis) VALUES (1, 25, 'CALENDAR')")
            execSQL("INSERT INTO accounts (id, name, type, currency, opening_balance, include_in_available, archived, memo, sort_order, rate_to_krw_x10000, created_at, updated_at) " +
                "VALUES (1, '주거래', 'CHECKING', 'KRW', 500000, 1, 0, '', 0, NULL, 0, 0)")
            execSQL("INSERT INTO recurring_rules (id, name, type, amount, currency, from_account_id, to_account_id, category_id, frequency, interval, day_of_month, day_of_week, start_date, end_date, active, generated_through, memo, created_at, updated_at) " +
                "VALUES (1, '통신비', 'EXPENSE', 55000, 'KRW', 1, NULL, NULL, 'MONTHLY', 1, 20, NULL, $day, NULL, 1, NULL, '', 0, 0)")
            close()
        }
        helper.runMigrationsAndValidate(n, 4, true).close()
        val db = FinanceDatabase.build(ApplicationProvider.getApplicationContext(), n)
        try {
            val rule = FinanceRepository(db, now = { 1 }, today = { LocalDate(2026, 11, 13) }).snapshot().rules.single()
            assertEquals("통신비", rule.name)
            assertEquals(false, rule.autoComplete)
        } finally {
            db.close()
        }
    }
}
