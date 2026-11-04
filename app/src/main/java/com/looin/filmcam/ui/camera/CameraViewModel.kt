package com.looin.filmcam.ui.camera

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.looin.filmcam.AppContainer
import com.looin.filmcam.camera.CameraController
import com.looin.filmcam.camera.LocationHelper
import com.looin.filmcam.data.CameraPrefs
import com.looin.filmcam.data.FlashMode
import com.looin.filmcam.data.Photo
import com.looin.filmcam.data.Roll
import com.looin.filmcam.film.FilmLook
import com.looin.filmcam.film.Gear
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CameraViewModel(private val app: android.app.Application, private val c: AppContainer) : ViewModel() {
    val catalog = c.catalog

    val gear: StateFlow<Gear> = c.settings.gear.stateIn(viewModelScope, SharingStarted.Eagerly, catalog.defaultGear)
    val prefs: StateFlow<CameraPrefs> = c.settings.cameraPrefs
        .stateIn(viewModelScope, SharingStarted.Eagerly, CameraPrefs())
    val roll: StateFlow<Roll?> = c.db.dao().observeShootingRoll().stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val lastPhoto: StateFlow<Photo?> = c.db.dao().observeLatestDeveloped().stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val exposure = MutableStateFlow(0f)
    val look: StateFlow<FilmLook> = combine(gear, exposure) { g, ev -> catalog.look(g, ev) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, catalog.look(catalog.defaultGear))

    val busy = MutableStateFlow(false)
    /** 롤 도중 필름을 바꾸려 할 때 확인을 기다리는 필름 id. */
    val pendingFilm = MutableStateFlow<String?>(null)

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val messages: SharedFlow<String> = _messages
    private val _rollFinished = MutableSharedFlow<Roll>(extraBufferCapacity = 1)
    val rollFinished: SharedFlow<Roll> = _rollFinished

    init {
        viewModelScope.launch { c.rolls.ensureRoll(c.settings.gear.first()) }
    }

    fun shoot(controller: CameraController) {
        if (busy.value) return
        busy.value = true
        viewModelScope.launch {
            try {
                val file = c.rolls.newRawFile()
                controller.takePicture(file)
                val where = if (prefs.value.location) LocationHelper.lastKnown(app) else null
                val result = c.rolls.addFrame(
                    raw = file, gear = gear.value, exposureEv = exposure.value,
                    lensFacing = if (controller.isFront) "front" else "back",
                    flash = prefs.value.flash != FlashMode.OFF && controller.hasFlash(),
                    latitude = where?.latitude, longitude = where?.longitude,
                )
                c.appScope.launch {
                    runCatching { c.darkroom.develop(result.photo.id) }
                        .onFailure { Log.e("FilmCam", "현상 실패", it); _messages.tryEmit("현상에 실패했어요. 다음 실행 때 다시 시도해요") }
                }
                if (result.rollFinished) _rollFinished.tryEmit(result.roll)
            } catch (e: Exception) {
                Log.e("FilmCam", "촬영 실패", e)
                _messages.tryEmit("사진을 찍지 못했어요")
            } finally {
                busy.value = false
            }
        }
    }

    fun requestFilm(id: String) {
        if (id == gear.value.filmId) return
        val r = roll.value
        if (r != null && r.shotCount > 0) pendingFilm.value = id else applyFilm(id)
    }

    fun confirmFilm() {
        pendingFilm.value?.let { applyFilm(it) }
        pendingFilm.value = null
    }

    fun cancelFilm() { pendingFilm.value = null }

    private fun applyFilm(id: String) = viewModelScope.launch {
        c.settings.setFilm(id)
        val finished = c.rolls.changeFilm(gear.value.copy(filmId = id))
        if (finished != null) _rollFinished.tryEmit(finished)
    }

    fun setBody(id: String) = viewModelScope.launch { c.settings.setBody(id) }
    fun setLens(id: String) = viewModelScope.launch { c.settings.setLens(id) }
    fun setGrid(on: Boolean) = viewModelScope.launch { c.settings.setGrid(on) }

    fun cycleTimer() = viewModelScope.launch {
        c.settings.setTimer(when (prefs.value.timer) { 0 -> 3; 3 -> 10; else -> 0 })
    }

    fun cycleFlash(): Int {
        val next = when (prefs.value.flash) { FlashMode.OFF -> FlashMode.AUTO; FlashMode.AUTO -> FlashMode.ON; else -> FlashMode.OFF }
        viewModelScope.launch { c.settings.setFlash(next) }
        return next
    }

    fun message(text: String) { _messages.tryEmit(text) }
}
