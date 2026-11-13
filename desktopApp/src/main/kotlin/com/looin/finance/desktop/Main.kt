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
    val db = FinanceDatabase.build(FinanceDatabase.defaultDesktopFile())
    val repo = FinanceRepository(db)
    application {
        Window(
            onCloseRequest = { db.close(); exitApplication() },
            title = "루인 가계부",
            icon = painterResource("icon.png"),
            state = rememberWindowState(size = DpSize(460.dp, 900.dp)),
        ) {
            window.minimumSize = java.awt.Dimension(380, 600)
            val vm = remember { MainViewModel(repo) }
            DesktopRoot(vm, remember { DesktopFileActions(window) })
        }
    }
}

/**
 * PC 화면: 공용 화면을 그대로 쓰되, 창이 넓으면 가운데에 휴대폰 폭(최대 560dp)으로 보여 준다.
 * (넓은 창 두 칸 배치는 로드맵 3단계)
 */
@Composable
fun DesktopRoot(vm: MainViewModel, files: FileActions) {
    LooinTheme {
        CompositionLocalProvider(
            LocalAppInfo provides AppInfo(appVersion, AppPlatform.DESKTOP),
            LocalFileActions provides files,
        ) {
            Box(Modifier.fillMaxSize().background(Looin.colors.bg), contentAlignment = Alignment.TopCenter) {
                Box(Modifier.widthIn(max = 560.dp).fillMaxWidth().fillMaxHeight()) {
                    LooinAppRoot(vm)
                }
            }
        }
    }
}
