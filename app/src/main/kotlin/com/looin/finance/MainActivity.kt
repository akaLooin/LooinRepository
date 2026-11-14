package com.looin.finance

import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.looin.finance.ui.LooinAppRoot
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.platform.AndroidKeyValueStore
import com.looin.finance.ui.platform.AppInfo
import com.looin.finance.ui.platform.AppPlatform
import com.looin.finance.ui.platform.LocalAppInfo
import com.looin.finance.ui.platform.LocalFileActions
import com.looin.finance.ui.platform.LocalReminderControl
import com.looin.finance.reminder.rememberAndroidReminderControl
import com.looin.finance.ui.platform.rememberAndroidFileActions
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.theme.ThemePrefs
import com.looin.finance.ui.security.AppLock
import com.looin.finance.ui.security.LocalBiometric
import com.looin.finance.security.AndroidBiometric

/** Android 진입점: 공용 화면([LooinAppRoot])에 Android 구현(설정 저장소·파일 선택·시스템 바)을 연결한다. */
class MainActivity : FragmentActivity() { // 생체 인증 창(BiometricPrompt)은 FragmentActivity 가 필요
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ThemePrefs.init(AndroidKeyValueStore(this))
        // 앱 잠금: 프로세스마다 한 번만 초기화(화면 회전으로는 잠금이 풀리거나 다시 걸리지 않고,
        // 시스템이 앱을 정리했다가 다시 열면 새 프로세스라 잠근 상태로 시작한다)
        if (!AppLock.initialized) AppLock.init(AndroidKeyValueStore(this))
        val biometric = AndroidBiometric(this)
        val repo = (application as LooinApp).repository
        setContent {
            LooinTheme {
                val dark = Looin.colors.isDark
                LaunchedEffect(dark) {
                    val style = if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                    else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
                    enableEdgeToEdge(style, style)
                }
                val vm: MainViewModel = viewModel(factory = viewModelFactory { initializer { MainViewModel(repo) } })
                CompositionLocalProvider(
                    LocalAppInfo provides AppInfo(BuildConfig.VERSION_NAME, AppPlatform.ANDROID),
                    LocalFileActions provides rememberAndroidFileActions(),
                    LocalReminderControl provides rememberAndroidReminderControl(),
                    LocalBiometric provides biometric,
                ) {
                    LooinAppRoot(vm)
                }
            }
        }
    }
}
