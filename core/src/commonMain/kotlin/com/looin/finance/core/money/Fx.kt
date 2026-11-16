package com.looin.finance.core.money

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlin.math.roundToLong

/**
 * 외화 계산. 환율은 항상 "외화 1단위당 원 × 10,000" 정수(예: 1 JPY = 8.3638원 → 83,638).
 */
object Fx {
    private fun factor(currency: String): Double { var f = 1.0; repeat(Currencies.of(currency).decimals) { f *= 10.0 }; return f }

    /** 외화 금액(최소 단위) → 원. */
    fun toKrw(amountMinor: Long, currency: String, rateX10000: Long): Long = MoneyFormat.toKrw(amountMinor, currency, rateX10000)

    /** 원 → 외화 금액(최소 단위, 반올림). */
    fun fromKrw(krw: Long, currency: String, rateX10000: Long): Long {
        require(rateX10000 > 0)
        return (krw * 10_000.0 / rateX10000 * factor(currency)).roundToLong()
    }

    /** 원 금액과 외화 금액으로 환율을 구한다(환전에서 실제로 받은 금액을 적었을 때). */
    fun rateOf(krw: Long, foreignMinor: Long, currency: String): Long? =
        if (krw <= 0 || foreignMinor <= 0) null else (krw * 10_000.0 / (foreignMinor / factor(currency))).roundToLong()

    /** "1380.5" → 13,805,000. 소수 4자리까지, 0 은 안 됨. */
    fun parseRate(text: String): Long? {
        val parts = text.trim().replace(",", "").split(".")
        if (parts.size > 2 || parts[0].isEmpty() || !parts.all { p -> p.all { it.isDigit() } }) return null
        val frac = parts.getOrElse(1) { "" }
        if (frac.length > 4 || parts[0].length > 9) return null
        return (parts[0].toLong() * 10_000 + frac.padEnd(4, '0').toLong()).takeIf { it > 0 }
    }

    fun formatRate(x10000: Long): String {
        val frac = (x10000 % 10_000).toString().padStart(4, '0').trimEnd('0')
        val whole = MoneyFormat.number(x10000 / 10_000)
        return if (frac.isEmpty()) whole else "$whole.$frac"
    }

    /** 환율 소개 문구: "1 JPY = 8.3638원" */
    fun rateLabel(currency: String, x10000: Long) = "1 $currency = ${formatRate(x10000)}원"

    /** 환율 API 응답(JSON)에서 원화 환율을 읽는다. {"rates":{"KRW":8.3638}} 꼴(Frankfurter·ExchangeRate-API 공통). */
    fun parseKrwRate(json: String): Long? {
        val v = Regex(""""KRW"\s*:\s*([0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?)""").find(json)?.groupValues?.get(1)?.toDoubleOrNull() ?: return null
        return (v * 10_000).roundToLong().takeIf { it > 0 }
    }

    /** 기간 환율 응답 {"rates":{"2026-01-02":{"KRW":9.1}, ...}} → 날짜별 환율. */
    fun parseKrwSeries(json: String): Map<kotlinx.datetime.LocalDate, Long> =
        Regex(""""(\d{4}-\d{2}-\d{2})"\s*:\s*\{\s*"KRW"\s*:\s*([0-9]+(?:\.[0-9]+)?)""").findAll(json).mapNotNull { m ->
            val d = runCatching { kotlinx.datetime.LocalDate.parse(m.groupValues[1]) }.getOrNull() ?: return@mapNotNull null
            val r = m.groupValues[2].toDoubleOrNull()?.let { (it * 10_000).roundToLong() }?.takeIf { it > 0 } ?: return@mapNotNull null
            d to r
        }.toMap()

    /** 그날 환율(없으면 가장 가까운 이전 영업일, 그것도 없으면 가장 가까운 이후 날). */
    fun rateOn(series: Map<kotlinx.datetime.LocalDate, Long>, date: kotlinx.datetime.LocalDate): Long? {
        if (series.isEmpty()) return null
        series[date]?.let { return it }
        return series.keys.filter { it <= date }.maxOrNull()?.let { series[it] } ?: series[series.keys.min()]
    }

    /** 거래에 외화가 끼어 있으면 그 통화(원화끼리면 null). 외화끼리(다른 통화) 이동은 지원하지 않는다. */
    fun foreignCurrencyOf(tx: Transaction, accounts: Map<Long, Account>): String? {
        val cs = listOfNotNull(tx.fromAccountId?.let { accounts[it]?.currency }, tx.toAccountId?.let { accounts[it]?.currency })
        return cs.firstOrNull { it != KRW }
    }
}

/**
 * 통계·예산에 쓰는 원화 금액: 원화 거래는 그대로, 외화 거래는 **기록한 당시 환율**로 환산.
 * 외화인데 환율이 없으면 null(계산에서 빠짐 → 계좌 화면에서 환율을 채우면 들어감).
 */
fun Transaction.krwAmount(): Long? =
    if (currency == KRW) amount else rateToKrwX10000?.let { MoneyFormat.toKrw(amount, currency, it) }

/**
 * 외화 계좌의 환율 기록 상태와 원화 평가.
 */
object AccountFx {
    /** 환율을 꼭 적어야 하는 거래: 이 외화 계좌가 낀 완료 거래 중 환율이 없는 것. */
    fun missingRates(account: Account, txs: List<Transaction>): List<Transaction> =
        if (account.currency == KRW) emptyList()
        else txs.filter { it.touches(account.id) && it.status == TransactionStatus.COMPLETED && it.rateToKrwX10000 == null }

    fun openingRateMissing(account: Account) = account.currency != KRW && account.openingBalance != 0L && account.openingRateX10000 == null

    /** 이 계좌에서 [tx] 가 바꾼 외화 금액(계좌 통화). */
    private fun deltaIn(account: Account, tx: Transaction) = tx.deltaFor(account.id)

    /**
     * 기록 환율 기준 원화(들어온·나간 외화를 각각 그때 환율로 계산해 더한 값). 환율이 빠진 기록이 있으면 null.
     * 현재 환율로 계산한 평가액과의 차이가 환율 변동으로 생긴 손익이다.
     */
    fun bookValueKrw(account: Account, txs: List<Transaction>): Long? {
        if (account.currency == KRW) return null
        var krw = if (account.openingBalance == 0L) 0L else Fx.toKrw(account.openingBalance, account.currency, account.openingRateX10000 ?: return null)
        for (t in txs) {
            if (!t.isCompleted || !t.touches(account.id)) continue
            val d = deltaIn(account, t)
            if (d == 0L) continue
            krw += Fx.toKrw(d, account.currency, t.rateToKrwX10000 ?: return null)
        }
        return krw
    }

    /** 원화 평가에 쓸 환율: 실시간 > 계좌에 직접 적은 현재 환율 > 가장 최근 거래의 환율 > 초기 잔고 환율. */
    fun valuationRate(account: Account, txs: List<Transaction>, live: Map<String, Long>): RateSource? {
        if (account.currency == KRW) return null
        live[account.currency]?.let { return RateSource(it, RateKind.LIVE) }
        account.rateToKrwX10000?.let { return RateSource(it, RateKind.MANUAL) }
        txs.filter { it.isCompleted && it.touches(account.id) && it.rateToKrwX10000 != null }
            .maxWithOrNull(compareBy<Transaction> { it.effectiveDate }.thenBy { it.id })?.rateToKrwX10000?.let { return RateSource(it, RateKind.LAST_RECORD) }
        account.openingRateX10000?.let { return RateSource(it, RateKind.LAST_RECORD) }
        return null
    }
}

enum class RateKind(val label: String) { LIVE("실시간 환율"), MANUAL("직접 적은 환율"), LAST_RECORD("최근 기록 환율") }
data class RateSource(val rateX10000: Long, val kind: RateKind)

/**
 * 거래가 있는 계좌의 통화 바꾸기: 원화 → 외화, 외화 → 원화, 외화 → 다른 외화.
 *
 * [rates] 는 거래별 "1 X 당 원" 환율이고, X 는 새 통화가 외화면 새 통화, 원화로 바꾸면 원래 통화다.
 * [openingRate] 도 같은 뜻(초기 잔고).
 *  - [amountsAsIs] = true: 그동안 적은 숫자가 이미 새 통화 금액 → 숫자는 그대로, 통화만 바꿈
 *  - false: 원래 통화 금액 → 환율로 새 통화 금액을 계산
 *    (외화 → 다른 외화는 원래 통화의 기록 환율로 원화로 바꾼 뒤 새 통화 환율로 나눈다 → 원래 기록 환율이 모두 있어야 함)
 * 모든 거래(예정·취소 포함)와 초기 잔고(0 이 아니면)에 환율이 있어야 한다(원화로 숫자 그대로 바꿀 때만 필요 없음).
 * 원화 계좌와 오간 이체는 그 계좌 쪽 금액은 그대로 둔다:
 *   새 통화가 외화면 이 계좌 쪽만 바꿔 환전 기록이 되고, 원화로 바꾸면 이 계좌 쪽도 원화 계좌 쪽 금액과 같아진다(같은 통화 이체).
 * 다른 외화 계좌와 오간 거래가 있으면 바꿀 수 없다.
 */
object CurrencyConversion {
    data class Result(val account: Account, val transactions: List<Transaction>, val errors: List<String>)

    /** 이 바꾸기에 환율 입력이 필요한지. */
    fun needsRates(oldCurrency: String, newCurrency: String, amountsAsIs: Boolean) = !(newCurrency == KRW && amountsAsIs)

    /** 환율 칸이 묻는 통화(1 X 당 원). */
    fun rateCurrency(oldCurrency: String, newCurrency: String) = if (newCurrency == KRW) oldCurrency else newCurrency

    /** 금액 하나를 새 통화로. [oldRate] 는 원래 통화의 기록 환율(외화 → 다른 외화에서만 씀). */
    fun convertAmount(v: Long, old: String, new: String, asIs: Boolean, rate: Long?, oldRate: Long?): Long? = when {
        asIs -> v
        rate == null -> null
        old == KRW -> Fx.fromKrw(v, new, rate)
        new == KRW -> Fx.toKrw(v, old, rate)
        else -> oldRate?.let { Fx.fromKrw(Fx.toKrw(v, old, it), new, rate) }
    }

    fun convert(
        account: Account,
        newCurrency: String,
        amountsAsIs: Boolean,
        openingRate: Long?,
        rates: Map<Long, Long>,
        txs: List<Transaction>,
        accounts: Map<Long, Account>,
    ): Result {
        val old = account.currency
        val errors = mutableListOf<String>()
        if (newCurrency == old) errors += "지금과 다른 통화를 고르세요."
        if (account.type.isLiability) errors += "부채 계좌는 통화를 바꿀 수 없어요."
        val need = needsRates(old, newCurrency, amountsAsIs)
        val viaKrw = old != KRW && newCurrency != KRW && !amountsAsIs
        val mine = txs.filter { it.touches(account.id) }
        if (need && account.openingBalance != 0L && openingRate == null) errors += "초기 잔고의 당시 환율을 적어 주세요."
        if (viaKrw && account.openingBalance != 0L && account.openingRateX10000 == null) errors += "초기 잔고의 원래($old) 환율이 없어요. 먼저 거래별 환율을 채워 주세요."
        if (need) mine.count { rates[it.id] == null }.takeIf { it > 0 }?.let { errors += "환율이 비어 있는 거래가 ${it}건 있어요." }
        if (viaKrw) mine.count { it.rateToKrwX10000 == null }.takeIf { it > 0 }?.let { errors += "원래($old) 환율이 없는 거래가 ${it}건 있어요. 먼저 거래별 환율을 채운 뒤 바꾸세요." }
        mine.forEach { t ->
            val other = (if (t.fromAccountId == account.id) t.toAccountId else t.fromAccountId)?.let { accounts[it] }
            if (other != null && other.currency != KRW) errors += "다른 외화 계좌(${other.name})와 오간 거래가 있어 바꿀 수 없어요."
            if (t.type == com.looin.finance.core.model.TransactionType.EXCHANGE) errors += "환전 거래가 있는 계좌는 바꿀 수 없어요."
        }
        if (errors.isNotEmpty()) return Result(account, emptyList(), errors.distinct())

        val toKrwAccount = newCurrency == KRW
        fun conv(v: Long, rate: Long?, oldRate: Long?) = convertAmount(v, old, newCurrency, amountsAsIs, rate, oldRate)!!
        val newAcc = account.copy(
            currency = newCurrency,
            type = if (toKrwAccount) com.looin.finance.core.model.AccountType.CHECKING else com.looin.finance.core.model.AccountType.FOREIGN,
            includeInAvailable = if (toKrwAccount) account.includeInAvailable else false,
            openingBalance = if (account.openingBalance == 0L) 0L else conv(account.openingBalance, openingRate, account.openingRateX10000),
            openingRateX10000 = if (toKrwAccount) null else openingRate,
            rateToKrwX10000 = null, billingDay = null, billingAccountId = null,
        )
        val out = mine.map { t ->
            val rate = rates[t.id]
            val newRate = if (toKrwAccount) null else rate
            val otherId = if (t.fromAccountId == account.id) t.toAccountId else t.fromAccountId
            val other = otherId?.let { accounts[it] }
            val isFrom = t.fromAccountId == account.id
            when {
                t.type == com.looin.finance.core.model.TransactionType.TRANSFER && other != null -> {
                    // 원화 계좌와의 이체: 그 계좌 쪽 금액은 그대로
                    val counterpart = if (isFrom) (t.toAmount ?: t.amount) else t.amount
                    val mineSide = if (isFrom) t.amount else (t.toAmount ?: t.amount)
                    if (toKrwAccount) {
                        // 둘 다 원화가 됨 → 같은 금액의 원화 이체
                        if (isFrom) t.copy(amount = counterpart, currency = KRW, toAmount = null, rateToKrwX10000 = null)
                        else t.copy(toAmount = null, rateToKrwX10000 = null)
                    } else {
                        val converted = conv(mineSide, rate, t.rateToKrwX10000)
                        if (isFrom) t.copy(amount = converted, currency = newCurrency, toAmount = counterpart, rateToKrwX10000 = newRate)
                        else t.copy(toAmount = converted, rateToKrwX10000 = newRate)
                    }
                }
                else -> t.copy(amount = conv(t.amount, rate, t.rateToKrwX10000), currency = newCurrency, rateToKrwX10000 = newRate)
            }
        }
        val zero = out.firstOrNull { it.amount <= 0 || (it.toAmount != null && it.toAmount <= 0) }
        if (zero != null) return Result(account, emptyList(), listOf("환율로 바꾸면 0이 되는 거래가 있어요(${zero.date}). 환율을 확인하세요."))
        return Result(newAcc, out, emptyList())
    }
}
