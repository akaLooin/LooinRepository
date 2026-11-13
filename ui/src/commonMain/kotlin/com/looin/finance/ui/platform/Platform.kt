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
    fun saveText(suggestedName: String, onTarget: (write: (String) -> Unit) -> Unit)
    fun openText(onSource: (read: () -> String) -> Unit)
}

object NoFileActions : FileActions {
    override fun saveText(suggestedName: String, onTarget: ((String) -> Unit) -> Unit) = Unit
    override fun openText(onSource: (() -> String) -> Unit) = Unit
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

enum class AppPlatform(val label: String) { ANDROID("Android"), DESKTOP("PC"), IOS("iOS") }

data class AppInfo(val versionName: String, val platform: AppPlatform)

val LocalAppInfo = staticCompositionLocalOf { AppInfo("dev", AppPlatform.ANDROID) }
val LocalFileActions = staticCompositionLocalOf<FileActions> { NoFileActions }
val LocalReminderControl = staticCompositionLocalOf<ReminderControl> { NoReminders }
