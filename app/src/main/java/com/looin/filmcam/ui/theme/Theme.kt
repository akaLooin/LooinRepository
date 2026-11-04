package com.looin.filmcam.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.looin.filmcam.R

val Pretendard = FontFamily(
    Font(R.font.pretendard_regular, FontWeight.Normal),
    Font(R.font.pretendard_semibold, FontWeight.SemiBold),
    Font(R.font.pretendard_bold, FontWeight.Bold),
)

val PlexMono = FontFamily(
    Font(R.font.plexmono_medium, FontWeight.Medium),
    Font(R.font.plexmono_semibold, FontWeight.SemiBold),
)

fun TypeToken.style(): TextStyle = TextStyle(
    fontFamily = if (mono) PlexMono else Pretendard,
    fontSize = size.sp,
    lineHeight = line.sp,
    fontWeight = FontWeight(weight),
    letterSpacing = tracking.em,
)

object FilmText {
    val caption = FilmType.caption.style()
    val xs = FilmType.xs.style()
    val sm = FilmType.sm.style()
    val smStrong = FilmType.sm.style().copy(fontWeight = FontWeight.SemiBold)
    val base = FilmType.base.style()
    val lg = FilmType.lg.style()
    val xl = FilmType.xl.style()
    val counter = FilmType.counter.style()
}

private val scheme = darkColorScheme(
    primary = FilmColors.accent,
    onPrimary = FilmColors.onAccent,
    background = FilmColors.bg,
    onBackground = FilmColors.text,
    surface = FilmColors.surface,
    onSurface = FilmColors.text,
    surfaceVariant = FilmColors.surfaceRaised,
    onSurfaceVariant = FilmColors.textMuted,
    surfaceContainer = FilmColors.surface,
    surfaceContainerLow = FilmColors.surface,
    surfaceContainerHigh = FilmColors.surfaceRaised,
    surfaceContainerHighest = FilmColors.surfaceRaised,
    outline = FilmColors.borderInput,
    outlineVariant = FilmColors.border,
    error = FilmColors.danger,
)

@Composable
fun FilmTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = scheme,
        typography = Typography(
            bodyLarge = FilmText.base,
            bodyMedium = FilmText.sm,
            bodySmall = FilmText.xs,
            labelLarge = FilmText.smStrong,
            labelMedium = FilmText.xs,
            labelSmall = FilmText.caption,
            titleMedium = FilmText.base.copy(fontWeight = FontWeight.SemiBold),
            titleLarge = FilmText.lg,
            headlineMedium = FilmText.xl,
        ),
        content = content,
    )
}
