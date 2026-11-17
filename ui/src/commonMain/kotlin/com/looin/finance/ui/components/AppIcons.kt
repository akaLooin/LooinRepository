package com.looin.finance.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * 페즈뱅크 전용 아이콘(직접 그림). 장부 느낌에 맞춰 둥근 선(굵기 1.8, 끝 둥글게)으로 그리고, 쓰는 곳에서 색을 입힌다.
 * 같은 모양을 Android 앱 바로가기 아이콘(res/drawable/ic_shortcut_*.xml)에도 쓴다.
 */
object AppIcons {
    private fun icon(name: String, vararg paths: String): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach { d ->
                addPath(addPathNodes(d), fill = null, stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f,
                    strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round)
            }
        }.build()

    private const val WALLET = "M5,10H19A2,2 0 0 1 21,12V19A2,2 0 0 1 19,21H5A2,2 0 0 1 3,19V12A2,2 0 0 1 5,10Z"
    private const val CLASP = "M21,14H17.5A1.5,1.5 0 0 0 17.5,17H21"

    /** 지출: 지갑에서 돈이 나감(위로 화살표). */
    val Expense: ImageVector by lazy { icon("Expense", WALLET, CLASP, "M11,8V2", "M8,5L11,2L14,5") }

    /** 수입: 지갑으로 돈이 들어옴(아래로 화살표). */
    val Income: ImageVector by lazy { icon("Income", WALLET, CLASP, "M11,2V8", "M8,5L11,8L14,5") }

    /** 저축 및 이체: 쌓인 동전에서 다른 곳으로 옮김. */
    val Transfer: ImageVector by lazy {
        icon("Transfer",
            "M3,7.5A5,2 0 1 0 13,7.5A5,2 0 1 0 3,7.5Z", // 맨 위 동전
            "M3,7.5V16.5A5,2 0 0 0 13,16.5V7.5",        // 쌓인 옆면
            "M3,12A5,2 0 0 0 13,12",                    // 가운데 동전 경계
            "M15.5,12H21", "M18.5,9.5L21,12L18.5,14.5")
    }

    /** 영수증 스캔: 네 귀퉁이 스캔 틀 안의 영수증. */
    val ReceiptScan: ImageVector by lazy {
        icon("ReceiptScan",
            "M8,5H16V19L14,17.8L12,19L10,17.8L8,19Z", "M10.5,9H13.5", "M10.5,12H13.5",
            "M3,7V4.5A1.5,1.5 0 0 1 4.5,3H6", "M18,3H19.5A1.5,1.5 0 0 1 21,4.5V7",
            "M21,17V19.5A1.5,1.5 0 0 1 19.5,21H18", "M6,21H4.5A1.5,1.5 0 0 1 3,19.5V17")
    }
}
