package com.looin.finance.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.platform.Font
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSBundle
import platform.Foundation.NSData
import platform.Foundation.dataWithContentsOfFile
import platform.posix.memcpy

/**
 * iOS: 앱 번들에 함께 넣은 Pretendard(ui/src/androidMain/res/font, iosApp/project.yml)를 읽는다.
 * 파일을 찾지 못하면 시스템 글꼴(Apple SD 고딕 Neo)로 보인다.
 */
actual val Pretendard: FontFamily = run {
    val fonts = listOf(
        "pretendard_regular" to FontWeight.Normal, "pretendard_medium" to FontWeight.Medium,
        "pretendard_semibold" to FontWeight.SemiBold, "pretendard_bold" to FontWeight.Bold,
    ).mapNotNull { (name, weight) -> bundleBytes(name, "otf")?.let { Font(name, it, weight) } }
    if (fonts.size == 4) FontFamily(fonts) else FontFamily.Default
}

@OptIn(ExperimentalForeignApi::class)
private fun bundleBytes(name: String, ext: String): ByteArray? {
    val path = NSBundle.mainBundle.pathForResource(name, ext) ?: return null
    val data = NSData.dataWithContentsOfFile(path) ?: return null
    return data.toByteArray()
}

@OptIn(ExperimentalForeignApi::class)
internal fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    val out = ByteArray(size)
    if (size > 0) out.usePinned { memcpy(it.addressOf(0), bytes, length) }
    return out
}
