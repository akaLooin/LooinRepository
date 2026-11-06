package com.looin.studio.ui

import android.graphics.Bitmap
import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.looin.studio.gl.PhotoPreviewView
import com.looin.studio.model.RenderState
import com.looin.studio.video.ChainGlEffect
import com.looin.studio.video.VideoEffects
import java.util.concurrent.atomic.AtomicReference

@Composable
fun PhotoPreview(bitmap: Bitmap, state: RenderState, modifier: Modifier) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var view by remember { mutableStateOf<PhotoPreviewView?>(null) }
    AndroidView(
        modifier = modifier,
        factory = { ctx -> PhotoPreviewView(ctx).also { view = it } },
        update = { v -> v.setState(state) },
    )
    // Only push the bitmap again when it really changed.
    LaunchedEffect(bitmap, view) { view?.setBitmap(bitmap) }
    DisposableEffect(lifecycle, view) {
        val obs = LifecycleEventObserver { _, e ->
            when (e) {
                Lifecycle.Event.ON_PAUSE -> view?.onPause()
                Lifecycle.Event.ON_RESUME -> view?.onResume()
                else -> Unit
            }
        }
        lifecycle.addObserver(obs)
        onDispose { lifecycle.removeObserver(obs) }
    }
}

@UnstableApi
@Composable
fun VideoPreview(vm: EditorViewModel, modifier: Modifier) {
    val context = LocalContext.current
    val uri = vm.mediaUri ?: return
    val edit = vm.edit
    val state = remember { AtomicReference(RenderState.EMPTY) }
    state.set(vm.renderState)

    // Geometry and trim change the frame size or the timeline, so they rebuild the player.
    val geometry = edit.geometry
    val trimKey = edit.trimStartMs to edit.trimEndMs
    var playing by remember { mutableStateOf(true) }

    val player = remember(uri, geometry, trimKey) {
        ExoPlayer.Builder(context).build().apply {
            setVideoEffects(VideoEffects.geometry(geometry) + ChainGlEffect { state.get() })
            val item = MediaItem.Builder().setUri(uri)
            if (trimKey.first > 0 || trimKey.second > 0) {
                val clip = MediaItem.ClippingConfiguration.Builder().setStartPositionMs(trimKey.first)
                if (trimKey.second > 0) clip.setEndPositionMs(trimKey.second)
                item.setClippingConfiguration(clip.build())
            }
            setMediaItem(item.build())
            repeatMode = Player.REPEAT_MODE_ALL
            playWhenReady = playing
            prepare()
        }
    }
    DisposableEffect(player) { onDispose { player.release() } }

    LaunchedEffect(player, edit.speed) { player.playbackParameters = PlaybackParameters(edit.speed) }
    LaunchedEffect(player, edit.mute) { player.volume = if (edit.mute) 0f else 1f }
    // While paused, re-render the current frame so edits show up.
    val rs = vm.renderState
    LaunchedEffect(rs) {
        if (!player.isPlaying && player.playbackState == Player.STATE_READY) player.seekTo(player.currentPosition)
    }

    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, player) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_PAUSE) { player.pause(); playing = false }
        }
        lifecycle.addObserver(obs)
        onDispose { lifecycle.removeObserver(obs) }
    }

    Box(modifier) {
        AndroidView(
            modifier = Modifier.matchParentSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    setShutterBackgroundColor(0xFF0E0E10.toInt())
                    setBackgroundColor(0xFF0E0E10.toInt())
                    layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    setOnClickListener {
                        playing = !player.isPlaying
                        if (playing) player.play() else player.pause()
                    }
                }
            },
            update = { v ->
                if (v.player !== player) v.player = player
                v.setOnClickListener {
                    playing = !player.isPlaying
                    if (playing) player.play() else player.pause()
                }
            },
        )
        if (!playing) {
            Box(
                Modifier.align(Alignment.Center).size(64.dp).clip(RoundedCornerShape(50)).background(Tokens.surface2.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.PlayArrow, contentDescription = "재생", tint = Tokens.text) }
        }
    }
}
