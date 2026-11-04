package com.looin.filmcam.ui.camera

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/** 화면 밖에서 오는 셔터 입력(볼륨 키). MainActivity가 보내고 CameraScreen이 받는다. */
object ShutterEvents {
    private val _flow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val flow: SharedFlow<Unit> = _flow
    @Volatile var cameraVisible = false
    fun fire(): Boolean = cameraVisible && _flow.tryEmit(Unit)
}
