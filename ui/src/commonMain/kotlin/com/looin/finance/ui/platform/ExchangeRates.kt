package com.looin.finance.ui.platform

import com.looin.finance.core.model.KRW
import com.looin.finance.core.money.Fx
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.datetime.LocalDate

/** 인터넷에서 글자를 받아 오는 함수(플랫폼마다). 실패하면 예외. */
fun interface HttpGet { suspend fun get(url: String): String }

/** 이 플랫폼의 [HttpGet](지원하지 않으면 null). */
expect fun platformHttpGet(): HttpGet?

/**
 * 최신 환율(외화 1단위당 원). 외화 계좌가 있을 때만, 통화 코드만 보내 공개 환율 서비스에서 받아 온다(개인 정보 전송 없음).
 *  - 출처: Frankfurter(유럽중앙은행 기준 환율, 영업일 하루 한 번 갱신) → 안 되면 ExchangeRate-API(하루 한 번 갱신)
 *  - 받은 값은 기기에 저장해 두고, 인터넷이 없을 땐 마지막 값을 쓴다
 *  - 설정에서 끌 수 있다(끄면 계좌에 직접 적은 환율 → 최근 기록 환율로 평가)
 */
object ExchangeRates {
    data class Quote(val rateX10000: Long, val fetchedAtMs: Long, val date: String, val source: String)

    private val _quotes = MutableStateFlow<Map<String, Quote>>(emptyMap())
    val quotes: StateFlow<Map<String, Quote>> = _quotes.asStateFlow()
    private val _enabled = MutableStateFlow(true)
    val enabled: StateFlow<Boolean> = _enabled.asStateFlow()
    private var store: KeyValueStore? = null
    /** 테스트에서 바꿔 끼울 수 있다. */
    var http: HttpGet? = null

    /** 다시 받기까지 기다리는 시간. */
    const val REFRESH_MS = 30 * 60 * 1000L

    fun init(store: KeyValueStore, http: HttpGet? = platformHttpGet()) {
        this.store = store
        this.http = http
        _enabled.value = store.get("fx.live") != "off"
        _quotes.value = decode(store.get("fx.quotes"))
    }

    val supported get() = http != null

    fun setEnabled(on: Boolean) { _enabled.value = on; store?.put("fx.live", if (on) "on" else "off") }

    /** 화면 계산에 쓸 실시간 환율(꺼져 있으면 빈 값). */
    fun live(): Map<String, Long> = if (_enabled.value) _quotes.value.mapValues { it.value.rateX10000 } else emptyMap()

    /** [currencies] 의 환율을 받아 온다. 최근에 받았으면 건너뜀([force] 면 다시). 실패한 통화가 있으면 안내 문구. */
    suspend fun refresh(currencies: Set<String>, nowMs: Long, force: Boolean = false): String? {
        val h = http ?: return null
        if (!_enabled.value) return null
        var failed = 0
        for (c in currencies.filter { it != KRW }) {
            val old = _quotes.value[c]
            if (!force && old != null && nowMs - old.fetchedAtMs < REFRESH_MS) continue
            val q = runCatching { fetch(h, c, nowMs) }.getOrNull()
            if (q == null) failed++ else _quotes.value = _quotes.value + (c to q)
        }
        store?.put("fx.quotes", encode(_quotes.value))
        return if (failed > 0) "환율을 받아 오지 못했어요. 인터넷 연결을 확인하세요." else null
    }

    private suspend fun fetch(h: HttpGet, c: String, nowMs: Long): Quote? {
        runCatching {
            val j = h.get("https://api.frankfurter.dev/v1/latest?base=$c&symbols=KRW")
            Fx.parseKrwRate(j)?.let { return Quote(it, nowMs, Regex(""""date"\s*:\s*"([0-9-]+)"""").find(j)?.groupValues?.get(1) ?: "", "유럽중앙은행 기준 환율(Frankfurter)") }
        }
        val j = h.get("https://open.er-api.com/v6/latest/$c")
        return Fx.parseKrwRate(j)?.let { Quote(it, nowMs, "", "ExchangeRate-API") }
    }

    /** 기간의 날짜별 환율(유럽중앙은행 기준, 영업일만). 거래 당시 환율 채우기에 쓴다. */
    suspend fun history(currency: String, from: LocalDate, to: LocalDate): Map<LocalDate, Long> {
        val h = http ?: return emptyMap()
        // 주말·휴일에 걸친 첫날도 채울 수 있게 일주일 앞부터
        val start = LocalDate.fromEpochDays(from.toEpochDays() - 7)
        return Fx.parseKrwSeries(h.get("https://api.frankfurter.dev/v1/$start..$to?base=$currency&symbols=KRW"))
    }

    private fun encode(m: Map<String, Quote>) = m.entries.joinToString(";") { (c, q) -> "$c|${q.rateX10000}|${q.fetchedAtMs}|${q.date}|${q.source}" }
    private fun decode(s: String?): Map<String, Quote> = s.orEmpty().split(";").mapNotNull { e ->
        val p = e.split("|"); if (p.size < 5) return@mapNotNull null
        val r = p[1].toLongOrNull() ?: return@mapNotNull null
        p[0] to Quote(r, p[2].toLongOrNull() ?: 0, p[3], p[4])
    }.toMap()
}
