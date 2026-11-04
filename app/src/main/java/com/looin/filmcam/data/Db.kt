package com.looin.filmcam.data

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

object RollStatus {
    const val SHOOTING = "shooting"
    const val DEVELOPING = "developing"
    const val DEVELOPED = "developed"
}

// replica/schema.sql 기준. CHECK 제약은 Room이 만들지 않으므로 RollRepository에서 지킨다.
@Entity(
    tableName = "rolls",
    indices = [Index(value = ["status", "develop_at"]), Index(value = ["started_at"])],
)
data class Roll(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "film_id") val filmId: String,
    @ColumnInfo(name = "body_id") val bodyId: String,
    @ColumnInfo(name = "lens_id") val lensId: String,
    val capacity: Int = 36,
    @ColumnInfo(name = "shot_count") val shotCount: Int = 0,
    val status: String = RollStatus.SHOOTING,
    @ColumnInfo(name = "started_at") val startedAt: Long,
    @ColumnInfo(name = "finished_at") val finishedAt: Long? = null,
    @ColumnInfo(name = "develop_at") val developAt: Long? = null,
    @ColumnInfo(name = "developed_at") val developedAt: Long? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

@Entity(
    tableName = "photos",
    foreignKeys = [ForeignKey(
        entity = Roll::class, parentColumns = ["id"], childColumns = ["roll_id"], onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index(value = ["roll_id", "frame_no"], unique = true), Index(value = ["taken_at"])],
)
data class Photo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "roll_id") val rollId: Long,
    @ColumnInfo(name = "frame_no") val frameNo: Int,
    @ColumnInfo(name = "body_id") val bodyId: String,
    @ColumnInfo(name = "lens_id") val lensId: String,
    @ColumnInfo(name = "raw_path") val rawPath: String,
    @ColumnInfo(name = "developed_path") val developedPath: String? = null,
    val width: Int,
    val height: Int,
    val rotation: Int = 0,
    @ColumnInfo(name = "lens_facing") val lensFacing: String,
    @ColumnInfo(name = "exposure_ev") val exposureEv: Float = 0f,
    val flash: Boolean = false,
    @ColumnInfo(name = "light_leak_seed") val lightLeakSeed: Long,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @ColumnInfo(name = "exported_uri") val exportedUri: String? = null,
    @ColumnInfo(name = "taken_at") val takenAt: Long,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

@Dao
interface FilmDao {
    @Query("SELECT * FROM rolls WHERE status = 'shooting' LIMIT 1")
    suspend fun shootingRoll(): Roll?

    @Query("SELECT * FROM rolls WHERE status = 'shooting' LIMIT 1")
    fun observeShootingRoll(): Flow<Roll?>

    @Query("SELECT * FROM rolls WHERE id = :id")
    suspend fun roll(id: Long): Roll?

    @Query("SELECT * FROM rolls WHERE id = :id")
    fun observeRoll(id: Long): Flow<Roll?>

    @Query("SELECT * FROM rolls WHERE shot_count > 0 ORDER BY started_at DESC")
    fun observeRolls(): Flow<List<Roll>>

    @Insert
    suspend fun insertRoll(roll: Roll): Long

    @Update
    suspend fun updateRoll(roll: Roll)

    @Query("DELETE FROM rolls WHERE id = :id")
    suspend fun deleteRoll(id: Long)

    @Insert
    suspend fun insertPhoto(photo: Photo): Long

    @Update
    suspend fun updatePhoto(photo: Photo)

    @Query("SELECT * FROM photos WHERE id = :id")
    suspend fun photo(id: Long): Photo?

    @Query("SELECT * FROM photos WHERE roll_id = :rollId ORDER BY frame_no")
    fun observePhotos(rollId: Long): Flow<List<Photo>>

    @Query("SELECT * FROM photos WHERE roll_id = :rollId ORDER BY frame_no")
    suspend fun photos(rollId: Long): List<Photo>

    @Query("SELECT * FROM photos WHERE developed_path IS NOT NULL ORDER BY taken_at DESC LIMIT 1")
    fun observeLatestDeveloped(): Flow<Photo?>

    @Query("SELECT * FROM photos WHERE developed_path IS NULL ORDER BY taken_at")
    suspend fun undeveloped(): List<Photo>

    @Query("SELECT COUNT(*) FROM photos WHERE roll_id = :rollId AND developed_path IS NULL")
    suspend fun undevelopedCount(rollId: Long): Int

    @Query("DELETE FROM photos WHERE id IN (:ids)")
    suspend fun deletePhotos(ids: List<Long>)
}

@Database(entities = [Roll::class, Photo::class], version = 1, exportSchema = true)
abstract class FilmDb : RoomDatabase() {
    abstract fun dao(): FilmDao

    companion object {
        fun create(context: Context): FilmDb =
            Room.databaseBuilder(context, FilmDb::class.java, "filmcam.db")
                .addCallback(object : Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        // 촬영 중인 롤은 항상 하나. Room @Index는 WHERE를 지원하지 않아 직접 만든다.
                        db.execSQL(
                            "CREATE UNIQUE INDEX IF NOT EXISTS rolls_one_shooting ON rolls(status) WHERE status = 'shooting'"
                        )
                    }
                })
                .build()
    }
}
