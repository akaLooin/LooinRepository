package com.looin.finance.data

import androidx.room.Room
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import platform.Foundation.NSApplicationSupportDirectory
import platform.Foundation.NSFileManager
import platform.Foundation.NSUserDomainMask

/** iOS: 번들 SQLite 드라이버, 앱의 Application Support 폴더. [name] 이 null 이면 메모리 DB(테스트용). */
fun FinanceDatabase.Companion.build(name: String? = FinanceDatabase.NAME): FinanceDatabase {
    val builder = if (name == null) {
        Room.inMemoryDatabaseBuilder<FinanceDatabase>()
    } else {
        Room.databaseBuilder<FinanceDatabase>(name = "${appSupportDirectory()}/$name")
    }
    return builder.setDriver(BundledSQLiteDriver()).setQueryCoroutineContext(Dispatchers.IO).build()
}

@OptIn(ExperimentalForeignApi::class)
private fun appSupportDirectory(): String {
    val url = NSFileManager.defaultManager.URLForDirectory(
        directory = NSApplicationSupportDirectory,
        inDomain = NSUserDomainMask,
        appropriateForURL = null,
        create = true,
        error = null,
    )
    return requireNotNull(url?.path) { "Application Support 폴더를 찾을 수 없습니다." }
}

/** iOS 앱 기본 DB: Application Support/[FinanceDatabase.NAME]. */
actual fun openDefaultDatabase(): FinanceDatabase = FinanceDatabase.build()
