package com.looin.filmcam.roll

import android.graphics.BitmapFactory
import androidx.exifinterface.media.ExifInterface
import androidx.room.withTransaction
import com.looin.filmcam.data.FilmDb
import com.looin.filmcam.data.Photo
import com.looin.filmcam.data.Roll
import com.looin.filmcam.data.RollStatus
import com.looin.filmcam.film.Gear
import java.io.File
import java.util.UUID
import kotlin.random.Random

data class ShotResult(val photo: Photo, val roll: Roll, val rollFinished: Boolean)

/** 롤 시작, 컷 추가, 마감. schema.sql의 CHECK 규칙(컷 수 범위, 롤 하나)을 여기서 지킨다. */
class RollRepository(private val db: FilmDb, filesDir: File) {
    private val dao = db.dao()
    private val rawDir = File(filesDir, "raw").apply { mkdirs() }

    fun newRawFile() = File(rawDir, "${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}.jpg")

    suspend fun ensureRoll(gear: Gear): Roll = db.withTransaction { dao.shootingRoll() ?: insertNew(gear) }

    private suspend fun insertNew(gear: Gear): Roll {
        val now = System.currentTimeMillis()
        val r = Roll(
            filmId = gear.filmId, bodyId = gear.bodyId, lensId = gear.lensId,
            startedAt = now, createdAt = now, updatedAt = now,
        )
        return r.copy(id = dao.insertRoll(r))
    }

    /** 컷 하나를 롤에 넣는다. 마지막 컷이면 롤을 마감하고 같은 필름으로 새 롤을 장착한다. */
    suspend fun addFrame(
        raw: File, gear: Gear, exposureEv: Float, lensFacing: String, flash: Boolean,
        latitude: Double? = null, longitude: Double? = null,
    ): ShotResult {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(raw.path, bounds)
        val rotation = runCatching { ExifInterface(raw.path).rotationDegrees }.getOrDefault(0)

        return db.withTransaction {
            val roll = dao.shootingRoll() ?: insertNew(gear)
            val frame = roll.shotCount + 1
            check(frame <= roll.capacity) { "롤이 이미 다 찼음" }
            val now = System.currentTimeMillis()
            val photo = Photo(
                rollId = roll.id, frameNo = frame,
                bodyId = gear.bodyId, lensId = gear.lensId,
                rawPath = raw.path,
                width = bounds.outWidth, height = bounds.outHeight, rotation = rotation,
                lensFacing = lensFacing, exposureEv = exposureEv, flash = flash,
                lightLeakSeed = Random.nextLong(1, 1_000_000),
                latitude = latitude, longitude = longitude,
                takenAt = now, createdAt = now, updatedAt = now,
            )
            val id = dao.insertPhoto(photo)
            val finished = frame == roll.capacity
            val updated = if (finished) finishedCopy(roll.copy(shotCount = frame), now)
            else roll.copy(shotCount = frame, updatedAt = now)
            dao.updateRoll(updated)
            if (finished) insertNew(gear)
            ShotResult(photo.copy(id = id), updated, finished)
        }
    }

    /**
     * 필름 교체. 빈 롤이면 필름만 바꾸고, 찍은 컷이 있으면 그 롤을 마감한 뒤 새 롤을 넣는다.
     * @return 마감된 롤 (없으면 null)
     */
    suspend fun changeFilm(gear: Gear): Roll? = db.withTransaction {
        val r = dao.shootingRoll()
        when {
            r == null -> { insertNew(gear); null }
            r.shotCount == 0 -> {
                dao.updateRoll(r.copy(filmId = gear.filmId, bodyId = gear.bodyId, lensId = gear.lensId, updatedAt = System.currentTimeMillis()))
                null
            }
            else -> {
                val done = finishedCopy(r, System.currentTimeMillis())
                dao.updateRoll(done)
                insertNew(gear)
                done
            }
        }
    }

    private suspend fun finishedCopy(r: Roll, now: Long): Roll {
        // 이미 모든 컷이 현상됐으면 바로 developed. 아니면 Darkroom이 마지막 컷 후 developed로 바꾼다.
        val pending = dao.undevelopedCount(r.id) > 0 || r.shotCount == 0
        return r.copy(
            status = if (pending) RollStatus.DEVELOPING else RollStatus.DEVELOPED,
            finishedAt = now, developAt = now,
            developedAt = if (pending) null else now,
            updatedAt = now,
        )
    }

    /** 사진 삭제: 행과 앱 안의 파일. 사진첩에 저장한 사본은 남긴다. */
    suspend fun deletePhotos(photos: List<Photo>) {
        if (photos.isEmpty()) return
        db.withTransaction {
            dao.deletePhotos(photos.map { it.id })
            photos.map { it.rollId }.distinct().forEach { rollId ->
                val roll = dao.roll(rollId)
                if (roll != null && roll.status != RollStatus.SHOOTING && dao.photos(rollId).isEmpty()) dao.deleteRoll(rollId)
            }
        }
        photos.forEach { p ->
            File(p.rawPath).delete()
            p.developedPath?.let { File(it).delete() }
        }
    }
}
