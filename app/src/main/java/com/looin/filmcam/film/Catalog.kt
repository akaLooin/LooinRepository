package com.looin.filmcam.film

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Film(
    val id: String,
    val name: String,
    val code: String,
    val category: String,
    val grain: Float,
    val leak: Float,
    val leakColor: List<Float>,
)

@Serializable
data class Body(
    val id: String,
    val name: String,
    val traits: String,
    val vignette: Float,
    val warmth: Float,
)

@Serializable
data class Lens(
    val id: String,
    val name: String,
    val focalMm: Int,
    val traits: String,
    val zoom: Float,
    val distortion: Float,
)

/** 필름 + 바디 + 렌즈 + 노출. 셰이더 파라미터의 원천. */
data class FilmLook(val film: Film, val body: Body, val lens: Lens, val exposureEv: Float = 0f)

data class Gear(val filmId: String, val bodyId: String, val lensId: String)

@Serializable
data class Catalog(val films: List<Film>, val bodies: List<Body>, val lenses: List<Lens>) {
    fun film(id: String) = films.firstOrNull { it.id == id } ?: films.first()
    fun body(id: String) = bodies.firstOrNull { it.id == id } ?: bodies.first()
    fun lens(id: String) = lenses.firstOrNull { it.id == id } ?: lenses.first()
    fun look(g: Gear, ev: Float = 0f) = FilmLook(film(g.filmId), body(g.bodyId), lens(g.lensId), ev)
    val defaultGear get() = Gear(films.first().id, bodies.first().id, lenses.first().id)

    companion object {
        val categories = listOf(
            "all" to "전체", "warm" to "따뜻함", "cool" to "차가움", "pastel" to "파스텔", "mono" to "흑백",
        )

        fun load(context: Context): Catalog {
            val text = context.assets.open("catalog.json").bufferedReader().use { it.readText() }
            return Json { ignoreUnknownKeys = true }.decodeFromString(serializer(), text)
        }
    }
}
