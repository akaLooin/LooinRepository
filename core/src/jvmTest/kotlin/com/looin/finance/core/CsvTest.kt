package com.looin.finance.core

import com.looin.finance.core.csv.Csv
import com.looin.finance.core.csv.ImportStatus
import com.looin.finance.core.csv.TransactionCsvExport
import com.looin.finance.core.csv.TransactionCsvImport
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CsvTest {
    private val accounts = F.accounts
    private fun acc(id: Long?) = accounts.firstOrNull { it.id == id }?.name ?: ""
    private fun cat(id: Long?) = F.categories.firstOrNull { it.id == id }?.name ?: ""
    private fun preview(text: String, existing: List<com.looin.finance.core.model.Transaction> = emptyList(), default: Long? = F.checking.id) =
        TransactionCsvImport.preview(text, accounts, F.categories, existing, default, F.today)

    @Test fun parsesQuotesCommasNewlinesAndBom() {
        val rows = Csv.parse("﻿날짜,메모\r\n2026-11-01,\"점심, 회사\"\r\n2026-11-02,\"줄\n바꿈 \"\"인용\"\"\"\r\n")
        assertEquals(listOf("날짜", "메모"), rows[0])
        assertEquals("점심, 회사", rows[1][1])
        assertEquals("줄\n바꿈 \"인용\"", rows[2][1])
    }

    @Test fun exportThenImportIsAllDuplicates() {
        val txs = listOf(
            F.expense(12_000, date = LocalDate(2026, 11, 3)).copy(memo = "점심, 회사"),
            F.income(3_000_000, date = LocalDate(2026, 10, 25)),
            F.transfer(100_000, F.checking.id, F.savings.id, date = LocalDate(2026, 11, 1)),
            F.expense(50_000, date = LocalDate(2026, 11, 20), status = TransactionStatus.PLANNED).copy(memo = "월세"),
        )
        val csv = TransactionCsvExport.export(txs, ::acc, ::cat)
        assertTrue(csv.startsWith(Csv.BOM))
        // 빈 앱에 가져오면 4건 모두 새 거래로, 원래 값 그대로
        val fresh = preview(csv)
        assertEquals("루인 가계부 형식", fresh.format)
        assertEquals(4, fresh.newItems.size)
        val imported = fresh.newItems.map { it.tx!! }
        assertEquals(txs.map { it.type to it.amount }.toSet(), imported.map { it.type to it.amount }.toSet())
        assertEquals("점심, 회사", imported.first { it.amount == 12_000L }.memo)
        assertEquals(TransactionStatus.PLANNED, imported.first { it.memo == "월세" }.status)
        assertEquals(F.food.id, imported.first { it.amount == 12_000L }.categoryId)
        // 같은 데이터가 이미 있으면 모두 중복으로 건너뜀
        val again = preview(csv, existing = txs)
        assertEquals(0, again.newItems.size)
        assertEquals(4, again.duplicates)
    }

    @Test fun bankStatementWithSplitColumns() {
        val csv = """
            거래일시,적요,출금액,입금액,잔액
            2026.11.01 09:12,스타벅스,"4,800",,995200
            2026.11.02,급여,,"3,000,000",3995200
            2026.11.02,급여,,"3,000,000",3995200
            20261103,빈 줄,,,
        """.trimIndent()
        val p = preview(csv)
        assertEquals("은행 거래내역 형식", p.format)
        assertTrue(p.usedDefaultAccount)
        val first = p.items[0].tx!!
        assertEquals(TransactionType.EXPENSE, first.type)
        assertEquals(4_800, first.amount)
        assertEquals(F.checking.id, first.fromAccountId)
        assertEquals(LocalDate(2026, 11, 1), first.date)
        assertEquals(TransactionType.INCOME, p.items[1].tx!!.type)
        assertEquals(ImportStatus.DUPLICATE, p.items[2].status)   // 파일 안의 중복도 건너뜀
        assertEquals(ImportStatus.ERROR, p.items[3].status)       // 금액 없음
        assertEquals(5, p.items[3].line)                           // 줄 번호(머리글 = 1)
    }

    @Test fun signedAmountAndFutureBecomesPlanned() {
        val csv = "날짜,금액,메모\n2026-11-10,-12000,점심\n2026-11-25,3000000,급여\n2026-12-01,-50000,여행"
        val p = preview(csv)
        assertEquals(TransactionType.EXPENSE, p.items[0].tx!!.type)
        assertEquals(TransactionType.INCOME, p.items[1].tx!!.type)
        assertEquals(TransactionStatus.PLANNED, p.items[1].tx!!.status) // 오늘(11/12) 이후 → 예정
        assertEquals(TransactionStatus.PLANNED, p.items[2].tx!!.status)
    }

    @Test fun errorsAreReportedNotThrown() {
        assertEquals(ImportStatus.ERROR, preview("메모,값\n점심,1").items.single().status)
        val p = preview("날짜,금액\n2026-13-40,1000\n2026-11-01,abc")
        assertTrue(p.items.all { it.status == ImportStatus.ERROR })
        // 계좌가 하나도 없으면(기본 계좌 없음) 검증 오류
        assertEquals(ImportStatus.ERROR, preview("날짜,금액\n2026-11-01,-1000", default = null).items.single().status)
    }

    @Test fun dateAndAmountFormats() {
        assertEquals(LocalDate(2026, 11, 13), TransactionCsvImport.parseDate("2026/11/13"))
        assertEquals(LocalDate(2026, 11, 13), TransactionCsvImport.parseDate("26.11.13"))
        assertEquals(LocalDate(2026, 11, 13), TransactionCsvImport.parseDate("2026-11-13T10:00"))
        assertNull(TransactionCsvImport.parseDate("어제"))
        assertEquals(-12_000L, TransactionCsvImport.parseAmount("-12,000원"))
        assertEquals(-12_000L, TransactionCsvImport.parseAmount("(12,000)"))
        assertEquals(12_000L, TransactionCsvImport.parseAmount("₩12,000"))
        assertNull(TransactionCsvImport.parseAmount("12.5"))
    }
}
