package com.looin.filmcam.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.looin.filmcam.ui.theme.FilmColors
import com.looin.filmcam.ui.theme.FilmRadius
import com.looin.filmcam.ui.theme.FilmSize
import com.looin.filmcam.ui.theme.FilmSpace
import com.looin.filmcam.ui.theme.FilmText
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** 상단 바 아이콘 버튼. 48dp 터치, 현재 값까지 읽어 주는 설명. */
@Composable
fun BarIcon(
    icon: ImageVector,
    description: String,
    active: Boolean = false,
    enabled: Boolean = true,
    badge: String? = null,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .size(FilmSize.touchMin)
            .clip(CircleShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon, contentDescription = null,
            tint = when { !enabled -> FilmColors.textMuted.copy(alpha = 0.4f); active -> FilmColors.text; else -> FilmColors.textMuted },
            modifier = Modifier.size(FilmSize.icon),
        )
        if (badge != null) {
            Text(
                badge, style = FilmText.caption, color = FilmColors.accent,
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 6.dp),
            )
        }
    }
}

@Composable
fun ShutterButton(enabled: Boolean, remaining: Int, countdown: Int? = null, onShoot: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    Box(
        Modifier
            .size(FilmSize.shutter)
            .clip(CircleShape)
            .border(FilmSize.shutterRing, when { countdown != null -> FilmColors.accent; enabled -> FilmColors.text; else -> FilmColors.textMuted }, CircleShape)
            .clickable(enabled = enabled, role = Role.Button) {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onShoot()
            }
            .semantics {
                contentDescription = if (countdown != null) "타이머 ${countdown}초, 다시 누르면 취소" else "셔터, 남은 컷 ${remaining}장"
            },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(FilmSize.shutter - 18.dp)
                .scale(if (enabled) 1f else 0.9f)
                .clip(CircleShape)
                .background(if (enabled) FilmColors.text else FilmColors.textMuted),
            contentAlignment = Alignment.Center,
        ) {
            if (countdown != null) Text("$countdown", style = FilmText.counter, color = FilmColors.onAccent)
        }
    }
}

/** 가로 눈금자 노출 다이얼: -2 ~ +2, 1/3 스텝. 더블탭하면 0. */
@Composable
fun ExposureDial(value: Float, onChange: (Float) -> Unit, modifier: Modifier = Modifier) {
    val haptic = LocalHapticFeedback.current
    val stepPx = with(LocalDensity.current) { 14.dp.toPx() }
    var drag by remember { mutableFloatStateOf(0f) }
    val label = formatEv(value)
    Box(
        modifier
            .fillMaxWidth()
            .height(40.dp)
            .semantics {
                contentDescription = "노출 $label"
                progressBarRangeInfo = ProgressBarRangeInfo(value, -2f..2f, steps = 11)
                setProgress { v -> onChange(snapEv(v)); true }
            }
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { onChange(0f) })
            }
            .pointerInput(value) {
                detectHorizontalDragGestures(
                    onDragStart = { drag = 0f },
                    onHorizontalDrag = { change, dx ->
                        change.consume()
                        drag += dx
                        val steps = (drag / stepPx).toInt()
                        if (steps != 0) {
                            drag -= steps * stepPx
                            val next = snapEv(value - steps / 3f)
                            if (next != value) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onChange(next)
                            }
                        }
                    },
                )
            },
    ) {
        Canvas(Modifier.fillMaxWidth().height(32.dp).align(Alignment.CenterStart)) {
            val center = size.width / 2
            val offset = value * 3 * stepPx // 값만큼 눈금자를 민다
            var i = -40
            while (i <= 40) {
                val x = center + i * stepPx - offset
                if (x in 0f..size.width) {
                    val major = i % 3 == 0
                    val fade = 1f - abs(x - center) / center
                    drawLine(
                        color = (if (major) FilmColors.textMuted else FilmColors.borderInput).copy(alpha = fade.coerceIn(0f, 1f)),
                        start = Offset(x, if (major) 4f else 10f), end = Offset(x, size.height - if (major) 4f else 10f),
                        strokeWidth = if (major) 3f else 2f,
                    )
                }
                i++
            }
            drawLine(FilmColors.accent, Offset(center, 0f), Offset(center, size.height), strokeWidth = 5f)
        }
        Text(
            label, style = FilmText.caption,
            color = if (value == 0f) FilmColors.textMuted else FilmColors.accent,
            modifier = Modifier.align(Alignment.TopEnd),
        )
    }
}

fun snapEv(v: Float) = ((v * 3).roundToInt() / 3f).coerceIn(-2f, 2f)

fun formatEv(v: Float): String = if (v == 0f) "±0" else String.format(Locale.US, "%+.1f", v)

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .height(FilmSize.touchMin)
            .clickable(role = Role.Tab, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            style = if (selected) FilmText.smStrong else FilmText.sm,
            color = if (selected) FilmColors.onAccent else FilmColors.textMuted,
            modifier = Modifier
                .clip(RoundedCornerShape(FilmRadius.pill))
                .background(if (selected) FilmColors.accent else FilmColors.surfaceRaised)
                .padding(horizontal = 14.dp, vertical = 6.dp),
        )
    }
}

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(FilmRadius.md))
            .background(FilmColors.accent)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = FilmSpace.s5),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = FilmText.smStrong, color = FilmColors.onAccent, textAlign = TextAlign.Center) }
}

@Composable
fun SecondaryButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(FilmRadius.md))
            .background(FilmColors.surfaceRaised)
            .border(1.dp, FilmColors.border, RoundedCornerShape(FilmRadius.md))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = FilmSpace.s5),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = FilmText.smStrong, color = FilmColors.text) }
}

/** 필름 가장자리 스프로킷 띠 (장식). */
@Composable
fun SprocketStrip(modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(10.dp)) {
        val hole = 6.dp.toPx(); val gap = 6.dp.toPx(); val h = 4.dp.toPx()
        var x = 0f
        while (x < size.width) {
            drawRect(Color(0xFF2A2622), Offset(x, (size.height - h) / 2), androidx.compose.ui.geometry.Size(hole, h))
            x += hole + gap
        }
    }
}

@Composable
fun Toast(text: String, modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(FilmRadius.md))
            .background(FilmColors.surfaceRaised)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) { Text(text, style = FilmText.sm, color = FilmColors.text) }
}
