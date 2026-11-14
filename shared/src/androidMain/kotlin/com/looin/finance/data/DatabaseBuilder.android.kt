package com.looin.finance.data

import android.content.Context
import androidx.room.Room

/**
 * Android: OS 내장 SQLite 를 쓴다(드라이버 미지정). Phase 1 부터 쓰던 DB 파일(looin_finance.db)을 그대로 연다.
 * [name] 이 null 이면 메모리 DB(테스트용).
 */
fun FinanceDatabase.Companion.build(context: Context, name: String? = FinanceDatabase.NAME): FinanceDatabase {
    val app = context.applicationContext
    val builder = if (name == null) {
        Room.inMemoryDatabaseBuilder(app, FinanceDatabase::class.java)
    } else {
        Room.databaseBuilder(app, FinanceDatabase::class.java, name)
    }
    return builder.build()
}

/** Android 는 Context 가 필요하다: [FinanceDatabase.build] (context, name) 을 쓴다. */
actual fun openDefaultDatabase(): FinanceDatabase =
    error("Android 에서는 FinanceDatabase.build(context, name) 으로 DB 를 엽니다")
