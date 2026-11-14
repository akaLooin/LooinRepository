package com.looin.finance.backup

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import com.looin.finance.LooinApp
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.LocalDate
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import java.nio.file.Files

/** 일반 폴더로 바꿔 끼운 자동 백업: 오늘 파일을 쓰고, 오래된 자동 백업만 지우고, 직접 만든 백업은 그대로. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AutoBackupTest {
    private val app = ApplicationProvider.getApplicationContext<LooinApp>()
    private val dir: File = Files.createTempDirectory("autobackup").toFile()

    private class DirFolder(val dir: File) : BackupFolder {
        override fun names() = dir.list()!!.toList()
        override fun write(name: String, text: String) = File(dir, name).writeText(text)
        override fun delete(name: String) { File(dir, name).delete() }
    }

    @After fun tearDown() {
        dir.deleteRecursively()
        AutoBackup.folderFor = { c, u -> DocumentTreeFolder(c, u) }
    }

    private fun turnOn() =
        app.getSharedPreferences("autobackup", Context.MODE_PRIVATE).edit().putString("uri", "content://test/tree").commit()

    @Test fun fileNamesAndRotation() {
        assertEquals("looin-auto-2026-11-14.json", AutoBackup.fileName(LocalDate(2026, 11, 14)))
        val names = (1..7).map { "looin-auto-2026-11-0$it.json" } + "looin-backup-2026-10-01.json"
        assertEquals(listOf("looin-auto-2026-11-02.json", "looin-auto-2026-11-01.json"), AutoBackup.toDelete(names))
    }

    @Test fun workerWritesTodayAndKeepsFive() = runBlocking {
        app.repository.ensureInitialized()
        app.repository.saveAccount(Account(name = "주거래", type = AccountType.CHECKING, openingBalance = 123_000, includeInAvailable = true))
        (1..6).forEach { File(dir, "looin-auto-2026-10-0$it.json").writeText("{}") }
        File(dir, "looin-backup-2026-09-01.json").writeText("{}") // 직접 만든 백업
        turnOn()
        AutoBackup.folderFor = { _, _ -> DirFolder(dir) }

        val result = TestListenableWorkerBuilder<AutoBackupWorker>(app).build().doWork()
        assertEquals(ListenableWorker.Result.success(), result)
        val today = app.repository.today()
        val names = dir.list()!!.sorted()
        val auto = names.filter { it.startsWith("looin-auto-") }
        assertEquals(5, auto.size)
        assertTrue(AutoBackup.fileName(today) in auto)
        assertTrue("looin-backup-2026-09-01.json" in names)
        // 쓴 파일은 그대로 복원할 수 있는 백업이다
        assertTrue(File(dir, AutoBackup.fileName(today)).readText().contains("123000"))
        assertTrue(AutoBackup.lastResult(app)!!.contains("저장함"))
    }

    @Test fun failureIsReported() = runBlocking {
        turnOn()
        AutoBackup.folderFor = { _, _ -> error("권한이 없습니다") }
        val result = TestListenableWorkerBuilder<AutoBackupWorker>(app).build().doWork()
        assertEquals(ListenableWorker.Result.failure(), result)
        assertTrue(AutoBackup.lastResult(app)!!.startsWith("실패"))
    }
}
