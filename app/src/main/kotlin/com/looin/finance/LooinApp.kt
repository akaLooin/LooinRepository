package com.looin.finance

import android.app.Application
import androidx.glance.appwidget.updateAll
import com.looin.finance.data.FinanceDatabase
import com.looin.finance.data.FinanceRepository
import com.looin.finance.data.build
import com.looin.finance.widget.LooinWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

/** 간단한 수동 의존성 컨테이너. */
class LooinApp : Application() {
    val repository: FinanceRepository by lazy { FinanceRepository(FinanceDatabase.build(this)) }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @OptIn(FlowPreview::class)
    override fun onCreate() {
        super.onCreate()
        // 데이터가 바뀌면(거래 저장 등) 홈 화면 위젯을 새로 그린다. 연달아 바뀌면 1초 뒤 한 번만.
        scope.launch {
            repository.data.drop(1).debounce(1_000).collect { runCatching { LooinWidget().updateAll(this@LooinApp) } }
        }
    }
}
