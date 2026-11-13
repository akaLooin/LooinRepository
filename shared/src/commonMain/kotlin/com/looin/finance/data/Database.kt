package com.looin.finance.data

import androidx.room.AutoMigration
import androidx.room.ConstructedBy
import androidx.room.RoomDatabaseConstructor
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import androidx.room.Update
import androidx.room.Upsert
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.CategoryKind
import com.looin.finance.core.model.TransactionSource
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.recurring.Frequency
import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.LocalDate

// 금액은 모두 최소 통화 단위의 정수(Long). 날짜는 epoch day 정수로 저장한다.

@Entity(tableName = "accounts")
data class AccountEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val type: AccountType,
    val currency: String,
    @ColumnInfo(name = "opening_balance") val openingBalance: Long,
    @ColumnInfo(name = "include_in_available") val includeInAvailable: Boolean,
    val archived: Boolean,
    val memo: String,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    @ColumnInfo(name = "rate_to_krw_x10000") val rateToKrwX10000: Long?,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val kind: CategoryKind,
    @ColumnInfo(name = "color_argb") val colorArgb: Long,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    val archived: Boolean,
)

@Entity(
    tableName = "transactions",
    foreignKeys = [
        ForeignKey(entity = AccountEntity::class, parentColumns = ["id"], childColumns = ["from_account_id"]),
        ForeignKey(entity = AccountEntity::class, parentColumns = ["id"], childColumns = ["to_account_id"]),
        ForeignKey(entity = CategoryEntity::class, parentColumns = ["id"], childColumns = ["category_id"]),
    ],
    indices = [
        Index("date"), Index("from_account_id"), Index("to_account_id"), Index("category_id"), Index("status"),
        // 같은 규칙의 같은 발생일은 한 번만 (NULL 은 중복 허용 → 직접 입력 거래에는 영향 없음)
        Index(value = ["recurring_id", "recurring_occurrence"], unique = true),
    ],
)
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: TransactionType,
    val status: TransactionStatus,
    val amount: Long,
    val currency: String,
    val date: LocalDate,
    @ColumnInfo(name = "completed_date") val completedDate: LocalDate?,
    @ColumnInfo(name = "from_account_id") val fromAccountId: Long?,
    @ColumnInfo(name = "to_account_id") val toAccountId: Long?,
    @ColumnInfo(name = "category_id") val categoryId: Long?,
    val memo: String,
    val source: TransactionSource,
    @ColumnInfo(name = "linked_planned_id") val linkedPlannedId: Long?,
    @ColumnInfo(name = "to_amount") val toAmount: Long?,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
    @ColumnInfo(name = "recurring_id") val recurringId: Long? = null,
    @ColumnInfo(name = "recurring_occurrence") val recurringOccurrence: LocalDate? = null,
)

/** 반복 거래 규칙 (v2). 요일은 ISO 번호(월=1 … 일=7)로 저장한다. */
@Entity(tableName = "recurring_rules")
data class RecurringRuleEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val type: TransactionType,
    val amount: Long,
    val currency: String,
    @ColumnInfo(name = "from_account_id") val fromAccountId: Long?,
    @ColumnInfo(name = "to_account_id") val toAccountId: Long?,
    @ColumnInfo(name = "category_id") val categoryId: Long?,
    val frequency: Frequency,
    val interval: Int,
    @ColumnInfo(name = "day_of_month") val dayOfMonth: Int?,
    @ColumnInfo(name = "day_of_week") val dayOfWeek: Int?,
    @ColumnInfo(name = "start_date") val startDate: LocalDate,
    @ColumnInfo(name = "end_date") val endDate: LocalDate?,
    val active: Boolean,
    @ColumnInfo(name = "generated_through") val generatedThrough: LocalDate?,
    val memo: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

@Entity(
    tableName = "budgets",
    foreignKeys = [ForeignKey(entity = CategoryEntity::class, parentColumns = ["id"], childColumns = ["category_id"])],
    indices = [Index(value = ["basis", "period_start", "category_id"], unique = true), Index("category_id")],
)
data class BudgetEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val basis: PeriodBasis,
    @ColumnInfo(name = "period_start") val periodStart: LocalDate,
    @ColumnInfo(name = "period_end_exclusive") val periodEndExclusive: LocalDate,
    /** null = 전체 생활비 예산. (SQLite UNIQUE 는 NULL 을 중복 허용하므로 저장소에서 별도 확인) */
    @ColumnInfo(name = "category_id") val categoryId: Long?,
    val amount: Long,
    val memo: String,
)

/** 저축 목표 (v3). 지우지 않고 보관(archived)한다. */
@Entity(
    tableName = "savings_goals",
    foreignKeys = [ForeignKey(entity = AccountEntity::class, parentColumns = ["id"], childColumns = ["account_id"])],
    indices = [Index("account_id")],
)
data class SavingsGoalEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    @ColumnInfo(name = "target_amount") val targetAmount: Long,
    @ColumnInfo(name = "target_date") val targetDate: LocalDate?,
    @ColumnInfo(name = "account_id") val accountId: Long?,
    @ColumnInfo(name = "color_argb") val colorArgb: Long,
    val archived: Boolean,
    val memo: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

/** 저축 목표 배정 기록 (v3). 양수 = 떼어 둠, 음수 = 해제. 이력이므로 지우지 않는다. */
@Entity(
    tableName = "savings_allocations",
    foreignKeys = [ForeignKey(entity = SavingsGoalEntity::class, parentColumns = ["id"], childColumns = ["goal_id"])],
    indices = [Index("goal_id")],
)
data class SavingsAllocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "goal_id") val goalId: Long,
    val amount: Long,
    val date: LocalDate,
    val memo: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
)

/** 단일 행 설정 테이블. */
@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey val id: Int = 1,
    @ColumnInfo(name = "payday_day") val paydayDay: Int,
    @ColumnInfo(name = "primary_basis") val primaryBasis: PeriodBasis,
)

class Converters {
    // DB 열은 정수(epoch day)로 유지: 스키마 변경 없음
    @TypeConverter fun fromDate(d: LocalDate?): Int? = d?.toEpochDays()?.toInt()
    @TypeConverter fun toDate(v: Int?): LocalDate? = v?.let { LocalDate.fromEpochDays(it) }
}

@Dao
interface FinanceDao {
    // 계좌
    @Query("SELECT * FROM accounts ORDER BY archived, sort_order, id") fun observeAccounts(): Flow<List<AccountEntity>>
    @Query("SELECT * FROM accounts") suspend fun accounts(): List<AccountEntity>
    @Insert suspend fun insertAccount(a: AccountEntity): Long
    @Update suspend fun updateAccount(a: AccountEntity)

    // 카테고리
    @Query("SELECT * FROM categories ORDER BY kind, sort_order, id") fun observeCategories(): Flow<List<CategoryEntity>>
    @Query("SELECT * FROM categories") suspend fun categories(): List<CategoryEntity>
    @Insert suspend fun insertCategories(c: List<CategoryEntity>)
    @Upsert suspend fun upsertCategory(c: CategoryEntity): Long

    // 거래
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC") fun observeTransactions(): Flow<List<TransactionEntity>>
    @Query("SELECT * FROM transactions") suspend fun transactions(): List<TransactionEntity>
    @Query("SELECT * FROM transactions WHERE id = :id") suspend fun transaction(id: Long): TransactionEntity?
    @Insert suspend fun insertTransaction(t: TransactionEntity): Long
    @Update suspend fun updateTransaction(t: TransactionEntity)
    @Query("DELETE FROM transactions WHERE id = :id") suspend fun deleteTransaction(id: Long)
    /** 반복 생성분: 같은 (규칙, 발생일)이 이미 있으면 건너뛴다. */
    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun insertGenerated(t: List<TransactionEntity>): List<Long>
    /** 규칙 수정·삭제 시: 아직 처리 안 한 [from] 이후 예정 발생분만 지운다(완료·취소 기록은 보존). */
    @Query("DELETE FROM transactions WHERE recurring_id = :ruleId AND status = 'PLANNED' AND recurring_occurrence >= :from")
    suspend fun deletePlannedOccurrences(ruleId: Long, from: LocalDate): Int

    // 반복 규칙
    @Query("SELECT * FROM recurring_rules ORDER BY active DESC, name") fun observeRules(): Flow<List<RecurringRuleEntity>>
    @Query("SELECT * FROM recurring_rules") suspend fun rules(): List<RecurringRuleEntity>
    @Insert suspend fun insertRule(r: RecurringRuleEntity): Long
    @Update suspend fun updateRule(r: RecurringRuleEntity)
    @Query("DELETE FROM recurring_rules WHERE id = :id") suspend fun deleteRule(id: Long)

    // 저축 목표
    @Query("SELECT * FROM savings_goals ORDER BY archived, id") fun observeGoals(): Flow<List<SavingsGoalEntity>>
    @Query("SELECT * FROM savings_goals") suspend fun goals(): List<SavingsGoalEntity>
    @Query("SELECT * FROM savings_allocations ORDER BY date DESC, id DESC") fun observeAllocations(): Flow<List<SavingsAllocationEntity>>
    @Query("SELECT * FROM savings_allocations") suspend fun allocations(): List<SavingsAllocationEntity>
    @Insert suspend fun insertGoal(g: SavingsGoalEntity): Long
    @Update suspend fun updateGoal(g: SavingsGoalEntity)
    @Insert suspend fun insertAllocation(a: SavingsAllocationEntity): Long

    // 백업 복원용: 전체 교체
    @Query("DELETE FROM savings_allocations") suspend fun clearAllocations()
    @Query("DELETE FROM savings_goals") suspend fun clearGoals()
    @Insert suspend fun insertGoals(g: List<SavingsGoalEntity>)
    @Insert suspend fun insertAllocations(a: List<SavingsAllocationEntity>)
    @Query("DELETE FROM transactions") suspend fun clearTransactions()
    @Query("DELETE FROM budgets") suspend fun clearBudgets()
    @Query("DELETE FROM recurring_rules") suspend fun clearRules()
    @Query("DELETE FROM accounts") suspend fun clearAccounts()
    @Query("DELETE FROM categories") suspend fun clearCategories()
    @Insert suspend fun insertAccounts(a: List<AccountEntity>)
    @Insert suspend fun insertTransactions(t: List<TransactionEntity>)
    @Insert suspend fun insertBudgets(b: List<BudgetEntity>)
    @Insert suspend fun insertRules(r: List<RecurringRuleEntity>)

    // 예산
    @Query("SELECT * FROM budgets ORDER BY period_start DESC, id") fun observeBudgets(): Flow<List<BudgetEntity>>
    @Query("SELECT * FROM budgets") suspend fun budgets(): List<BudgetEntity>
    @Insert(onConflict = OnConflictStrategy.ABORT) suspend fun insertBudget(b: BudgetEntity): Long
    @Update suspend fun updateBudget(b: BudgetEntity)
    @Query("DELETE FROM budgets WHERE id = :id") suspend fun deleteBudget(id: Long)

    // 설정
    @Query("SELECT * FROM settings WHERE id = 1") fun observeSettings(): Flow<SettingsEntity?>
    @Query("SELECT * FROM settings WHERE id = 1") suspend fun settings(): SettingsEntity?
    @Upsert suspend fun upsertSettings(s: SettingsEntity)
}

@Database(
    entities = [
        AccountEntity::class, CategoryEntity::class, TransactionEntity::class, BudgetEntity::class, SettingsEntity::class,
        RecurringRuleEntity::class, SavingsGoalEntity::class, SavingsAllocationEntity::class,
    ],
    version = 3,
    exportSchema = true,
    // v1 → v2: 반복 규칙 테이블과 거래의 반복 연결 열 추가. 기존 데이터는 그대로 둔다.
    // v2 → v3: 저축 목표·배정 기록 테이블 추가(기존 테이블 변경 없음).
    autoMigrations = [AutoMigration(from = 1, to = 2), AutoMigration(from = 2, to = 3)],
)
@TypeConverters(Converters::class)
@ConstructedBy(FinanceDatabaseConstructor::class)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun dao(): FinanceDao

    /**
     * 플랫폼별 생성 함수는 확장 함수로 둔다:
     *  - Android: `FinanceDatabase.build(context, name)` (androidMain)
     *  - PC: `FinanceDatabase.build(file)` (jvmMain) / iOS: `FinanceDatabase.build(name)` (iosMain)
     * 스키마 변경 시에는 반드시 Migration 을 추가한다(파괴적 마이그레이션 금지: 사용자 금융 데이터 보존).
     */
    companion object {
        const val NAME = "looin_finance.db"
    }
}

/** Room 이 플랫폼마다 생성하는 생성자(KMP 필수). */
@Suppress("KotlinNoActualForExpect")
expect object FinanceDatabaseConstructor : RoomDatabaseConstructor<FinanceDatabase> {
    override fun initialize(): FinanceDatabase
}
