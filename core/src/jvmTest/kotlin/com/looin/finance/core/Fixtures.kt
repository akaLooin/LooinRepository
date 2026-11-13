package com.looin.finance.core

import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import kotlinx.datetime.LocalDate

object F {
    val today = LocalDate(2026, 11, 12)

    val checking = Account(id = 1, name = "주거래 통장", type = AccountType.CHECKING, openingBalance = 1_000_000, includeInAvailable = true)
    val savings = Account(id = 2, name = "적금", type = AccountType.SAVINGS, openingBalance = 500_000)
    val cash = Account(id = 3, name = "지갑", type = AccountType.CASH, openingBalance = 50_000, includeInAvailable = true)
    val card = Account(id = 4, name = "신용카드", type = AccountType.LIABILITY, openingBalance = -200_000)
    val usd = Account(id = 5, name = "달러 통장", type = AccountType.FOREIGN, currency = "USD", openingBalance = 10_000, rateToKrwX10000 = 1_400_0000)

    val accounts = listOf(checking, savings, cash, card)

    val food = Category(id = 10, name = "식비", kind = CategoryKind.EXPENSE)
    val transport = Category(id = 11, name = "교통", kind = CategoryKind.EXPENSE)
    val salary = Category(id = 20, name = "급여", kind = CategoryKind.INCOME)
    val categories = listOf(food, transport, salary)

    private var nextId = 100L

    fun expense(
        amount: Long,
        date: LocalDate = today,
        status: TransactionStatus = TransactionStatus.COMPLETED,
        from: Long = checking.id,
        category: Long? = food.id,
    ) = Transaction(
        id = nextId++, type = TransactionType.EXPENSE, status = status, amount = amount,
        date = date, completedDate = if (status == TransactionStatus.COMPLETED) date else null,
        fromAccountId = from, categoryId = category,
    )

    fun income(
        amount: Long,
        date: LocalDate = today,
        status: TransactionStatus = TransactionStatus.COMPLETED,
        to: Long = checking.id,
    ) = Transaction(
        id = nextId++, type = TransactionType.INCOME, status = status, amount = amount,
        date = date, completedDate = if (status == TransactionStatus.COMPLETED) date else null,
        toAccountId = to, categoryId = salary.id,
    )

    fun transfer(
        amount: Long,
        from: Long,
        to: Long,
        date: LocalDate = today,
        status: TransactionStatus = TransactionStatus.COMPLETED,
    ) = Transaction(
        id = nextId++, type = TransactionType.TRANSFER, status = status, amount = amount,
        date = date, completedDate = if (status == TransactionStatus.COMPLETED) date else null,
        fromAccountId = from, toAccountId = to,
    )
}
