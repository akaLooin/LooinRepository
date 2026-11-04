package com.looin.filmcam.ui.camera

import androidx.camera.view.PreviewView
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Cameraswitch
import androidx.compose.material.icons.rounded.FlashAuto
import androidx.compose.material.icons.rounded.FlashOff
import androidx.compose.material.icons.rounded.FlashOn
import androidx.compose.material.icons.rounded.GridOn
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.TimerOff
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.looin.filmcam.FilmCamApp
import com.looin.filmcam.camera.CameraController
import com.looin.filmcam.data.FlashMode
import com.looin.filmcam.data.Roll
import com.looin.filmcam.gl.FilmSurfaceProcessor
import com.looin.filmcam.gl.params
import com.looin.filmcam.ui.components.BarIcon
import com.looin.filmcam.ui.components.ExposureDial
import com.looin.filmcam.ui.components.ShutterButton
import com.looin.filmcam.ui.components.SprocketStrip
import com.looin.filmcam.ui.components.Toast
import com.looin.filmcam.ui.components.formatEv
import com.looin.filmcam.ui.theme.FilmColors
import com.looin.filmcam.ui.theme.FilmRadius
import com.looin.filmcam.ui.theme.FilmSize
import com.looin.filmcam.ui.theme.FilmSpace
import com.looin.filmcam.ui.theme.FilmText
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.roundToInt

private const val DIM_AFTER_MS = 60_000L
private const val SLEEP_AFTER_MS = 60_000L

/** S02 카메라. */
@Composable
fun CameraScreen(onGallery: () -> Unit, onSettings: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as FilmCamApp
    val vm: CameraViewModel = viewModel { CameraViewModel(app, app.container) }
    val owner = LocalLifecycleOwner.current

    val processor = remember { FilmSurfaceProcessor(context.assets) }
    val controller = remember { CameraController(context, processor) }
    val previewView = remember {
        PreviewView(context).apply {
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }
    DisposableEffect(Unit) { onDispose { controller.release(); processor.release() } }

    val look by vm.look.collectAsStateWithLifecycle()
    val prefs by vm.prefs.collectAsStateWithLifecycle()
    val roll by vm.roll.collectAsStateWithLifecycle()
    val lastPhoto by vm.lastPhoto.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val exposure by vm.exposure.collectAsStateWithLifecycle()
    val pendingFilm by vm.pendingFilm.collectAsStateWithLifecycle()

    var cameraError by remember { mutableStateOf(false) }
    var facingKey by remember { mutableIntStateOf(0) }
    var hasFlash by remember { mutableStateOf(true) }
    var toast by remember { mutableStateOf<String?>(null) }
    var finishedRoll by remember { mutableStateOf<Roll?>(null) }
    var showFilms by remember { mutableStateOf(false) }
    var showGear by remember { mutableStateOf(false) }
    var focusAt by remember { mutableStateOf<Offset?>(null) }
    var locked by remember { mutableStateOf(false) }

    fun bind() = controller.bind(owner, previewView,
        onReady = {
            cameraError = false
            hasFlash = controller.hasFlash()
            controller.setZoom(vm.look.value.lens.zoom)
            controller.setFlash(vm.prefs.value.flash)
        },
        onError = { cameraError = true },
    )

    LaunchedEffect(look) {
        processor.params = look.params()
        controller.setZoom(look.lens.zoom)
    }
    LaunchedEffect(prefs.flash) { controller.setFlash(prefs.flash) }
    LaunchedEffect(prefs.shutterSound) { controller.shutterSound = prefs.shutterSound }
    LaunchedEffect(Unit) { vm.messages.collect { toast = it } }
    LaunchedEffect(Unit) { vm.rollFinished.collect { finishedRoll = it } }
    LaunchedEffect(toast) { if (toast != null) { delay(2500); toast = null } }
    LaunchedEffect(finishedRoll) { if (finishedRoll != null) { delay(2800); finishedRoll = null } }
    LaunchedEffect(focusAt, locked) { if (focusAt != null && !locked) { delay(1500); focusAt = null } }

    // 절전: 조작이 없으면 60초 후 어둡게 + 렌더 중지, 다시 60초 후 카메라 해제. 화질은 건드리지 않는다.
    var lastTouch by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var dimmed by remember { mutableStateOf(false) }
    var sleeping by remember { mutableStateOf(false) }
    LaunchedEffect(facingKey) { bind() }
    LaunchedEffect(lastTouch) {
        dimmed = false
        processor.paused = false
        if (sleeping) { sleeping = false; bind() }
        delay(DIM_AFTER_MS)
        dimmed = true
        processor.paused = true
        delay(SLEEP_AFTER_MS)
        sleeping = true
        controller.unbind()
    }

    val shot = roll?.shotCount ?: 0
    val capacity = roll?.capacity ?: 36
    // 셀프 타이머: 누르면 카운트다운, 카운트다운 중 다시 누르면 취소
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var countdown by remember { mutableStateOf<Int?>(null) }
    var countdownJob by remember { mutableStateOf<kotlinx.coroutines.Job?>(null) }
    val shoot: () -> Unit = shoot@{
        if (dimmed) return@shoot
        if (countdown != null) { countdownJob?.cancel(); countdown = null; return@shoot }
        val seconds = prefs.timer
        if (seconds == 0) { vm.shoot(controller); return@shoot }
        countdownJob = scope.launch {
            for (s in seconds downTo 1) { countdown = s; delay(1000) }
            countdown = null
            vm.shoot(controller)
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(FilmColors.bg)
            .systemBarsPadding()
            .pointerInput(Unit) {
                // 화면 어디를 만지든 절전 타이머를 다시 시작 (이벤트는 소비하지 않음)
                awaitEachGesture {
                    awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                    lastTouch = System.currentTimeMillis()
                }
            },
    ) {
        // TopBar
        Row(
            Modifier.fillMaxWidth().height(FilmSize.topBar).padding(horizontal = FilmSpace.s2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val flashLabel = when (prefs.flash) { FlashMode.AUTO -> "자동"; FlashMode.ON -> "켜짐"; else -> "꺼짐" }
            BarIcon(
                icon = when (prefs.flash) { FlashMode.AUTO -> Icons.Rounded.FlashAuto; FlashMode.ON -> Icons.Rounded.FlashOn; else -> Icons.Rounded.FlashOff },
                description = "플래시: $flashLabel",
                active = prefs.flash != FlashMode.OFF,
                enabled = hasFlash,
            ) { vm.cycleFlash() }
            BarIcon(
                if (prefs.timer == 0) Icons.Rounded.TimerOff else Icons.Rounded.Timer,
                if (prefs.timer == 0) "셀프 타이머: 꺼짐" else "셀프 타이머: ${prefs.timer}초",
                active = prefs.timer != 0,
                badge = if (prefs.timer == 0) null else "${prefs.timer}",
            ) { vm.cycleTimer() }
            BarIcon(Icons.Rounded.GridOn, "그리드: ${if (prefs.grid) "켜짐" else "꺼짐"}", active = prefs.grid) { vm.setGrid(!prefs.grid) }
            Spacer(Modifier.weight(1f))
            BarIcon(Icons.Rounded.Cameraswitch, if (controller.isFront) "후면 카메라로 전환" else "전면 카메라로 전환") {
                controller.switchFacing(); facingKey++
            }
            BarIcon(Icons.Rounded.Tune, "설정", onClick = onSettings)
        }

        // Viewfinder 3:4
        Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).background(FilmColors.viewfinderFrame)) {
            AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
            if (prefs.grid) GridOverlay()

            // 초점/노출: 탭 = 맞추기, 길게 = 잠금
            Box(
                Modifier
                    .fillMaxSize()
                    .semantics { contentDescription = "뷰파인더, 현재 필름 ${look.film.name}" }
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onTap = { o ->
                                if (dimmed) return@detectTapGestures
                                controller.focus(previewView, o.x, o.y, lock = false); focusAt = o; locked = false
                            },
                            onLongPress = { o ->
                                controller.focus(previewView, o.x, o.y, lock = true); focusAt = o; locked = true
                                toast = "AE/AF 잠금"
                            },
                        )
                    }
            )
            focusAt?.let { FocusRing(it, locked) }

            SprocketStrip(Modifier.align(Alignment.TopCenter))
            SprocketStrip(Modifier.align(Alignment.BottomCenter))

            Row(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(horizontal = FilmSpace.s3, vertical = FilmSpace.s4),
                verticalAlignment = Alignment.Bottom,
            ) {
                FrameCounter(shot, capacity)
                Spacer(Modifier.weight(1f))
                Column(
                    horizontalAlignment = Alignment.End,
                    modifier = Modifier
                        .clip(RoundedCornerShape(FilmRadius.sm))
                        .clickable(role = Role.Button) { showFilms = true }
                        .semantics { contentDescription = "필름 고르기, 현재 ${look.film.name}" }
                        .padding(FilmSpace.s1),
                ) {
                    Text(look.film.name.uppercase(), style = FilmText.caption, color = FilmColors.accent)
                    Text("${look.lens.name} · EV ${formatEv(exposure)}", style = FilmText.caption, color = FilmColors.onViewfinder)
                }
            }

            if (dimmed) {
                Box(
                    Modifier.fillMaxSize().background(FilmColors.viewfinderFrame.copy(alpha = 0.7f)),
                    contentAlignment = Alignment.Center,
                ) { Text("탭해서 깨우기", style = FilmText.sm, color = FilmColors.textMuted) }
            }
            if (cameraError) {
                Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Rounded.Videocam, null, tint = FilmColors.textMuted)
                    Text("카메라를 열 수 없어요", style = FilmText.sm, color = FilmColors.text)
                    TextButton(onClick = { bind() }) { Text("다시 시도", color = FilmColors.accent) }
                }
            }
            androidx.compose.animation.AnimatedVisibility(finishedRoll != null, enter = fadeIn(), exit = fadeOut(), modifier = Modifier.fillMaxSize()) {
                RollAdvanceOverlay(finishedRoll, onClick = { finishedRoll = null; onGallery() })
            }
        }

        // Control deck
        Column(
            Modifier.fillMaxWidth().weight(1f).padding(horizontal = FilmSpace.s5),
            verticalArrangement = Arrangement.SpaceEvenly,
        ) {
            ExposureDial(value = exposure, onChange = { vm.exposure.value = it })
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                GalleryThumb(lastPhoto?.developedPath, onGallery)
                Spacer(Modifier.weight(1f))
                ShutterButton(enabled = !busy && !cameraError, remaining = capacity - shot, countdown = countdown, onShoot = shoot)
                Spacer(Modifier.weight(1f))
                GearButton(look.film.id, look.lens.focalMm, onClick = { showGear = true })
            }
        }
    }

    toast?.let {
        Box(Modifier.fillMaxSize().padding(bottom = 220.dp), contentAlignment = Alignment.BottomCenter) {
            Toast(it, Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        }
    }

    if (showFilms) {
        FilmShelfSheet(
            films = vm.catalog.films, selectedId = look.film.id, shot = shot, capacity = capacity,
            onPick = { vm.requestFilm(it) }, onDismiss = { showFilms = false },
        )
    }
    if (showGear) {
        GearSheet(
            bodies = vm.catalog.bodies, lenses = vm.catalog.lenses,
            bodyId = look.body.id, lensId = look.lens.id,
            onBody = { vm.setBody(it) }, onLens = { vm.setLens(it) }, onDismiss = { showGear = false },
        )
    }
    pendingFilm?.let { id ->
        AlertDialog(
            onDismissRequest = vm::cancelFilm,
            containerColor = FilmColors.surfaceRaised,
            title = { Text("필름을 바꿀까요?", style = FilmText.lg, color = FilmColors.text) },
            text = {
                Text(
                    "필름을 바꾸면 지금 롤($shot/$capacity)을 여기서 마감하고 현상해요. 새 롤에는 ${vm.catalog.film(id).name}이 들어가요.",
                    style = FilmText.sm, color = FilmColors.textMuted,
                )
            },
            confirmButton = { TextButton(onClick = { vm.confirmFilm(); showFilms = false }) { Text("바꾸기", color = FilmColors.accent, style = FilmText.smStrong) } },
            dismissButton = { TextButton(onClick = vm::cancelFilm) { Text("계속 찍기", color = FilmColors.text) } },
        )
    }

    // 볼륨 키 셔터 등 외부 셔터 이벤트
    LaunchedEffect(Unit) { ShutterEvents.flow.collect { lastTouch = System.currentTimeMillis(); shoot() } }
}

@Composable
private fun FrameCounter(shot: Int, capacity: Int) {
    val left = capacity - shot
    Row(
        verticalAlignment = Alignment.Bottom,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite; contentDescription = "남은 컷 ${left}장" },
    ) {
        Text("$shot", style = FilmText.counter, color = if (left <= 3) FilmColors.warning else FilmColors.onViewfinder)
        Text("/$capacity", style = FilmText.caption, color = FilmColors.textMuted, modifier = Modifier.padding(bottom = 2.dp))
    }
}

@Composable
private fun GridOverlay() {
    Canvas(Modifier.fillMaxSize()) {
        val c = FilmColors.onViewfinder.copy(alpha = 0.3f)
        for (i in 1..2) {
            val x = size.width * i / 3; val y = size.height * i / 3
            drawLine(c, Offset(x, 0f), Offset(x, size.height), 1.5f)
            drawLine(c, Offset(0f, y), Offset(size.width, y), 1.5f)
        }
    }
}

@Composable
private fun FocusRing(at: Offset, locked: Boolean) {
    val half = with(LocalDensity.current) { 32.dp.toPx() }
    Box(
        Modifier
            .offset { IntOffset((at.x - half).roundToInt(), (at.y - half).roundToInt()) }
            .size(64.dp)
            .border(1.5.dp, FilmColors.accent, RoundedCornerShape(FilmRadius.sm))
    ) {
        if (locked) {
            Text(
                "AE/AF 잠금", style = FilmText.caption, color = FilmColors.onAccent,
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(FilmRadius.pill))
                    .background(FilmColors.accent)
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
    }
}

@Composable
private fun GalleryThumb(path: String?, onClick: () -> Unit) {
    Box(
        Modifier
            .size(FilmSize.touchMin)
            .clip(RoundedCornerShape(FilmRadius.sm))
            .border(1.dp, FilmColors.border, RoundedCornerShape(FilmRadius.sm))
            .background(FilmColors.surface)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "갤러리" },
        contentAlignment = Alignment.Center,
    ) {
        if (path != null) {
            AsyncImage(model = File(path), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Icon(Icons.Rounded.HourglassTop, null, tint = FilmColors.textMuted, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun GearButton(filmId: String, focalMm: Int, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(FilmRadius.sm))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "장비 바꾸기, 렌즈 ${focalMm}mm" }
            .padding(FilmSpace.s1),
    ) {
        AsyncImage(
            model = "file:///android_asset/swatches/$filmId.png", contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(36.dp).clip(CircleShape).border(2.dp, FilmColors.surfaceRaised, CircleShape),
        )
        Text("$focalMm", style = FilmText.caption, color = FilmColors.textMuted)
    }
}

@Composable
private fun RollAdvanceOverlay(roll: Roll?, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(FilmColors.bg.copy(alpha = 0.85f))
            .clickable(onClick = onClick)
            .semantics { liveRegion = LiveRegionMode.Assertive },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(FilmSpace.s2)) {
            Icon(Icons.Rounded.HourglassTop, null, tint = FilmColors.accent, modifier = Modifier.size(40.dp))
            Text("롤을 다 썼어요", style = FilmText.lg, color = FilmColors.text)
            Text("${roll?.shotCount ?: 0}컷 현상 중 · 새 필름을 넣었어요", style = FilmText.sm, color = FilmColors.textMuted)
            Text("탭해서 갤러리 보기", style = FilmText.xs, color = FilmColors.accent)
        }
    }
}
