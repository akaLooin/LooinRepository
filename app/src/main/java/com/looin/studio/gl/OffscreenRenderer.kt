package com.looin.studio.gl

import android.graphics.Bitmap
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLContext
import android.opengl.EGLDisplay
import android.opengl.EGLSurface
import android.opengl.GLES20
import android.opengl.GLUtils
import com.looin.studio.model.RenderState
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors

/**
 * A private EGL context on its own thread, for full-resolution photo export and
 * preset thumbnails. Shares [ChainRenderer] with the live preview.
 */
object OffscreenRenderer {
    private val dispatcher = Executors.newSingleThreadExecutor { r -> Thread(r, "looin-gl") }
        .asCoroutineDispatcher()

    private var display: EGLDisplay = EGL14.EGL_NO_DISPLAY
    private var context: EGLContext = EGL14.EGL_NO_CONTEXT
    private var surface: EGLSurface = EGL14.EGL_NO_SURFACE
    private var chain: ChainRenderer? = null
    private var maxTex = 2048

    private fun ensureContext() {
        if (context != EGL14.EGL_NO_CONTEXT) return
        display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
        val ver = IntArray(2)
        check(EGL14.eglInitialize(display, ver, 0, ver, 1)) { "eglInitialize failed" }
        val attrs = intArrayOf(
            EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8,
            EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
            EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
            EGL14.EGL_NONE,
        )
        val configs = arrayOfNulls<EGLConfig>(1)
        val num = IntArray(1)
        check(EGL14.eglChooseConfig(display, attrs, 0, configs, 0, 1, num, 0) && num[0] > 0) { "no EGL config" }
        context = EGL14.eglCreateContext(
            display, configs[0], EGL14.EGL_NO_CONTEXT,
            intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0
        )
        surface = EGL14.eglCreatePbufferSurface(
            display, configs[0], intArrayOf(EGL14.EGL_WIDTH, 1, EGL14.EGL_HEIGHT, 1, EGL14.EGL_NONE), 0
        )
        check(EGL14.eglMakeCurrent(display, surface, surface, context)) { "eglMakeCurrent failed" }
        chain = ChainRenderer()
        maxTex = GlUtil.maxTextureSize()
    }

    /** Largest side the GPU can process. */
    suspend fun maxSide(): Int = withContext(dispatcher) { ensureContext(); maxTex }

    /** Render [src] through [state] at [outW]x[outH] and read it back as a Bitmap. */
    suspend fun render(src: Bitmap, state: RenderState, timeSec: Float, outW: Int = src.width, outH: Int = src.height): Bitmap =
        withContext(dispatcher) {
            ensureContext()
            renderLocked(src, state, timeSec, outW, outH)
        }

    /** Render many states over the same small source (thumbnails), uploading the source once. */
    suspend fun renderMany(src: Bitmap, states: List<RenderState>, timeSec: Float): List<Bitmap> =
        withContext(dispatcher) {
            ensureContext()
            val tex = upload(src)
            try {
                states.map { drawAndRead(tex, src.width, src.height, it, timeSec, src.width, src.height) }
            } finally {
                GlUtil.deleteTexture(tex)
            }
        }

    private fun upload(src: Bitmap): Int {
        val tex = GlUtil.createTexture()
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, tex)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, src, 0)
        return tex
    }

    private fun renderLocked(src: Bitmap, state: RenderState, timeSec: Float, outW: Int, outH: Int): Bitmap {
        val tex = upload(src)
        try {
            return drawAndRead(tex, src.width, src.height, state, timeSec, outW, outH)
        } finally {
            GlUtil.deleteTexture(tex)
        }
    }

    private fun drawAndRead(tex: Int, w: Int, h: Int, state: RenderState, timeSec: Float, outW: Int, outH: Int): Bitmap {
        val target = RenderTarget(outW, outH)
        try {
            val c = chain!!
            c.setAspect(w.toFloat() / h)
            c.render(tex, w, h, true, state, timeSec, target.framebuffer, 0, 0, outW, outH, flipOutput = true)
            val buf = ByteBuffer.allocateDirect(outW * outH * 4).order(ByteOrder.nativeOrder())
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, target.framebuffer)
            GLES20.glReadPixels(0, 0, outW, outH, GLES20.GL_RGBA, GLES20.GL_UNSIGNED_BYTE, buf)
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
            // The chain wrote the picture upside down, so rows come back top-first like a Bitmap.
            val out = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
            buf.position(0)
            out.copyPixelsFromBuffer(buf)
            return out
        } finally {
            target.release()
        }
    }
}
