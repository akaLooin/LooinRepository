package com.looin.finance.ui.platform

import androidx.compose.runtime.staticCompositionLocalOf

/**
 * 화면 코드가 플랫폼(Android·PC·iOS)에 따라 달라지는 부분. 각 앱 진입점이 구현을 넣어 준다.
 */

/** 기기별 작은 설정 저장소(화면 테마 등). Android: SharedPreferences, PC: java.util.prefs. */
interface KeyValueStore {
    fun get(key: String): String?
    fun put(key: String, value: String)
}

/** 메모리 저장소(테스트·미리보기용). */
class InMemoryKeyValueStore : KeyValueStore {
    private val map = mutableMapOf<String, String>()
    override fun get(key: String) = map[key]
    override fun put(key: String, value: String) { map[key] = value }
}

/**
 * 백업 파일 저장·열기. 사용자가 위치를 고르면 콜백으로 쓰기/읽기 함수를 넘겨준다(취소하면 호출 안 함).
 * 실제 입출력은 ViewModel 이 IO 스레드에서 호출한다.
 */
interface FileActions {
    fun saveText(suggestedName: String, kind: FileKind = FileKind.JSON, onTarget: (write: (String) -> Unit) -> Unit)
    fun openText(kind: FileKind = FileKind.JSON, onSource: (read: () -> String) -> Unit)
}

/** 파일 종류: 확장자와 MIME. 백업은 JSON, 거래 내보내기·가져오기는 CSV. */
enum class FileKind(val extension: String, val mime: String, val title: String) {
    JSON("json", "application/json", "백업 파일"),
    CSV("csv", "text/csv", "CSV 파일"),
}

object NoFileActions : FileActions {
    override fun saveText(suggestedName: String, kind: FileKind, onTarget: ((String) -> Unit) -> Unit) = Unit
    override fun openText(kind: FileKind, onSource: (() -> String) -> Unit) = Unit
}

/** 예정 거래 알림 켜기/끄기. 지원하지 않는 플랫폼(PC 등)은 [supported] = false 로 설정 항목을 숨긴다. */
interface ReminderControl {
    val supported: Boolean
    /** 켜져 있는지(화면 갱신용 상태). */
    val enabled: Boolean
    /** 권한이 거부되어 켤 수 없었는지. */
    val permissionDenied: Boolean
    fun setEnabled(on: Boolean)
}

object NoReminders : ReminderControl {
    override val supported = false
    override val enabled = false
    override val permissionDenied = false
    override fun setEnabled(on: Boolean) = Unit
}

/**
 * 자동 백업(Android): 사용자가 고른 폴더에 정기적으로 백업 파일을 쓴다. 지원하지 않으면 [supported] = false.
 */
interface AutoBackupControl {
    val supported: Boolean
    /** 고른 폴더 이름. null 이면 꺼짐. */
    val folderLabel: String?
    /** 마지막 실행 결과 문구(없으면 null). */
    val lastResult: String?
    fun chooseFolder()
    fun disable()
    fun runNow()
}

object NoAutoBackup : AutoBackupControl {
    override val supported = false
    override val folderLabel: String? = null
    override val lastResult: String? = null
    override fun chooseFolder() = Unit
    override fun disable() = Unit
    override fun runNow() = Unit
}

enum class AppPlatform(val label: String) { ANDROID("Android"), DESKTOP("PC"), IOS("iOS") }

data class AppInfo(val versionName: String, val platform: AppPlatform)

val LocalAppInfo = staticCompositionLocalOf { AppInfo("dev", AppPlatform.ANDROID) }
val LocalFileActions = staticCompositionLocalOf<FileActions> { NoFileActions }
val LocalReminderControl = staticCompositionLocalOf<ReminderControl> { NoReminders }
val LocalAutoBackup = staticCompositionLocalOf<AutoBackupControl> { NoAutoBackup }
