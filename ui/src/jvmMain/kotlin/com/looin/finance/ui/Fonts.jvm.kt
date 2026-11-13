package com.looin.finance.ui.theme

import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.platform.Font

/** PC: ui/src/androidMain/res/font 를 클래스패스 리소스로 함께 쓴다(ui/build.gradle.kts). */
actual val Pretendard: FontFamily = FontFamily(
    Font("font/pretendard_regular.otf", FontWeight.Normal),
    Font("font/pretendard_medium.otf", FontWeight.Medium),
    Font("font/pretendard_semibold.otf", FontWeight.SemiBold),
    Font("font/pretendard_bold.otf", FontWeight.Bold),
)
