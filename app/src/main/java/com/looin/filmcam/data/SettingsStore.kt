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

data class CameraPrefs(val grid: Boolean, val flash: Int)

/** 장착 장비와 촬영 설정. */
class SettingsStore(private val context: Context, private val catalog: Catalog) {
    private val film = stringPreferencesKey("film")
    private val body = stringPreferencesKey("body")
    private val lens = stringPreferencesKey("lens")
    private val grid = booleanPreferencesKey("grid")
    private val flash = intPreferencesKey("flash")

    val gear: Flow<Gear> = context.dataStore.data.map {
        val d = catalog.defaultGear
        Gear(it[film] ?: d.filmId, it[body] ?: d.bodyId, it[lens] ?: d.lensId)
    }

    val cameraPrefs: Flow<CameraPrefs> = context.dataStore.data.map {
        CameraPrefs(grid = it[grid] ?: false, flash = it[flash] ?: FlashMode.OFF)
    }

    suspend fun setFilm(id: String) = context.dataStore.edit { it[film] = id }
    suspend fun setBody(id: String) = context.dataStore.edit { it[body] = id }
    suspend fun setLens(id: String) = context.dataStore.edit { it[lens] = id }
    suspend fun setGrid(on: Boolean) = context.dataStore.edit { it[grid] = on }
    suspend fun setFlash(mode: Int) = context.dataStore.edit { it[flash] = mode }
}
