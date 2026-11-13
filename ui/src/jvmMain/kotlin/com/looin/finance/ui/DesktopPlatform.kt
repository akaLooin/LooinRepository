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
    override fun saveText(suggestedName: String, onTarget: ((String) -> Unit) -> Unit) {
        val dialog = FileDialog(owner, "백업 파일 저장", FileDialog.SAVE).apply { file = suggestedName; isVisible = true }
        val name = dialog.file ?: return
        val target = File(dialog.directory, if (name.endsWith(".json")) name else "$name.json")
        onTarget { text -> target.writeText(text, Charsets.UTF_8) }
    }

    override fun openText(onSource: (() -> String) -> Unit) {
        val dialog = FileDialog(owner, "백업 파일 열기", FileDialog.LOAD).apply { setFilenameFilter { _, n -> n.endsWith(".json") }; isVisible = true }
        val name = dialog.file ?: return
        val source = File(dialog.directory, name)
        onSource { source.readText(Charsets.UTF_8) }
    }
}
