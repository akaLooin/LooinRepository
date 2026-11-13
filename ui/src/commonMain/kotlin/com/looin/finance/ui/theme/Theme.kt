package com.looin.finance.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.platform.KeyValueStore

/**
 * 디자인 토큰. 투두메이트 프로젝트(replica/design/tokens*.json)의 색 역할·글자 크기·모서리를 그대로 옮기고,
 * 가계부 의미(수입·지출·이체·예정)는 그 팔레트 안에서 고른다.
 *  - 수입 = 토요일 파랑, 지출 = 일요일 빨강 (한국 가계부 관습과도 일치)
 *  - 이체 = menu-soft 보라, 예정 = menu-repeat 주황, 강조·완료 = accent 초록
 * 다크에서는 그림자 대신 배경 밝기 차이로 층을 나눈다.
 */
@Immutable
data class LooinColors(
    val isDark: Boolean,
    val bg: Color,
    val surface: Color,
    val surfaceRaised: Color,
    val surfaceInput: Color,
    val surfaceRow: Color,
    val surfaceButton: Color,
    val surfaceStrong: Color,
    val selectedDay: Color,
    val markerEmpty: Color,
    val markerNumber: Color,
    val divider: Color,
    val grabber: Color,
    val text: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textPlaceholder: Color,
    val iconInactive: Color,
    val accent: Color,
    val onAccent: Color,
    val sunday: Color,
    val saturday: Color,
    val dday: Color,
    val danger: Color,
    val toggleOn: Color,
    val toggleOff: Color,
    val toggleThumb: Color,
    val selectedBg: Color,
    val onSelected: Color,
    val menuEdit: Color,
    val menuDelete: Color,
    val menuMemo: Color,
    val menuTime: Color,
    val menuDone: Color,
    val menuRepeat: Color,
    val menuMove: Color,
    val menuInfo: Color,
    val menuSoft: Color,
    val scrim: Color,
) {
    // ── 가계부 의미 색 ──
    val income get() = saturday
    val expense get() = sunday
    val transfer get() = menuSoft
    val planned get() = menuRepeat
    val cancelled get() = textMuted
    val positive get() = if (isDark) accent else Color(0xFF0F8A47)
    val warning get() = danger
}

val DarkTokens = LooinColors(
    isDark = true,
    bg = Color(0xFF000000), surface = Color(0xFF1C1C1C), surfaceRaised = Color(0xFF242424),
    surfaceInput = Color(0xFF181818), surfaceRow = Color(0xFF1E1E1E), surfaceButton = Color(0xFF303030),
    surfaceStrong = Color(0xFF424242), selectedDay = Color(0xFF363636), markerEmpty = Color(0xFF333333),
    markerNumber = Color(0xFFFFFFFF), divider = Color(0xFF121212), grabber = Color(0xFF4E4E4E),
    text = Color(0xFFFFFFFF), textSecondary = Color(0xFFD2D2D2), textMuted = Color(0xFF8C8C8C),
    textPlaceholder = Color(0xFF868686), iconInactive = Color(0xFF5C5C5C),
    accent = Color(0xFF00FF7F), onAccent = Color(0xFF000000),
    sunday = Color(0xFFE85050), saturday = Color(0xFF0C78ED), dday = Color(0xFFF04E5A), danger = Color(0xFFE5646E),
    toggleOn = Color(0xFF9C9C9C), toggleOff = Color(0xFF424242), toggleThumb = Color(0xFFFFFFFF),
    selectedBg = Color(0xFFFFFFFF), onSelected = Color(0xFF000000),
    menuEdit = Color(0xFF4E7EFC), menuDelete = Color(0xFFFC5A5A), menuMemo = Color(0xFFFCD218),
    menuTime = Color(0xFFF060E4), menuDone = Color(0xFF00C072), menuRepeat = Color(0xFFFC7812),
    menuMove = Color(0xFF666CF0), menuInfo = Color(0xFF36363C), menuSoft = Color(0xFF9DA3DD),
    scrim = Color(0x99000000),
)

val LightTokens = LooinColors(
    isDark = false,
    bg = Color(0xFFFFFFFF), surface = Color(0xFFF0F0F0), surfaceRaised = Color(0xFFFFFFFF),
    surfaceInput = Color(0xFFF5F5F5), surfaceRow = Color(0xFFF3F3F3), surfaceButton = Color(0xFFEAEAEA),
    surfaceStrong = Color(0xFFDDDDDD), selectedDay = Color(0xFFDCDCDC), markerEmpty = Color(0xFFD2D8D8),
    markerNumber = Color(0xFF4F5555), divider = Color(0xFFEEEEEE), grabber = Color(0xFFCCCCCC),
    text = Color(0xFF181818), textSecondary = Color(0xFF3C3C3C), textMuted = Color(0xFF666666),
    textPlaceholder = Color(0xFF6B6B6B), iconInactive = Color(0xFF8E8E93),
    accent = Color(0xFF00FF7F), onAccent = Color(0xFF000000),
    sunday = Color(0xFFD63A3A), saturday = Color(0xFF0A6AD6), dday = Color(0xFFCF2F3C), danger = Color(0xFFC4303C),
    toggleOn = Color(0xFF555555), toggleOff = Color(0xFFCCCCCC), toggleThumb = Color(0xFFFFFFFF),
    selectedBg = Color(0xFF000000), onSelected = Color(0xFFFFFFFF),
    menuEdit = Color(0xFF4E7EFC), menuDelete = Color(0xFFFC5A5A), menuMemo = Color(0xFFFCD218),
    menuTime = Color(0xFFF060E4), menuDone = Color(0xFF00C072), menuRepeat = Color(0xFFFC7812),
    menuMove = Color(0xFF666CF0), menuInfo = Color(0xFFC8C8CC), menuSoft = Color(0xFF7F86C9),
    scrim = Color(0x66000000),
)

/** Pretendard 글꼴(OFL). 플랫폼마다 불러오는 방법이 달라 각 플랫폼 소스에 둔다(Fonts.android.kt / Fonts.jvm.kt). */
expect val Pretendard: FontFamily

/** 투두메이트 토큰의 글자 크기(type.*). 숫자는 고정폭(tnum)으로 자릿수를 맞춘다. */
object LooinType {
    private fun s(size: Float, line: Float, w: FontWeight) =
        TextStyle(fontFamily = Pretendard, fontSize = size.sp, lineHeight = line.sp, fontWeight = w)

    val screenTitle = s(17.5f, 23f, FontWeight.Bold)
    val monthTitle = s(19f, 25f, FontWeight.Bold)
    val sheetTitle = s(16.5f, 22f, FontWeight.Bold)
    val bodyLg = s(15.5f, 22f, FontWeight.Normal)
    val pill = s(16f, 20f, FontWeight.Bold)
    val body = s(14f, 20f, FontWeight.Normal)
    val date = s(14.5f, 17f, FontWeight.Medium)
    val helper = s(13f, 18f, FontWeight.Normal)
    val weekday = s(12.5f, 16f, FontWeight.Medium)
    val tiny = s(10.5f, 13f, FontWeight.SemiBold)
    val toggleLabel = s(10f, 12f, FontWeight.Bold)
    val bigAmount = s(32f, 38f, FontWeight.Bold).copy(fontFeatureSettings = "tnum")
}

object LooinShape {
    val sm = 6.dp
    val md = 10.dp
    val lg = 20.dp
    val sheet = 24.dp
    const val GUTTER = 21
}

val AmountStyle = TextStyle(fontFeatureSettings = "tnum", fontWeight = FontWeight.SemiBold)
val BigAmountStyle = LooinType.bigAmount

val LocalLooinColors = staticCompositionLocalOf { DarkTokens }

/** 화면 테마: 시스템 따름(기본, 시스템이 라이트가 아니면 다크) / 다크 / 라이트. 기기별 설정이라 [KeyValueStore] 에 둔다. */
enum class ThemeMode(val label: String) { SYSTEM("시스템 설정"), DARK("다크"), LIGHT("라이트") }

object ThemePrefs {
    private var store: KeyValueStore = InMemoryKeyValueStore()

    var mode by mutableStateOf(ThemeMode.SYSTEM)
        private set

    /** 앱 시작 시 플랫폼 저장소를 연결하고 저장된 값을 읽는다. */
    fun init(store: KeyValueStore) {
        this.store = store
        mode = ThemeMode.entries.firstOrNull { it.name == store.get("theme") } ?: ThemeMode.SYSTEM
    }

    fun set(m: ThemeMode) {
        store.put("theme", m.name)
        mode = m
    }
}

@Composable
fun LooinTheme(dark: Boolean = when (ThemePrefs.mode) {
    ThemeMode.SYSTEM -> isSystemInDarkTheme()
    ThemeMode.DARK -> true
    ThemeMode.LIGHT -> false
}, content: @Composable () -> Unit) {
    val c = if (dark) DarkTokens else LightTokens
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.text, onPrimary = c.bg,
        primaryContainer = c.surfaceStrong, onPrimaryContainer = c.text,
        secondaryContainer = c.selectedBg, onSecondaryContainer = c.onSelected,
        background = c.bg, onBackground = c.text,
        surface = c.bg, onSurface = c.text, onSurfaceVariant = c.textMuted,
        surfaceVariant = c.surface, surfaceContainer = c.surface, surfaceContainerLow = c.surface,
        surfaceContainerHigh = c.surfaceRaised, surfaceContainerHighest = c.surfaceStrong,
        surfaceContainerLowest = c.bg,
        outline = c.surfaceStrong, outlineVariant = c.divider,
        error = c.danger, scrim = c.scrim, inverseSurface = c.surfaceStrong, inverseOnSurface = c.text,
    )
    val base = Typography()
    val typography = Typography(
        displayLarge = base.displayLarge.copy(fontFamily = Pretendard),
        headlineMedium = base.headlineMedium.copy(fontFamily = Pretendard, fontWeight = FontWeight.Bold),
        titleLarge = LooinType.monthTitle,
        titleMedium = LooinType.screenTitle,
        titleSmall = LooinType.pill.copy(fontSize = 15.sp),
        bodyLarge = LooinType.bodyLg,
        bodyMedium = LooinType.body,
        bodySmall = LooinType.helper,
        labelLarge = LooinType.body.copy(fontWeight = FontWeight.SemiBold),
        labelMedium = LooinType.weekday,
        labelSmall = LooinType.tiny,
    )
    CompositionLocalProvider(LocalLooinColors provides c) {
        MaterialTheme(colorScheme = scheme, typography = typography, content = content)
    }
}

object Looin {
    val colors: LooinColors @Composable get() = LocalLooinColors.current
}

/** 예전 이름 호환: 화면 코드의 FinanceTheme.colors.income 등. */
object FinanceTheme {
    val colors: LooinColors @Composable get() = LocalLooinColors.current
}
