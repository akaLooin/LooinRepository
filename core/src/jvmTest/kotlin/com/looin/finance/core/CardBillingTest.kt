package com.looin.finance.core

import com.looin.finance.core.card.CardBilling
import com.looin.finance.core.model.TransactionStatus
import kotlinx.datetime.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CardBillingTest {
    private val card = F.card.copy(billingDay = 14, billingStartDay = 1, billingAccountId = F.checking.id)

    /** 14일 결제·전월 1일~말일: 12월 14일 결제분 = 11월 이용분 */
    @Test fun statementPeriods() {
        val st = CardBilling.statement(card, 2026, 12)!!
        assertEquals(LocalDate(2026, 12, 14), st.paymentDate)
        assertEquals(LocalDate(2026, 11, 1), st.start)
        assertEquals(LocalDate(2026, 12, 1), st.endExclusive)
        // 25일 결제·전월 12일~당월 11일, 2월은 말일 처리
        val c2 = card.copy(billingDay = 31, billingStartDay = 12)
        val feb = CardBilling.statement(c2, 2027, 2)!!
        assertEquals(LocalDate(2027, 2, 28), feb.paymentDate)
        assertEquals(LocalDate(2027, 1, 12), feb.start)
        assertEquals(LocalDate(2027, 2, 12), feb.endExclusive)
    }

    /** 오늘 11/16: 결제일이 지나지 않았고 이용이 시작된 명세 = 11/14 은 지남 → 12/14(11월 이용) 하나 */
    @Test fun activeStatements() {
        val a = CardBilling.activeStatements(card, LocalDate(2026, 11, 16))
        assertEquals(listOf(LocalDate(2026, 12, 14)), a.map { it.paymentDate })
        // 시작일 12: 11/16 은 12/25 결제분(11/12~12/11) 이용 중, 11/25 결제분(10/12~11/11)도 아직 결제 전
        val c2 = card.copy(billingDay = 25, billingStartDay = 12)
        assertEquals(listOf(LocalDate(2026, 11, 25), LocalDate(2026, 12, 25)), CardBilling.activeStatements(c2, LocalDate(2026, 11, 16)).map { it.paymentDate })
        assertTrue(CardBilling.activeStatements(card.copy(billingAccountId = null), LocalDate(2026, 11, 16)).isEmpty())
    }

    /** 금액: 이용 기간 카드 지출(예정 포함) − 환불, 다른 계좌·이체·취소·기간 밖 제외 */
    @Test fun amount() {
        val st = CardBilling.statement(card, 2026, 12)!!
        val txs = listOf(
            F.expense(30_000, date = LocalDate(2026, 11, 3), from = F.card.id),
            F.expense(20_000, date = LocalDate(2026, 11, 28), status = TransactionStatus.PLANNED, from = F.card.id),
            F.expense(9_000, date = LocalDate(2026, 11, 5), from = F.card.id).copy(status = TransactionStatus.CANCELLED),
            F.income(5_000, date = LocalDate(2026, 11, 10)).copy(toAccountId = F.card.id),       // 환불
            F.expense(70_000, date = LocalDate(2026, 10, 30), from = F.card.id),                  // 지난 이용 기간
            F.expense(40_000, date = LocalDate(2026, 11, 3)),                                     // 다른 계좌
            F.transfer(100_000, F.checking.id, F.card.id, date = LocalDate(2026, 11, 14)),       // 지난 결제
        )
        assertEquals(45_000L, CardBilling.amount(card, txs, st))
    }
}
