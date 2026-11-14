package com.looin.finance.ui.platform

import com.looin.finance.ui.theme.toByteArray
import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import platform.CoreFoundation.CFStringConvertEncodingToNSStringEncoding
import platform.CoreFoundation.kCFStringEncodingDOSKorean
import platform.Foundation.NSData
import platform.Foundation.NSString
import platform.Foundation.NSTemporaryDirectory
import platform.Foundation.NSURL
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.NSUserDefaults
import platform.Foundation.create
import platform.Foundation.dataUsingEncoding
import platform.Foundation.dataWithContentsOfURL
import platform.Foundation.writeToURL
import platform.UIKit.UIApplication
import platform.UIKit.UIDocumentPickerDelegateProtocol
import platform.UIKit.UIDocumentPickerViewController
import platform.UIKit.UIViewController
import platform.UniformTypeIdentifiers.UTTypeCommaSeparatedText
import platform.UniformTypeIdentifiers.UTTypeJSON
import platform.UniformTypeIdentifiers.UTTypePlainText
import platform.darwin.NSObject
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

/** iOS 설정 저장소: NSUserDefaults(앱 전용, iCloud 기기 백업에 포함). */
class IosKeyValueStore : KeyValueStore {
    private val defaults = NSUserDefaults.standardUserDefaults
    override fun get(key: String): String? = defaults.stringForKey("looin.$key")
    override fun put(key: String, value: String) = defaults.setObject(value, "looin.$key")
}

/** 지금 화면 맨 위의 화면 컨트롤러(대화상자를 띄울 곳). */
internal fun topViewController(): UIViewController? {
    @Suppress("DEPRECATION")
    var vc = UIApplication.sharedApplication.keyWindow?.rootViewController
    while (vc?.presentedViewController != null) vc = vc.presentedViewController
    return vc
}

/**
 * iOS 파일 저장·열기: '파일' 앱 선택 화면(UIDocumentPicker).
 *  - 저장: 임시 파일에 쓴 뒤 "내보내기" 선택 화면으로 사용자가 고른 위치(iCloud Drive·나의 iPhone 등)에 복사
 *  - 열기: 선택한 파일을 읽는다. CSV 는 UTF-8 이 아니면 CP949(은행·엑셀)로 읽는다
 */
class IosFileActions : FileActions {
    // 선택 화면이 떠 있는 동안 대리자(delegate)를 붙잡아 둔다(약한 참조라 사라지지 않게).
    private var delegate: NSObject? = null

    @OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
    override fun saveText(suggestedName: String, kind: FileKind, onTarget: ((String) -> Unit) -> Unit) {
        val url = NSURL.fileURLWithPath(NSTemporaryDirectory() + suggestedName)
        onTarget { text ->
            val data = NSString.create(string = text).dataUsingEncoding(NSUTF8StringEncoding)
                ?: error("파일 내용을 만들 수 없습니다")
            check(data.writeToURL(url, atomically = true)) { "임시 파일을 쓸 수 없습니다" }
            dispatch_async(dispatch_get_main_queue()) {
                val picker = UIDocumentPickerViewController(forExportingURLs = listOf(url), asCopy = true)
                topViewController()?.presentViewController(picker, animated = true, completion = null)
            }
        }
    }

    override fun openText(kind: FileKind, onSource: (() -> String) -> Unit) {
        val types = if (kind == FileKind.CSV) listOf(UTTypeCommaSeparatedText, UTTypePlainText) else listOf(UTTypeJSON, UTTypePlainText)
        val picker = UIDocumentPickerViewController(forOpeningContentTypes = types, asCopy = true)
        val d = object : NSObject(), UIDocumentPickerDelegateProtocol {
            override fun documentPicker(controller: UIDocumentPickerViewController, didPickDocumentsAtURLs: List<*>) {
                delegate = null
                val url = didPickDocumentsAtURLs.firstOrNull() as? NSURL ?: return
                onSource { readText(url) }
            }
            override fun documentPickerWasCancelled(controller: UIDocumentPickerViewController) { delegate = null }
        }
        delegate = d
        picker.delegate = d
        topViewController()?.presentViewController(picker, animated = true, completion = null)
    }

    @OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
    private fun readText(url: NSURL): String {
        val data: NSData = NSData.dataWithContentsOfURL(url) ?: error("파일을 읽을 수 없습니다")
        val utf8 = NSString.create(data = data, encoding = NSUTF8StringEncoding)
        val text = utf8 ?: NSString.create(data = data, encoding = CFStringConvertEncodingToNSStringEncoding(kCFStringEncodingDOSKorean.toUInt()))
            ?: data.toByteArray().decodeToString()
        return text.toString().removePrefix("﻿")
    }
}
