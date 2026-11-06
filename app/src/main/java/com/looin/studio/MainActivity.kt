package com.looin.studio

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.media3.common.util.UnstableApi
import com.looin.studio.model.MediaType
import com.looin.studio.ui.EditorScreen
import com.looin.studio.ui.EditorViewModel
import com.looin.studio.ui.HomeScreen
import com.looin.studio.ui.LooinTheme

@UnstableApi
class MainActivity : ComponentActivity() {
    private val editor: EditorViewModel by viewModels()
    private var editing by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(0xFF0E0E10.toInt()),
            navigationBarStyle = SystemBarStyle.dark(0xFF0E0E10.toInt()),
        )
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) handleShare(intent)
        else editing = editor.mediaUri != null

        setContent {
            LooinTheme {
                if (editing && editor.mediaUri != null) {
                    EditorScreen(editor, onClose = { editor.close(); editing = false })
                } else {
                    HomeScreen(onOpen = { uri, type -> openEditor(uri, type) })
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShare(intent)
    }

    private fun openEditor(uri: Uri, type: MediaType) {
        editor.open(uri, type)
        editing = true
    }

    /** "Share to Looin Studio" from the gallery. */
    private fun handleShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        val uri = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_STREAM)
        uri ?: return
        val type = if (intent.type?.startsWith("video") == true) MediaType.VIDEO else MediaType.PHOTO
        openEditor(uri, type)
    }
}
