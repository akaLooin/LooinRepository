package com.looin.filmcam.camera

import android.content.Context
import android.media.MediaActionSound
import android.os.Build
import android.view.OrientationEventListener
import android.view.Surface
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.looin.filmcam.data.FlashMode
import com.looin.filmcam.gl.FilmEffect
import com.looin.filmcam.gl.FilmSurfaceProcessor
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** CameraX 바인딩. 프리뷰(필름 효과) + 원본 촬영. */
class CameraController(private val context: Context, processor: FilmSurfaceProcessor) {
    private val ratio4x3 = ResolutionSelector.Builder()
        .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
        .build()
    private val preview = Preview.Builder().setResolutionSelector(ratio4x3).build()
    private val capture = ImageCapture.Builder()
        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
        .setResolutionSelector(ratio4x3)
        .build()
    private val effect = FilmEffect(processor)
    private val sound = MediaActionSound().apply { load(MediaActionSound.SHUTTER_CLICK) }
    /** 셔터음을 끌 수 있는지 설정 화면에서 쓰는 값. */
    var shutterSound = true
    private var provider: ProcessCameraProvider? = null

    var camera: Camera? = null
        private set
    var lensFacing = CameraSelector.LENS_FACING_BACK
        private set

    // 화면은 세로 고정이라, 기기를 돌린 방향을 직접 촬영 회전에 반영한다. (가로 사진은 가로로 저장)
    private val orientation = object : OrientationEventListener(context) {
        override fun onOrientationChanged(o: Int) {
            if (o == ORIENTATION_UNKNOWN) return
            capture.targetRotation = when (o) {
                in 45 until 135 -> Surface.ROTATION_270
                in 135 until 225 -> Surface.ROTATION_180
                in 225 until 315 -> Surface.ROTATION_90
                else -> Surface.ROTATION_0
            }
        }
    }

    fun bind(owner: LifecycleOwner, view: PreviewView, onReady: (Camera) -> Unit, onError: (Throwable) -> Unit) {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            try {
                val p = future.get()
                provider = p
                preview.surfaceProvider = view.surfaceProvider
                val group = UseCaseGroup.Builder()
                    .addUseCase(preview)
                    .addUseCase(capture)
                    .addEffect(effect)
                    .build()
                p.unbindAll()
                val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
                val cam = p.bindToLifecycle(owner, selector, group)
                camera = cam
                orientation.enable()
                onReady(cam)
            } catch (e: Exception) {
                onError(e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun release() {
        unbind()
        sound.release()
    }

    fun unbind() {
        provider?.unbindAll()
        camera = null
        orientation.disable()
    }

    fun switchFacing() {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) CameraSelector.LENS_FACING_FRONT
        else CameraSelector.LENS_FACING_BACK
    }

    val isFront get() = lensFacing == CameraSelector.LENS_FACING_FRONT
    fun hasFlash() = camera?.cameraInfo?.hasFlashUnit() == true

    fun setFlash(mode: Int) {
        capture.flashMode = when (mode) {
            FlashMode.ON -> ImageCapture.FLASH_MODE_ON
            FlashMode.AUTO -> ImageCapture.FLASH_MODE_AUTO
            else -> ImageCapture.FLASH_MODE_OFF
        }
    }

    /** 렌즈 화각 흉내: 28mm = 1x 기준 줌 배율. 기기 한계 안으로 자른다. */
    fun setZoom(ratio: Float) {
        val cam = camera ?: return
        val st = cam.cameraInfo.zoomState.value
        val r = ratio.coerceIn(st?.minZoomRatio ?: 1f, st?.maxZoomRatio ?: 1f)
        cam.cameraControl.setZoomRatio(r)
    }

    fun focus(view: PreviewView, x: Float, y: Float, lock: Boolean) {
        val cam = camera ?: return
        val point = view.meteringPointFactory.createPoint(x, y)
        val action = FocusMeteringAction.Builder(point).apply {
            if (lock) disableAutoCancel() else setAutoCancelDuration(5, TimeUnit.SECONDS)
        }.build()
        cam.cameraControl.startFocusAndMetering(action)
    }

    fun cancelFocusLock() {
        camera?.cameraControl?.cancelFocusAndMetering()
    }

    suspend fun takePicture(file: File) = suspendCancellableCoroutine { cont ->
        if (shutterSound || mustPlayShutterSound()) sound.play(MediaActionSound.SHUTTER_CLICK)
        capture.takePicture(
            ImageCapture.OutputFileOptions.Builder(file).build(),
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) = cont.resume(Unit)
                override fun onError(e: ImageCaptureException) = cont.resumeWithException(e)
            },
        )
    }

    companion object {
        /** 한국·일본 등 셔터음을 끌 수 없게 정한 기기. Android 13 미만은 알 수 없으므로 끌 수 있다고 본다. */
        fun mustPlayShutterSound(): Boolean =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && MediaActionSound.mustPlayShutterSound()
    }
}
