package com.looin.studio.video

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import com.looin.studio.model.EditState
import com.looin.studio.model.RenderState
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Encodes a video (or a photo as a short looping clip) with the edit chain baked in.
 * Runs on the main looper as Transformer requires; reports progress 0..1.
 */
@UnstableApi
object VideoExporter {

    /** @param maxHeight null keeps the source resolution. */
    suspend fun export(
        context: Context,
        source: Uri,
        isImage: Boolean,
        edit: EditState,
        render: RenderState,
        maxHeight: Int?,
        onProgress: (Float) -> Unit,
    ): File = withContext(Dispatchers.Main) {
        val out = File(context.cacheDir, "export_${System.currentTimeMillis()}.mp4")
        val itemBuilder = MediaItem.Builder().setUri(source)
        if (isImage) {
            itemBuilder.setImageDurationMs(IMAGE_CLIP_MS)
        } else if (edit.trimStartMs > 0 || edit.trimEndMs > 0) {
            val clip = MediaItem.ClippingConfiguration.Builder().setStartPositionMs(edit.trimStartMs)
            if (edit.trimEndMs > 0) clip.setEndPositionMs(edit.trimEndMs)
            itemBuilder.setClippingConfiguration(clip.build())
        }

        val video = ArrayList<Effect>()
        val audio = ArrayList<AudioProcessor>()
        video += VideoEffects.geometry(edit.geometry)
        maxHeight?.let { video += Presentation.createForHeight(it) }
        video += ChainGlEffect { render }
        if (!isImage && edit.speed != 1f) {
            val pair = Effects.createExperimentalSpeedChangingEffect(VideoEffects.ConstantSpeed(edit.speed))
            audio += pair.first
            video += pair.second
        }

        val edited = EditedMediaItem.Builder(itemBuilder.build())
            .setEffects(Effects(audio, video))
            .setRemoveAudio(isImage || edit.mute)
            .apply { if (isImage) setFrameRate(30) }
            .build()

        suspendCancellableCoroutine { cont: CancellableContinuation<File> ->
            val handler = Handler(Looper.getMainLooper())
            val transformer = Transformer.Builder(context)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .addListener(object : Transformer.Listener {
                    override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                        handler.removeCallbacksAndMessages(null)
                        onProgress(1f)
                        if (cont.isActive) cont.resume(out)
                    }

                    override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                        handler.removeCallbacksAndMessages(null)
                        out.delete()
                        if (cont.isActive) cont.resumeWithException(exportException)
                    }
                })
                .build()
            val holder = ProgressHolder()
            val poll = object : Runnable {
                override fun run() {
                    if (transformer.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) {
                        onProgress(holder.progress / 100f)
                    }
                    handler.postDelayed(this, 200)
                }
            }
            cont.invokeOnCancellation {
                handler.post {
                    handler.removeCallbacksAndMessages(null)
                    transformer.cancel()
                    out.delete()
                }
            }
            transformer.start(edited, out.absolutePath)
            handler.post(poll)
        }
    }

    const val IMAGE_CLIP_MS = 5_000L
}
