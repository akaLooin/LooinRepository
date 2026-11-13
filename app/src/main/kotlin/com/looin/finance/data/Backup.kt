package com.looin.finance.data

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.isoDayNumber
import org.json.JSONArray
import org.json.JSONObject

/**
 * 백업 파일(JSON) 형식.
 *
 * - 금액은 최소 통화 단위 정수, 날짜는 "YYYY-MM-DD" 문자열
 * - [summary]에 건수와 금액 합계를 함께 저장하고, 복원 전에 다시 계산해 일치하는지 검사한다(파일 손상·편집 감지)
 * - 형식이 바뀌면 [FORMAT_VERSION]을 올리고 이전 버전 읽기를 유지한다
 */
object BackupCodec {
    const val FORMAT = "looin-finance-backup"
    const val FORMAT_VERSION = 1

    data class Summary(val accounts: Int, val categories: Int, val transactions: Int, val budgets: Int, val rules: Int, val transactionAmountSum: Long, val openingBalanceSum: Long)

    fun summarize(d: FinanceData) = Summary(
        d.accounts.size, d.categories.size, d.transactions.size, d.budgets.size, d.rules.size,
        d.transactions.sumOf { it.amount }, d.accounts.sumOf { it.openingBalance },
    )

    fun encode(d: FinanceData, exportedAtMillis: Long, appVersion: String): String {
        val root = JSONObject()
        root.put("format", FORMAT)
        root.put("formatVersion", FORMAT_VERSION)
        root.put("appVersion", appVersion)
        root.put("exportedAt", exportedAtMillis)
        root.put("settings", JSONObject().put("paydayDay", d.settings.paydayDay).put("primaryBasis", d.settings.primaryBasis.name))
        root.put("accounts", JSONArray(d.accounts.map { a ->
            JSONObject().put("id", a.id).put("name", a.name).put("type", a.type.name).put("currency", a.currency)
                .put("openingBalance", a.openingBalance).put("includeInAvailable", a.includeInAvailable).put("archived", a.archived)
                .put("memo", a.memo).put("sortOrder", a.sortOrder).putOpt("rateToKrwX10000", a.rateToKrwX10000)
                .put("createdAt", a.createdAt).put("updatedAt", a.updatedAt)
        }))
        root.put("categories", JSONArray(d.categories.map { c ->
            JSONObject().put("id", c.id).put("name", c.name).put("kind", c.kind.name).put("colorArgb", c.colorArgb)
                .put("sortOrder", c.sortOrder).put("archived", c.archived)
        }))
        root.put("transactions", JSONArray(d.transactions.map { t ->
            JSONObject().put("id", t.id).put("type", t.type.name).put("status", t.status.name).put("amount", t.amount)
                .put("currency", t.currency).put("date", t.date.toString()).putOpt("completedDate", t.completedDate?.toString())
                .putOpt("fromAccountId", t.fromAccountId).putOpt("toAccountId", t.toAccountId).putOpt("categoryId", t.categoryId)
                .put("memo", t.memo).put("source", t.source.name).putOpt("linkedPlannedId", t.linkedPlannedId).putOpt("toAmount", t.toAmount)
                .put("createdAt", t.createdAt).put("updatedAt", t.updatedAt)
                .putOpt("recurringId", t.recurringId).putOpt("recurringOccurrence", t.recurringOccurrence?.toString())
        }))
        root.put("budgets", JSONArray(d.budgets.map { b ->
            JSONObject().put("id", b.id).put("basis", b.basis.name).put("periodStart", b.periodStart.toString())
                .put("periodEndExclusive", b.periodEndExclusive.toString()).putOpt("categoryId", b.categoryId)
                .put("amount", b.amount).put("memo", b.memo)
        }))
        root.put("recurringRules", JSONArray(d.rules.map { r ->
            JSONObject().put("id", r.id).put("name", r.name).put("type", r.type.name).put("amount", r.amount).put("currency", r.currency)
                .putOpt("fromAccountId", r.fromAccountId).putOpt("toAccountId", r.toAccountId).putOpt("categoryId", r.categoryId)
                .put("frequency", r.frequency.name).put("interval", r.interval).putOpt("dayOfMonth", r.dayOfMonth)
                .putOpt("dayOfWeek", r.dayOfWeek?.isoDayNumber).put("startDate", r.startDate.toString())
                .putOpt("endDate", r.endDate?.toString()).put("active", r.active).putOpt("generatedThrough", r.generatedThrough?.toString())
                .put("memo", r.memo).put("createdAt", r.createdAt).put("updatedAt", r.updatedAt)
        }))
        val s = summarize(d)
        root.put("summary", JSONObject().put("accounts", s.accounts).put("categories", s.categories).put("transactions", s.transactions)
            .put("budgets", s.budgets).put("recurringRules", s.rules).put("transactionAmountSum", s.transactionAmountSum)
            .put("openingBalanceSum", s.openingBalanceSum))
        return root.toString(2)
    }

    /** 파일 내용을 해석하고 검증한다. 문제가 있으면 [FinanceException](한국어 이유). */
    fun decode(text: String): FinanceData {
        val root = try { JSONObject(text) } catch (e: Exception) { throw FinanceException("백업 파일을 읽을 수 없습니다(JSON 형식 아님).") }
        if (root.optString("format") != FORMAT) throw FinanceException("루인 가계부 백업 파일이 아닙니다.")
        val version = root.optInt("formatVersion", -1)
        if (version < 1 || version > FORMAT_VERSION) throw FinanceException("지원하지 않는 백업 형식 버전입니다($version). 앱을 업데이트하세요.")
        val data = try { parse(root) } catch (e: FinanceException) { throw e } catch (e: Exception) {
            throw FinanceException("백업 파일 내용이 올바르지 않습니다: ${e.message}")
        }
        verify(data, root.getJSONObject("summary"))
        return data
    }

    private fun parse(root: JSONObject): FinanceData {
        val st = root.getJSONObject("settings")
        val settings = FinanceSettings(st.getInt("paydayDay"), PeriodBasis.valueOf(st.getString("primaryBasis")))
        val accounts = root.getJSONArray("accounts").objects().map { o ->
            Account(o.getLong("id"), o.getString("name"), AccountType.valueOf(o.getString("type")), o.getString("currency"),
                o.getLong("openingBalance"), o.getBoolean("includeInAvailable"), o.getBoolean("archived"), o.optString("memo"),
                o.optInt("sortOrder"), o.optLongOrNull("rateToKrwX10000"), o.optLong("createdAt"), o.optLong("updatedAt"))
        }
        val categories = root.getJSONArray("categories").objects().map { o ->
            Category(o.getLong("id"), o.getString("name"), CategoryKind.valueOf(o.getString("kind")), o.getLong("colorArgb"),
                o.optInt("sortOrder"), o.optBoolean("archived"))
        }
        val transactions = root.getJSONArray("transactions").objects().map { o ->
            Transaction(
                id = o.getLong("id"), type = TransactionType.valueOf(o.getString("type")), status = TransactionStatus.valueOf(o.getString("status")),
                amount = o.getLong("amount"), currency = o.getString("currency"), date = LocalDate.parse(o.getString("date")),
                completedDate = o.optStringOrNull("completedDate")?.let(LocalDate::parse),
                fromAccountId = o.optLongOrNull("fromAccountId"), toAccountId = o.optLongOrNull("toAccountId"), categoryId = o.optLongOrNull("categoryId"),
                memo = o.optString("memo"), source = TransactionSource.valueOf(o.getString("source")),
                linkedPlannedId = o.optLongOrNull("linkedPlannedId"), toAmount = o.optLongOrNull("toAmount"),
                createdAt = o.optLong("createdAt"), updatedAt = o.optLong("updatedAt"),
                recurringId = o.optLongOrNull("recurringId"), recurringOccurrence = o.optStringOrNull("recurringOccurrence")?.let(LocalDate::parse),
            )
        }
        val budgets = root.getJSONArray("budgets").objects().map { o ->
            Budget(o.getLong("id"), PeriodBasis.valueOf(o.getString("basis")), LocalDate.parse(o.getString("periodStart")),
                LocalDate.parse(o.getString("periodEndExclusive")), o.optLongOrNull("categoryId"), o.getLong("amount"), o.optString("memo"))
        }
        val rules = root.optJSONArray("recurringRules")?.objects()?.map { o ->
            RecurringRule(
                id = o.getLong("id"), name = o.getString("name"), type = TransactionType.valueOf(o.getString("type")),
                amount = o.getLong("amount"), currency = o.getString("currency"),
                fromAccountId = o.optLongOrNull("fromAccountId"), toAccountId = o.optLongOrNull("toAccountId"), categoryId = o.optLongOrNull("categoryId"),
                frequency = Frequency.valueOf(o.getString("frequency")), interval = o.getInt("interval"),
                dayOfMonth = o.optLongOrNull("dayOfMonth")?.toInt(),
                dayOfWeek = o.optLongOrNull("dayOfWeek")?.toInt()?.let { n -> DayOfWeek.entries.first { it.isoDayNumber == n } },
                startDate = LocalDate.parse(o.getString("startDate")), endDate = o.optStringOrNull("endDate")?.let(LocalDate::parse),
                active = o.getBoolean("active"), generatedThrough = o.optStringOrNull("generatedThrough")?.let(LocalDate::parse),
                memo = o.optString("memo"), createdAt = o.optLong("createdAt"), updatedAt = o.optLong("updatedAt"),
            )
        } ?: emptyList()
        return FinanceData(accounts, categories, transactions, budgets, settings, loaded = true, rules = rules)
    }

    /** 요약값 일치 + 참조 무결성(거래·예산·규칙이 가리키는 계좌·카테고리가 파일 안에 있는지) 검사. */
    private fun verify(d: FinanceData, summary: JSONObject) {
        val s = summarize(d)
        val expected = Summary(summary.getInt("accounts"), summary.getInt("categories"), summary.getInt("transactions"),
            summary.getInt("budgets"), summary.optInt("recurringRules"), summary.getLong("transactionAmountSum"), summary.getLong("openingBalanceSum"))
        if (s != expected) throw FinanceException("백업 파일의 요약값이 내용과 맞지 않습니다(파일이 손상되었거나 편집됨).")
        val accountIds = d.accounts.map { it.id }.toSet()
        val categoryIds = d.categories.map { it.id }.toSet()
        fun checkAcc(id: Long?) { if (id != null && id !in accountIds) throw FinanceException("없는 계좌(#$id)를 가리키는 기록이 있습니다.") }
        fun checkCat(id: Long?) { if (id != null && id !in categoryIds) throw FinanceException("없는 카테고리(#$id)를 가리키는 기록이 있습니다.") }
        d.transactions.forEach { checkAcc(it.fromAccountId); checkAcc(it.toAccountId); checkCat(it.categoryId) }
        d.budgets.forEach { checkCat(it.categoryId) }
        d.rules.forEach { checkAcc(it.fromAccountId); checkAcc(it.toAccountId); checkCat(it.categoryId) }
        if (d.settings.paydayDay !in 1..31) throw FinanceException("급여 기준일 값이 올바르지 않습니다.")
        if (d.categories.isEmpty()) throw FinanceException("카테고리가 없는 백업은 복원할 수 없습니다.")
    }

    private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
    private fun JSONObject.optLongOrNull(key: String): Long? = if (has(key) && !isNull(key)) getLong(key) else null
    private fun JSONObject.optStringOrNull(key: String): String? = if (has(key) && !isNull(key)) getString(key) else null
}
