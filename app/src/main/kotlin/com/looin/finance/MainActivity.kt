package com.looin.finance

import android.os.Bundle
import android.content.Intent
import com.looin.finance.shortcut.Shortcuts
import com.looin.finance.backup.rememberAndroidAutoBackup
import com.looin.finance.ui.platform.LocalAutoBackup
import com.looin.finance.ui.AppCommand
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
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
import com.looin.finance.ui.platform.LocalReceiptScanner
import com.looin.finance.receipt.ReceiptStore
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.looin.finance.receipt.rememberAndroidReceiptScanner
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
    /** 바로가기·위젯에서 온 명령. 화면이 받을 때까지 버퍼에 둔다. */
    private val commands = Channel<AppCommand>(Channel.BUFFERED)

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Shortcuts.commandOf(intent)?.let { commands.trySend(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Shortcuts.register(this)
        // 처음 열 때만(화면 회전 등으로 다시 만들어질 때 같은 명령을 또 실행하지 않게)
        if (savedInstanceState == null) Shortcuts.commandOf(intent)?.let { commands.trySend(it) }
        val commandFlow = commands.receiveAsFlow()
        ThemePrefs.init(AndroidKeyValueStore(this))
        com.looin.finance.ui.platform.ExchangeRates.init(AndroidKeyValueStore(this))
        // 앱 잠금: 프로세스마다 한 번만 초기화(화면 회전으로는 잠금이 풀리거나 다시 걸리지 않고,
        // 시스템이 앱을 정리했다가 다시 열면 새 프로세스라 잠근 상태로 시작한다)
        if (!AppLock.initialized) AppLock.init(AndroidKeyValueStore(this))
        val biometric = AndroidBiometric(this)
        val repo = (application as LooinApp).repository
        // 어떤 거래에도 붙어 있지 않은 영수증 사진 정리
        if (savedInstanceState == null) lifecycleScope.launch(Dispatchers.IO) {
            runCatching { ReceiptStore.cleanup(this@MainActivity, repo.snapshot().transactions.mapNotNull { it.attachment }.toSet()) }
        }
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
                    LocalAutoBackup provides rememberAndroidAutoBackup(),
                    LocalReceiptScanner provides rememberAndroidReceiptScanner(),
                ) {
                    LooinAppRoot(vm, commandFlow)
                }
            }
        }
    }
}
