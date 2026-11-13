package com.looin.finance.data

import android.content.Context
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
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
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

/** 단일 행 설정 테이블. */
@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey val id: Int = 1,
    @ColumnInfo(name = "payday_day") val paydayDay: Int,
    @ColumnInfo(name = "primary_basis") val primaryBasis: PeriodBasis,
)

class Converters {
    @TypeConverter fun fromDate(d: LocalDate?): Int? = d?.toEpochDays()
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

    @Transaction
    suspend fun seedIfEmpty(defaults: List<CategoryEntity>, settings: SettingsEntity) {
        if (settings() == null) {
            if (categories().isEmpty()) insertCategories(defaults)
            upsertSettings(settings)
        }
    }
}

@Database(
    entities = [AccountEntity::class, CategoryEntity::class, TransactionEntity::class, BudgetEntity::class, SettingsEntity::class],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun dao(): FinanceDao

    companion object {
        const val NAME = "looin_finance.db"

        fun build(context: Context, name: String? = NAME): FinanceDatabase {
            val builder = if (name == null) {
                Room.inMemoryDatabaseBuilder(context, FinanceDatabase::class.java)
            } else {
                Room.databaseBuilder(context, FinanceDatabase::class.java, name)
            }
            // 스키마 변경 시에는 반드시 Migration 을 추가한다(파괴적 마이그레이션 금지: 사용자 금융 데이터 보존).
            return builder.build()
        }
    }
}
