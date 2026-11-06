package com.looin.studio.video

import android.content.Context
import androidx.media3.common.C
import androidx.media3.common.Effect
import androidx.media3.common.audio.SpeedProvider
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram
import androidx.media3.effect.GlEffect
import androidx.media3.effect.GlShaderProgram
import androidx.media3.effect.Presentation
import androidx.media3.effect.ScaleAndRotateTransformation
import com.looin.studio.gl.ChainRenderer
import com.looin.studio.gl.GlUtil
import com.looin.studio.model.Geometry
import com.looin.studio.model.RenderState

/**
 * Media3 effect that runs the shared [ChainRenderer] on every video frame.
 * The state is read per frame, so the preview reacts to edits without rebuilding the player.
 */
@UnstableApi
class ChainGlEffect(private val stateProvider: () -> RenderState) : GlEffect {
    override fun toGlShaderProgram(context: Context, useHdr: Boolean): GlShaderProgram =
        Program(stateProvider)

    private class Program(private val stateProvider: () -> RenderState) :
        BaseGlShaderProgram(/* useHighPrecisionColorComponents = */ false, /* texturePoolCapacity = */ 1) {
        private var chain: ChainRenderer? = null
        private var w = 0
        private var h = 0

        override fun configure(inputWidth: Int, inputHeight: Int): Size {
            w = inputWidth; h = inputHeight
            return Size(inputWidth, inputHeight)
        }

        override fun drawFrame(inputTexId: Int, presentationTimeUs: Long) {
            val c = chain ?: ChainRenderer().also { chain = it }
            val fbo = GlUtil.currentFramebuffer()
            c.setAspect(w.toFloat() / h)
            c.render(inputTexId, w, h, false, stateProvider(), presentationTimeUs / 1_000_000f, fbo, 0, 0, w, h)
        }

        override fun release() {
            super.release()
            chain?.release()
            chain = null
        }
    }
}

@UnstableApi
object VideoEffects {
    /** Rotation, flip and aspect crop as Media3 effects (they change the frame size). */
    fun geometry(g: Geometry): List<Effect> {
        val list = ArrayList<Effect>()
        if (g.flipH || g.flipV) {
            list += ScaleAndRotateTransformation.Builder()
                .setScale(if (g.flipH) -1f else 1f, if (g.flipV) -1f else 1f).build()
        }
        if (g.rotation % 360 != 0) {
            // Media3 rotates counter-clockwise for positive degrees.
            list += ScaleAndRotateTransformation.Builder().setRotationDegrees(360f - (g.rotation % 360)).build()
        }
        g.ratio.value?.let { list += Presentation.createForAspectRatio(it, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP) }
        return list
    }

    class ConstantSpeed(private val speed: Float) : SpeedProvider {
        override fun getSpeed(timeUs: Long): Float = speed
        override fun getNextSpeedChangeTimeUs(timeUs: Long): Long = C.TIME_UNSET
    }
}
