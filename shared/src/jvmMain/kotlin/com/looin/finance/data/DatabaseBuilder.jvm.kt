package com.looin.finance.data

import androidx.room.Room
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import kotlinx.coroutines.Dispatchers
import java.io.File

/** PC(Windows·macOS·Linux): 번들 SQLite 드라이버. [file] 이 null 이면 메모리 DB(테스트용). */
fun FinanceDatabase.Companion.build(file: File?): FinanceDatabase {
    val builder = if (file == null) {
        Room.inMemoryDatabaseBuilder<FinanceDatabase>()
    } else {
        file.parentFile?.mkdirs()
        Room.databaseBuilder<FinanceDatabase>(name = file.absolutePath)
    }
    return builder.setDriver(BundledSQLiteDriver()).setQueryCoroutineContext(Dispatchers.IO).build()
}

/** OS 관례에 맞는 사용자 데이터 위치의 DB 파일. */
fun FinanceDatabase.Companion.defaultDesktopFile(): File {
    val os = System.getProperty("os.name").lowercase()
    val home = System.getProperty("user.home")
    val dir = when {
        os.contains("win") -> File(System.getenv("APPDATA") ?: "$home\\AppData\\Roaming", "LooinFinance")
        os.contains("mac") -> File(home, "Library/Application Support/LooinFinance")
        else -> File(System.getenv("XDG_DATA_HOME") ?: "$home/.local/share", "looin-finance")
    }
    return File(dir, FinanceDatabase.NAME)
}
