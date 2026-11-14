package com.looin.finance.desktop

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.data.defaultDesktopFile
import com.looin.finance.ui.LooinAppRoot
import com.looin.finance.ui.AppCommand
import com.looin.finance.ui.SHORTCUT_MOD
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.platform.AppInfo
import com.looin.finance.ui.platform.AppPlatform
import com.looin.finance.ui.platform.DesktopFileActions
import com.looin.finance.ui.platform.DesktopKeyValueStore
import com.looin.finance.ui.platform.FileActions
import com.looin.finance.ui.platform.LocalAppInfo
import com.looin.finance.ui.platform.LocalFileActions
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.theme.ThemePrefs

/** 설치 패키지가 넣어 주는 버전(jpackage). 개발 실행 시에는 "dev". */
val appVersion: String = System.getProperty("jpackage.app-version") ?: "dev"

fun main() {
    ThemePrefs.init(DesktopKeyValueStore())
    com.looin.finance.ui.security.AppLock.init(DesktopKeyValueStore())
    val db = FinanceDatabase.build(FinanceDatabase.defaultDesktopFile())
    val repo = FinanceRepository(db)
    val commands = MutableSharedFlow<AppCommand>(extraBufferCapacity = 8)
    if (isMac) SHORTCUT_MOD = "⌘"
    application {
        Window(
            onCloseRequest = { db.close(); exitApplication() },
            title = "루인 가계부",
            icon = painterResource("icon.png"),
            state = rememberWindowState(size = DpSize(1240.dp, 840.dp)),
            onPreviewKeyEvent = { e -> shortcut(e)?.let { commands.tryEmit(it); true } ?: false },
        ) {
            window.minimumSize = java.awt.Dimension(380, 600)
            val vm = remember { MainViewModel(repo) }
            DesktopRoot(vm, remember { DesktopFileActions(window) }, commands)
        }
    }
}

private val isMac = System.getProperty("os.name").orEmpty().lowercase().contains("mac")

/**
 * PC 단축키: Ctrl(macOS 는 ⌘)+N 새 거래, +F 검색, +, 설정, +1~5 탭, Esc 뒤로.
 * 글자 입력 중에도 Ctrl 조합만 가로채므로 일반 타이핑은 막지 않는다.
 */
fun shortcut(e: KeyEvent): AppCommand? {
    if (e.type != KeyEventType.KeyDown) return null
    if (e.key == Key.Escape) return AppCommand.BACK
    val mod = if (isMac) e.isMetaPressed else e.isCtrlPressed
    if (!mod) return null
    return when (e.key) {
        Key.N -> AppCommand.NEW_TRANSACTION
        Key.F -> AppCommand.SEARCH
        Key.Comma -> AppCommand.SETTINGS
        Key.One -> AppCommand.TAB_HOME
        Key.Two -> AppCommand.TAB_CALENDAR
        Key.Three -> AppCommand.TAB_PLAN
        Key.Four -> AppCommand.TAB_ASSETS
        Key.Five -> AppCommand.TAB_ANALYSIS
        else -> null
    }
}

/**
 * PC 화면: 창 폭에 맞춘다. 넓으면(840dp 이상) 사이드바 + 두 칸, 좁게 줄이면 휴대폰 배치.
 */
@Composable
fun DesktopRoot(vm: MainViewModel, files: FileActions, commands: Flow<AppCommand>? = null) {
    LooinTheme {
        CompositionLocalProvider(
            LocalAppInfo provides AppInfo(appVersion, AppPlatform.DESKTOP),
            LocalFileActions provides files,
        ) {
            Box(Modifier.fillMaxSize().background(Looin.colors.bg)) {
                LooinAppRoot(vm, commands)
            }
        }
    }
}
