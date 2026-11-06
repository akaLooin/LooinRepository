package com.looin.studio.media

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.util.Size
import com.looin.studio.model.Geometry
import com.looin.studio.model.MediaType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

const val ALBUM = "LooinStudio"

data class SavedItem(val uri: Uri, val type: MediaType, val dateAdded: Long)

object MediaIO {

    /** Decode a photo with EXIF orientation applied, longest side at most [maxSide]. */
    suspend fun decodePhoto(context: Context, uri: Uri, maxSide: Int): Bitmap = withContext(Dispatchers.IO) {
        val src = ImageDecoder.createSource(context.contentResolver, uri)
        ImageDecoder.decodeBitmap(src) { decoder, info, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            decoder.isMutableRequired = false
            val w = info.size.width
            val h = info.size.height
            val longest = max(w, h)
            if (longest > maxSide) {
                val s = maxSide.toFloat() / longest
                decoder.setTargetSize((w * s).roundToInt().coerceAtLeast(1), (h * s).roundToInt().coerceAtLeast(1))
            }
        }.let { bmp ->
            if (bmp.config == Bitmap.Config.ARGB_8888) bmp
            else bmp.copy(Bitmap.Config.ARGB_8888, false).also { bmp.recycle() }
        }
    }

    /** First frame of a video, for thumbnails. */
    suspend fun videoFrame(context: Context, uri: Uri, maxSide: Int): Bitmap? = withContext(Dispatchers.IO) {
        val r = MediaMetadataRetriever()
        try {
            r.setDataSource(context, uri)
            val f = r.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: return@withContext null
            scaleDown(f.copy(Bitmap.Config.ARGB_8888, false), maxSide)
        } catch (e: Exception) {
            null
        } finally {
            r.release()
        }
    }

    suspend fun videoDurationMs(context: Context, uri: Uri): Long = withContext(Dispatchers.IO) {
        val r = MediaMetadataRetriever()
        try {
            r.setDataSource(context, uri)
            r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        } catch (e: Exception) {
            0L
        } finally {
            r.release()
        }
    }

    fun scaleDown(bmp: Bitmap, maxSide: Int): Bitmap {
        val longest = max(bmp.width, bmp.height)
        if (longest <= maxSide) return bmp
        val s = maxSide.toFloat() / longest
        return Bitmap.createScaledBitmap(bmp, (bmp.width * s).roundToInt().coerceAtLeast(1),
            (bmp.height * s).roundToInt().coerceAtLeast(1), true)
    }

    /** Apply rotation, flip and centred aspect crop on the CPU (photos only). */
    fun applyGeometry(src: Bitmap, g: Geometry): Bitmap {
        if (g.isIdentity) return src
        val m = Matrix()
        m.postScale(if (g.flipH) -1f else 1f, if (g.flipV) -1f else 1f)
        m.postRotate(g.rotation.toFloat())
        var out = Bitmap.createBitmap(src, 0, 0, src.width, src.height, m, true)
        val ratio = g.ratio.value
        if (ratio != null) {
            val cur = out.width.toFloat() / out.height
            val (cw, ch) = if (cur > ratio) (out.height * ratio).roundToInt() to out.height
            else out.width to (out.width / ratio).roundToInt()
            val cropped = Bitmap.createBitmap(out, (out.width - cw) / 2, (out.height - ch) / 2,
                cw.coerceAtLeast(1), ch.coerceAtLeast(1))
            if (cropped !== out && out !== src) out.recycle()
            out = cropped
        }
        return out
    }

    private fun stamp(): String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())

    suspend fun savePhoto(context: Context, bitmap: Bitmap): Uri = withContext(Dispatchers.IO) {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "LOOIN_${stamp()}.jpg")
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/$ALBUM")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: error("갤러리에 저장할 수 없어요")
        resolver.openOutputStream(uri)!!.use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
        values.clear()
        values.put(MediaStore.Images.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        uri
    }

    suspend fun saveVideo(context: Context, file: File): Uri = withContext(Dispatchers.IO) {
        val values = ContentValues().apply {
            put(MediaStore.Video.Media.DISPLAY_NAME, "LOOIN_${stamp()}.mp4")
            put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
            put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/$ALBUM")
            put(MediaStore.Video.Media.IS_PENDING, 1)
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
            ?: error("갤러리에 저장할 수 없어요")
        resolver.openOutputStream(uri)!!.use { out -> file.inputStream().use { it.copyTo(out) } }
        values.clear()
        values.put(MediaStore.Video.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        file.delete()
        uri
    }

    /** Items this app saved (Android lets an app see its own media without a permission). */
    suspend fun recent(context: Context, limit: Int = 30): List<SavedItem> = withContext(Dispatchers.IO) {
        val out = ArrayList<SavedItem>()
        fun query(collection: Uri, type: MediaType, dir: String) {
            val proj = arrayOf(MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DATE_ADDED)
            context.contentResolver.query(
                collection, proj,
                "${MediaStore.MediaColumns.RELATIVE_PATH} LIKE ?", arrayOf("$dir/$ALBUM%"),
                "${MediaStore.MediaColumns.DATE_ADDED} DESC"
            )?.use { c ->
                while (c.moveToNext() && out.size < limit * 2) {
                    out += SavedItem(ContentUris.withAppendedId(collection, c.getLong(0)), type, c.getLong(1))
                }
            }
        }
        try {
            query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, MediaType.PHOTO, Environment.DIRECTORY_PICTURES)
            query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, MediaType.VIDEO, Environment.DIRECTORY_MOVIES)
        } catch (_: Exception) {
        }
        out.sortedByDescending { it.dateAdded }.take(limit)
    }

    suspend fun thumbnail(context: Context, uri: Uri, size: Int): Bitmap? = withContext(Dispatchers.IO) {
        try {
            context.contentResolver.loadThumbnail(uri, Size(size, size), null)
        } catch (_: Exception) {
            null
        }
    }
}
