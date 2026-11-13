package com.looin.finance

import android.app.Application
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build

/** 간단한 수동 의존성 컨테이너. */
class LooinApp : Application() {
    val repository: FinanceRepository by lazy { FinanceRepository(FinanceDatabase.build(this)) }
}
