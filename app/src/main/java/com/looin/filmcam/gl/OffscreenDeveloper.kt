package com.looin.filmcam.gl

import android.content.res.AssetManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.opengl.EGLSurface
import android.opengl.GLES20
import android.opengl.Matrix as GlMatrix
import android.os.Handler
import android.os.HandlerThread
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.android.asCoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max

/**
 * 원본 JPEG → 필름 셰이더(미리보기와 같은 코드) → Bitmap.
 * 전용 GL 스레드 하나에서 순서대로 처리한다.
 */
class OffscreenDeveloper(private val assets: AssetManager) {
    private val thread = HandlerThread("film-develop-gl").apply { start() }
    private val dispatcher = Handler(thread.looper).asCoroutineDispatcher()

    private var egl: EglCore? = null
    private lateinit var surface: EGLSurface
    private lateinit var program: FilmProgram
    private var maxSide = 0

    private fun ensureGl() {
        if (egl != null) return
        val core = EglCore()
        surface = core.pbuffer(1, 1)
        core.makeCurrent(surface)
        program = FilmProgram(oes = false, assets = assets)
        // 기본 최대 긴 변 3264px(약 8MP). 메모리와 GL 한계 안에서.
        maxSide = minOf(3264, GlUtil.maxTextureSize())
        egl = core
    }

    suspend fun render(raw: File, params: FilmParams): Bitmap = withContext(dispatcher) {
        ensureGl()
        val src = decodeUpright(raw, maxSide)
        val w = src.width
        val h = src.height

        val inputTex = GlUtil.bitmapTexture(src)
        src.recycle()
        val outTex = GlUtil.emptyTexture(w, h)
        val fbo = IntArray(1)
        GLES20.glGenFramebuffers(1, fbo, 0)
        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, fbo[0])
        GLES20.glFramebufferTexture2D(GLES20.GL_FRAMEBUFFER, GLES20.GL_COLOR_ATTACHMENT0, GLES20.GL_TEXTURE_2D, outTex, 0)
        check(GLES20.glCheckFramebufferStatus(GLES20.GL_FRAMEBUFFER) == GLES20.GL_FRAMEBUFFER_COMPLETE) { "FBO 미완성" }

        // 비트맵 첫 줄이 t=0, glReadPixels 첫 줄이 y=0 이라 단위 행렬이면 결과가 바로 선다.
        val identity = FloatArray(16).also { GlMatrix.setIdentityM(it, 0) }
        program.draw(GLES20.GL_TEXTURE_2D, inputTex, identity, params, w, h)

        val buf = ByteBuffer.allocateDirect(w * h * 4).order(ByteOrder.nativeOrder())
        GLES20.glReadPixels(0, 0, w, h, GLES20.GL_RGBA, GLES20.GL_UNSIGNED_BYTE, buf)
        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
        GLES20.glDeleteFramebuffers(1, fbo, 0)
        GlUtil.deleteTexture(inputTex)
        GlUtil.deleteTexture(outTex)

        buf.rewind()
        Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply { copyPixelsFromBuffer(buf) }
    }

    companion object {
        /** EXIF 회전을 픽셀에 굽고 긴 변을 maxSide 이하로 줄인다. 가로 사진은 가로로 나온다. */
        fun decodeUpright(file: File, maxSide: Int): Bitmap {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.path, bounds)
            var sample = 1
            while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
            val decoded = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply {
                inSampleSize = sample
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }) ?: error("원본을 읽을 수 없음: ${file.path}")

            val rotation = ExifInterface(file.path).rotationDegrees
            val longSide = max(decoded.width, decoded.height)
            val scale = if (longSide > maxSide) maxSide.toFloat() / longSide else 1f
            if (rotation == 0 && scale == 1f) return decoded
            val m = Matrix().apply { postRotate(rotation.toFloat()); postScale(scale, scale) }
            return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, m, true).also {
                if (it !== decoded) decoded.recycle()
            }
        }
    }
}
