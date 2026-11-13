package com.looin.finance.ui.platform

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

class AndroidKeyValueStore(context: Context) : KeyValueStore {
    private val prefs = context.applicationContext.getSharedPreferences("ui", Context.MODE_PRIVATE)
    override fun get(key: String): String? = prefs.getString(key, null)
    override fun put(key: String, value: String) { prefs.edit().putString(key, value).apply() }
}

/** Android 저장소 접근 프레임워크(권한 불필요)로 백업 파일 저장·열기. */
@Composable
fun rememberAndroidFileActions(): FileActions {
    val resolver = LocalContext.current.contentResolver
    // 파일 선택 화면에서 돌아올 때 이어서 할 일. 재구성 사이에도 같은 객체를 쓰도록 remember 로 보관.
    val pending = remember { PendingFileCallbacks() }
    val save = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri: Uri? ->
        val cb = pending.save; pending.save = null
        if (uri != null && cb != null) cb { text -> resolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) } }
    }
    val open = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        val cb = pending.open; pending.open = null
        if (uri != null && cb != null) cb { resolver.openInputStream(uri)!!.use { it.readBytes().toString(Charsets.UTF_8) } }
    }
    return remember(save, open) {
        object : FileActions {
            override fun saveText(suggestedName: String, onTarget: ((String) -> Unit) -> Unit) {
                pending.save = onTarget; save.launch(suggestedName)
            }
            override fun openText(onSource: (() -> String) -> Unit) {
                pending.open = onSource; open.launch(arrayOf("application/json", "text/plain", "*/*"))
            }
        }
    }
}

private class PendingFileCallbacks {
    var save: (((String) -> Unit) -> Unit)? = null
    var open: ((() -> String) -> Unit)? = null
}
