package com.looin.finance.ui.platform

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

actual fun platformHttpGet(): HttpGet? = HttpGet { url ->
    withContext(Dispatchers.IO) {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 8_000; conn.readTimeout = 8_000
            conn.setRequestProperty("Accept", "application/json")
            check(conn.responseCode == 200) { "HTTP ${conn.responseCode}" }
            conn.inputStream.bufferedReader().use { it.readText() }
        } finally { conn.disconnect() }
    }
}
