package com.looin.finance.data

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** PC: 파일 DB 가 앱 재시작(다시 열기) 후에도 유지되고, 기본 저장 위치가 OS 관례를 따르는지. */
class DesktopFileDatabaseTest {
    @Test fun dataSurvivesReopenOnDesktop() = runTest {
        val dir = Files.createTempDirectory("looin").toFile()
        val file = File(dir, "nested/looin_finance.db")
        var db = FinanceDatabase.build(file)
        FinanceRepository(db, today = { LocalDate(2026, 11, 13) }).apply {
            ensureInitialized()
            saveAccount(Account(name = "PC 통장", type = AccountType.CHECKING, openingBalance = 123_456))
        }
        db.close()
        assertTrue(file.exists())

        db = FinanceDatabase.build(file)
        val s = FinanceRepository(db).snapshot()
        db.close()
        assertEquals("PC 통장", s.accounts.single().name)
        assertEquals(123_456, s.accounts.single().openingBalance)
        dir.deleteRecursively()
    }

    @Test fun defaultFileLocation() {
        val f = FinanceDatabase.defaultDesktopFile()
        assertEquals(FinanceDatabase.NAME, f.name)
        assertTrue(f.parentFile.path.contains("looin", ignoreCase = true))
    }
}
