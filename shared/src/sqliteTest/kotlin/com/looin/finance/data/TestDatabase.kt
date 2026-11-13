package com.looin.finance.data

/** 플랫폼별 메모리 DB(번들 SQLite). PC(JVM)·iOS 테스트에서 같은 시나리오를 돌리기 위한 것. */
expect fun testDatabase(): FinanceDatabase
