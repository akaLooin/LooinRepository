package com.looin.filmcam.ui.gallery

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.looin.filmcam.FilmCamApp
import com.looin.filmcam.data.Photo
import com.looin.filmcam.data.Roll
import com.looin.filmcam.data.RollStatus
import com.looin.filmcam.ui.components.PrimaryButton
import com.looin.filmcam.ui.theme.FilmColors
import com.looin.filmcam.ui.theme.FilmRadius
import com.looin.filmcam.ui.theme.FilmSize
import com.looin.filmcam.ui.theme.FilmSpace
import com.looin.filmcam.ui.theme.FilmText
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun day(ms: Long) = SimpleDateFormat("M월 d일", Locale.KOREAN).format(Date(ms))

@Composable
private fun Header(title: String, onBack: () -> Unit, actions: @Composable () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().height(FilmSize.topBar).padding(horizontal = FilmSpace.s1),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconAction(Icons.AutoMirrored.Rounded.ArrowBack, "뒤로", onBack)
        Text(title, style = FilmText.xl, color = FilmColors.text, maxLines = 1,
            modifier = Modifier.weight(1f).semantics { heading() })
        actions()
    }
}

@Composable
private fun IconAction(icon: ImageVector, description: String, onClick: () -> Unit, tint: androidx.compose.ui.graphics.Color = FilmColors.text) {
    Box(
        Modifier.size(FilmSize.touchMin).clip(CircleShape).clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = tint) }
}

/** S07 갤러리: 롤 목록. */
@Composable
fun GalleryScreen(onBack: () -> Unit, onRoll: (Long) -> Unit) {
    val app = LocalContext.current.applicationContext as FilmCamApp
    val dao = app.container.db.dao()
    val rolls by remember { dao.observeRolls() }.collectAsState(initial = null)
    val catalog = app.container.catalog

    Column(Modifier.fillMaxSize().background(FilmColors.bg).systemBarsPadding()) {
        Header("갤러리", onBack)
        val list = rolls
        when {
            list == null -> Unit
            list.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(FilmSpace.s6),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
            ) {
                Icon(Icons.Rounded.HourglassTop, null, tint = FilmColors.textMuted, modifier = Modifier.size(56.dp))
                Text("아직 찍은 롤이 없어요", style = FilmText.lg, color = FilmColors.text, modifier = Modifier.padding(top = FilmSpace.s4))
                Text("셔터를 눌러 첫 컷을 남겨 보세요", style = FilmText.sm, color = FilmColors.textMuted, modifier = Modifier.padding(top = FilmSpace.s1))
                PrimaryButton("촬영하러 가기", Modifier.padding(top = FilmSpace.s6), onClick = onBack)
            }
            else -> LazyColumn(
                Modifier.padding(horizontal = FilmSpace.s4),
                verticalArrangement = Arrangement.spacedBy(FilmSpace.s3),
            ) {
                items(list, key = { it.id }) { r -> RollCard(r, catalog.film(r.filmId).name) { onRoll(r.id) } }
            }
        }
    }
}

@Composable
private fun RollCard(roll: Roll, filmName: String, onClick: () -> Unit) {
    val app = LocalContext.current.applicationContext as FilmCamApp
    val photos by remember(roll.id) { app.container.db.dao().observePhotos(roll.id) }.collectAsState(initial = emptyList())
    val covers = photos.mapNotNull { it.developedPath }.take(3)
    val (badge, badgeColor) = when (roll.status) {
        RollStatus.SHOOTING -> "${roll.shotCount}/${roll.capacity}" to FilmColors.textMuted
        RollStatus.DEVELOPING -> "현상 중" to FilmColors.accent
        else -> "현상 완료" to FilmColors.success
    }
    val sub = if (roll.status == RollStatus.SHOOTING) "촬영 중" else "${roll.shotCount}컷 · ${day(roll.startedAt)}"
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(FilmRadius.md))
            .background(FilmColors.surface)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "$filmName, $sub, $badge" }
            .padding(FilmSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(FilmSpace.s3),
    ) {
        Box(Modifier.width(84.dp).height(64.dp)) {
            if (covers.isEmpty()) {
                Box(
                    Modifier.fillMaxSize().clip(RoundedCornerShape(FilmRadius.sm)).background(FilmColors.surfaceRaised),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Rounded.HourglassTop, null, tint = FilmColors.accent) }
            } else covers.forEachIndexed { i, path ->
                AsyncImage(
                    model = File(path), contentDescription = null, contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .offset(x = (i * 16).dp)
                        .graphicsLayer { rotationZ = (i - 1) * 5f }
                        .width(52.dp).height(64.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .border(2.dp, FilmColors.surface, RoundedCornerShape(4.dp)),
                )
            }
        }
        Column(Modifier.weight(1f)) {
            Text(filmName, style = FilmText.base.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold), color = FilmColors.text, maxLines = 1)
            Text(sub, style = FilmText.sm, color = FilmColors.textMuted)
        }
        Text(
            badge, style = FilmText.caption, color = badgeColor,
            modifier = Modifier.clip(RoundedCornerShape(FilmRadius.pill)).background(FilmColors.surfaceRaised)
                .padding(horizontal = 8.dp, vertical = 3.dp),
        )
    }
}

/** S08 롤 상세: 3열 그리드, 길게 눌러 선택 모드. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun RollScreen(rollId: Long, onBack: () -> Unit, onPhoto: (Int) -> Unit) {
    val app = LocalContext.current.applicationContext as FilmCamApp
    val dao = app.container.db.dao()
    val roll by remember(rollId) { dao.observeRoll(rollId) }.collectAsState(initial = null)
    val photos by remember(rollId) { dao.observePhotos(rollId) }.collectAsState(initial = emptyList())
    val developed = photos.filter { it.developedPath != null }
    val selected = remember { mutableStateListOf<Long>() }
    var confirmDelete by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val title = roll?.let { app.container.catalog.film(it.filmId).name } ?: ""

    Column(Modifier.fillMaxSize().background(FilmColors.bg).systemBarsPadding()) {
        if (selected.isEmpty()) Header(title, onBack)
        else Row(
            Modifier.fillMaxWidth().height(FilmSize.topBar).padding(horizontal = FilmSpace.s1),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconAction(Icons.Rounded.Close, "선택 취소", { selected.clear() })
            Text("${selected.size}장 선택", style = FilmText.lg, color = FilmColors.text, modifier = Modifier.weight(1f))
            IconAction(Icons.Rounded.Delete, "선택한 사진 지우기", { confirmDelete = true }, tint = FilmColors.danger)
        }
        val waiting = photos.size - developed.size
        if (waiting > 0) {
            Text("현상 중인 컷 ${waiting}장", style = FilmText.xs, color = FilmColors.accent, modifier = Modifier.padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s1))
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            itemsIndexed(developed, key = { _, p -> p.id }) { index, p ->
                val isSel = p.id in selected
                Box(
                    Modifier
                        .aspectRatio(1f)
                        .combinedClickable(
                            onClick = {
                                if (selected.isNotEmpty()) { if (isSel) selected.remove(p.id) else selected.add(p.id) }
                                else onPhoto(index)
                            },
                            onLongClick = { if (!isSel) selected.add(p.id) },
                        )
                        .semantics { contentDescription = "${p.frameNo}번째 컷, ${day(p.takenAt)}"; this.selected = isSel }
                ) {
                    AsyncImage(model = File(p.developedPath!!), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    if (selected.isNotEmpty()) {
                        Icon(
                            Icons.Rounded.CheckCircle, null,
                            tint = if (isSel) FilmColors.accent else FilmColors.text.copy(alpha = 0.5f),
                            modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                        )
                    }
                }
            }
        }
    }
    if (confirmDelete) {
        DeleteDialog(selected.size, onConfirm = {
            val targets = photos.filter { it.id in selected }
            scope.launch { app.container.rolls.deletePhotos(targets) }
            selected.clear(); confirmDelete = false
        }, onDismiss = { confirmDelete = false })
    }
}

@Composable
private fun DeleteDialog(count: Int, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = FilmColors.surfaceRaised,
        title = { Text("사진 ${count}장을 지울까요?", style = FilmText.lg, color = FilmColors.text) },
        text = { Text("사진첩에 저장된 사본은 그대로 남아요.", style = FilmText.sm, color = FilmColors.textMuted) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("지우기", color = FilmColors.danger, style = FilmText.smStrong) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소", color = FilmColors.text) } },
    )
}

/** S09 사진 뷰어: 좌우 넘기기, 핀치/더블탭 확대, 공유, 삭제. */
@Composable
fun PhotoScreen(rollId: Long, startIndex: Int, onBack: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as FilmCamApp
    val photos by remember(rollId) { app.container.db.dao().observePhotos(rollId) }.collectAsState(initial = null)
    val developed = photos?.filter { it.developedPath != null } ?: return
    if (developed.isEmpty()) { onBack(); return }
    val pager = rememberPagerState(initialPage = startIndex.coerceIn(0, developed.lastIndex)) { developed.size }
    var uiVisible by remember { mutableStateOf(true) }
    var confirmDelete by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val current = developed.getOrNull(pager.currentPage)

    Box(Modifier.fillMaxSize().background(FilmColors.viewfinderFrame)) {
        HorizontalPager(state = pager, modifier = Modifier.fillMaxSize(), key = { developed[it].id }) { page ->
            ZoomableImage(developed[page], onTap = { uiVisible = !uiVisible })
        }
        if (uiVisible && current != null) {
            Row(
                Modifier.fillMaxWidth().systemBarsPadding().height(FilmSize.topBar).padding(horizontal = FilmSpace.s1),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconAction(Icons.AutoMirrored.Rounded.ArrowBack, "뒤로", onBack)
                Text("${current.frameNo}번째 컷 · ${day(current.takenAt)}", style = FilmText.sm, color = FilmColors.text, modifier = Modifier.weight(1f))
            }
            Row(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(FilmColors.surface.copy(alpha = 0.9f))
                    .systemBarsPadding().padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s2),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (current.exportedUri != null) "사진첩에 저장됨" else "사진첩 저장 안 됨",
                    style = FilmText.xs, color = if (current.exportedUri != null) FilmColors.success else FilmColors.warning,
                    modifier = Modifier.weight(1f),
                )
                IconAction(Icons.Rounded.Share, "공유", {
                    current.exportedUri?.let { uri ->
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "image/jpeg"
                            putExtra(Intent.EXTRA_STREAM, Uri.parse(uri))
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(send, null))
                    }
                })
                Spacer(Modifier.width(FilmSpace.s2))
                IconAction(Icons.Rounded.Delete, "지우기", { confirmDelete = true }, tint = FilmColors.danger)
            }
        }
    }
    if (confirmDelete && current != null) {
        DeleteDialog(1, onConfirm = {
            scope.launch { app.container.rolls.deletePhotos(listOf(current)) }
            confirmDelete = false
        }, onDismiss = { confirmDelete = false })
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ZoomableImage(photo: Photo, onTap: () -> Unit) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    val state = rememberTransformableState { zoom, pan, _ ->
        scale = (scale * zoom).coerceIn(1f, 5f)
        offset = if (scale == 1f) Offset.Zero else offset + pan
    }
    AsyncImage(
        model = File(photo.developedPath!!), contentDescription = "${photo.frameNo}번째 컷",
        contentScale = ContentScale.Fit,
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { onTap() },
                    onDoubleTap = { if (scale > 1f) { scale = 1f; offset = Offset.Zero } else scale = 2.5f },
                )
            }
            .transformable(state, canPan = { scale > 1f })
            .graphicsLayer { scaleX = scale; scaleY = scale; translationX = offset.x; translationY = offset.y },
    )
}
