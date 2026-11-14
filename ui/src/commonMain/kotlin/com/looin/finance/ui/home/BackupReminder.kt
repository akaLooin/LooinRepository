package com.looin.finance.ui.home

import com.looin.finance.core.model.Transaction
import kotlinx.datetime.LocalDate

/**
 * 백업 알림 규칙(기기에만 저장되는 앱이라 데이터를 잃지 않도록).
 *  - 백업한 적이 있으면: 마지막 백업 후 [AFTER_DAYS]일이 지나면
 *  - 한 번도 없으면: 가장 오래된 거래가 [FIRST_DAYS]일 전보다 앞서면(며칠 써 본 뒤)
 *  - 거래가 없거나, "나중에"로 미룬 기간 안이면 알리지 않는다
 */
object BackupReminder {
    const val AFTER_DAYS = 30
    const val FIRST_DAYS = 7
    const val SNOOZE_DAYS = 7

    /** 알릴 문구. 알릴 필요가 없으면 null. */
    fun message(txs: List<Transaction>, today: LocalDate, lastBackupDay: Long?, snoozeUntil: Long?): String? {
        val t = today.toEpochDays()
        if (txs.isEmpty() || (snoozeUntil != null && t < snoozeUntil)) return null
        return if (lastBackupDay != null) {
            val days = t - lastBackupDay
            if (days >= AFTER_DAYS) "마지막 백업 후 ${days}일이 지났어요" else null
        } else {
            val oldest = txs.minOf { it.date.toEpochDays() }
            if (t - oldest >= FIRST_DAYS) "아직 백업 파일이 없어요" else null
        }
    }
}
