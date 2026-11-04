package com.looin.filmcam.gl

import android.content.res.AssetManager
import android.graphics.SurfaceTexture
import android.opengl.EGLSurface
import android.opengl.GLES11Ext
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.view.Surface
import androidx.camera.core.CameraEffect
import androidx.camera.core.SurfaceOutput
import androidx.camera.core.SurfaceProcessor
import androidx.camera.core.SurfaceRequest
import java.util.concurrent.Executor

/**
 * 카메라 프리뷰에 필름 셰이더를 입히는 CameraX SurfaceProcessor.
 * 입력: 카메라 → SurfaceTexture(OES). 출력: PreviewView의 Surface.
 * 회전·크롭·미러링은 SurfaceOutput.updateTransformMatrix가 계산해 준다.
 */
class FilmSurfaceProcessor(private val assets: AssetManager) : SurfaceProcessor {
    private val thread = HandlerThread("film-preview-gl").apply { start() }
    private val handler = Handler(thread.looper)
    val executor = Executor { handler.post(it) }

    @Volatile var params: FilmParams? = null
    /** 절전: true면 프레임을 받아도 그리지 않는다. */
    @Volatile var paused = false

    private lateinit var egl: EglCore
    private lateinit var idleSurface: EGLSurface
    private lateinit var program: FilmProgram
    private var oesTex = 0
    private var input: SurfaceTexture? = null
    private val outputs = LinkedHashMap<SurfaceOutput, EGLSurface>()
    private val stMatrix = FloatArray(16)
    private val texMatrix = FloatArray(16)
    private var released = false

    init {
        handler.post {
            egl = EglCore()
            idleSurface = egl.pbuffer(1, 1)
            egl.makeCurrent(idleSurface)
            program = FilmProgram(oes = true, assets = assets)
            oesTex = GlUtil.oesTexture()
        }
    }

    override fun onInputSurface(request: SurfaceRequest) {
        if (released) { request.willNotProvideSurface(); return }
        val tex = SurfaceTexture(oesTex)
        tex.setDefaultBufferSize(request.resolution.width, request.resolution.height)
        val surface = Surface(tex)
        request.provideSurface(surface, executor) {
            tex.setOnFrameAvailableListener(null)
            tex.release()
            surface.release()
            if (input === tex) input = null
        }
        tex.setOnFrameAvailableListener({ drawFrame(it) }, handler)
        input = tex
    }

    override fun onOutputSurface(output: SurfaceOutput) {
        if (released) { output.close(); return }
        val surface = output.getSurface(executor) {
            outputs.remove(output)?.let { egl.makeCurrent(idleSurface); egl.destroy(it) }
            output.close()
        }
        outputs[output] = egl.windowSurface(surface)
    }

    private fun drawFrame(tex: SurfaceTexture) {
        if (released) return
        try {
            egl.makeCurrent(idleSurface)
            tex.updateTexImage()
            val p = params
            if (paused || p == null || outputs.isEmpty()) return
            tex.getTransformMatrix(stMatrix)
            for ((out, es) in outputs) {
                egl.makeCurrent(es)
                out.updateTransformMatrix(texMatrix, stMatrix)
                val (w, h) = egl.size(es)
                program.draw(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTex, texMatrix, p, w, h)
                egl.swap(es)
            }
        } catch (e: Exception) {
            Log.e("FilmCam", "프리뷰 렌더 실패", e)
        }
    }

    fun release() {
        handler.post {
            released = true
            input?.release()
            for ((out, es) in outputs) { egl.destroy(es); out.close() }
            outputs.clear()
            program.release()
            egl.release()
            thread.quitSafely()
        }
    }
}

/** 프리뷰에만 적용하는 효과. 촬영본은 원본으로 저장해서 현상 단계에서 같은 셰이더로 렌더한다. */
class FilmEffect(processor: FilmSurfaceProcessor) :
    CameraEffect(PREVIEW, processor.executor, processor, { e -> Log.e("FilmCam", "카메라 효과 오류", e) })
