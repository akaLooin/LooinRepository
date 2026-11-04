// 자동 생성 파일: replica/design/gen_compose_tokens.py. 직접 수정하지 말 것.
package com.looin.filmcam.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object FilmColors {
    val bg = Color(0xFF0E0D0C)
    val surface = Color(0xFF1A1816)
    val surfaceRaised = Color(0xFF26231F)
    val border = Color(0xFF38332D)
    val borderInput = Color(0xFF7D756A)
    val text = Color(0xFFF2EBDF)
    val textMuted = Color(0xFFA89F92)
    val accent = Color(0xFFFF8A3D)
    val onAccent = Color(0xFF1A0E05)
    val danger = Color(0xFFFF6B5E)
    val success = Color(0xFF6FCF8E)
    val warning = Color(0xFFF2C14E)
    val viewfinderFrame = Color(0xFF000000)
    val onViewfinder = Color(0xFFF2EBDF)
}

object FilmSpace {
    val s0 = 0.dp
    val s1 = 4.dp
    val s2 = 8.dp
    val s3 = 12.dp
    val s4 = 16.dp
    val s5 = 24.dp
    val s6 = 32.dp
    val s7 = 48.dp
    val s8 = 64.dp
}

object FilmRadius {
    val sm = 6.dp
    val md = 12.dp
    val lg = 20.dp
    val pill = 999.dp
}

object FilmSize {
    val touchMin = 48.dp
    val shutter = 76.dp
    val shutterRing = 4.dp
    val icon = 24.dp
    val topBar = 56.dp
    val controlDeck = 196.dp
}

data class TypeToken(val size: Int, val line: Int, val weight: Int, val mono: Boolean, val tracking: Float)

object FilmType {
    val caption = TypeToken(11, 14, 500, true, 0.08f)
    val xs = TypeToken(12, 16, 500, false, 0f)
    val sm = TypeToken(14, 20, 400, false, 0f)
    val base = TypeToken(16, 24, 400, false, 0f)
    val lg = TypeToken(20, 28, 600, false, 0f)
    val xl = TypeToken(28, 34, 700, false, 0f)
    val counter = TypeToken(22, 24, 600, true, 0f)
}

object FilmMotion {
    const val fastMs = 120
    const val baseMs = 220
    const val advanceMs = 480
}
