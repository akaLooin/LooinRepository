package com.looin.studio.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.BlurOn
import androidx.compose.material.icons.rounded.Brightness6
import androidx.compose.material.icons.rounded.Contrast
import androidx.compose.material.icons.rounded.Deblur
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Exposure
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Flip
import androidx.compose.material.icons.rounded.Grain
import androidx.compose.material.icons.rounded.Gradient
import androidx.compose.material.icons.rounded.InvertColors
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Restore
import androidx.compose.material.icons.rounded.RotateLeft
import androidx.compose.material.icons.rounded.RotateRight
import androidx.compose.material.icons.rounded.Tonality
import androidx.compose.material.icons.rounded.Thermostat
import androidx.compose.material.icons.rounded.Vignette
import androidx.compose.material.icons.rounded.VolumeOff
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material.icons.rounded.Flare
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.util.UnstableApi
import com.looin.studio.model.AdjustKey
import com.looin.studio.model.AspectRatio
import com.looin.studio.model.EditState
import com.looin.studio.model.Presets
import kotlin.math.roundToInt

private const val FAV = "♥"

// ---------------------------------------------------------------- shared bits

@Composable
private fun CategoryRow(categories: List<String>, selected: String, onSelect: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = Tokens.space4),
        horizontalArrangement = Arrangement.spacedBy(Tokens.space2),
        modifier = Modifier.fillMaxWidth().height(36.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items(categories) { c -> Chip(c, selected = c == selected) { onSelect(c) } }
    }
}

/** A slider that records one undo step per drag. */
@UnstableApi
@Composable
private fun EditSlider(
    vm: EditorViewModel,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    label: String,
    onChange: (EditState, Float) -> EditState,
) {
    var before by remember { mutableStateOf<EditState?>(null) }
    Row(
        Modifier.fillMaxWidth().height(44.dp).padding(horizontal = Tokens.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = Tokens.textMuted,
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.width(64.dp))
        Slider(
            value = value,
            onValueChange = { v ->
                if (before == null) before = vm.edit
                vm.preview { onChange(it, v) }
            },
            onValueChangeFinished = { before?.let { vm.commit(it) }; before = null },
            valueRange = range,
            modifier = Modifier.weight(1f).semantics { contentDescription = label },
            colors = SliderDefaults.colors(
                thumbColor = Tokens.text, activeTrackColor = Tokens.accent, inactiveTrackColor = Tokens.surface2,
            ),
        )
        Text((value * 100).roundToInt().toString(), style = MaterialTheme.typography.labelMedium, color = Tokens.text,
            textAlign = TextAlign.End, modifier = Modifier.width(40.dp))
    }
}

@Composable
private fun PresetTile(
    name: String,
    thumb: Bitmap?,
    selected: Boolean,
    marked: Boolean,
    favourite: Boolean,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(Tokens.thumb)) {
        Box(
            Modifier.size(Tokens.thumb).clip(RoundedCornerShape(Tokens.radiusSm)).background(Tokens.surface2)
                .then(if (selected) Modifier.border(2.dp, Tokens.accent, RoundedCornerShape(Tokens.radiusSm)) else Modifier)
                .combinedClickable(role = Role.Button, onClick = onClick, onLongClick = onLongClick)
                .semantics { contentDescription = name + if (selected) ", 선택됨" else "" },
        ) {
            if (thumb != null) {
                Image(thumb.asImageBitmap(), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
            if (marked) {
                Box(Modifier.align(Alignment.TopEnd).padding(4.dp).size(8.dp).clip(RoundedCornerShape(50)).background(Tokens.accent))
            }
            if (favourite) {
                Icon(Icons.Rounded.Favorite, contentDescription = null, tint = Color.White,
                    modifier = Modifier.align(Alignment.BottomStart).padding(3.dp).size(12.dp))
            }
        }
        Text(name, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis,
            color = if (selected) Tokens.text else Tokens.textMuted, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun NoneTile(selected: Boolean, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(Tokens.thumb)) {
        Box(
            Modifier.size(Tokens.thumb).clip(RoundedCornerShape(Tokens.radiusSm)).background(Tokens.surface2)
                .then(if (selected) Modifier.border(2.dp, Tokens.accent, RoundedCornerShape(Tokens.radiusSm)) else Modifier)
                .combinedClickable(role = Role.Button, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Rounded.Block, contentDescription = "필터 없음", tint = Tokens.textMuted) }
        Text("없음", style = MaterialTheme.typography.labelSmall, color = Tokens.textMuted, modifier = Modifier.padding(top = 4.dp))
    }
}

// ---------------------------------------------------------------- filters

@UnstableApi
@Composable
fun FiltersPanel(vm: EditorViewModel) {
    val cats = listOf(FAV) + Presets.lookCategories
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(Tokens.space1)) {
        if (vm.edit.lookId != null) {
            EditSlider(vm, vm.edit.lookIntensity, 0f..1f, Presets.look(vm.edit.lookId)?.name ?: "") { s, v -> s.copy(lookIntensity = v) }
        } else {
            Box(Modifier.fillMaxWidth().height(44.dp), contentAlignment = Alignment.Center) {
                Text("길게 누르면 즐겨찾기에 추가돼요", style = MaterialTheme.typography.labelSmall, color = Tokens.textMuted)
            }
        }
        val looks = if (vm.lookCategory == FAV) Presets.looks.filter { it.id in vm.favourites }
        else Presets.looks.filter { it.category == vm.lookCategory }
        LazyRow(
            contentPadding = PaddingValues(horizontal = Tokens.space4),
            horizontalArrangement = Arrangement.spacedBy(Tokens.space2),
            modifier = Modifier.fillMaxWidth().height(92.dp),
        ) {
            item { NoneTile(vm.edit.lookId == null) { vm.selectLook(null) } }
            if (looks.isEmpty() && vm.lookCategory == FAV) {
                item {
                    Box(Modifier.height(Tokens.thumb).padding(horizontal = Tokens.space3), contentAlignment = Alignment.Center) {
                        Text("아직 즐겨찾기가 없어요", color = Tokens.textMuted, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
            items(looks, key = { it.id }) { look ->
                PresetTile(
                    name = look.name, thumb = vm.lookThumbs[look.id],
                    selected = vm.edit.lookId == look.id, marked = false, favourite = look.id in vm.favourites,
                    onClick = { vm.selectLook(look.id) }, onLongClick = { vm.toggleFavourite(look.id) },
                )
            }
        }
        CategoryRow(cats, vm.lookCategory) { vm.lookCategory = it }
    }
}

// ---------------------------------------------------------------- effects

@UnstableApi
@Composable
fun EffectsPanel(vm: EditorViewModel) {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(Tokens.space1)) {
        val focused = vm.focusedEffect?.let { id -> vm.edit.effects.firstOrNull { it.id == id } }
        if (focused != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    EditSlider(vm, focused.intensity, 0f..1f, Presets.effect(focused.id)?.name ?: "") { s, v ->
                        s.copy(effects = s.effects.map { if (it.id == focused.id) it.copy(intensity = v) else it })
                    }
                }
                IconButton(onClick = { vm.removeEffect(focused.id) }) {
                    Icon(Icons.Rounded.Delete, contentDescription = "효과 빼기", tint = Tokens.textMuted)
                }
            }
        } else {
            Box(Modifier.fillMaxWidth().height(44.dp), contentAlignment = Alignment.Center) {
                Text("효과는 최대 ${EditorViewModel.MAX_EFFECTS}개까지 겹칠 수 있어요", style = MaterialTheme.typography.labelSmall, color = Tokens.textMuted)
            }
        }
        val list = Presets.effects.filter { it.category == vm.effectCategory }
        val activeIds = vm.edit.effects.map { it.id }.toSet()
        LazyRow(
            contentPadding = PaddingValues(horizontal = Tokens.space4),
            horizontalArrangement = Arrangement.spacedBy(Tokens.space2),
            modifier = Modifier.fillMaxWidth().height(92.dp),
        ) {
            items(list, key = { it.id }) { fx ->
                PresetTile(
                    name = fx.name, thumb = vm.effectThumbs[fx.id],
                    selected = vm.focusedEffect == fx.id && fx.id in activeIds,
                    marked = fx.id in activeIds, favourite = false,
                    onClick = { vm.toggleEffect(fx.id) },
                )
            }
        }
        CategoryRow(Presets.effectCategories, vm.effectCategory) { vm.effectCategory = it }
    }
}

// ---------------------------------------------------------------- adjust

private fun AdjustKey.icon(): ImageVector = when (this) {
    AdjustKey.EXPOSURE -> Icons.Rounded.Exposure
    AdjustKey.BRIGHTNESS -> Icons.Rounded.WbSunny
    AdjustKey.CONTRAST -> Icons.Rounded.Contrast
    AdjustKey.SATURATION -> Icons.Rounded.Palette
    AdjustKey.VIBRANCE -> Icons.Rounded.InvertColors
    AdjustKey.WARMTH -> Icons.Rounded.Thermostat
    AdjustKey.TINT -> Icons.Rounded.Gradient
    AdjustKey.HIGHLIGHTS -> Icons.Rounded.Flare
    AdjustKey.SHADOWS -> Icons.Rounded.Tonality
    AdjustKey.FADE -> Icons.Rounded.BlurOn
    AdjustKey.VIGNETTE -> Icons.Rounded.Vignette
    AdjustKey.SHARPEN -> Icons.Rounded.Deblur
    AdjustKey.GRAIN -> Icons.Rounded.Grain
}

@UnstableApi
@Composable
fun AdjustPanel(vm: EditorViewModel) {
    val key = vm.adjustKey
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(Tokens.space1)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                EditSlider(vm, vm.edit.adjust[key] ?: 0f, if (key.bipolar) -1f..1f else 0f..1f, key.label) { s, v ->
                    s.copy(adjust = s.adjust + (key to v))
                }
            }
            IconButton(onClick = { vm.commit { it.copy(adjust = emptyMap()) } }, enabled = vm.edit.adjust.isNotEmpty()) {
                Icon(Icons.Rounded.Restore, contentDescription = "조정 초기화",
                    tint = if (vm.edit.adjust.isNotEmpty()) Tokens.textMuted else Tokens.border)
            }
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = Tokens.space4),
            horizontalArrangement = Arrangement.spacedBy(Tokens.space2),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(AdjustKey.entries) { k ->
                val selected = k == key
                val changed = (vm.edit.adjust[k] ?: 0f) != 0f
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(60.dp).clip(RoundedCornerShape(Tokens.radiusSm))
                        .combinedClickable(role = Role.Button, onClick = { vm.adjustKey = k }, onDoubleClick = {
                            vm.commit { it.copy(adjust = it.adjust - k) }
                        })
                        .padding(vertical = Tokens.space2),
                ) {
                    Box(
                        Modifier.size(48.dp).clip(RoundedCornerShape(50))
                            .background(if (selected) Tokens.text else Tokens.surface2),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(k.icon(), contentDescription = null, tint = if (selected) Tokens.bg else Tokens.text)
                        if (changed) Box(Modifier.align(Alignment.TopEnd).size(8.dp).clip(RoundedCornerShape(50)).background(Tokens.accent))
                    }
                    Text(k.label, style = MaterialTheme.typography.labelSmall, maxLines = 1,
                        color = if (selected) Tokens.text else Tokens.textMuted, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
        Text("두 번 누르면 그 항목만 초기화돼요", style = MaterialTheme.typography.labelSmall, color = Tokens.textMuted,
            modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
    }
}

// ---------------------------------------------------------------- crop

@UnstableApi
@Composable
fun CropPanel(vm: EditorViewModel) {
    val g = vm.edit.geometry
    Column(Modifier.fillMaxSize().padding(top = Tokens.space3), verticalArrangement = Arrangement.spacedBy(Tokens.space4)) {
        LazyRow(
            contentPadding = PaddingValues(horizontal = Tokens.space4),
            horizontalArrangement = Arrangement.spacedBy(Tokens.space2),
        ) {
            items(AspectRatio.entries) { r ->
                Chip(r.label, selected = g.ratio == r) { vm.commit { it.copy(geometry = it.geometry.copy(ratio = r)) } }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            ToolButton(Icons.Rounded.RotateLeft, "왼쪽 회전") {
                vm.commit { it.copy(geometry = it.geometry.copy(rotation = (it.geometry.rotation + 270) % 360)) }
            }
            ToolButton(Icons.Rounded.RotateRight, "오른쪽 회전") {
                vm.commit { it.copy(geometry = it.geometry.copy(rotation = (it.geometry.rotation + 90) % 360)) }
            }
            ToolButton(Icons.Rounded.Flip, "좌우 반전", active = g.flipH) {
                vm.commit { it.copy(geometry = it.geometry.copy(flipH = !it.geometry.flipH)) }
            }
            ToolButton(Icons.Rounded.Flip, "상하 반전", active = g.flipV, rotate = 90f) {
                vm.commit { it.copy(geometry = it.geometry.copy(flipV = !it.geometry.flipV)) }
            }
            ToolButton(Icons.Rounded.Restore, "전체 초기화") { vm.resetAll() }
        }
    }
}

@Composable
private fun ToolButton(icon: ImageVector, label: String, active: Boolean = false, rotate: Float = 0f, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(64.dp).clip(RoundedCornerShape(Tokens.radiusSm))
            .combinedClickable(role = Role.Button, onClick = onClick).padding(vertical = Tokens.space2),
    ) {
        Box(
            Modifier.size(48.dp).clip(RoundedCornerShape(50)).background(if (active) Tokens.accent else Tokens.surface2),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = if (active) Tokens.onAccent else Tokens.text,
                modifier = Modifier.graphicsLayer { rotationZ = rotate })
        }
        Text(label, style = MaterialTheme.typography.labelSmall, color = Tokens.textMuted, maxLines = 1,
            modifier = Modifier.padding(top = 4.dp))
    }
}

// ---------------------------------------------------------------- trim / speed (video)

private fun fmt(ms: Long): String {
    val s = ms / 1000
    return "%d:%02d.%d".format(s / 60, s % 60, (ms % 1000) / 100)
}

@UnstableApi
@Composable
fun TrimPanel(vm: EditorViewModel) {
    val dur = vm.videoDurationMs.coerceAtLeast(1L)
    val e = vm.edit
    var range by remember(dur, e.trimStartMs, e.trimEndMs) {
        mutableStateOf(e.trimStartMs.toFloat()..(if (e.trimEndMs > 0) e.trimEndMs else dur).toFloat())
    }
    Column(Modifier.fillMaxSize().padding(horizontal = Tokens.space4), verticalArrangement = Arrangement.spacedBy(Tokens.space1)) {
        Row(Modifier.fillMaxWidth().padding(top = Tokens.space2)) {
            Text(fmt(range.start.toLong()), style = MaterialTheme.typography.labelMedium, color = Tokens.text)
            Spacer(Modifier.weight(1f))
            Text("길이 ${fmt((range.endInclusive - range.start).toLong())}", style = MaterialTheme.typography.labelMedium, color = Tokens.textMuted)
            Spacer(Modifier.weight(1f))
            Text(fmt(range.endInclusive.toLong()), style = MaterialTheme.typography.labelMedium, color = Tokens.text)
        }
        RangeSlider(
            value = range,
            onValueChange = { r -> if (r.endInclusive - r.start >= 500f) range = r },
            onValueChangeFinished = {
                val end = if (range.endInclusive >= dur - 50) -1L else range.endInclusive.toLong()
                vm.commit { it.copy(trimStartMs = range.start.toLong(), trimEndMs = end) }
            },
            valueRange = 0f..dur.toFloat(),
            colors = SliderDefaults.colors(thumbColor = Tokens.text, activeTrackColor = Tokens.accent, inactiveTrackColor = Tokens.surface2),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Tokens.space2)) {
            Text("속도", style = MaterialTheme.typography.labelMedium, color = Tokens.textMuted, modifier = Modifier.width(36.dp))
            listOf(0.5f, 1f, 1.5f, 2f).forEach { sp ->
                Chip("${if (sp % 1f == 0f) sp.toInt() else sp}x", selected = e.speed == sp) { vm.commit { it.copy(speed = sp) } }
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { vm.commit { it.copy(mute = !it.mute) } }) {
                Icon(if (e.mute) Icons.Rounded.VolumeOff else Icons.Rounded.VolumeUp,
                    contentDescription = if (e.mute) "소리 켜기" else "소리 끄기", tint = if (e.mute) Tokens.danger else Tokens.text)
            }
        }
    }
}

