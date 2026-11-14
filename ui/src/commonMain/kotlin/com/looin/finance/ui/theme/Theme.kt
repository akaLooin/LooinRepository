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
import androidx.compose.ui.graphics.luminance
import androidx.compose.foundation.LocalIndication
import androidx.compose.material3.LocalRippleConfiguration
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.platform.KeyValueStore

/**
 * 디자인 토큰 — "장부(ledger)" 테마.
 * 차분한 잉크 네이비(주 버튼·선택)와 청록(완료·여유) 위에, 종이처럼 옅은 회색 배경과 흰 카드로 정보를 묶는다.
 * 가계부 의미 색: 수입 = 파랑, 지출 = 코랄 빨강, 저축·이체 = 보라, 예정 = 호박색.
 * 사용자가 설정 → 색상에서 주요 색을 색 코드로 바꿀 수 있다([ColorRole], [ThemePrefs.colorOverrides]).
 * 다크에서는 그림자 대신 배경 밝기 차이로 층을 나눈다.
 */
@Immutable
data class LooinColors(
    val isDark: Boolean,
    val bg: Color,
    /** 카드(섹션·입력 묶음) 배경. */
    val card: Color,
    val cardBorder: Color,
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
    /** 주 색: 주 버튼, 선택한 칩·탭, + 버튼. */
    val primary: Color,
    val onPrimary: Color,
    /** 강조: 완료 표시, 예산 진행, 여유. */
    val accent: Color,
    val onAccent: Color,
    val income: Color,
    val expense: Color,
    val transfer: Color,
    val planned: Color,
    val dday: Color,
    val danger: Color,
    val toggleOff: Color,
    val toggleThumb: Color,
    val toastBg: Color,
    val onToast: Color,
    val menuEdit: Color,
    val menuDelete: Color,
    val menuMemo: Color,
    val menuTime: Color,
    val menuDone: Color,
    val menuRepeat: Color,
    val menuMove: Color,
    val menuInfo: Color,
    val scrim: Color,
) {
    // ── 예전 이름 호환 ──
    val sunday get() = expense
    val saturday get() = income
    val menuSoft get() = transfer
    val selectedBg get() = primary
    val onSelected get() = onPrimary
    val toggleOn get() = accent
    val cancelled get() = textMuted
    val positive get() = accent
    val warning get() = danger
    /** 주 색을 옅게 깐 배경(선택 표시·알림 상자). */
    val primarySoft get() = primary.copy(alpha = if (isDark) 0.22f else 0.10f)
}

val LightTokens = LooinColors(
    isDark = false,
    bg = Color(0xFFF2F4F7), card = Color(0xFFFFFFFF), cardBorder = Color(0xFFE4E7EC),
    surface = Color(0xFFEBEEF2), surfaceRaised = Color(0xFFFFFFFF), surfaceInput = Color(0xFFFFFFFF),
    surfaceRow = Color(0xFFF6F7F9), surfaceButton = Color(0xFFEDF0F4), surfaceStrong = Color(0xFFDCE0E6),
    selectedDay = Color(0xFFE1E6EE), markerEmpty = Color(0xFFDCE0E6), markerNumber = Color(0xFF4A5260),
    divider = Color(0xFFE9ECF0), grabber = Color(0xFFCDD2DA),
    text = Color(0xFF17202B), textSecondary = Color(0xFF3B4552), textMuted = Color(0xFF677080),
    textPlaceholder = Color(0xFF8A929D), iconInactive = Color(0xFF98A0AA),
    primary = Color(0xFF1F3A5F), onPrimary = Color(0xFFFFFFFF),
    accent = Color(0xFF0E9F8A), onAccent = Color(0xFFFFFFFF),
    income = Color(0xFF2F6FED), expense = Color(0xFFE0484D), transfer = Color(0xFF7C5CDB), planned = Color(0xFFD9861C),
    dday = Color(0xFFE0484D), danger = Color(0xFFD03A40),
    toggleOff = Color(0xFFCDD2DA), toggleThumb = Color(0xFFFFFFFF),
    toastBg = Color(0xFF1F2A38), onToast = Color(0xFFFFFFFF),
    menuEdit = Color(0xFF2F6FED), menuDelete = Color(0xFFE0484D), menuMemo = Color(0xFFD9A400),
    menuTime = Color(0xFFC2459C), menuDone = Color(0xFF0E9F8A), menuRepeat = Color(0xFFD9861C),
    menuMove = Color(0xFF5B5FD6), menuInfo = Color(0xFF677080),
    scrim = Color(0x66101820),
)

val DarkTokens = LooinColors(
    isDark = true,
    bg = Color(0xFF0E1116), card = Color(0xFF171B22), cardBorder = Color(0xFF232934),
    surface = Color(0xFF222833), surfaceRaised = Color(0xFF1B2028), surfaceInput = Color(0xFF171B22),
    surfaceRow = Color(0xFF1B2028), surfaceButton = Color(0xFF242A35), surfaceStrong = Color(0xFF2E3542),
    selectedDay = Color(0xFF2A3140), markerEmpty = Color(0xFF2E3542), markerNumber = Color(0xFFE6E9EE),
    divider = Color(0xFF232934), grabber = Color(0xFF3A4250),
    text = Color(0xFFEEF1F5), textSecondary = Color(0xFFC9CFD8), textMuted = Color(0xFF8B94A1),
    textPlaceholder = Color(0xFF7D8693), iconInactive = Color(0xFF5F6875),
    primary = Color(0xFF8DB8FF), onPrimary = Color(0xFF0E1116),
    accent = Color(0xFF2EC4A9), onAccent = Color(0xFF0E1116),
    income = Color(0xFF6E9BFF), expense = Color(0xFFFF6B6E), transfer = Color(0xFFA78BFA), planned = Color(0xFFF2A93B),
    dday = Color(0xFFFF6B6E), danger = Color(0xFFFF6B6E),
    toggleOff = Color(0xFF3A4250), toggleThumb = Color(0xFFFFFFFF),
    toastBg = Color(0xFFE6E9EE), onToast = Color(0xFF0E1116),
    menuEdit = Color(0xFF6E9BFF), menuDelete = Color(0xFFFF6B6E), menuMemo = Color(0xFFF2C94C),
    menuTime = Color(0xFFE47CC6), menuDone = Color(0xFF2EC4A9), menuRepeat = Color(0xFFF2A93B),
    menuMove = Color(0xFF8C8FF0), menuInfo = Color(0xFF8B94A1),
    scrim = Color(0x99000000),
)

/** 사용자가 색 코드로 바꿀 수 있는 색. 라이트·다크 모두에 같은 색을 쓴다. */
enum class ColorRole(val label: String, val help: String) {
    PRIMARY("주 색", "버튼·선택 표시·+ 버튼"),
    ACCENT("강조 색", "완료 표시·예산 진행 막대"),
    INCOME("수입", "수입 금액·토요일"),
    EXPENSE("지출", "지출 금액·일요일"),
    TRANSFER("저축 및 이체", "계좌 간 이동"),
    PLANNED("예정", "예정 거래 표시");

    fun of(c: LooinColors): Color = when (this) {
        PRIMARY -> c.primary; ACCENT -> c.accent; INCOME -> c.income; EXPENSE -> c.expense; TRANSFER -> c.transfer; PLANNED -> c.planned
    }
}

/** 밝은 색 위에는 검정, 어두운 색 위에는 흰 글자. */
fun contentColorFor(bg: Color): Color = if (bg.luminance() > 0.45f) Color(0xFF0E1116) else Color.White

/** 사용자 지정 색을 토큰에 덮어쓴다. */
fun LooinColors.withOverrides(o: Map<ColorRole, Long>): LooinColors {
    if (o.isEmpty()) return this
    var r = this
    o.forEach { (role, argb) ->
        val col = Color(argb)
        r = when (role) {
            ColorRole.PRIMARY -> r.copy(primary = col, onPrimary = contentColorFor(col))
            ColorRole.ACCENT -> r.copy(accent = col, onAccent = contentColorFor(col), menuDone = col)
            ColorRole.INCOME -> r.copy(income = col)
            ColorRole.EXPENSE -> r.copy(expense = col, dday = col)
            ColorRole.TRANSFER -> r.copy(transfer = col)
            ColorRole.PLANNED -> r.copy(planned = col, menuRepeat = col)
        }
    }
    return r
}

/** Pretendard 글꼴(OFL). 플랫폼마다 불러오는 방법이 달라 각 플랫폼 소스에 둔다(Fonts.android.kt / Fonts.jvm.kt). */
expect val Pretendard: FontFamily

/** 글자 크기. 숫자는 고정폭(tnum)으로 자릿수를 맞춘다. */
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
/** 캘린더 날짜 아래에 무엇을 보일지: 수입·지출 금액 / 그날 잔고 / 표시 없음(점만). */
enum class CalendarDisplay(val label: String) { AMOUNT("금액 보기"), BALANCE("잔고 보기"), DOT("점만 보기") }

enum class ThemeMode(val label: String) { SYSTEM("시스템 설정"), DARK("다크"), LIGHT("라이트") }

object ThemePrefs {
    private var store: KeyValueStore = InMemoryKeyValueStore()

    var mode by mutableStateOf(ThemeMode.SYSTEM)
        private set

    /** 캘린더 날짜 아래 표시 방식(기기별 기억). */
    var calendarDisplay by mutableStateOf(CalendarDisplay.AMOUNT)
        private set

    /** 마지막으로 백업 파일을 만든 날(epoch day, 기기별). 백업 알림에 쓴다. */
    var lastBackupDay by mutableStateOf<Long?>(null)
        private set
    /** "나중에"를 누르면 이 날까지 백업 알림을 숨긴다. */
    var backupSnoozeUntil by mutableStateOf<Long?>(null)
        private set

    fun recordBackup(day: Long) { lastBackupDay = day; store.put("backup.last", day.toString()) }
    fun snoozeBackup(untilDay: Long) { backupSnoozeUntil = untilDay; store.put("backup.snooze", untilDay.toString()) }

    /** 사용자가 바꾼 색(역할 → ARGB). 없으면 기본 테마 색. */
    var colorOverrides by mutableStateOf<Map<ColorRole, Long>>(emptyMap())
        private set

    fun setColor(role: ColorRole, argb: Long?) {
        colorOverrides = if (argb == null) colorOverrides - role else colorOverrides + (role to argb)
        store.put("colors", colorOverrides.entries.joinToString(",") { "${it.key.name}=${it.value.toString(16)}" })
    }

    fun resetColors() { colorOverrides = emptyMap(); store.put("colors", "") }

    /** 앱 시작 시 플랫폼 저장소를 연결하고 저장된 값을 읽는다. */
    fun init(store: KeyValueStore) {
        this.store = store
        lastBackupDay = store.get("backup.last")?.toLongOrNull()
        backupSnoozeUntil = store.get("backup.snooze")?.toLongOrNull()
        colorOverrides = store.get("colors").orEmpty().split(",").mapNotNull { e ->
            val (k, v) = e.split("=").takeIf { it.size == 2 } ?: return@mapNotNull null
            val role = ColorRole.entries.firstOrNull { it.name == k } ?: return@mapNotNull null
            v.toLongOrNull(16)?.let { role to it }
        }.toMap()
        mode = ThemeMode.entries.firstOrNull { it.name == store.get("theme") } ?: ThemeMode.SYSTEM
        calendarDisplay = CalendarDisplay.entries.firstOrNull { it.name == store.get("calendarDisplay") } ?: CalendarDisplay.AMOUNT
    }

    fun chooseCalendarDisplay(d: CalendarDisplay) {
        store.put("calendarDisplay", d.name)
        calendarDisplay = d
    }

    fun set(m: ThemeMode) {
        store.put("theme", m.name)
        mode = m
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun LooinTheme(dark: Boolean = when (ThemePrefs.mode) {
    ThemeMode.SYSTEM -> isSystemInDarkTheme()
    ThemeMode.DARK -> true
    ThemeMode.LIGHT -> false
}, content: @Composable () -> Unit) {
    val c = (if (dark) DarkTokens else LightTokens).withOverrides(ThemePrefs.colorOverrides)
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.primary, onPrimary = c.onPrimary,
        primaryContainer = c.surfaceStrong, onPrimaryContainer = c.text,
        secondaryContainer = c.selectedBg, onSecondaryContainer = c.onSelected,
        background = c.bg, onBackground = c.text,
        surface = c.card, onSurface = c.text, onSurfaceVariant = c.textMuted,
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
        MaterialTheme(colorScheme = scheme, typography = typography) {
            // 누르는 동안만 옅게 칠하고 손을 떼면 바로 지운다(물결이 다음 화면까지 남는 잔상 없음).
            CompositionLocalProvider(LocalIndication provides PressIndication, LocalRippleConfiguration provides null, content = content)
        }
    }
}

object Looin {
    val colors: LooinColors @Composable get() = LocalLooinColors.current
}

/** 예전 이름 호환: 화면 코드의 FinanceTheme.colors.income 등. */
object FinanceTheme {
    val colors: LooinColors @Composable get() = LocalLooinColors.current
}
