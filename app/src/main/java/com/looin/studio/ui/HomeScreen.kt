package com.looin.studio.ui

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.looin.studio.R
import com.looin.studio.media.MediaIO
import com.looin.studio.media.SavedItem
import com.looin.studio.model.MediaType

@Composable
fun HomeScreen(onOpen: (Uri, MediaType) -> Unit) {
    val context = LocalContext.current
    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { onOpen(it, MediaType.PHOTO) }
    }
    val pickVideo = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { onOpen(it, MediaType.VIDEO) }
    }
    var recent by remember { mutableStateOf<List<SavedItem>>(emptyList()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(Unit) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) { recent = MediaIO.recent(context) }
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = Modifier.fillMaxSize().background(Tokens.bg).systemBarsPadding(),
        contentPadding = PaddingValues(Tokens.space4),
        horizontalArrangement = Arrangement.spacedBy(Tokens.space1),
        verticalArrangement = Arrangement.spacedBy(Tokens.space1),
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = Tokens.space3)) {
                Image(painterResource(R.drawable.logo_white), contentDescription = null, modifier = Modifier.size(32.dp))
                Spacer(Modifier.size(Tokens.space3))
                Text("Looin Studio", style = MaterialTheme.typography.headlineSmall, color = Tokens.text)
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(Tokens.space3), modifier = Modifier.padding(bottom = Tokens.space6)) {
                ActionCard(
                    title = "사진 편집", subtitle = "필터 · 효과 · 조정", icon = Icons.Rounded.PhotoLibrary,
                    brush = Brush.linearGradient(listOf(Color(0xFF3A2E5C), Color(0xFF1F2A44))),
                ) { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
                ActionCard(
                    title = "영상 편집", subtitle = "VHS · 글리치 · 트림 · 속도", icon = Icons.Rounded.Movie,
                    brush = Brush.linearGradient(listOf(Color(0xFF5C2E3A), Color(0xFF44281F))),
                ) { pickVideo.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly)) }
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Text("최근 작업", style = MaterialTheme.typography.titleMedium, color = Tokens.text,
                modifier = Modifier.padding(bottom = Tokens.space2))
        }
        if (recent.isEmpty()) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Box(
                    Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(Tokens.radiusMd)).background(Tokens.surface),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("저장한 사진과 영상이 여기에 모여요", color = Tokens.textMuted, style = MaterialTheme.typography.bodyMedium)
                }
            }
        } else {
            items(recent, key = { it.uri.toString() }) { item ->
                RecentTile(item) {
                    context.startActivity(Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(item.uri, if (item.type == MediaType.VIDEO) "video/*" else "image/*")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    })
                }
            }
        }
    }
}

@Composable
private fun ActionCard(title: String, subtitle: String, icon: ImageVector, brush: Brush, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(104.dp).clip(RoundedCornerShape(Tokens.radiusLg)).background(brush)
            .clickable(role = Role.Button, onClick = onClick).padding(Tokens.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, color = Tokens.text)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = Tokens.textMuted)
        }
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(50)).background(Tokens.accent), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = Tokens.onAccent)
        }
    }
}

@Composable
private fun RecentTile(item: SavedItem, onClick: () -> Unit) {
    val context = LocalContext.current
    val thumb by produceState<Bitmap?>(null, item.uri) { value = MediaIO.thumbnail(context, item.uri, 300) }
    Box(
        Modifier.aspectRatio(1f).clip(RoundedCornerShape(Tokens.radiusSm)).background(Tokens.surface)
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        thumb?.let {
            Image(it.asImageBitmap(), contentDescription = if (item.type == MediaType.VIDEO) "저장한 영상" else "저장한 사진",
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
        if (item.type == MediaType.VIDEO) {
            Icon(Icons.Rounded.PlayArrow, contentDescription = null, tint = Color.White,
                modifier = Modifier.align(Alignment.BottomEnd).padding(Tokens.space1))
        }
    }
}
