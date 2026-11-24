package world.looin.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** 아카엘 기본색: 스프링 그린 #00FF7F. 밝은 화면에서는 글자가 잘 보이도록 한 톤 진하게 쓴다. */
object AkaelColors {
    val Spring = Color(0xFF00FF7F)
    val SpringDeep = Color(0xFF00A85A)
}

private val Light = lightColorScheme(
    primary = AkaelColors.SpringDeep,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD6FFE9),
    onPrimaryContainer = Color(0xFF00391C),
    secondary = Color(0xFF00C46A),
    onSecondary = Color.White,
    tertiary = Color(0xFF5B6B62),
    background = Color(0xFFFAFCFA),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFEEF3EF),
    onSurfaceVariant = Color(0xFF55615A),
    outline = Color(0xFFC9D3CC),
)

private val Dark = darkColorScheme(
    primary = AkaelColors.Spring,
    onPrimary = Color(0xFF00210F),
    primaryContainer = Color(0xFF103A24),
    onPrimaryContainer = Color(0xFFB8FFD8),
    secondary = Color(0xFF66FFB2),
    onSecondary = Color(0xFF00210F),
    tertiary = Color(0xFF9FB3A7),
    background = Color(0xFF0B0F0D),
    surface = Color(0xFF121815),
    surfaceVariant = Color(0xFF1C2520),
    onSurfaceVariant = Color(0xFFA9B8AF),
    outline = Color(0xFF34423A),
)

@Composable
fun LooinTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
}
