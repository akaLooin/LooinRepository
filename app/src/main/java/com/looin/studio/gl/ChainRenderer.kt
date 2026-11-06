package com.looin.studio.gl

import android.graphics.Bitmap
import android.opengl.GLES20
import android.opengl.GLUtils
import com.looin.studio.model.AdjustKey
import com.looin.studio.model.Look
import com.looin.studio.model.RenderState

/**
 * Runs the edit chain (look -> adjust -> effects) as a series of full-screen passes.
 * The same class renders the photo preview, the photo export, thumbnails and every video
 * frame (through [com.looin.studio.video.ChainGlEffect]), so all four always match.
 *
 * Must be created and used on one GL thread with a current context.
 */
class ChainRenderer {
    private val programs = HashMap<String, Program>()
    private var targets: Array<RenderTarget>? = null
    private var overlayTex = 0
    private var overlayKey = ""

    /** Supplies the date-stamp bitmap for a given aspect ratio (main-thread free). */
    var overlayProvider: (aspect: Float) -> Bitmap? = { DateStamp.create(it) }

    private fun program(fragment: String): Program =
        programs.getOrPut(fragment) { Program(Shaders.VERTEX, fragment) }

    private fun ensureTargets(w: Int, h: Int): Array<RenderTarget> {
        val t = targets
        if (t != null && t[0].width == w && t[0].height == h) return t
        t?.forEach { it.release() }
        return arrayOf(RenderTarget(w, h), RenderTarget(w, h)).also { targets = it }
    }

    private class Pass(val fragment: String, val intensity: Float, val setup: (Program) -> Unit = {})

    private fun buildPasses(state: RenderState): List<Pass> {
        val passes = ArrayList<Pass>()
        state.look?.let { look -> passes += Pass(Shaders.LOOK, state.lookIntensity) { p -> setLook(p, look) } }
        if (state.hasAdjust) passes += Pass(Shaders.ADJUST, 1f) { p -> setAdjust(p, state.adjust) }
        for ((def, intensity) in state.effects) {
            passes += Pass(def.shader, intensity) { p ->
                if (def.needsOverlay) bindOverlay(p)
            }
        }
        if (passes.isEmpty()) passes += Pass(Shaders.COPY, 1f)
        return passes
    }

    /**
     * Render [inputTex] (size [inW]x[inH]) through the chain into framebuffer [targetFbo]
     * at viewport ([vx], [vy], [vw], [vh]).
     * @param flipInput true when the input came from a Bitmap upload (row 0 at the top).
     * @param flipOutput true to write the result top row first, so glReadPixels yields Bitmap order.
     */
    fun render(
        inputTex: Int, inW: Int, inH: Int, flipInput: Boolean,
        state: RenderState, timeSec: Float,
        targetFbo: Int, vx: Int, vy: Int, vw: Int, vh: Int,
        flipOutput: Boolean = false,
    ) {
        val passes = buildPasses(state)
        val rt = if (passes.size > 1) ensureTargets(inW, inH) else null
        var src = inputTex
        GLES20.glDisable(GLES20.GL_BLEND)
        GLES20.glDisable(GLES20.GL_DEPTH_TEST)
        passes.forEachIndexed { i, pass ->
            val last = i == passes.lastIndex
            val outW: Int
            val outH: Int
            if (last) {
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, targetFbo)
                GLES20.glViewport(vx, vy, vw, vh)
                outW = vw; outH = vh
            } else {
                val t = rt!![i % 2]
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, t.framebuffer)
                GLES20.glViewport(0, 0, inW, inH)
                outW = inW; outH = inH
            }
            val p = program(pass.fragment)
            GLES20.glUseProgram(p.id)
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, src)
            p.set1i("uTex", 0)
            p.set1f("uIntensity", pass.intensity)
            p.set1f("uTime", timeSec)
            // Effects are tuned for the picture's own aspect ratio, not the screen's.
            p.set2f("uRes", outW.toFloat(), outW.toFloat() * inH / inW)
            if (i == 0 && flipInput) {
                p.set2f("uTexScale", 1f, -1f); p.set2f("uTexOffset", 0f, 1f)
            } else {
                p.set2f("uTexScale", 1f, 1f); p.set2f("uTexOffset", 0f, 0f)
            }
            p.set1f("uFlipY", if (last && flipOutput) -1f else 1f)
            pass.setup(p)
            drawQuad()
            if (!last) src = rt!![i % 2].texture
        }
        GlUtil.checkError("chain")
    }

    private fun drawQuad() {
        val q = GlUtil.QUAD
        q.position(0)
        GLES20.glEnableVertexAttribArray(0)
        GLES20.glVertexAttribPointer(0, 2, GLES20.GL_FLOAT, false, 16, q)
        q.position(2)
        GLES20.glEnableVertexAttribArray(1)
        GLES20.glVertexAttribPointer(1, 2, GLES20.GL_FLOAT, false, 16, q)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        GLES20.glDisableVertexAttribArray(0)
        GLES20.glDisableVertexAttribArray(1)
        q.position(0)
    }

    private var currentAspect = 1f

    private fun bindOverlay(p: Program) {
        val key = "%.3f".format(currentAspect)
        if (overlayTex == 0 || overlayKey != key) {
            val bmp = overlayProvider(currentAspect)
            if (bmp != null) {
                if (overlayTex == 0) overlayTex = GlUtil.createTexture()
                GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, overlayTex)
                GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0)
                overlayKey = key
            }
        }
        GLES20.glActiveTexture(GLES20.GL_TEXTURE1)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, overlayTex)
        p.set1i("uOverlay", 1)
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    }

    /** Called before [render] so the date stamp is laid out for the picture's shape. */
    fun setAspect(aspect: Float) { currentAspect = aspect }

    private fun setLook(p: Program, l: Look) {
        p.setMat3("uMatrix", l.matrix)
        p.set3f("uOffset", l.offset)
        p.set3f("uLift", l.lift)
        p.set3f("uGamma", l.gamma)
        p.set3f("uGain", l.gain)
        p.set1f("uSat", l.sat)
        p.set1f("uContrast", l.contrast)
        p.set3f("uShadowTint", l.shadowTint)
        p.set3f("uHighTint", l.highTint)
        p.set1f("uSplit", l.split)
        p.set1f("uFade", l.fade)
        p.set1f("uGrain", l.grain)
        p.set1f("uVignette", l.vignette)
    }

    private fun setAdjust(p: Program, a: FloatArray) {
        fun g(k: AdjustKey) = a[k.ordinal]
        p.set1f("uExposure", g(AdjustKey.EXPOSURE))
        p.set1f("uBrightness", g(AdjustKey.BRIGHTNESS))
        p.set1f("uContrast", g(AdjustKey.CONTRAST))
        p.set1f("uSaturation", g(AdjustKey.SATURATION))
        p.set1f("uVibrance", g(AdjustKey.VIBRANCE))
        p.set1f("uWarmth", g(AdjustKey.WARMTH))
        p.set1f("uTint", g(AdjustKey.TINT))
        p.set1f("uHighlights", g(AdjustKey.HIGHLIGHTS))
        p.set1f("uShadows", g(AdjustKey.SHADOWS))
        p.set1f("uFade", g(AdjustKey.FADE))
        p.set1f("uVignette", g(AdjustKey.VIGNETTE))
        p.set1f("uSharpen", g(AdjustKey.SHARPEN))
        p.set1f("uGrain", g(AdjustKey.GRAIN))
    }

    fun release() {
        programs.values.forEach { it.release() }
        programs.clear()
        targets?.forEach { it.release() }
        targets = null
        GlUtil.deleteTexture(overlayTex)
        overlayTex = 0
    }
}
