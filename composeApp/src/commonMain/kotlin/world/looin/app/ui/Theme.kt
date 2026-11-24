package world.looin.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Light = lightColorScheme(
    primary = Color(0xFF1A1A1A),
    onPrimary = Color.White,
    secondary = Color(0xFFB8862B),
    onSecondary = Color.White,
    tertiary = Color(0xFFFF8A5B),
    background = Color(0xFFFAFAF8),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFF0EFEA),
    onSurfaceVariant = Color(0xFF55534E),
)

private val Dark = darkColorScheme(
    primary = Color(0xFFF2F2F0),
    onPrimary = Color(0xFF111111),
    secondary = Color(0xFFE8BA4A),
    onSecondary = Color(0xFF111111),
    tertiary = Color(0xFFFFA783),
    background = Color(0xFF0B0A16),
    surface = Color(0xFF15142A),
    surfaceVariant = Color(0xFF221F3D),
    onSurfaceVariant = Color(0xFFB8B6B0),
)

@Composable
fun LooinTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Dark else Light, content = content)
}
