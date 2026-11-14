package com.looin.finance.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 넓은 화면(PC 창·태블릿) 여부. 앱 루트가 창 폭으로 정한다([WIDE_MIN_WIDTH] 이상).
 * 넓으면 왼쪽 사이드바 + 두 칸 배치, 좁으면 휴대폰 배치(하단 탭).
 */
val LocalWide = compositionLocalOf { false }

/** 이 폭 이상이면 넓은 화면 배치. */
val WIDE_MIN_WIDTH = 840.dp

/** 넓은 화면에서 두 칸 화면 전체의 최대 폭(아주 넓은 모니터에서 지나치게 퍼지지 않게). */
val WIDE_MAX_CONTENT = 1280.dp

/**
 * 블록 목록을 화면 폭에 맞게 배치한다.
 *  - 좁은 화면: [left] 다음 [right] 를 한 줄로(휴대폰 순서 그대로)
 *  - 넓은 화면: 왼쪽·오른쪽 두 칸, 각자 스크롤
 */
@Composable
fun AdaptiveColumns(
    left: List<@Composable () -> Unit>,
    right: List<@Composable () -> Unit>,
    mobilePadding: PaddingValues,
    spacing: Dp = 12.dp,
    leftWeight: Float = 1.15f,
) {
    if (LocalWide.current) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            Row(Modifier.widthIn(max = WIDE_MAX_CONTENT).fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                val pad = PaddingValues(start = 24.dp, end = 0.dp, top = 4.dp, bottom = 32.dp)
                LazyColumn(Modifier.weight(leftWeight), contentPadding = pad, verticalArrangement = Arrangement.spacedBy(spacing)) {
                    items(left.size) { left[it]() }
                }
                LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(end = 24.dp, top = 4.dp, bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(spacing)) {
                    items(right.size) { right[it]() }
                }
            }
        }
    } else {
        val all = left + right
        LazyColumn(contentPadding = mobilePadding, verticalArrangement = Arrangement.spacedBy(spacing)) {
            items(all.size) { all[it]() }
        }
    }
}
