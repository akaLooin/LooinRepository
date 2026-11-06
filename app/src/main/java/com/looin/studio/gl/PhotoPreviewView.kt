package com.looin.studio.gl

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.os.SystemClock
import com.looin.studio.model.RenderState
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/** Live GPU preview of a photo with the current edit chain, aspect-fit on a dark background. */
@SuppressLint("ViewConstructor")
class PhotoPreviewView(context: Context) : GLSurfaceView(context) {

    @Volatile private var state: RenderState = RenderState.EMPTY
    @Volatile private var pendingBitmap: Bitmap? = null
    private val startTime = SystemClock.elapsedRealtime()
    private val renderer = Renderer()

    init {
        setEGLContextClientVersion(2)
        setEGLConfigChooser(8, 8, 8, 8, 0, 0)
        setRenderer(renderer)
        renderMode = RENDERMODE_WHEN_DIRTY
    }

    fun setBitmap(bitmap: Bitmap) {
        pendingBitmap = bitmap
        requestRender()
    }

    fun setState(newState: RenderState) {
        state = newState
        renderMode = if (newState.animated) RENDERMODE_CONTINUOUSLY else RENDERMODE_WHEN_DIRTY
        requestRender()
    }

    private inner class Renderer : GLSurfaceView.Renderer {
        private var chain: ChainRenderer? = null
        private var tex = 0
        private var texW = 0
        private var texH = 0
        private var viewW = 1
        private var viewH = 1

        override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
            chain = ChainRenderer()
            tex = 0
            // The context is new: re-upload whatever bitmap we were showing.
            lastBitmap?.let { if (pendingBitmap == null) pendingBitmap = it }
        }

        override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
            viewW = width; viewH = height
        }

        private var lastBitmap: Bitmap? = null

        override fun onDrawFrame(gl: GL10?) {
            pendingBitmap?.let { bmp ->
                pendingBitmap = null
                if (tex == 0) tex = GlUtil.createTexture()
                GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, tex)
                GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0)
                texW = bmp.width; texH = bmp.height
                lastBitmap = bmp
            }
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
            GLES20.glViewport(0, 0, viewW, viewH)
            GLES20.glClearColor(0.055f, 0.055f, 0.063f, 1f)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
            if (tex == 0 || texW == 0) return
            val imgAspect = texW.toFloat() / texH
            val viewAspect = viewW.toFloat() / viewH
            val (w, h) = if (imgAspect > viewAspect) viewW to (viewW / imgAspect).toInt()
            else (viewH * imgAspect).toInt() to viewH
            val x = (viewW - w) / 2
            val y = (viewH - h) / 2
            val t = (SystemClock.elapsedRealtime() - startTime) / 1000f
            chain!!.setAspect(imgAspect)
            chain!!.render(tex, texW, texH, true, state, t, 0, x, y, w, h)
        }
    }
}
