package com.looin.studio.ui

import android.app.Application
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.util.UnstableApi
import com.looin.studio.gl.OffscreenRenderer
import com.looin.studio.media.MediaIO
import com.looin.studio.model.ActiveEffect
import com.looin.studio.model.AdjustKey
import com.looin.studio.model.EditState
import com.looin.studio.model.Look
import com.looin.studio.model.MediaType
import com.looin.studio.model.Presets
import com.looin.studio.model.RenderState
import com.looin.studio.video.VideoExporter
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlin.random.Random

enum class Tool(val label: String) { FILTERS("필터"), EFFECTS("효과"), ADJUST("조정"), CROP("자르기"), TRIM("트림") }

enum class ExportQuality(val label: String, val maxSide: Int?) {
    ORIGINAL("원본", null), FHD("1080p", 1080), HD("720p", 720)
}

sealed interface ExportStatus {
    data object Idle : ExportStatus
    data class Running(val progress: Float, val label: String) : ExportStatus
    data class Done(val uri: Uri, val type: MediaType) : ExportStatus
    data class Failed(val message: String) : ExportStatus
}

@UnstableApi
class EditorViewModel(app: Application) : AndroidViewModel(app) {
    private val ctx: Context get() = getApplication()

    var mediaUri by mutableStateOf<Uri?>(null); private set
    var mediaType by mutableStateOf(MediaType.PHOTO); private set
    var loadError by mutableStateOf<String?>(null); private set

    /** Preview-size photo with geometry applied (photos only). */
    var previewBitmap by mutableStateOf<Bitmap?>(null); private set
    private var basePreview: Bitmap? = null
    var videoDurationMs by mutableStateOf(0L); private set

    var edit by mutableStateOf(EditState()); private set
    var comparing by mutableStateOf(false)
    var tool by mutableStateOf(Tool.FILTERS)
    var lookCategory by mutableStateOf(Presets.lookCategories.first())
    var effectCategory by mutableStateOf(Presets.effectCategories.first())
    var adjustKey by mutableStateOf(AdjustKey.EXPOSURE)
    /** Effect whose intensity the slider controls. */
    var focusedEffect by mutableStateOf<String?>(null)

    val lookThumbs = mutableStateMapOf<String, Bitmap>()
    val effectThumbs = mutableStateMapOf<String, Bitmap>()

    var exportStatus by mutableStateOf<ExportStatus>(ExportStatus.Idle)
    private var exportJob: Job? = null

    private val undo = ArrayDeque<EditState>()
    private val redo = ArrayDeque<EditState>()
    var canUndo by mutableStateOf(false); private set
    var canRedo by mutableStateOf(false); private set

    private val prefs = ctx.getSharedPreferences("looin", Context.MODE_PRIVATE)
    var favourites by mutableStateOf(prefs.getStringSet("fav", emptySet())!!.toSet()); private set

    val renderState: RenderState get() = if (comparing) RenderState.EMPTY else edit.toRender()

    fun close() {
        cancelExport()
        mediaUri = null
        previewBitmap = null
        basePreview = null
    }

    fun open(uri: Uri, type: MediaType) {
        if (uri == mediaUri) return
        mediaUri = uri
        mediaType = type
        edit = EditState()
        undo.clear(); redo.clear(); refreshHistory()
        lookThumbs.clear(); effectThumbs.clear()
        loadError = null
        previewBitmap = null
        tool = Tool.FILTERS
        viewModelScope.launch {
            try {
                val thumbSrc: Bitmap?
                if (type == MediaType.PHOTO) {
                    val bmp = MediaIO.decodePhoto(ctx, uri, PREVIEW_MAX)
                    basePreview = bmp
                    previewBitmap = bmp
                    thumbSrc = MediaIO.scaleDown(bmp, THUMB)
                } else {
                    videoDurationMs = MediaIO.videoDurationMs(ctx, uri)
                    thumbSrc = MediaIO.videoFrame(ctx, uri, THUMB)
                }
                if (thumbSrc != null) buildThumbs(thumbSrc)
            } catch (e: Exception) {
                loadError = "파일을 열 수 없어요: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private suspend fun buildThumbs(src: Bitmap) {
        val square = centerSquare(src)
        val looks = Presets.looks
        OffscreenRenderer.renderMany(square, looks.map { lookOnly(it) }, 0f)
            .forEachIndexed { i, b -> lookThumbs[looks[i].id] = b }
        val effects = Presets.effects
        OffscreenRenderer.renderMany(square, effects.map {
            RenderState(null, 0f, FloatArray(AdjustKey.entries.size), listOf(it to it.defaultIntensity))
        }, 1.3f).forEachIndexed { i, b -> effectThumbs[effects[i].id] = b }
    }

    private fun lookOnly(l: Look) = RenderState(l, 1f, FloatArray(AdjustKey.entries.size), emptyList())

    private fun centerSquare(b: Bitmap): Bitmap {
        val s = minOf(b.width, b.height)
        return Bitmap.createBitmap(b, (b.width - s) / 2, (b.height - s) / 2, s, s)
    }

    // ---------------------------------------------------------------- edits

    /** Live change while dragging: no history entry. */
    fun preview(transform: (EditState) -> EditState) {
        edit = transform(edit)
    }

    /** A finished change: recorded for undo. [before] is the state when the gesture began. */
    fun commit(before: EditState = edit, transform: (EditState) -> EditState = { it }) {
        val after = transform(edit)
        if (before == after) { edit = after; return }
        undo.addLast(before)
        if (undo.size > 60) undo.removeFirst()
        redo.clear()
        val geometryChanged = before.geometry != after.geometry
        edit = after
        if (geometryChanged) rebuildPreview()
        refreshHistory()
    }

    fun undo() {
        val prev = undo.removeLastOrNull() ?: return
        redo.addLast(edit)
        val geo = prev.geometry != edit.geometry
        edit = prev
        if (geo) rebuildPreview()
        refreshHistory()
    }

    fun redo() {
        val next = redo.removeLastOrNull() ?: return
        undo.addLast(edit)
        val geo = next.geometry != edit.geometry
        edit = next
        if (geo) rebuildPreview()
        refreshHistory()
    }

    private fun refreshHistory() { canUndo = undo.isNotEmpty(); canRedo = redo.isNotEmpty() }

    private fun rebuildPreview() {
        if (mediaType != MediaType.PHOTO) return
        val base = basePreview ?: return
        previewBitmap = MediaIO.applyGeometry(base, edit.geometry)
    }

    fun selectLook(id: String?) = commit {
        if (it.lookId == id) it else it.copy(lookId = id, lookIntensity = 1f)
    }

    fun toggleEffect(id: String) {
        val def = Presets.effect(id) ?: return
        val active = edit.effects.any { it.id == id }
        when {
            active && focusedEffect == id -> {
                commit { s -> s.copy(effects = s.effects.filterNot { it.id == id }) }
                focusedEffect = edit.effects.lastOrNull()?.id
            }
            active -> focusedEffect = id
            edit.effects.size >= MAX_EFFECTS -> Unit
            else -> {
                commit { s -> s.copy(effects = s.effects + ActiveEffect(id, def.defaultIntensity)) }
                focusedEffect = id
            }
        }
    }

    fun removeEffect(id: String) {
        commit { s -> s.copy(effects = s.effects.filterNot { it.id == id }) }
        if (focusedEffect == id) focusedEffect = edit.effects.lastOrNull()?.id
    }

    fun setEffectIntensity(id: String, v: Float) = preview { s ->
        s.copy(effects = s.effects.map { if (it.id == id) it.copy(intensity = v) else it })
    }

    fun resetAll() = commit { s -> EditState(trimStartMs = s.trimStartMs, trimEndMs = s.trimEndMs, speed = s.speed, mute = s.mute) }

    fun shuffle() = commit { s ->
        val look = Presets.looks.random()
        val pool = Presets.effects.filter { it.id !in setOf("mirror", "kaleido", "pixel", "sketch", "halftone", "fisheye") }
        val n = Random.nextInt(1, 3)
        val fx = pool.shuffled().take(n).map { ActiveEffect(it.id, it.defaultIntensity * Random.nextDouble(0.6, 1.0).toFloat()) }
        s.copy(lookId = look.id, lookIntensity = Random.nextDouble(0.6, 1.0).toFloat(), effects = fx)
    }.also {
        lookCategory = Presets.look(edit.lookId)?.category ?: lookCategory
        focusedEffect = edit.effects.lastOrNull()?.id
    }

    fun toggleFavourite(id: String) {
        favourites = if (id in favourites) favourites - id else favourites + id
        prefs.edit().putStringSet("fav", favourites).apply()
    }

    // ---------------------------------------------------------------- export

    fun exportPhoto(quality: ExportQuality) {
        val uri = mediaUri ?: return
        val state = edit
        exportJob = viewModelScope.launch {
            exportStatus = ExportStatus.Running(0.1f, "사진 처리 중…")
            try {
                val cap = minOf(PHOTO_EXPORT_MAX, OffscreenRenderer.maxSide())
                var full = MediaIO.decodePhoto(ctx, uri, cap)
                quality.maxSide?.let { short -> full = MediaIO.scaleDown(full, shortToLong(full, short, cap)) }
                val geo = MediaIO.applyGeometry(full, state.geometry)
                exportStatus = ExportStatus.Running(0.5f, "효과 적용 중…")
                val rendered = OffscreenRenderer.render(geo, state.toRender(), 1.3f)
                if (geo !== full) geo.recycle()
                full.recycle()
                exportStatus = ExportStatus.Running(0.85f, "갤러리에 저장 중…")
                val saved = MediaIO.savePhoto(ctx, rendered)
                rendered.recycle()
                exportStatus = ExportStatus.Done(saved, MediaType.PHOTO)
            } catch (e: Throwable) {
                exportStatus = ExportStatus.Failed(e.message ?: "저장하지 못했어요")
            }
        }
    }

    /** "1080p" means the short side; returns the matching long side, capped. */
    private fun shortToLong(b: Bitmap, short: Int, cap: Int): Int {
        val ratio = maxOf(b.width, b.height).toFloat() / minOf(b.width, b.height)
        return minOf((short * ratio).toInt(), cap)
    }

    /** Video export, or a photo saved as a 5-second clip so animated effects keep moving. */
    fun exportVideo(quality: ExportQuality) {
        val uri = mediaUri ?: return
        val state = edit
        val render = state.toRender()
        val isImage = mediaType == MediaType.PHOTO
        exportJob = viewModelScope.launch {
            exportStatus = ExportStatus.Running(0f, "영상 인코딩 중…")
            try {
                val height = quality.maxSide ?: if (isImage) 1920 else null
                val file = VideoExporter.export(ctx, uri, isImage, state, render, height) { p ->
                    exportStatus = ExportStatus.Running(p * 0.95f, "영상 인코딩 중…")
                }
                exportStatus = ExportStatus.Running(0.97f, "갤러리에 저장 중…")
                val saved = MediaIO.saveVideo(ctx, file)
                exportStatus = ExportStatus.Done(saved, MediaType.VIDEO)
            } catch (e: kotlinx.coroutines.CancellationException) {
                exportStatus = ExportStatus.Idle
                throw e
            } catch (e: Throwable) {
                exportStatus = ExportStatus.Failed(e.message ?: "내보내지 못했어요")
            }
        }
    }

    fun cancelExport() {
        exportJob?.cancel()
        exportStatus = ExportStatus.Idle
    }

    fun dismissExport() {
        if (exportStatus !is ExportStatus.Running) exportStatus = ExportStatus.Idle
    }

    companion object {
        const val PREVIEW_MAX = 1600
        const val THUMB = 200
        const val PHOTO_EXPORT_MAX = 4096
        const val MAX_EFFECTS = 5
    }
}
