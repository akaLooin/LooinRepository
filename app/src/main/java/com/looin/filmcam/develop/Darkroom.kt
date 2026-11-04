package com.looin.filmcam.develop

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.looin.filmcam.data.FilmDb
import com.looin.filmcam.data.RollStatus
import com.looin.filmcam.data.SettingsStore
import com.looin.filmcam.film.Catalog
import com.looin.filmcam.film.Gear
import com.looin.filmcam.gl.OffscreenDeveloper
import com.looin.filmcam.gl.params
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 현상소. 원본 → 필름 렌더 → JPEG 저장 → 사진첩 내보내기 → DB 갱신.
 * 이미 현상된 컷은 건너뛰므로 여러 번 불러도 안전하다.
 */
class Darkroom(
    private val context: Context,
    private val db: FilmDb,
    private val catalog: Catalog,
    private val settings: SettingsStore,
    private val developer: OffscreenDeveloper,
) {
    private val dao = db.dao()
    private val mutex = Mutex()
    private val outDir = File(context.filesDir, "developed").apply { mkdirs() }

    suspend fun develop(photoId: Long) = mutex.withLock {
        val photo = dao.photo(photoId) ?: return@withLock
        if (photo.developedPath != null) return@withLock
        val roll = dao.roll(photo.rollId) ?: return@withLock
        val raw = File(photo.rawPath)
        if (!raw.exists()) { Log.w(TAG, "원본 없음: ${raw.path}"); return@withLock }

        val look = catalog.look(Gear(roll.filmId, photo.bodyId, photo.lensId), photo.exposureEv)
        val prefs = settings.cameraPrefs.first()
        // 기본 긴 변 3264px(약 8MP), 고해상도 4096px(약 12MP)
        val bitmap = developer.render(raw, look.params(photo.lightLeakSeed), if (prefs.highRes) 4096 else 3264)
        if (prefs.dateStamp) DateStamp.draw(context, bitmap, photo.takenAt)
        val out = File(outDir, "${photo.id}.jpg")
        val w = bitmap.width
        val h = bitmap.height
        withContext(Dispatchers.IO) {
            out.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bitmap.recycle()
            writeExif(out, photo.takenAt, photo.latitude, photo.longitude)
        }
        val uri = runCatching { export(out, photo.rollId, photo.frameNo, photo.takenAt) }
            .onFailure { Log.e(TAG, "사진첩 저장 실패", it) }
            .getOrNull()

        dao.updatePhoto(
            photo.copy(
                developedPath = out.path, exportedUri = uri?.toString(),
                width = w, height = h, rotation = 0, updatedAt = System.currentTimeMillis(),
            )
        )
        withContext(Dispatchers.IO) { raw.delete() }

        val latest = dao.roll(roll.id)
        if (latest != null && latest.status == RollStatus.DEVELOPING && dao.undevelopedCount(latest.id) == 0) {
            val now = System.currentTimeMillis()
            dao.updateRoll(latest.copy(status = RollStatus.DEVELOPED, developedAt = now, updatedAt = now))
        }
    }

    /**
     * 기존 사진에 지금 장착한 필름을 입혀 사진첩에 새로 저장. 원본 사진은 건드리지 않는다.
     * @return 저장된 사진의 URI
     */
    suspend fun importAndDevelop(source: Uri, gear: Gear): Uri? = mutex.withLock {
        val tmp = File(context.cacheDir, "import_${System.currentTimeMillis()}.jpg")
        try {
            withContext(Dispatchers.IO) {
                context.contentResolver.openInputStream(source)?.use { i -> tmp.outputStream().use { i.copyTo(it) } }
                    ?: error("사진을 열 수 없음")
            }
            val prefs = settings.cameraPrefs.first()
            val seed = kotlin.random.Random.nextLong(1, 1_000_000)
            val bitmap = developer.render(tmp, catalog.look(gear).params(seed), if (prefs.highRes) 4096 else 3264)
            val now = System.currentTimeMillis()
            val takenAt = withContext(Dispatchers.IO) {
                runCatching { ExifInterface(tmp.path).dateTimeOriginal }.getOrNull() ?: now
            }
            if (prefs.dateStamp) DateStamp.draw(context, bitmap, takenAt)
            val out = File(context.cacheDir, "import_out_$now.jpg")
            withContext(Dispatchers.IO) {
                out.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
                bitmap.recycle()
                writeExif(out, takenAt, null, null)
            }
            val uri = export(out, 0, 0, now)
            out.delete()
            uri
        } finally {
            tmp.delete()
        }
    }

    /** 앱이 현상 도중 꺼졌을 때 남은 컷을 이어서 현상. */
    suspend fun resumePending() {
        dao.undeveloped().forEach { runCatching { develop(it.id) }.onFailure { e -> Log.e(TAG, "재현상 실패", e) } }
    }

    private fun writeExif(file: File, takenAt: Long, lat: Double?, lng: Double?) {
        val exif = ExifInterface(file.path)
        val stamp = SimpleDateFormat("yyyy:MM:dd HH:mm:ss", Locale.US).format(Date(takenAt))
        exif.setAttribute(ExifInterface.TAG_DATETIME_ORIGINAL, stamp)
        exif.setAttribute(ExifInterface.TAG_DATETIME, stamp)
        exif.setAttribute(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL.toString())
        exif.setAttribute(ExifInterface.TAG_SOFTWARE, "FilmCam")
        if (lat != null && lng != null) exif.setLatLong(lat, lng)
        exif.saveAttributes()
    }

    private fun export(file: File, rollId: Long, frame: Int, takenAt: Long): Uri? {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "FilmCam_${rollId}_${frame}_$takenAt.jpg")
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FilmCam")
            put(MediaStore.Images.Media.DATE_TAKEN, takenAt)
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val uri = resolver.insert(collection, values) ?: return null
        try {
            resolver.openOutputStream(uri)?.use { o -> file.inputStream().use { it.copyTo(o) } }
                ?: error("출력 스트림 없음")
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            return uri
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
    }

    companion object { private const val TAG = "FilmCam" }
}
