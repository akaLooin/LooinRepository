package com.looin.finance.backup

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.documentfile.provider.DocumentFile
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.looin.finance.BuildConfig
import com.looin.finance.LooinApp
import com.looin.finance.ui.platform.AndroidKeyValueStore
import com.looin.finance.ui.platform.AutoBackupControl
import com.looin.finance.ui.theme.ThemePrefs
import java.util.concurrent.TimeUnit
import kotlinx.datetime.LocalDate

/** 백업 파일을 쓸 폴더(실제: 사용자가 고른 문서 폴더, 테스트: 일반 폴더). */
interface BackupFolder {
    fun names(): List<String>
    fun write(name: String, text: String)
    fun delete(name: String)
}

/** Android 저장소 접근 프레임워크 폴더(구글 드라이브·기기 저장공간 등). */
class DocumentTreeFolder(private val context: Context, uri: Uri) : BackupFolder {
    private val dir = DocumentFile.fromTreeUri(context, uri) ?: error("폴더를 열 수 없습니다")
    override fun names() = dir.listFiles().mapNotNull { it.name }
    override fun write(name: String, text: String) {
        val file = dir.findFile(name) ?: dir.createFile("application/json", name) ?: error("파일을 만들 수 없습니다")
        context.contentResolver.openOutputStream(file.uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) }
    }
    override fun delete(name: String) { dir.findFile(name)?.delete() }
}

/**
 * 자동 백업: 사용자가 고른 폴더에 일주일마다 백업 파일(JSON, 수동 백업과 같은 형식)을 쓴다.
 *  - 파일 이름 `looin-auto-날짜.json`, 같은 날 다시 쓰면 덮어씀
 *  - 최근 [KEEP]개만 남기고 오래된 자동 백업은 지운다(직접 만든 백업 파일은 건드리지 않음)
 *  - 성공하면 백업 알림 기준일(마지막 백업)을 갱신
 */
object AutoBackup {
    const val WORK_NAME = "auto-backup"
    const val WORK_NOW = "auto-backup-now"
    const val KEEP = 5
    private const val PREFIX = "looin-auto-"

    /** 테스트에서 폴더를 바꿔 끼우기 위한 연결점. */
    var folderFor: (Context, Uri) -> BackupFolder = { c, u -> DocumentTreeFolder(c, u) }

    fun fileName(day: LocalDate) = "$PREFIX$day.json"

    /** 지울 자동 백업 파일(이름 = 날짜라 이름순 = 날짜순). */
    fun toDelete(names: List<String>, keep: Int = KEEP): List<String> =
        names.filter { it.startsWith(PREFIX) && it.endsWith(".json") }.sortedDescending().drop(keep)

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences("autobackup", Context.MODE_PRIVATE)
    fun folderUri(c: Context): Uri? = prefs(c).getString("uri", null)?.let(Uri::parse)
    fun folderLabel(c: Context): String? = prefs(c).getString("label", null)
    fun lastResult(c: Context): String? = prefs(c).getString("result", null)

    fun setFolder(c: Context, uri: Uri) {
        runCatching {
            c.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        val label = runCatching { DocumentFile.fromTreeUri(c, uri)?.name }.getOrNull() ?: "선택한 폴더"
        prefs(c).edit().putString("uri", uri.toString()).putString("label", label).apply()
        val weekly = PeriodicWorkRequestBuilder<AutoBackupWorker>(7, TimeUnit.DAYS)
            .setConstraints(Constraints.Builder().setRequiresBatteryNotLow(true).build()).build()
        WorkManager.getInstance(c).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, weekly)
        runNow(c) // 고르자마자 한 번 써서 제대로 되는지 바로 보여 준다
    }

    fun runNow(c: Context) {
        WorkManager.getInstance(c).enqueueUniqueWork(WORK_NOW, ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<AutoBackupWorker>().build())
    }

    fun disable(c: Context) {
        folderUri(c)?.let { u ->
            runCatching { c.contentResolver.releasePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) }
        }
        prefs(c).edit().clear().apply()
        WorkManager.getInstance(c).cancelUniqueWork(WORK_NAME)
    }

    internal fun recordResult(c: Context, text: String) = prefs(c).edit().putString("result", text).apply()
}

class AutoBackupWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val uri = AutoBackup.folderUri(ctx) ?: return Result.success() // 꺼져 있음
        val repo = (ctx as LooinApp).repository
        val today = repo.today()
        return try {
            val folder = AutoBackup.folderFor(ctx, uri)
            folder.write(AutoBackup.fileName(today), repo.exportBackup("${BuildConfig.VERSION_NAME} (Android 자동 백업)"))
            AutoBackup.toDelete(folder.names()).forEach { runCatching { folder.delete(it) } }
            AutoBackup.recordResult(ctx, "${today.month.ordinal + 1}월 ${today.day}일 저장함")
            // 백업 알림 기준일: 기기 설정에 쓰고, 화면이 떠 있으면 바로 반영
            AndroidKeyValueStore(ctx).put("backup.last", today.toEpochDays().toString())
            ThemePrefs.recordBackup(today.toEpochDays())
            Result.success()
        } catch (e: Exception) {
            AutoBackup.recordResult(ctx, "실패: ${e.message ?: "폴더에 쓸 수 없음"} · 폴더를 다시 골라 주세요")
            Result.failure()
        }
    }
}

/** 설정 화면의 자동 백업: 켜면 폴더 선택 화면을 띄운다. */
@Composable
fun rememberAndroidAutoBackup(): AutoBackupControl {
    val context = LocalContext.current
    val state = remember { AutoBackupState(AutoBackup.folderLabel(context), AutoBackup.lastResult(context)) }
    val refresh = { state.label = AutoBackup.folderLabel(context); state.result = AutoBackup.lastResult(context) }
    // 백업 작업이 끝나면 결과 문구를 새로 읽는다
    LaunchedEffect(Unit) {
        // WorkManager 를 쓸 수 없는 환경(일부 테스트)에서도 화면은 그대로 뜨게 한다
        val wm = runCatching { WorkManager.getInstance(context) }.getOrNull() ?: return@LaunchedEffect
        wm.getWorkInfosForUniqueWorkFlow(AutoBackup.WORK_NOW).collect { refresh() }
    }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) { AutoBackup.setFolder(context, uri); refresh() }
    }
    return remember(pick) {
        object : AutoBackupControl {
            override val supported = true
            override val folderLabel get() = state.label
            override val lastResult get() = state.result
            override fun chooseFolder() = pick.launch(null)
            override fun disable() { AutoBackup.disable(context); refresh() }
            override fun runNow() { AutoBackup.runNow(context); state.result = "저장하는 중…" }
        }
    }
}

private class AutoBackupState(label: String?, result: String?) {
    var label by mutableStateOf(label)
    var result by mutableStateOf(result)
}
