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
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put

/**
 * 백업 파일(JSON) 형식. Android·PC·iOS 공용(kotlinx.serialization).
 *
 * - 금액은 최소 통화 단위 정수, 날짜는 "YYYY-MM-DD" 문자열
 * - [summary]에 건수와 금액 합계를 함께 저장하고, 복원 전에 다시 계산해 일치하는지 검사한다(파일 손상·편집 감지)
 * - 형식이 바뀌면 [FORMAT_VERSION]을 올리고 이전 버전 읽기를 유지한다
 * - 값이 없는(null) 항목은 키를 생략한다. 1.0.0(Android, org.json) 시절 파일과 같은 모양이며 서로 읽을 수 있다.
 */
object BackupCodec {
    const val FORMAT = "looin-finance-backup"
    const val FORMAT_VERSION = 1

    private val json = Json { prettyPrint = true }

    data class Summary(val accounts: Int, val categories: Int, val transactions: Int, val budgets: Int, val rules: Int, val transactionAmountSum: Long, val openingBalanceSum: Long)

    fun summarize(d: FinanceData) = Summary(
        d.accounts.size, d.categories.size, d.transactions.size, d.budgets.size, d.rules.size,
        d.transactions.sumOf { it.amount }, d.accounts.sumOf { it.openingBalance },
    )

    private fun JsonObjectBuilder.putOpt(key: String, value: Long?) { if (value != null) put(key, value) }
    private fun JsonObjectBuilder.putOpt(key: String, value: Int?) { if (value != null) put(key, value) }
    private fun JsonObjectBuilder.putOpt(key: String, value: String?) { if (value != null) put(key, value) }

    fun encode(d: FinanceData, exportedAtMillis: Long, appVersion: String): String {
        val s = summarize(d)
        val root = buildJsonObject {
            put("format", FORMAT)
            put("formatVersion", FORMAT_VERSION)
            put("appVersion", appVersion)
            put("exportedAt", exportedAtMillis)
            put("settings", buildJsonObject {
                put("paydayDay", d.settings.paydayDay); put("primaryBasis", d.settings.primaryBasis.name)
            })
            put("accounts", buildJsonArray {
                d.accounts.forEach { a ->
                    add(buildJsonObject {
                        put("id", a.id); put("name", a.name); put("type", a.type.name); put("currency", a.currency)
                        put("openingBalance", a.openingBalance); put("includeInAvailable", a.includeInAvailable); put("archived", a.archived)
                        put("memo", a.memo); put("sortOrder", a.sortOrder); putOpt("rateToKrwX10000", a.rateToKrwX10000)
                        put("createdAt", a.createdAt); put("updatedAt", a.updatedAt)
                    })
                }
            })
            put("categories", buildJsonArray {
                d.categories.forEach { c ->
                    add(buildJsonObject {
                        put("id", c.id); put("name", c.name); put("kind", c.kind.name); put("colorArgb", c.colorArgb)
                        put("sortOrder", c.sortOrder); put("archived", c.archived)
                    })
                }
            })
            put("transactions", buildJsonArray {
                d.transactions.forEach { t ->
                    add(buildJsonObject {
                        put("id", t.id); put("type", t.type.name); put("status", t.status.name); put("amount", t.amount)
                        put("currency", t.currency); put("date", t.date.toString()); putOpt("completedDate", t.completedDate?.toString())
                        putOpt("fromAccountId", t.fromAccountId); putOpt("toAccountId", t.toAccountId); putOpt("categoryId", t.categoryId)
                        put("memo", t.memo); put("source", t.source.name); putOpt("linkedPlannedId", t.linkedPlannedId); putOpt("toAmount", t.toAmount)
                        put("createdAt", t.createdAt); put("updatedAt", t.updatedAt)
                        putOpt("recurringId", t.recurringId); putOpt("recurringOccurrence", t.recurringOccurrence?.toString())
                    })
                }
            })
            put("budgets", buildJsonArray {
                d.budgets.forEach { b ->
                    add(buildJsonObject {
                        put("id", b.id); put("basis", b.basis.name); put("periodStart", b.periodStart.toString())
                        put("periodEndExclusive", b.periodEndExclusive.toString()); putOpt("categoryId", b.categoryId)
                        put("amount", b.amount); put("memo", b.memo)
                    })
                }
            })
            put("recurringRules", buildJsonArray {
                d.rules.forEach { r ->
                    add(buildJsonObject {
                        put("id", r.id); put("name", r.name); put("type", r.type.name); put("amount", r.amount); put("currency", r.currency)
                        putOpt("fromAccountId", r.fromAccountId); putOpt("toAccountId", r.toAccountId); putOpt("categoryId", r.categoryId)
                        put("frequency", r.frequency.name); put("interval", r.interval); putOpt("dayOfMonth", r.dayOfMonth)
                        putOpt("dayOfWeek", r.dayOfWeek?.isoDayNumber); put("startDate", r.startDate.toString())
                        putOpt("endDate", r.endDate?.toString()); put("active", r.active); putOpt("generatedThrough", r.generatedThrough?.toString())
                        put("memo", r.memo); put("createdAt", r.createdAt); put("updatedAt", r.updatedAt)
                    })
                }
            })
            put("summary", buildJsonObject {
                put("accounts", s.accounts); put("categories", s.categories); put("transactions", s.transactions)
                put("budgets", s.budgets); put("recurringRules", s.rules); put("transactionAmountSum", s.transactionAmountSum)
                put("openingBalanceSum", s.openingBalanceSum)
            })
        }
        return json.encodeToString(JsonObject.serializer(), root)
    }

    /** 파일 내용을 해석하고 검증한다. 문제가 있으면 [FinanceException](한국어 이유). */
    fun decode(text: String): FinanceData {
        val root = try { json.parseToJsonElement(text).jsonObject } catch (e: Exception) {
            throw FinanceException("백업 파일을 읽을 수 없습니다(JSON 형식 아님).")
        }
        if (root.str("format") != FORMAT) throw FinanceException("루인 가계부 백업 파일이 아닙니다.")
        val version = root.intOrNull("formatVersion") ?: -1
        if (version < 1 || version > FORMAT_VERSION) throw FinanceException("지원하지 않는 백업 형식 버전입니다($version). 앱을 업데이트하세요.")
        val data = try { parse(root) } catch (e: FinanceException) { throw e } catch (e: Exception) {
            throw FinanceException("백업 파일 내용이 올바르지 않습니다: ${e.message}")
        }
        verify(data, root.obj("summary"))
        return data
    }

    private fun parse(root: JsonObject): FinanceData {
        val st = root.obj("settings")
        val settings = FinanceSettings(st.int("paydayDay"), PeriodBasis.valueOf(st.req("primaryBasis")))
        val accounts = root.arr("accounts").map { o ->
            Account(o.long("id"), o.req("name"), AccountType.valueOf(o.req("type")), o.req("currency"),
                o.long("openingBalance"), o.bool("includeInAvailable"), o.bool("archived"), o.str("memo") ?: "",
                o.intOrNull("sortOrder") ?: 0, o.longOrNull("rateToKrwX10000"), o.longOrNull("createdAt") ?: 0, o.longOrNull("updatedAt") ?: 0)
        }
        val categories = root.arr("categories").map { o ->
            Category(o.long("id"), o.req("name"), CategoryKind.valueOf(o.req("kind")), o.long("colorArgb"),
                o.intOrNull("sortOrder") ?: 0, o.boolOrNull("archived") ?: false)
        }
        val transactions = root.arr("transactions").map { o ->
            Transaction(
                id = o.long("id"), type = TransactionType.valueOf(o.req("type")), status = TransactionStatus.valueOf(o.req("status")),
                amount = o.long("amount"), currency = o.req("currency"), date = LocalDate.parse(o.req("date")),
                completedDate = o.str("completedDate")?.let(LocalDate::parse),
                fromAccountId = o.longOrNull("fromAccountId"), toAccountId = o.longOrNull("toAccountId"), categoryId = o.longOrNull("categoryId"),
                memo = o.str("memo") ?: "", source = TransactionSource.valueOf(o.req("source")),
                linkedPlannedId = o.longOrNull("linkedPlannedId"), toAmount = o.longOrNull("toAmount"),
                createdAt = o.longOrNull("createdAt") ?: 0, updatedAt = o.longOrNull("updatedAt") ?: 0,
                recurringId = o.longOrNull("recurringId"), recurringOccurrence = o.str("recurringOccurrence")?.let(LocalDate::parse),
            )
        }
        val budgets = root.arr("budgets").map { o ->
            Budget(o.long("id"), PeriodBasis.valueOf(o.req("basis")), LocalDate.parse(o.req("periodStart")),
                LocalDate.parse(o.req("periodEndExclusive")), o.longOrNull("categoryId"), o.long("amount"), o.str("memo") ?: "")
        }
        val rules = (root["recurringRules"] as? JsonArray)?.map { it.jsonObject }?.map { o ->
            RecurringRule(
                id = o.long("id"), name = o.req("name"), type = TransactionType.valueOf(o.req("type")),
                amount = o.long("amount"), currency = o.req("currency"),
                fromAccountId = o.longOrNull("fromAccountId"), toAccountId = o.longOrNull("toAccountId"), categoryId = o.longOrNull("categoryId"),
                frequency = Frequency.valueOf(o.req("frequency")), interval = o.int("interval"),
                dayOfMonth = o.intOrNull("dayOfMonth"),
                dayOfWeek = o.intOrNull("dayOfWeek")?.let { n -> DayOfWeek.entries.first { it.isoDayNumber == n } },
                startDate = LocalDate.parse(o.req("startDate")), endDate = o.str("endDate")?.let(LocalDate::parse),
                active = o.bool("active"), generatedThrough = o.str("generatedThrough")?.let(LocalDate::parse),
                memo = o.str("memo") ?: "", createdAt = o.longOrNull("createdAt") ?: 0, updatedAt = o.longOrNull("updatedAt") ?: 0,
            )
        } ?: emptyList()
        return FinanceData(accounts, categories, transactions, budgets, settings, loaded = true, rules = rules)
    }

    /** 요약값 일치 + 참조 무결성(거래·예산·규칙이 가리키는 계좌·카테고리가 파일 안에 있는지) 검사. */
    private fun verify(d: FinanceData, summary: JsonObject) {
        val s = summarize(d)
        val expected = Summary(summary.int("accounts"), summary.int("categories"), summary.int("transactions"),
            summary.int("budgets"), summary.intOrNull("recurringRules") ?: 0, summary.long("transactionAmountSum"), summary.long("openingBalanceSum"))
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

    // ── JSON 읽기 도우미 (없는 필수 값은 예외 → "내용이 올바르지 않습니다") ──
    private fun JsonObject.value(key: String): JsonPrimitive? = (this[key] as? JsonPrimitive)?.takeIf { it !is JsonNull }
    private fun JsonObject.str(key: String): String? = value(key)?.takeIf { it.isString }?.content
    private fun JsonObject.req(key: String): String = str(key) ?: error("'$key' 값이 없습니다")
    private fun JsonObject.longOrNull(key: String): Long? = value(key)?.long
    private fun JsonObject.long(key: String): Long = longOrNull(key) ?: error("'$key' 값이 없습니다")
    private fun JsonObject.intOrNull(key: String): Int? = value(key)?.int
    private fun JsonObject.int(key: String): Int = intOrNull(key) ?: error("'$key' 값이 없습니다")
    private fun JsonObject.boolOrNull(key: String): Boolean? = value(key)?.boolean
    private fun JsonObject.bool(key: String): Boolean = boolOrNull(key) ?: error("'$key' 값이 없습니다")
    private fun JsonObject.obj(key: String): JsonObject = (this[key] as? JsonObject) ?: error("'$key' 항목이 없습니다")
    private fun JsonObject.arr(key: String): List<JsonObject> = ((this[key] as? JsonArray) ?: error("'$key' 항목이 없습니다")).map { it.jsonObject }

}
