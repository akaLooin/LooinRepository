package com.looin.finance.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** 재정 의미 색상. 수입=파랑, 지출=빨강, 이체=보라회색, 예정=주황. 라이트/다크 각각 정의. */
@Immutable
data class FinanceColors(
    val income: Color,
    val expense: Color,
    val transfer: Color,
    val planned: Color,
    val cancelled: Color,
    val positive: Color,
    val warning: Color,
)

private val LightFinance = FinanceColors(
    income = Color(0xFF1765CC), expense = Color(0xFFD12E2E), transfer = Color(0xFF6A5FA8),
    planned = Color(0xFFC46A00), cancelled = Color(0xFF9E9E9E), positive = Color(0xFF2E7D32), warning = Color(0xFFC62828),
)
private val DarkFinance = FinanceColors(
    income = Color(0xFF7FB2FF), expense = Color(0xFFFF8A80), transfer = Color(0xFFB9AEF0),
    planned = Color(0xFFFFB74D), cancelled = Color(0xFF8A8A8A), positive = Color(0xFF81C784), warning = Color(0xFFFF8A80),
)

val LocalFinanceColors = staticCompositionLocalOf { LightFinance }

private val LightScheme = lightColorScheme(
    primary = Color(0xFF1F5FBF), onPrimary = Color.White,
    primaryContainer = Color(0xFFD8E3FA), onPrimaryContainer = Color(0xFF0A2A5C),
    secondaryContainer = Color(0xFFE6E8EF),
    background = Color(0xFFF6F7FA), surface = Color(0xFFF6F7FA), surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFFFFFF),
)
private val DarkScheme = darkColorScheme(
    primary = Color(0xFF9EC0FF), onPrimary = Color(0xFF0A2A5C),
    primaryContainer = Color(0xFF1E3A66), onPrimaryContainer = Color(0xFFD8E3FA),
    background = Color(0xFF111316), surface = Color(0xFF111316), surfaceContainer = Color(0xFF1C1F24),
    surfaceContainerLow = Color(0xFF1C1F24),
)

private val AppTypography = Typography().let { t ->
    t.copy(
        headlineMedium = t.headlineMedium.copy(fontWeight = FontWeight.Bold),
        titleLarge = t.titleLarge.copy(fontWeight = FontWeight.Bold),
        titleMedium = t.titleMedium.copy(fontWeight = FontWeight.SemiBold),
    )
}

/** 금액 표시용: 숫자 폭이 일정한 글꼴 기능(tabular figures)으로 자릿수를 정렬. */
val AmountStyle = TextStyle(fontFeatureSettings = "tnum", fontWeight = FontWeight.SemiBold)
val BigAmountStyle = TextStyle(fontFeatureSettings = "tnum", fontWeight = FontWeight.Bold, fontSize = 28.sp)

@Composable
fun LooinTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    androidx.compose.runtime.CompositionLocalProvider(LocalFinanceColors provides if (dark) DarkFinance else LightFinance) {
        MaterialTheme(colorScheme = if (dark) DarkScheme else LightScheme, typography = AppTypography, content = content)
    }
}

object FinanceTheme {
    val colors: FinanceColors @Composable get() = LocalFinanceColors.current
}
