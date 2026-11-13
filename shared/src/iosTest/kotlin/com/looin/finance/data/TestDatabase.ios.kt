package com.looin.finance.data

actual fun testDatabase(): FinanceDatabase = FinanceDatabase.build(name = null)
