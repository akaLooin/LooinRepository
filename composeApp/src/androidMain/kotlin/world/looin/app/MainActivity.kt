package world.looin.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private var controller: AppController? = null
    private var openInboxPending = false
    private var openNoticesPending = false

    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppSettings.init(applicationContext)
        enableEdgeToEdge()
        openInboxPending = intent?.getBooleanExtra(InboxWorker.EXTRA_OPEN_INBOX, false) == true
        openNoticesPending = intent?.getBooleanExtra(InboxWorker.EXTRA_OPEN_NOTICES, false) == true
        // 상세 화면이 열려 있으면 뒤로가기는 앱 안에서 처리한다.
        val back = object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() { controller?.pop() }
        }
        onBackPressedDispatcher.addCallback(this, back)
        setContent {
            App(onBackAvailable = { back.isEnabled = it }, controllerOut = { c ->
                controller = c
                if (openInboxPending) { openInboxPending = false; c.openInboxRequested = true }
                if (openNoticesPending) { openNoticesPending = false; c.openNoticesRequested = true }
            })
        }
        // 아카엘이 먼저 말을 걸면 알림으로 알려주기
        if (Build.VERSION.SDK_INT >= 33) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        InboxWorker.schedule(applicationContext)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(InboxWorker.EXTRA_OPEN_NOTICES, false)) {
            controller?.let { it.refreshNotices(); it.openNoticesRequested = true } ?: run { openNoticesPending = true }
        }
        if (intent.getBooleanExtra(InboxWorker.EXTRA_OPEN_INBOX, false)) {
            controller?.let { it.refreshInbox(); it.openInboxRequested = true } ?: run { openInboxPending = true }
        }
    }
}
