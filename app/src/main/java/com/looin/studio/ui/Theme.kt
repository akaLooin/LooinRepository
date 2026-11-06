package com.looin.studio.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Design tokens (mirrors replica/design/tokens.json). Components use these, never raw values. */
object Tokens {
    val bg = Color(0xFF0E0E10)
    val surface = Color(0xFF18181C)
    val surface2 = Color(0xFF232329)
    val border = Color(0xFF34343C)
    val text = Color(0xFFF4F4F6)
    val textMuted = Color(0xFFA1A1AA)
    val accent = Color(0xFFC8F560)
    val onAccent = Color(0xFF101208)
    val danger = Color(0xFFFF6B6B)

    val space1 = 4.dp
    val space2 = 8.dp
    val space3 = 12.dp
    val space4 = 16.dp
    val space6 = 24.dp

    val radiusSm = 8.dp
    val radiusMd = 12.dp
    val radiusLg = 20.dp

    val thumb = 68.dp
    val tabBar = 56.dp
}

private val scheme = darkColorScheme(
    primary = Tokens.accent,
    onPrimary = Tokens.onAccent,
    background = Tokens.bg,
    onBackground = Tokens.text,
    surface = Tokens.surface,
    onSurface = Tokens.text,
    surfaceVariant = Tokens.surface2,
    onSurfaceVariant = Tokens.textMuted,
    outline = Tokens.border,
    error = Tokens.danger,
    surfaceContainerLow = Tokens.surface,
    surfaceContainer = Tokens.surface,
    surfaceContainerHigh = Tokens.surface2,
)

private val type = Typography(
    headlineSmall = TextStyle(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium),
)

@Composable
fun LooinTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, typography = type, content = content)
}
