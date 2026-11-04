package com.looin.filmcam.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.looin.filmcam.film.Catalog
import com.looin.filmcam.film.Gear
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("settings")

object FlashMode {
    const val OFF = 0
    const val AUTO = 1
    const val ON = 2
}

data class CameraPrefs(
    val grid: Boolean = false,
    val flash: Int = FlashMode.OFF,
    /** 셀프 타이머 초: 0, 3, 10 */
    val timer: Int = 0,
    val shutterSound: Boolean = true,
    val dateStamp: Boolean = false,
    val highRes: Boolean = false,
    val location: Boolean = false,
)

/** 장착 장비와 촬영 설정. */
class SettingsStore(private val context: Context, private val catalog: Catalog) {
    private val film = stringPreferencesKey("film")
    private val body = stringPreferencesKey("body")
    private val lens = stringPreferencesKey("lens")
    private val grid = booleanPreferencesKey("grid")
    private val flash = intPreferencesKey("flash")
    private val timer = intPreferencesKey("timer")
    private val shutterSound = booleanPreferencesKey("shutter_sound")
    private val dateStamp = booleanPreferencesKey("date_stamp")
    private val highRes = booleanPreferencesKey("high_res")
    private val location = booleanPreferencesKey("location")

    val gear: Flow<Gear> = context.dataStore.data.map {
        val d = catalog.defaultGear
        Gear(it[film] ?: d.filmId, it[body] ?: d.bodyId, it[lens] ?: d.lensId)
    }

    val cameraPrefs: Flow<CameraPrefs> = context.dataStore.data.map {
        CameraPrefs(
            grid = it[grid] ?: false,
            flash = it[flash] ?: FlashMode.OFF,
            timer = it[timer] ?: 0,
            shutterSound = it[shutterSound] ?: true,
            dateStamp = it[dateStamp] ?: false,
            highRes = it[highRes] ?: false,
            location = it[location] ?: false,
        )
    }

    suspend fun setFilm(id: String) = context.dataStore.edit { it[film] = id }
    suspend fun setBody(id: String) = context.dataStore.edit { it[body] = id }
    suspend fun setLens(id: String) = context.dataStore.edit { it[lens] = id }
    suspend fun setGrid(on: Boolean) = context.dataStore.edit { it[grid] = on }
    suspend fun setFlash(mode: Int) = context.dataStore.edit { it[flash] = mode }
    suspend fun setTimer(seconds: Int) = context.dataStore.edit { it[timer] = seconds }
    suspend fun setShutterSound(on: Boolean) = context.dataStore.edit { it[shutterSound] = on }
    suspend fun setDateStamp(on: Boolean) = context.dataStore.edit { it[dateStamp] = on }
    suspend fun setHighRes(on: Boolean) = context.dataStore.edit { it[highRes] = on }
    suspend fun setLocation(on: Boolean) = context.dataStore.edit { it[location] = on }
}
