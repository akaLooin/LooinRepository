package com.looin.finance.ui.platform

import java.awt.FileDialog
import java.awt.Frame
import java.io.File
import java.util.prefs.Preferences

/** PC 설정 저장소: OS 사용자 설정(Windows 레지스트리 HKCU, macOS plist). */
class DesktopKeyValueStore(node: String = "com/looin/finance") : KeyValueStore {
    private val prefs = Preferences.userRoot().node(node)
    override fun get(key: String): String? = prefs.get(key, null)
    override fun put(key: String, value: String) { prefs.put(key, value); prefs.flush() }
}

/** PC 백업 파일 저장·열기: OS 기본 파일 대화상자(Windows 탐색기 / macOS Finder). */
class DesktopFileActions(private val owner: Frame?) : FileActions {
    override fun saveText(suggestedName: String, kind: FileKind, onTarget: ((String) -> Unit) -> Unit) {
        val dialog = FileDialog(owner, "${kind.title} 저장", FileDialog.SAVE).apply { file = suggestedName; isVisible = true }
        val name = dialog.file ?: return
        val target = File(dialog.directory, targetName(name, kind))
        onTarget { text -> target.writeText(text, Charsets.UTF_8) }
    }

    override fun openText(kind: FileKind, onSource: (() -> String) -> Unit) {
        val dialog = FileDialog(owner, "${kind.title} 열기", FileDialog.LOAD).apply {
            setFilenameFilter { _, n -> n.lowercase().endsWith(".${kind.extension}") }; isVisible = true
        }
        val name = dialog.file ?: return
        val source = File(dialog.directory, name)
        onSource { decodeKoreanText(source.readBytes()) }
    }

    companion object {
        /** 확장자가 없거나 다르면 종류에 맞는 확장자를 붙인다. */
        fun targetName(name: String, kind: FileKind) = if (name.lowercase().endsWith(".${kind.extension}")) name else "$name.${kind.extension}"
    }
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
