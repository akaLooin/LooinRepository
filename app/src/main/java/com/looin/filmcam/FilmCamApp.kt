package com.looin.filmcam

import android.app.Application
import com.looin.filmcam.data.FilmDb
import com.looin.filmcam.data.SettingsStore
import com.looin.filmcam.develop.Darkroom
import com.looin.filmcam.film.Catalog
import com.looin.filmcam.gl.OffscreenDeveloper
import com.looin.filmcam.roll.RollRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** 수동 DI. 화면이 적어서 Hilt 대신 이것 하나. */
class AppContainer(app: Application) {
    /** 화면을 벗어나도 끝까지 가야 하는 작업(현상)용. */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val catalog = Catalog.load(app)
    val db = FilmDb.create(app)
    val settings = SettingsStore(app, catalog)
    val rolls = RollRepository(db, app.filesDir)
    val darkroom = Darkroom(app, db, catalog, OffscreenDeveloper(app.assets))
}

class FilmCamApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        container.appScope.launch { container.darkroom.resumePending() }
    }
}
