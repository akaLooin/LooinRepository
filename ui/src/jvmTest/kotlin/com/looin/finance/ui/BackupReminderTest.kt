package com.looin.finance.ui

import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.home.BackupReminder
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class BackupReminderTest {
    private val today = LocalDate(2026, 11, 14)
    private fun tx(d: LocalDate) = Transaction(type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = 1, date = d,
        completedDate = d, fromAccountId = 1)
    private val day = today.toEpochDays()

    @Test fun rules() {
        // 거래가 없으면 알리지 않음
        assertNull(BackupReminder.message(emptyList(), today, null, null))
        // 백업한 적 없음: 7일 이상 써야 알림
        assertNull(BackupReminder.message(listOf(tx(LocalDate(2026, 11, 10))), today, null, null))
        assertEquals("아직 백업 파일이 없어요", BackupReminder.message(listOf(tx(LocalDate(2026, 11, 7))), today, null, null))
        // 마지막 백업 후 30일
        assertNull(BackupReminder.message(listOf(tx(today)), today, day - 29, null))
        assertEquals("마지막 백업 후 30일이 지났어요", BackupReminder.message(listOf(tx(today)), today, day - 30, null))
        // 나중에: 미룬 날까지 숨김
        assertNull(BackupReminder.message(listOf(tx(today)), today, day - 40, day + 1))
        assertEquals("마지막 백업 후 40일이 지났어요", BackupReminder.message(listOf(tx(today)), today, day - 40, day))
    }
}
