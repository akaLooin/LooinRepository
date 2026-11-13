package com.looin.finance.core.csv

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.KRW
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.money.MoneyFormat
import com.looin.finance.core.validation.TransactionValidator
import kotlinx.datetime.LocalDate

/** RFC 4180 CSV 읽기·쓰기(따옴표·쉼표·줄바꿈 포함 값, BOM, CRLF). */
object Csv {
    const val BOM = "﻿"

    fun escape(v: String): String =
        if (v.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) "\"" + v.replace("\"", "\"\"") + "\"" else v

    fun write(header: List<String>, rows: List<List<String>>): String =
        BOM + (listOf(header) + rows).joinToString("\r\n") { r -> r.joinToString(",") { escape(it) } } + "\r\n"

    fun parse(text: String): List<List<String>> {
        val src = text.removePrefix(BOM)
        val rows = mutableListOf<List<String>>()
        var row = mutableListOf<String>()
        val cell = StringBuilder()
        var quoted = false
        var i = 0
        while (i < src.length) {
            val ch = src[i]
            if (quoted) {
                when {
                    ch == '"' && i + 1 < src.length && src[i + 1] == '"' -> { cell.append('"'); i++ }
                    ch == '"' -> quoted = false
                    else -> cell.append(ch)
                }
            } else when (ch) {
                '"' -> quoted = true
                ',' -> { row.add(cell.toString()); cell.clear() }
                '\r' -> Unit
                '\n' -> { row.add(cell.toString()); cell.clear(); rows.add(row); row = mutableListOf() }
                else -> cell.append(ch)
            }
            i++
        }
        if (cell.isNotEmpty() || row.isNotEmpty()) { row.add(cell.toString()); rows.add(row) }
        return rows.filter { r -> r.any { it.isNotBlank() } }
    }
}

/** 거래 → CSV (엑셀에서 바로 열리는 UTF-8 BOM). 이 앱의 가져오기와 같은 열 구성. */
object TransactionCsvExport {
    val HEADER = listOf("날짜", "실제 처리일", "상태", "유형", "금액", "통화", "출금 계좌", "입금 계좌", "카테고리", "메모", "반복")

    fun export(txs: List<Transaction>, accountName: (Long?) -> String, categoryName: (Long?) -> String): String =
        Csv.write(HEADER, txs.sortedWith(compareBy<Transaction> { it.date }.thenBy { it.id }).map { t ->
            listOf(
                t.date.toString(), t.completedDate?.toString() ?: "", t.status.label, t.type.label,
                MoneyFormat.number(t.amount, t.currency).replace(",", ""), t.currency,
                t.fromAccountId?.let(accountName) ?: "", t.toAccountId?.let(accountName) ?: "",
                t.categoryId?.let(categoryName) ?: "", t.memo, if (t.recurringId != null) "예" else "",
            )
        })
}

enum class ImportStatus(val label: String) { NEW("새 거래"), DUPLICATE("중복(건너뜀)"), ERROR("오류") }

data class ImportItem(val line: Int, val status: ImportStatus, val tx: Transaction?, val message: String = "", val raw: List<String> = emptyList())

data class ImportPreview(val items: List<ImportItem>, val usedDefaultAccount: Boolean, val format: String) {
    val newItems get() = items.filter { it.status == ImportStatus.NEW }
    val duplicates get() = items.count { it.status == ImportStatus.DUPLICATE }
    val errors get() = items.count { it.status == ImportStatus.ERROR }
}

/**
 * CSV → 거래 가져오기 미리보기(저장 전).
 *
 * 지원 형식(머리글 이름으로 자동 판단):
 *  1) 이 앱이 내보낸 CSV: 날짜·상태·유형·금액·출금 계좌·입금 계좌·카테고리·메모
 *  2) 은행 거래내역형: 날짜(거래일·일자) + 출금액/입금액 두 열(또는 부호 있는 금액 한 열) + 적요·내용·메모
 * 유형 열이 없으면 금액 부호로 판단한다(음수 = 지출, 양수 = 수입).
 * 계좌 열이 없거나 이름이 맞지 않으면 [defaultAccountId] 를 쓴다. 카테고리는 같은 이름이 있을 때만 붙인다(없으면 미분류).
 *
 * 중복: 이미 있는 거래(취소 제외) 또는 파일 앞줄과 유형·금액·날짜·계좌가 같고, 메모가 같거나 한쪽이 비어 있으면 중복으로 보고 건너뛴다.
 * 오늘 이후 날짜는 '예정'으로, 이전은 '완료'로 들어간다(상태 열이 있으면 그 값을 따름).
 */
object TransactionCsvImport {
    private val DATE = listOf("날짜", "거래일", "거래일자", "일자", "거래일시", "date")
    private val AMOUNT = listOf("금액", "거래금액", "amount")
    private val OUT = listOf("출금액", "출금", "찾으신금액", "지출")
    private val IN = listOf("입금액", "입금", "맡기신금액", "수입")
    private val MEMO = listOf("메모", "적요", "내용", "거래내용", "기재내용", "memo")
    private val TYPE = listOf("유형", "구분", "거래구분")
    private val STATUS = listOf("상태")
    private val FROM = listOf("출금 계좌", "출금계좌")
    private val TO = listOf("입금 계좌", "입금계좌")
    private val ACCOUNT = listOf("계좌", "계좌명")
    private val CATEGORY = listOf("카테고리", "분류")
    private val ACTUAL = listOf("실제 처리일")

    fun preview(
        text: String,
        accounts: List<Account>,
        categories: List<Category>,
        existing: List<Transaction>,
        defaultAccountId: Long?,
        today: LocalDate,
        now: Long = 0,
    ): ImportPreview {
        val rows = Csv.parse(text)
        if (rows.isEmpty()) return ImportPreview(emptyList(), false, "빈 파일")
        val header = rows.first().map { it.trim().lowercase() }
        fun col(names: List<String>) = header.indexOfFirst { h -> names.any { it.lowercase() == h } }.takeIf { it >= 0 }
        val cDate = col(DATE); val cAmount = col(AMOUNT); val cOut = col(OUT); val cIn = col(IN)
        val cMemo = col(MEMO); val cType = col(TYPE); val cStatus = col(STATUS); val cFrom = col(FROM); val cTo = col(TO)
        val cAccount = col(ACCOUNT); val cCategory = col(CATEGORY); val cActual = col(ACTUAL)
        if (cDate == null || (cAmount == null && cOut == null && cIn == null)) {
            return ImportPreview(listOf(ImportItem(1, ImportStatus.ERROR, null, "날짜와 금액(또는 출금액/입금액) 열을 찾을 수 없습니다. 첫 줄에 열 이름이 있어야 합니다.")), false, "알 수 없음")
        }
        val format = if (cFrom != null || cTo != null) "루인 가계부 형식" else if (cOut != null || cIn != null) "은행 거래내역 형식" else "날짜·금액 형식"
        val activeAccounts = accounts.filter { !it.archived }
        fun accountByName(n: String?) = n?.trim()?.takeIf { it.isNotEmpty() }?.let { name -> activeAccounts.firstOrNull { it.name == name } }
        val default = defaultAccountId?.let { id -> activeAccounts.firstOrNull { it.id == id } }
        var usedDefault = false
        val accepted = mutableListOf<Transaction>()
        val pool = existing.filter { !it.isCancelled }

        val items = rows.drop(1).mapIndexed { idx, r ->
            val line = idx + 2
            fun get(c: Int?) = c?.let { r.getOrNull(it)?.trim() } ?: ""
            try {
                val date = parseDate(get(cDate)) ?: return@mapIndexed ImportItem(line, ImportStatus.ERROR, null, "날짜를 읽을 수 없습니다: '${get(cDate)}'", r)
                // 유형·금액
                val type: TransactionType
                val amount: Long
                val typeText = get(cType)
                if (cOut != null || cIn != null) {
                    val out = parseAmount(get(cOut)) ?: 0; val inn = parseAmount(get(cIn)) ?: 0
                    if (out == 0L && inn == 0L) return@mapIndexed ImportItem(line, ImportStatus.ERROR, null, "출금액·입금액이 모두 비어 있습니다.", r)
                    type = if (out != 0L) TransactionType.EXPENSE else TransactionType.INCOME
                    amount = kotlin.math.abs(if (out != 0L) out else inn)
                } else {
                    val a = parseAmount(get(cAmount)) ?: return@mapIndexed ImportItem(line, ImportStatus.ERROR, null, "금액을 읽을 수 없습니다: '${get(cAmount)}'", r)
                    type = when {
                        typeText.contains("이체") -> TransactionType.TRANSFER
                        typeText.contains("수입") || typeText.contains("입금") -> TransactionType.INCOME
                        typeText.contains("지출") || typeText.contains("출금") -> TransactionType.EXPENSE
                        typeText.contains("조정") -> return@mapIndexed ImportItem(line, ImportStatus.ERROR, null, "잔고 조정은 가져오지 않습니다(계좌 화면에서 조정하세요).", r)
                        // 유형 열이 없거나 값이 없으면 부호로 판단: 음수 = 지출, 양수 = 수입 (은행 거래내역 관례)
                        a < 0 -> TransactionType.EXPENSE
                        else -> TransactionType.INCOME
                    }
                    amount = kotlin.math.abs(a)
                }
                // 계좌
                val accountCell = accountByName(get(cAccount))
                var from: Account? = null; var to: Account? = null
                when (type) {
                    TransactionType.EXPENSE -> from = accountByName(get(cFrom)) ?: accountCell ?: default.also { usedDefault = true }
                    TransactionType.INCOME -> to = accountByName(get(cTo)) ?: accountCell ?: default.also { usedDefault = true }
                    else -> { from = accountByName(get(cFrom)); to = accountByName(get(cTo)) }
                }
                if (type == TransactionType.TRANSFER && (from == null || to == null)) {
                    return@mapIndexed ImportItem(line, ImportStatus.ERROR, null, "이체의 출금·입금 계좌 이름이 앱의 계좌와 맞지 않습니다.", r)
                }
                // 상태
                val statusText = get(cStatus)
                val status = when {
                    statusText.contains("취소") -> TransactionStatus.CANCELLED
                    statusText.contains("예정") -> TransactionStatus.PLANNED
                    statusText.contains("완료") -> TransactionStatus.COMPLETED
                    date > today -> TransactionStatus.PLANNED
                    else -> TransactionStatus.COMPLETED
                }
                val kind = if (type == TransactionType.INCOME) CategoryKind.INCOME else CategoryKind.EXPENSE
                val category = if (type == TransactionType.TRANSFER) null
                    else get(cCategory).takeIf { it.isNotEmpty() }?.let { n -> categories.firstOrNull { it.name == n && it.kind == kind && !it.archived } }
                val currency = (from ?: to)?.currency ?: KRW
                val actual = parseDate(get(cActual))
                val tx = Transaction(
                    type = type, status = status, amount = amount, currency = currency, date = date,
                    completedDate = if (status == TransactionStatus.COMPLETED) (actual ?: date) else null,
                    fromAccountId = from?.id, toAccountId = to?.id, categoryId = category?.id,
                    memo = get(cMemo), source = TransactionSource.IMPORT, createdAt = now, updatedAt = now,
                )
                val v = TransactionValidator.validate(tx, accounts, categories, emptyList(), today)
                if (!v.isValid) return@mapIndexed ImportItem(line, ImportStatus.ERROR, tx, v.errors.joinToString(" "), r)
                if (status != TransactionStatus.CANCELLED && (pool + accepted).any { isDuplicate(it, tx) }) {
                    return@mapIndexed ImportItem(line, ImportStatus.DUPLICATE, tx, "같은 날짜·금액·계좌의 거래가 이미 있습니다.", r)
                }
                accepted += tx
                ImportItem(line, ImportStatus.NEW, tx, "", r)
            } catch (e: Exception) {
                ImportItem(line, ImportStatus.ERROR, null, "읽을 수 없는 줄입니다: ${e.message}", r)
            }
        }
        return ImportPreview(items, usedDefault, format)
    }

    fun isDuplicate(a: Transaction, b: Transaction): Boolean =
        a.type == b.type && a.amount == b.amount && a.effectiveDate == b.effectiveDate &&
            a.fromAccountId == b.fromAccountId && a.toAccountId == b.toAccountId &&
            (a.memo.isBlank() || b.memo.isBlank() || a.memo.trim() == b.memo.trim())

    /** 2026-11-13 / 2026.11.13 / 2026/11/13 / 20261113 / "2026-11-13 14:22" / 26.11.13 */
    fun parseDate(s: String): LocalDate? {
        val t = s.trim().substringBefore(' ').substringBefore('T')
        if (t.isEmpty()) return null
        val parts = t.split('-', '.', '/').filter { it.isNotEmpty() }
        return runCatching {
            when {
                parts.size == 3 -> {
                    var y = parts[0].toInt(); if (y < 100) y += 2000
                    LocalDate(y, parts[1].toInt(), parts[2].toInt())
                }
                parts.size == 1 && t.length == 8 && t.all { it.isDigit() } -> LocalDate(t.substring(0, 4).toInt(), t.substring(4, 6).toInt(), t.substring(6, 8).toInt())
                else -> null
            }
        }.getOrNull()
    }

    /** "12,000", "-12,000원", "₩12,000", "(12,000)" → 원 단위. 소수(외화)는 지원하지 않는다. */
    fun parseAmount(s: String): Long? {
        var t = s.trim().replace(",", "").replace("원", "").replace("₩", "").replace(" ", "")
        if (t.isEmpty()) return null
        var negative = false
        if (t.startsWith("(") && t.endsWith(")")) { negative = true; t = t.drop(1).dropLast(1) }
        if (t.startsWith("-")) { negative = !negative; t = t.drop(1) }
        if (t.startsWith("+")) t = t.drop(1)
        if (t.isEmpty() || !t.all { it.isDigit() } || t.length > 15) return null
        return if (negative) -t.toLong() else t.toLong()
    }
}
