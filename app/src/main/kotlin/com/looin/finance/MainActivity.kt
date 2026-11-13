package com.looin.finance

import android.os.Bundle
import androidx.activity.ComponentActivity
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
import com.looin.finance.ui.platform.rememberAndroidFileActions
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.theme.ThemePrefs

/** Android 진입점: 공용 화면([LooinAppRoot])에 Android 구현(설정 저장소·파일 선택·시스템 바)을 연결한다. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ThemePrefs.init(AndroidKeyValueStore(this))
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
                ) {
                    LooinAppRoot(vm)
                }
            }
        }
    }
}
