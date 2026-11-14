package com.looin.finance.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.looin.finance.ui.platform.IosReminderControl
import com.looin.finance.ui.platform.LocalReminderControl
import androidx.compose.ui.window.ComposeUIViewController
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.openDefaultDatabase
import com.looin.finance.ui.platform.AppInfo
import com.looin.finance.ui.platform.AppPlatform
import com.looin.finance.ui.platform.IosFileActions
import com.looin.finance.ui.platform.IosKeyValueStore
import com.looin.finance.ui.platform.LocalAppInfo
import com.looin.finance.ui.platform.LocalFileActions
import com.looin.finance.ui.security.AppLock
import com.looin.finance.ui.security.IosBiometric
import com.looin.finance.ui.security.LocalBiometric
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.theme.ThemePrefs
import platform.Foundation.NSBundle
import platform.UIKit.UIViewController

/** 앱 하나에 저장소 하나(DB 연결은 앱이 살아 있는 동안 유지). */
private val repository by lazy { FinanceRepository(openDefaultDatabase()) }

/**
 * iOS 진입점: Swift(iosApp/LooinBudget/LooinBudgetApp.swift)가 이 화면 컨트롤러를 띄운다.
 * Android·PC 와 같은 공용 화면([LooinAppRoot])에 iOS 구현(설정 저장소·파일 선택·Face ID)을 연결한다.
 * 예정 거래 알림은 미리 예약하는 로컬 알림([IosReminderControl]).
 */
@Suppress("FunctionName", "unused")
fun MainViewController(): UIViewController {
    val store = IosKeyValueStore()
    ThemePrefs.init(store)
    if (!AppLock.initialized) AppLock.init(store)
    val version = NSBundle.mainBundle.objectForInfoDictionaryKey("CFBundleShortVersionString") as? String ?: "dev"
    val files = IosFileActions()
    val biometric = IosBiometric()
    val reminders = IosReminderControl(store)
    return ComposeUIViewController {
        LooinTheme {
            val vm = remember { MainViewModel(repository) }
            // 데이터가 바뀌면 예정 거래 알림 예약을 새로 만든다
            val state by vm.state.collectAsState()
            LaunchedEffect(state.data, state.today) { if (state.data.loaded) reminders.reschedule(state.data, state.today) }
            CompositionLocalProvider(
                LocalAppInfo provides AppInfo(version, AppPlatform.IOS),
                LocalFileActions provides files,
                LocalBiometric provides biometric,
                LocalReminderControl provides reminders,
            ) {
                LooinAppRoot(vm)
            }
        }
    }
}
