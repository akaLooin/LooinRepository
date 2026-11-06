package com.looin.studio.ui

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Redo
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Compare
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.media3.common.util.UnstableApi
import com.looin.studio.model.MediaType

@UnstableApi
@Composable
fun EditorScreen(vm: EditorViewModel, onClose: () -> Unit) {
    var showExport by remember { mutableStateOf(false) }
    var confirmClose by remember { mutableStateOf(false) }
    val dirty = vm.canUndo
    BackHandler { if (dirty) confirmClose = true else onClose() }

    Column(Modifier.fillMaxSize().background(Tokens.bg).statusBarsPadding().navigationBarsPadding()) {
        // ---- top bar
        Row(
            Modifier.fillMaxWidth().height(52.dp).padding(horizontal = Tokens.space1),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { if (dirty) confirmClose = true else onClose() }) {
                Icon(Icons.Rounded.Close, contentDescription = "닫기", tint = Tokens.text)
            }
            IconButton(onClick = vm::undo, enabled = vm.canUndo) {
                Icon(Icons.AutoMirrored.Rounded.Undo, contentDescription = "실행 취소",
                    tint = if (vm.canUndo) Tokens.text else Tokens.border)
            }
            IconButton(onClick = vm::redo, enabled = vm.canRedo) {
                Icon(Icons.AutoMirrored.Rounded.Redo, contentDescription = "다시 실행",
                    tint = if (vm.canRedo) Tokens.text else Tokens.border)
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = vm::shuffle) {
                Icon(Icons.Rounded.Shuffle, contentDescription = "랜덤 스타일", tint = Tokens.text)
            }
            Button(
                onClick = { showExport = true },
                colors = ButtonDefaults.buttonColors(containerColor = Tokens.accent, contentColor = Tokens.onAccent),
                shape = RoundedCornerShape(50),
                modifier = Modifier.padding(end = Tokens.space2),
            ) { Text("저장", style = MaterialTheme.typography.titleMedium) }
        }

        // ---- preview
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                vm.loadError != null -> Text(vm.loadError!!, color = Tokens.danger,
                    modifier = Modifier.align(Alignment.Center).padding(Tokens.space6))
                vm.mediaType == MediaType.PHOTO -> {
                    val bmp = vm.previewBitmap
                    if (bmp == null) CircularProgressIndicator(Modifier.align(Alignment.Center), color = Tokens.accent)
                    else PhotoPreview(bmp, vm.renderState, Modifier.fillMaxSize())
                }
                else -> VideoPreview(vm, Modifier.fillMaxSize())
            }
            CompareButton(Modifier.align(Alignment.BottomEnd).padding(Tokens.space3)) { vm.comparing = it }
        }

        // ---- tool panel
        Box(Modifier.fillMaxWidth().height(176.dp).background(Tokens.bg)) {
            when (vm.tool) {
                Tool.FILTERS -> FiltersPanel(vm)
                Tool.EFFECTS -> EffectsPanel(vm)
                Tool.ADJUST -> AdjustPanel(vm)
                Tool.CROP -> CropPanel(vm)
                Tool.TRIM -> TrimPanel(vm)
            }
        }

        // ---- tab bar
        val tools = if (vm.mediaType == MediaType.VIDEO) Tool.entries else Tool.entries - Tool.TRIM
        Row(
            Modifier.fillMaxWidth().height(Tokens.tabBar).background(Tokens.surface),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tools.forEach { t ->
                val selected = vm.tool == t
                TextButton(onClick = { vm.tool = t }) {
                    Text(t.label, style = MaterialTheme.typography.titleMedium,
                        color = if (selected) Tokens.accent else Tokens.textMuted)
                }
            }
        }
    }

    if (showExport) ExportSheet(vm) { showExport = false; vm.dismissExport() }

    if (confirmClose) {
        AlertDialog(
            onDismissRequest = { confirmClose = false },
            title = { Text("편집을 그만둘까요?") },
            text = { Text("저장하지 않은 변경 사항은 사라져요.") },
            confirmButton = { TextButton(onClick = { confirmClose = false; onClose() }) { Text("나가기", color = Tokens.danger) } },
            dismissButton = { TextButton(onClick = { confirmClose = false }) { Text("계속 편집") } },
            containerColor = Tokens.surface2,
        )
    }
}

/** Press and hold to see the original. */
@Composable
private fun CompareButton(modifier: Modifier, onCompare: (Boolean) -> Unit) {
    Box(
        modifier.size(44.dp).clip(RoundedCornerShape(50)).background(Tokens.surface2.copy(alpha = 0.85f))
            .semantics { contentDescription = "길게 눌러 원본 보기" }
            .pointerInput(Unit) {
                detectTapGestures(onPress = {
                    onCompare(true)
                    try { tryAwaitRelease() } finally { onCompare(false) }
                })
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Rounded.Compare, contentDescription = null, tint = Tokens.text)
    }
}

@UnstableApi
@Composable
private fun ExportSheet(vm: EditorViewModel, onDismiss: () -> Unit) {
    val context = LocalContext.current
    var quality by remember { mutableStateOf(ExportQuality.ORIGINAL) }
    val status = vm.exportStatus
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = { if (status !is ExportStatus.Running) onDismiss() },
        containerColor = Tokens.surface,
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = Tokens.space6).padding(bottom = Tokens.space6),
            verticalArrangement = Arrangement.spacedBy(Tokens.space4)) {
            when (status) {
                is ExportStatus.Running -> {
                    Text(status.label, style = MaterialTheme.typography.titleMedium)
                    androidx.compose.material3.LinearProgressIndicator(
                        progress = { status.progress }, modifier = Modifier.fillMaxWidth(),
                        color = Tokens.accent, trackColor = Tokens.surface2,
                    )
                    if (vm.mediaType == MediaType.VIDEO || status.label.contains("영상")) {
                        TextButton(onClick = vm::cancelExport) { Text("취소", color = Tokens.textMuted) }
                    }
                }
                is ExportStatus.Done -> {
                    Text("갤러리에 저장했어요", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(Tokens.space3)) {
                        val mime = if (status.type == MediaType.VIDEO) "video/*" else "image/*"
                        Button(onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(status.uri, mime)
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                        }, colors = ButtonDefaults.buttonColors(containerColor = Tokens.surface2, contentColor = Tokens.text)) { Text("열기") }
                        Button(onClick = {
                            val send = Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, status.uri)
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            context.startActivity(Intent.createChooser(send, "공유"))
                        }, colors = ButtonDefaults.buttonColors(containerColor = Tokens.accent, contentColor = Tokens.onAccent)) { Text("공유") }
                        Spacer(Modifier.weight(1f))
                        TextButton(onClick = onDismiss) { Text("계속 편집", color = Tokens.textMuted) }
                    }
                }
                else -> {
                    if (status is ExportStatus.Failed) {
                        Text("저장하지 못했어요: ${status.message}", color = Tokens.danger, style = MaterialTheme.typography.bodyMedium)
                    }
                    Text("화질", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(Tokens.space2)) {
                        ExportQuality.entries.forEach { q ->
                            Chip(q.label, selected = quality == q) { quality = q }
                        }
                    }
                    if (vm.mediaType == MediaType.PHOTO) {
                        WideButton("사진으로 저장", primary = true) { vm.exportPhoto(quality) }
                        val animated = vm.edit.toRender().animated
                        WideButton(if (animated) "움직이는 영상으로 저장 (5초)" else "영상으로 저장 (5초)", primary = false) {
                            vm.exportVideo(quality)
                        }
                    } else {
                        WideButton("영상 내보내기", primary = true) { vm.exportVideo(quality) }
                    }
                }
            }
        }
    }
}

@Composable
private fun WideButton(label: String, primary: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(Tokens.radiusMd),
        colors = if (primary) ButtonDefaults.buttonColors(containerColor = Tokens.accent, contentColor = Tokens.onAccent)
        else ButtonDefaults.buttonColors(containerColor = Tokens.surface2, contentColor = Tokens.text),
    ) { Text(label, style = MaterialTheme.typography.titleMedium) }
}

@Composable
fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.clip(RoundedCornerShape(50))
            .background(if (selected) Tokens.text else Tokens.surface2)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { this.selected = selected }
            .padding(horizontal = Tokens.space3, vertical = 6.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = if (selected) Tokens.bg else Tokens.textMuted)
    }
}

@Composable
fun HSpace(w: androidx.compose.ui.unit.Dp) = Spacer(Modifier.width(w))
