package com.looin.finance.receipt

import android.content.ActivityNotFoundException
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.looin.finance.ui.platform.ReceiptScan
import com.looin.finance.ui.platform.ReceiptScanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.coroutines.resume

/**
 * 영수증 사진 저장소: 앱 안 저장소(files/receipts)에만 둔다. 다른 앱·백업 파일에는 나가지 않는다.
 * 사진은 긴 변 2000px·JPEG 85% 로 줄여 저장해 용량을 아낀다.
 */
object ReceiptStore {
    const val DIR = "receipts"
    private const val MAX_EDGE = 2000

    fun file(context: Context, path: String): File = File(context.filesDir, path)

    /** [uri] 의 사진을 읽어 바르게 돌리고 줄여 저장한다. 저장된 경로("receipts/…")와 글자 읽기용 비트맵. */
    fun import(context: Context, uri: Uri): Pair<String, Bitmap> {
        val cr = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        cr.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
        require(bounds.outWidth > 0) { "사진을 읽을 수 없어요" }
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_EDGE) sample *= 2
        var bmp = cr.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
            ?: error("사진을 읽을 수 없어요")
        val rotation: Int = runCatching {
            val o = cr.openInputStream(uri)!!.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
            when (o) { ExifInterface.ORIENTATION_ROTATE_90 -> 90; ExifInterface.ORIENTATION_ROTATE_180 -> 180; ExifInterface.ORIENTATION_ROTATE_270 -> 270; else -> 0 }
        }.getOrDefault(0)
        val scale = minOf(1f, MAX_EDGE.toFloat() / maxOf(bmp.width, bmp.height))
        if (rotation != 0 || scale < 1f) {
            val m = Matrix().apply { postScale(scale, scale); postRotate(rotation.toFloat()) }
            bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
        }
        val dir = File(context.filesDir, DIR).apply { mkdirs() }
        val name = "r-${System.currentTimeMillis()}.jpg"
        File(dir, name).outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 85, it) }
        return "$DIR/$name" to bmp
    }

    /** 미리보기용으로 줄여 읽기. */
    fun load(context: Context, path: String, maxSize: Int): Bitmap? {
        val f = file(context, path).takeIf { it.isFile } ?: return null
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(f.path, bounds)
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSize) sample *= 2
        return BitmapFactory.decodeFile(f.path, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    /**
     * 어떤 거래에도 붙어 있지 않은 사진을 지운다(거래 삭제·사진 교체·저장 안 하고 나간 경우).
     * 지금 편집 중일 수 있는 최근 1시간 안 사진은 남긴다.
     */
    fun cleanup(context: Context, keep: Set<String>, now: Long = System.currentTimeMillis()): Int {
        val dir = File(context.filesDir, DIR)
        val stale = dir.listFiles().orEmpty().filter { "$DIR/${it.name}" !in keep && now - it.lastModified() > 60 * 60 * 1000L }
        stale.forEach { it.delete() }
        File(context.cacheDir, "camera").listFiles()?.forEach { it.delete() }
        return stale.size
    }
}

/** 기기 안 한국어 글자 읽기(ML Kit, 모델이 앱에 포함되어 인터넷이 필요 없다). */
object ReceiptOcr {
    private val recognizer by lazy { TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build()) }

    suspend fun read(bitmap: Bitmap): String = suspendCancellableCoroutine { cont ->
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { cont.resume(it.text) }
            .addOnFailureListener { cont.resume("") }
    }
}

@Composable
fun rememberAndroidReceiptScanner(): ReceiptScanner {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val holder = remember { arrayOfNulls<(ReceiptScan) -> Unit>(1) }
    val cameraFile = remember { File(context.cacheDir, "camera/shot.jpg") }

    fun handle(uri: Uri?) {
        val cb = holder[0] ?: return
        if (uri == null) return // 취소
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val (path, bmp) = ReceiptStore.import(context, uri)
                    val text = runCatching { ReceiptOcr.read(bmp) }.getOrDefault("")
                    ReceiptScan(path, text)
                }.getOrElse { ReceiptScan(null, "", it.message ?: "사진을 불러오지 못했어요.") }
            }
            if (uri.path?.endsWith("shot.jpg") == true) cameraFile.delete()
            cb(result)
        }
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        handle(if (ok && cameraFile.length() > 0) FileProvider.getUriForFile(context, context.packageName + ".files", cameraFile) else null)
    }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> handle(uri) }

    return remember {
        object : ReceiptScanner {
            override val supported = true
            override fun scan(fromCamera: Boolean, onResult: (ReceiptScan) -> Unit) {
                holder[0] = onResult
                try {
                    if (fromCamera) {
                        cameraFile.parentFile?.mkdirs()
                        cameraFile.delete()
                        camera.launch(FileProvider.getUriForFile(context, context.packageName + ".files", cameraFile))
                    } else {
                        gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }
                } catch (e: ActivityNotFoundException) {
                    onResult(ReceiptScan(null, "", if (fromCamera) "카메라 앱을 찾을 수 없어요. '앨범에서'로 골라 주세요." else "사진을 고를 앱이 없어요."))
                }
            }
            override fun load(path: String, maxSize: Int): ImageBitmap? =
                runCatching { ReceiptStore.load(context, path, maxSize)?.asImageBitmap() }.getOrNull()
        }
    }
}
