package world.looin.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import java.awt.FileDialog
import java.awt.Frame
import java.nio.file.Files

@Composable
actual fun rememberFilePicker(onPicked: (PickedFile?) -> Unit): () -> Unit {
    val callback by rememberUpdatedState(onPicked)
    return remember {
        {
            val dialog = FileDialog(null as Frame?, "파일 첨부", FileDialog.LOAD)
            dialog.isVisible = true
            val f = dialog.files.firstOrNull()
            callback(f?.let { PickedFile(it.name, runCatching { Files.probeContentType(it.toPath()) }.getOrNull() ?: "", it.readBytes()) })
        }
    }
}
