package com.looin.finance.ui.platform

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.withContext
import platform.Foundation.NSString
import platform.Foundation.NSURL
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.stringWithContentsOfURL

@OptIn(ExperimentalForeignApi::class)
actual fun platformHttpGet(): HttpGet? = HttpGet { url ->
    withContext(Dispatchers.IO) {
        val u = NSURL.URLWithString(url) ?: error("bad url")
        NSString.stringWithContentsOfURL(u, NSUTF8StringEncoding, null) ?: error("network")
    }
}
