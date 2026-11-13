package com.looin.finance.data

import androidx.room.withTransaction
import com.looin.finance.core.calc.TransactionActions
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.period.Period
import com.looin.finance.core.validation.AccountRules
import com.looin.finance.core.validation.TransactionValidator
import com.looin.finance.core.validation.ValidationResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn

/** 저장소 규칙 위반(사용자에게 그대로 보여줄 한국어 메시지). */
class FinanceException(message: String) : Exception(message)

/** 화면 계산에 필요한 전체 데이터 묶음. 계산 자체는 :core 의 계산기가 담당한다. */
data class FinanceData(
    val accounts: List<Account> = emptyList(),
    val categories: List<Category> = emptyList(),
    val transactions: List<Transaction> = emptyList(),
    val budgets: List<Budget> = emptyList(),
    val settings: FinanceSettings = FinanceSettings(),
    val loaded: Boolean = false,
) {
    val accountById by lazy { accounts.associateBy { it.id } }
    val categoryById by lazy { categories.associateBy { it.id } }
    fun categoryName(id: Long?) = id?.let { categoryById[it]?.name } ?: "미분류"
    fun accountName(id: Long?) = id?.let { accountById[it]?.name } ?: "-"
}

class FinanceRepository(
    private val db: FinanceDatabase,
    private val now: () -> Long = { System.currentTimeMillis() },
    private val today: () -> LocalDate = { Clock.System.todayIn(TimeZone.currentSystemDefault()) },
) {
    private val dao = db.dao()

    val data: Flow<FinanceData> = combine(
        dao.observeAccounts(),
        dao.observeCategories(),
        dao.observeTransactions(),
        dao.observeBudgets(),
        dao.observeSettings(),
    ) { a, c, t, b, s ->
        FinanceData(
            accounts = a.map { it.toModel() },
            categories = c.map { it.toModel() },
            transactions = t.map { it.toModel() },
            budgets = b.map { it.toModel() },
            settings = s?.toModel() ?: FinanceSettings(),
            loaded = true,
        )
    }

    val settings: Flow<FinanceSettings> = dao.observeSettings().map { it?.toModel() ?: FinanceSettings() }

    /** 최초 실행 시 기본 카테고리와 설정만 생성한다(샘플 거래·계좌는 만들지 않음). */
    suspend fun ensureInitialized() {
        dao.seedIfEmpty(DefaultData.categories(), FinanceSettings().toEntity())
    }

    suspend fun snapshot(): FinanceData = FinanceData(
        accounts = dao.accounts().map { it.toModel() },
        categories = dao.categories().map { it.toModel() },
        transactions = dao.transactions().map { it.toModel() },
        budgets = dao.budgets().map { it.toModel() },
        settings = dao.settings()?.toModel() ?: FinanceSettings(),
        loaded = true,
    )

    // ── 계좌 ──────────────────────────────────────────────

    suspend fun saveAccount(account: Account): Long = db.withTransaction {
        if (account.name.isBlank()) throw FinanceException("계좌 이름을 입력하세요.")
        val t = now()
        if (account.id == 0L) {
            dao.insertAccount(account.copy(createdAt = t, updatedAt = t).toEntity())
        } else {
            val old = dao.accounts().firstOrNull { it.id == account.id }?.toModel()
                ?: throw FinanceException("계좌를 찾을 수 없습니다.")
            val txs = dao.transactions().map { it.toModel() }
            if (old.currency != account.currency && txs.any { it.touches(account.id) }) {
                throw FinanceException("거래가 있는 계좌의 통화는 바꿀 수 없습니다.")
            }
            if (!old.archived && account.archived) {
                AccountRules.canArchive(old, txs)?.let { throw FinanceException(it) }
            }
            dao.updateAccount(account.copy(createdAt = old.createdAt, updatedAt = t).toEntity())
            account.id
        }
    }

    suspend fun setArchived(accountId: Long, archived: Boolean) {
        val acc = dao.accounts().firstOrNull { it.id == accountId }?.toModel() ?: throw FinanceException("계좌를 찾을 수 없습니다.")
        saveAccount(acc.copy(archived = archived, includeInAvailable = if (archived) false else acc.includeInAvailable))
    }

    /** 실제 잔고를 [targetBalance] 로 맞추는 조정 거래를 기록한다. 기록된 조정 거래가 곧 변경 이력이다. */
    suspend fun adjustBalance(accountId: Long, targetBalance: Long, date: LocalDate, memo: String): Transaction? =
        db.withTransaction {
            val acc = dao.accounts().firstOrNull { it.id == accountId }?.toModel()
                ?: throw FinanceException("계좌를 찾을 수 없습니다.")
            if (acc.archived) throw FinanceException("보관된 계좌는 조정할 수 없습니다.")
            if (date > today()) throw FinanceException("미래 날짜로 잔고를 조정할 수 없습니다.")
            val txs = dao.transactions().map { it.toModel() }
            val adj = AccountRules.adjustment(acc, txs, targetBalance, date, memo, now()) ?: return@withTransaction null
            val id = dao.insertTransaction(adj.toEntity())
            adj.copy(id = id)
        }

    // ── 거래 ──────────────────────────────────────────────

    suspend fun validate(tx: Transaction): ValidationResult {
        val s = snapshot()
        return TransactionValidator.validate(tx, s.accounts, s.categories, s.transactions, today())
    }

    /** 오류가 있으면 저장하지 않는다. 경고(잔액 부족 등)는 화면에서 사용자 확인을 받은 뒤 호출한다. */
    suspend fun saveTransaction(tx: Transaction): Long = db.withTransaction {
        val s = snapshot()
        val result = TransactionValidator.validate(tx, s.accounts, s.categories, s.transactions, today())
        if (!result.isValid) throw FinanceException(result.errors.joinToString("\n"))
        val t = now()
        if (tx.id == 0L) {
            dao.insertTransaction(tx.copy(createdAt = t, updatedAt = t).toEntity())
        } else {
            val old = dao.transaction(tx.id) ?: throw FinanceException("거래를 찾을 수 없습니다.")
            dao.updateTransaction(tx.copy(createdAt = old.createdAt, updatedAt = t).toEntity())
            tx.id
        }
    }

    suspend fun deleteTransaction(id: Long) = dao.deleteTransaction(id)

    suspend fun completeTransaction(id: Long, actualDate: LocalDate, actualAmount: Long?) {
        val tx = dao.transaction(id)?.toModel() ?: throw FinanceException("거래를 찾을 수 없습니다.")
        val done = runCatching { TransactionActions.complete(tx, actualDate, actualAmount, now()) }
            .getOrElse { throw FinanceException(it.message ?: "완료 처리할 수 없습니다.") }
        saveTransaction(done)
    }

    suspend fun cancelTransaction(id: Long) {
        val tx = dao.transaction(id)?.toModel() ?: throw FinanceException("거래를 찾을 수 없습니다.")
        dao.updateTransaction(TransactionActions.cancel(tx, now()).toEntity())
    }

    suspend fun reopenTransaction(id: Long) {
        val tx = dao.transaction(id)?.toModel() ?: throw FinanceException("거래를 찾을 수 없습니다.")
        saveTransaction(TransactionActions.reopen(tx, now()))
    }

    // ── 예산 ──────────────────────────────────────────────

    suspend fun saveBudget(budget: Budget): Long = db.withTransaction {
        if (budget.amount < 0) throw FinanceException("예산은 0원 이상이어야 합니다.")
        val duplicate = dao.budgets().any {
            it.id != budget.id && it.basis == budget.basis && it.periodStart == budget.periodStart &&
                it.categoryId == budget.categoryId
        }
        if (duplicate) throw FinanceException("이 기간에 같은 항목의 예산이 이미 있습니다.")
        if (budget.categoryId != null) {
            val cat = dao.categories().firstOrNull { it.id == budget.categoryId }
            if (cat == null || cat.kind != CategoryKind.EXPENSE) throw FinanceException("지출 카테고리만 예산을 설정할 수 있습니다.")
        }
        if (budget.id == 0L) dao.insertBudget(budget.toEntity()) else {
            dao.updateBudget(budget.toEntity()); budget.id
        }
    }

    suspend fun deleteBudget(id: Long) = dao.deleteBudget(id)

    /** 이전 기간 예산을 대상 기간으로 복사(이미 있는 항목은 건너뜀). 복사된 개수 반환. */
    suspend fun copyBudgets(from: Period, to: Period): Int = db.withTransaction {
        val all = dao.budgets().map { it.toModel() }
        val existing = all.filter { it.basis == to.basis && it.periodStart == to.start }.map { it.categoryId }.toSet()
        val source = all.filter { it.basis == from.basis && it.periodStart == from.start && it.categoryId !in existing }
        source.forEach {
            dao.insertBudget(it.copy(id = 0, basis = to.basis, periodStart = to.start, periodEndExclusive = to.endExclusive).toEntity())
        }
        source.size
    }

    // ── 카테고리·설정 ─────────────────────────────────────

    suspend fun saveCategory(category: Category): Long {
        if (category.name.isBlank()) throw FinanceException("카테고리 이름을 입력하세요.")
        return dao.upsertCategory(category.toEntity())
    }

    /** 기간 설정을 바꿔도 거래·예산 기록은 그대로 둔다(예산은 생성 당시 기간을 저장하고 있음). */
    suspend fun updateSettings(settings: FinanceSettings) {
        if (settings.paydayDay !in 1..31) throw FinanceException("급여 기준일은 1~31 사이여야 합니다.")
        dao.upsertSettings(settings.toEntity())
    }

    fun today(): LocalDate = today.invoke()
}

object DefaultData {
    private val expense = listOf(
        "식비" to 0xFFE57373, "카페·간식" to 0xFFFFB74D, "교통" to 0xFF64B5F6, "주거·관리비" to 0xFF9575CD,
        "통신" to 0xFF4DB6AC, "생활용품" to 0xFFA1887F, "의료·건강" to 0xFFF06292, "문화·여가" to 0xFF81C784,
        "쇼핑" to 0xFFBA68C8, "교육" to 0xFF7986CB, "경조사" to 0xFFFF8A65, "보험" to 0xFF90A4AE, "기타 지출" to 0xFFBDBDBD,
    )
    private val income = listOf(
        "급여" to 0xFF1E88E5, "부수입" to 0xFF43A047, "용돈" to 0xFF00ACC1, "이자·배당" to 0xFF5E35B1, "기타 수입" to 0xFF757575,
    )

    fun categories(): List<CategoryEntity> =
        expense.mapIndexed { i, (n, c) -> CategoryEntity(name = n, kind = CategoryKind.EXPENSE, colorArgb = c, sortOrder = i, archived = false) } +
            income.mapIndexed { i, (n, c) -> CategoryEntity(name = n, kind = CategoryKind.INCOME, colorArgb = c, sortOrder = i, archived = false) }
}

// ── 매퍼 ─────────────────────────────────────────────────

fun AccountEntity.toModel() = Account(id, name, type, currency, openingBalance, includeInAvailable, archived, memo, sortOrder, rateToKrwX10000, createdAt, updatedAt)
fun Account.toEntity() = AccountEntity(id, name.trim(), type, currency, openingBalance, includeInAvailable, archived, memo, sortOrder, rateToKrwX10000, createdAt, updatedAt)
fun CategoryEntity.toModel() = Category(id, name, kind, colorArgb, sortOrder, archived)
fun Category.toEntity() = CategoryEntity(id, name.trim(), kind, colorArgb, sortOrder, archived)
fun TransactionEntity.toModel() = Transaction(id, type, status, amount, currency, date, completedDate, fromAccountId, toAccountId, categoryId, memo, source, linkedPlannedId, toAmount, createdAt, updatedAt)
fun Transaction.toEntity() = TransactionEntity(id, type, status, amount, currency, date, completedDate, fromAccountId, toAccountId, categoryId, memo, source, linkedPlannedId, toAmount, createdAt, updatedAt)
fun BudgetEntity.toModel() = Budget(id, basis, periodStart, periodEndExclusive, categoryId, amount, memo)
fun Budget.toEntity() = BudgetEntity(id, basis, periodStart, periodEndExclusive, categoryId, amount, memo)
fun SettingsEntity.toModel() = FinanceSettings(paydayDay, primaryBasis)
fun FinanceSettings.toEntity() = SettingsEntity(1, paydayDay, primaryBasis)
