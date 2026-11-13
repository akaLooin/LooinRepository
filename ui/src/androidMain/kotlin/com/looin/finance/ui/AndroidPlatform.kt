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
    // CreateDocument 는 MIME 을 만들 때 정하므로 종류마다 하나씩
    val onCreated = { uri: Uri? ->
        val cb = pending.save; pending.save = null
        if (uri != null && cb != null) cb { text -> resolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) } }
    }
    val saveJson = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(FileKind.JSON.mime), onCreated)
    val saveCsv = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(FileKind.CSV.mime), onCreated)
    val open = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        val cb = pending.open; pending.open = null
        if (uri != null && cb != null) cb { resolver.openInputStream(uri)!!.use { decodeKoreanText(it.readBytes()) } }
    }
    return remember(saveJson, saveCsv, open) {
        object : FileActions {
            override fun saveText(suggestedName: String, kind: FileKind, onTarget: ((String) -> Unit) -> Unit) {
                pending.save = onTarget
                (if (kind == FileKind.CSV) saveCsv else saveJson).launch(suggestedName)
            }
            override fun openText(kind: FileKind, onSource: (() -> String) -> Unit) {
                pending.open = onSource
                // 은행 앱·엑셀이 주는 CSV 는 MIME 이 제각각이라 넓게 받는다
                open.launch(if (kind == FileKind.CSV) arrayOf("text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel", "*/*")
                    else arrayOf("application/json", "text/plain", "*/*"))
            }
        }
    }
}

private class PendingFileCallbacks {
    var save: (((String) -> Unit) -> Unit)? = null
    var open: ((() -> String) -> Unit)? = null
}

/**
 * 텍스트 파일 바이트 → 문자열. UTF-8(BOM 포함)로 읽되, UTF-8 이 아니면
 * 한국 은행·엑셀 CSV 에 흔한 CP949(EUC-KR 확장)로 읽는다.
 */
internal fun decodeKoreanText(bytes: ByteArray): String {
    val utf8 = java.nio.charset.StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
        .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)
    return try {
        utf8.decode(java.nio.ByteBuffer.wrap(bytes)).toString()
    } catch (_: java.nio.charset.CharacterCodingException) {
        val cs = listOf("MS949", "x-windows-949", "windows-949", "EUC-KR")
            .firstNotNullOfOrNull { runCatching { java.nio.charset.Charset.forName(it) }.getOrNull() } ?: Charsets.UTF_8
        String(bytes, cs)
    }.removePrefix("\uFEFF")
}
