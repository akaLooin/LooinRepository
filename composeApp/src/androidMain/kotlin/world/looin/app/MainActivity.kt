package world.looin.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    private var controller: AppController? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppSettings.init(applicationContext)
        enableEdgeToEdge()
        // 상세 화면이 열려 있으면 뒤로가기는 앱 안에서 처리한다.
        val back = object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() { controller?.pop() }
        }
        onBackPressedDispatcher.addCallback(this, back)
        setContent {
            App(onBackAvailable = { back.isEnabled = it }, controllerOut = { controller = it })
        }
    }
}
