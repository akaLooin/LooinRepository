package com.looin.finance.data

import androidx.room.immediateTransaction
import androidx.room.useWriterConnection
import com.looin.finance.core.calc.TransactionActions
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Category
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.recurring.RecurrenceCalculator
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.isoDayNumber
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
    val rules: List<RecurringRule> = emptyList(),
) {
    val accountById by lazy { accounts.associateBy { it.id } }
    val categoryById by lazy { categories.associateBy { it.id } }
    fun categoryName(id: Long?) = id?.let { categoryById[it]?.name } ?: "미분류"
    fun accountName(id: Long?) = id?.let { accountById[it]?.name } ?: "-"
}

class FinanceRepository(
    private val db: FinanceDatabase,
    private val now: () -> Long = { Clock.System.now().toEpochMilliseconds() },
    private val today: () -> LocalDate = { Clock.System.todayIn(TimeZone.currentSystemDefault()) },
) {
    private val dao = db.dao()

    /**
     * 쓰기 트랜잭션. 블록 안의 DAO 호출은 같은 연결을 쓰고, 예외가 나면 전부 되돌린다.
     * 중첩 호출(예: 규칙 저장 → 반복 생성)은 같은 트랜잭션 안의 중첩 트랜잭션으로 처리된다.
     */
    private suspend fun <R> tx(block: suspend () -> R): R =
        db.useWriterConnection { connection -> connection.immediateTransaction { block() } }

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
    }.combine(dao.observeRules()) { d, r -> d.copy(rules = r.map { it.toModel() }) }

    val settings: Flow<FinanceSettings> = dao.observeSettings().map { it?.toModel() ?: FinanceSettings() }

    /** 최초 실행 시 기본 카테고리와 설정만 생성한다(샘플 거래·계좌는 만들지 않음). */
    suspend fun ensureInitialized() {
        tx {
            if (dao.settings() == null) {
                if (dao.categories().isEmpty()) dao.insertCategories(DefaultData.categories())
                dao.upsertSettings(FinanceSettings().toEntity())
            }
        }
        generateRecurring()
    }

    suspend fun snapshot(): FinanceData = FinanceData(
        accounts = dao.accounts().map { it.toModel() },
        categories = dao.categories().map { it.toModel() },
        transactions = dao.transactions().map { it.toModel() },
        budgets = dao.budgets().map { it.toModel() },
        settings = dao.settings()?.toModel() ?: FinanceSettings(),
        loaded = true,
        rules = dao.rules().map { it.toModel() },
    )

    // ── 반복 거래 ─────────────────────────────────────────

    /**
     * 반복 규칙의 예정 거래 생성 범위: 주 회계 기간 기준 "다음 기간"의 마지막 날까지.
     * 그래서 이번 기간과 다음 기간의 예상 잔고·예산 확보액에 정기 결제가 빠짐없이 들어간다.
     */
    suspend fun recurringHorizon(): LocalDate {
        val st = dao.settings()?.toModel() ?: FinanceSettings()
        val current = PeriodCalculator.periodContaining(today(), st.primaryBasis, st.paydayDay)
        return PeriodCalculator.next(current, st.paydayDay).lastDay
    }

    /** 모든 활성 규칙에 대해 아직 만들지 않은 예정 거래를 만든다. 여러 번 호출해도 중복이 생기지 않는다. 만든 개수 반환. */
    suspend fun generateRecurring(): Int = tx {
        val horizon = recurringHorizon()
        var created = 0
        for (rule in dao.rules().map { it.toModel() }) {
            val (txs, through) = RecurrenceCalculator.plan(rule, today(), horizon, now())
            if (txs.isNotEmpty()) created += dao.insertGenerated(txs.map { it.toEntity() }).count { it != -1L }
            if (through != rule.generatedThrough) dao.updateRule(rule.copy(generatedThrough = through).toEntity())
        }
        created
    }

    /**
     * 규칙 저장. 수정이면 오늘 이후의 "아직 처리하지 않은" 예정 발생분을 지우고 새 규칙으로 다시 만든다.
     * 이미 완료·취소한 거래와 지난 예정 거래는 그대로 둔다.
     */
    suspend fun saveRule(rule: RecurringRule): Long = tx {
        val errors = RecurrenceCalculator.validate(rule).toMutableList()
        val s = snapshot()
        val template = RecurrenceCalculator.template(rule)
        errors += TransactionValidator.validate(template, s.accounts, s.categories, emptyList(), rule.startDate).errors
        if (errors.isNotEmpty()) throw FinanceException(errors.distinct().joinToString("\n"))
        val t = now()
        val id = if (rule.id == 0L) {
            dao.insertRule(rule.copy(generatedThrough = null, createdAt = t, updatedAt = t).toEntity())
        } else {
            val old = s.rules.firstOrNull { it.id == rule.id } ?: throw FinanceException("반복 규칙을 찾을 수 없습니다.")
            dao.deletePlannedOccurrences(rule.id, today())
            dao.updateRule(rule.copy(generatedThrough = null, createdAt = old.createdAt, updatedAt = t).toEntity())
            rule.id
        }
        generateRecurring()
        id
    }

    /** 규칙 삭제. 오늘 이후의 미처리 예정 발생분도 함께 지운다(완료·취소 기록은 보존). */
    suspend fun deleteRule(id: Long) = tx {
        dao.deletePlannedOccurrences(id, today())
        dao.deleteRule(id)
    }

    // ── 계좌 ──────────────────────────────────────────────

    suspend fun saveAccount(account: Account): Long = tx {
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
                if (dao.rules().any { it.active && (it.fromAccountId == account.id || it.toAccountId == account.id) }) {
                    throw FinanceException("이 계좌를 쓰는 반복 거래가 있어 보관할 수 없습니다. 반복 거래를 먼저 끄거나 지우세요.")
                }
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
        tx {
            val acc = dao.accounts().firstOrNull { it.id == accountId }?.toModel()
                ?: throw FinanceException("계좌를 찾을 수 없습니다.")
            if (acc.archived) throw FinanceException("보관된 계좌는 조정할 수 없습니다.")
            if (date > today()) throw FinanceException("미래 날짜로 잔고를 조정할 수 없습니다.")
            val txs = dao.transactions().map { it.toModel() }
            val adj = AccountRules.adjustment(acc, txs, targetBalance, date, memo, now()) ?: return@tx null
            val id = dao.insertTransaction(adj.toEntity())
            adj.copy(id = id)
        }

    // ── 거래 ──────────────────────────────────────────────

    suspend fun validate(tx: Transaction): ValidationResult {
        val s = snapshot()
        return TransactionValidator.validate(tx, s.accounts, s.categories, s.transactions, today())
    }

    /** 오류가 있으면 저장하지 않는다. 경고(잔액 부족 등)는 화면에서 사용자 확인을 받은 뒤 호출한다. */
    suspend fun saveTransaction(tx: Transaction): Long = tx {
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

    suspend fun saveBudget(budget: Budget): Long = tx {
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
    suspend fun copyBudgets(from: Period, to: Period): Int = tx {
        val all = dao.budgets().map { it.toModel() }
        val existing = all.filter { it.basis == to.basis && it.periodStart == to.start }.map { it.categoryId }.toSet()
        val source = all.filter { it.basis == from.basis && it.periodStart == from.start && it.categoryId !in existing }
        source.forEach {
            dao.insertBudget(it.copy(id = 0, basis = to.basis, periodStart = to.start, periodEndExclusive = to.endExclusive).toEntity())
        }
        source.size
    }

    // ── 카테고리·설정 ─────────────────────────────────────

    /**
     * 카테고리 추가·수정. 같은 종류 안에서 이름 중복 금지, 거래·예산·반복 규칙에 쓰인 카테고리는 수입↔지출 변경 금지.
     * 삭제 대신 보관(archived)을 쓴다: 지난 거래·예산 기록이 카테고리를 계속 가리킬 수 있게.
     */
    suspend fun saveCategory(category: Category): Long = tx {
        val name = category.name.trim()
        if (name.isBlank()) throw FinanceException("카테고리 이름을 입력하세요.")
        if (name.length > 20) throw FinanceException("카테고리 이름은 20자 이내로 입력하세요.")
        val all = dao.categories().map { it.toModel() }
        if (all.any { it.id != category.id && it.kind == category.kind && it.name == name }) {
            throw FinanceException("같은 이름의 ${category.kind.label} 카테고리가 이미 있습니다.")
        }
        if (category.id == 0L) {
            dao.upsertCategory(category.copy(name = name, sortOrder = all.count { it.kind == category.kind }).toEntity())
        } else {
            val old = all.firstOrNull { it.id == category.id } ?: throw FinanceException("카테고리를 찾을 수 없습니다.")
            if (old.kind != category.kind) {
                val used = dao.transactions().any { it.categoryId == category.id } || dao.budgets().any { it.categoryId == category.id } ||
                    dao.rules().any { it.categoryId == category.id }
                if (used) throw FinanceException("거래·예산에 쓰인 카테고리는 수입/지출 종류를 바꿀 수 없습니다.")
            }
            dao.upsertCategory(category.copy(name = name).toEntity())
            category.id
        }
    }

    /** 기간 설정을 바꿔도 거래·예산 기록은 그대로 둔다(예산은 생성 당시 기간을 저장하고 있음). */
    suspend fun updateSettings(settings: FinanceSettings) {
        if (settings.paydayDay !in 1..31) throw FinanceException("급여 기준일은 1~31 사이여야 합니다.")
        dao.upsertSettings(settings.toEntity())
        generateRecurring() // 기간 기준이 바뀌면 반복 거래 생성 범위도 바뀐다
    }

    // ── 백업·복원 ─────────────────────────────────────────

    suspend fun exportBackup(appVersion: String): String = BackupCodec.encode(snapshot(), now(), appVersion)

    /**
     * 백업 파일로 현재 데이터를 모두 바꾼다. 파일을 먼저 끝까지 검증하고, 교체는 한 트랜잭션으로 처리해
     * 중간에 실패하면 기존 데이터가 그대로 남는다. 복원 후 요약값을 다시 비교한다.
     */
    suspend fun restoreBackup(text: String): BackupCodec.Summary {
        val incoming = BackupCodec.decode(text)
        tx {
            dao.clearTransactions(); dao.clearBudgets(); dao.clearRules(); dao.clearAccounts(); dao.clearCategories()
            dao.insertCategories(incoming.categories.map { it.toEntity() })
            dao.insertAccounts(incoming.accounts.map { it.toEntity() })
            dao.insertTransactions(incoming.transactions.map { it.toEntity() })
            dao.insertBudgets(incoming.budgets.map { it.toEntity() })
            dao.insertRules(incoming.rules.map { it.toEntity() })
            dao.upsertSettings(incoming.settings.toEntity())
            val after = BackupCodec.summarize(snapshot())
            if (after != BackupCodec.summarize(incoming)) throw FinanceException("복원 결과가 백업과 일치하지 않아 취소했습니다.")
        }
        generateRecurring()
        return BackupCodec.summarize(incoming)
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
fun TransactionEntity.toModel() = Transaction(id, type, status, amount, currency, date, completedDate, fromAccountId, toAccountId, categoryId, memo, source, linkedPlannedId, toAmount, createdAt, updatedAt, recurringId, recurringOccurrence)
fun Transaction.toEntity() = TransactionEntity(id, type, status, amount, currency, date, completedDate, fromAccountId, toAccountId, categoryId, memo, source, linkedPlannedId, toAmount, createdAt, updatedAt, recurringId, recurringOccurrence)
fun RecurringRuleEntity.toModel() = RecurringRule(
    id, name, type, amount, currency, fromAccountId, toAccountId, categoryId, frequency, interval, dayOfMonth,
    dayOfWeek?.let { n -> DayOfWeek.entries.first { it.isoDayNumber == n } }, startDate, endDate, active, generatedThrough, memo, createdAt, updatedAt,
)
fun RecurringRule.toEntity() = RecurringRuleEntity(
    id, name.trim(), type, amount, currency, fromAccountId, toAccountId, categoryId, frequency, interval, dayOfMonth,
    dayOfWeek?.isoDayNumber, startDate, endDate, active, generatedThrough, memo, createdAt, updatedAt,
)
fun BudgetEntity.toModel() = Budget(id, basis, periodStart, periodEndExclusive, categoryId, amount, memo)
fun Budget.toEntity() = BudgetEntity(id, basis, periodStart, periodEndExclusive, categoryId, amount, memo)
fun SettingsEntity.toModel() = FinanceSettings(paydayDay, primaryBasis)
fun FinanceSettings.toEntity() = SettingsEntity(1, paydayDay, primaryBasis)
