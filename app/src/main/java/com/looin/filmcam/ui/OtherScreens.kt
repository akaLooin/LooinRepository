package com.looin.filmcam.ui

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.looin.filmcam.FilmCamApp
import com.looin.filmcam.camera.CameraController
import com.looin.filmcam.camera.LocationHelper
import com.looin.filmcam.data.CameraPrefs
import com.looin.filmcam.data.FlashMode
import com.looin.filmcam.ui.components.PrimaryButton
import com.looin.filmcam.ui.components.SecondaryButton
import com.looin.filmcam.ui.theme.FilmColors
import com.looin.filmcam.ui.theme.FilmRadius
import com.looin.filmcam.ui.theme.FilmSize
import com.looin.filmcam.ui.theme.FilmSpace
import com.looin.filmcam.ui.theme.FilmText
import kotlinx.coroutines.launch

/** S01 권한. */
@Composable
fun PermissionScreen(permanentlyDenied: Boolean, onRequest: () -> Unit, onOpenSettings: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(FilmColors.bg).systemBarsPadding().padding(FilmSpace.s6),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Rounded.PhotoCamera, null, tint = FilmColors.accent, modifier = Modifier.size(56.dp))
        Text(
            "카메라를 쓰려면 권한이 필요해요", style = FilmText.lg, color = FilmColors.text, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = FilmSpace.s4).semantics { heading() },
        )
        Text(
            if (permanentlyDenied) "권한이 꺼져 있어요. 설정에서 카메라 권한을 켜 주세요."
            else "찍은 사진은 이 폰 안에만 저장돼요. 어디로도 보내지 않아요.",
            style = FilmText.sm, color = FilmColors.textMuted, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = FilmSpace.s2),
        )
        if (permanentlyDenied) PrimaryButton("설정 열기", Modifier.padding(top = FilmSpace.s6), onClick = onOpenSettings)
        else PrimaryButton("허용하기", Modifier.padding(top = FilmSpace.s6), onClick = onRequest)
    }
}

/** S10 설정. */
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as FilmCamApp
    val settings = app.container.settings
    val prefs by remember { settings.cameraPrefs }.collectAsState(initial = CameraPrefs())
    val scope = rememberCoroutineScope()
    val forcedSound = remember { CameraController.mustPlayShutterSound() }
    val locationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        scope.launch { settings.setLocation(result.values.any { it }) }
    }

    Column(
        Modifier.fillMaxSize().background(FilmColors.bg).systemBarsPadding().verticalScroll(rememberScrollState()),
    ) {
        Row(Modifier.fillMaxWidth().height(FilmSize.topBar).padding(horizontal = FilmSpace.s1), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(FilmSize.touchMin).clip(CircleShape).clickable(role = Role.Button, onClick = onBack)
                    .semantics { contentDescription = "뒤로" },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null, tint = FilmColors.text) }
            Text("설정", style = FilmText.xl, color = FilmColors.text, modifier = Modifier.semantics { heading() })
        }

        Section("촬영") {
            SegmentRow("셀프 타이머", listOf(0 to "끔", 3 to "3초", 10 to "10초"), prefs.timer) { scope.launch { settings.setTimer(it) } }
            ToggleRow(
                "셔터음",
                if (forcedSound) "이 기기는 셔터음을 끌 수 없어요" else "찍을 때 찰칵 소리를 내요",
                if (forcedSound) true else prefs.shutterSound, enabled = !forcedSound,
            ) { scope.launch { settings.setShutterSound(it) } }
            ToggleRow("그리드 표시", "뷰파인더에 3x3 선을 보여요", prefs.grid) { scope.launch { settings.setGrid(it) } }
            ToggleRow("볼륨 키로 촬영", "카메라 화면에서 볼륨 키를 누르면 셔터가 눌려요", true, enabled = false) {}
        }
        Section("사진") {
            ToggleRow("날짜 각인", "오른쪽 아래에 '26 11 04 처럼 찍은 날짜를 새겨요", prefs.dateStamp) { scope.launch { settings.setDateStamp(it) } }
            ToggleRow("고해상도", "약 12MP로 저장해요. 끄면 약 8MP (더 빠르고 가벼움)", prefs.highRes) { scope.launch { settings.setHighRes(it) } }
            ToggleRow("위치 기록", "사진 정보(EXIF)에 촬영 위치를 넣어요. 기기 밖으로 보내지 않아요", prefs.location) { on ->
                if (on && !LocationHelper.hasPermission(context)) {
                    locationLauncher.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                } else scope.launch { settings.setLocation(on) }
            }
        }
        Text(
            "알림창의 빠른 설정에 \"필름캠\" 타일을 추가하면 잠금화면에서도 바로 열 수 있어요.\n" +
                "글꼴: Pretendard, IBM Plex Mono (SIL Open Font License 1.1)",
            style = FilmText.xs, color = FilmColors.textMuted,
            modifier = Modifier.padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s2),
        )
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Text(title, style = FilmText.xs, color = FilmColors.textMuted, modifier = Modifier.padding(start = FilmSpace.s5, top = FilmSpace.s4, bottom = FilmSpace.s1))
    Column(
        Modifier.padding(horizontal = FilmSpace.s4).clip(RoundedCornerShape(FilmRadius.md)).background(FilmColors.surface),
    ) { content() }
}

@Composable
private fun SegmentRow(title: String, options: List<Pair<Int, String>>, value: Int, onChange: (Int) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = FilmText.base, color = FilmColors.text, modifier = Modifier.weight(1f))
        Row(
            Modifier.clip(RoundedCornerShape(FilmRadius.pill)).background(FilmColors.surfaceRaised).padding(3.dp),
        ) {
            options.forEach { (v, label) ->
                val on = v == value
                Box(
                    Modifier
                        .clip(RoundedCornerShape(FilmRadius.pill))
                        .background(if (on) FilmColors.accent else FilmColors.surfaceRaised)
                        .clickable(role = Role.RadioButton) { onChange(v) }
                        .semantics { selected = on; contentDescription = "$title $label" }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Text(label, style = if (on) FilmText.smStrong else FilmText.sm, color = if (on) FilmColors.onAccent else FilmColors.textMuted)
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(title: String, sub: String, on: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = FilmSpace.s3)) {
            Text(title, style = FilmText.base, color = FilmColors.text)
            Text(sub, style = FilmText.xs, color = FilmColors.textMuted)
        }
        Switch(
            checked = on, onCheckedChange = onChange, enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedTrackColor = FilmColors.accent, checkedThumbColor = FilmColors.onAccent,
                uncheckedTrackColor = FilmColors.surfaceRaised, uncheckedBorderColor = FilmColors.borderInput,
                uncheckedThumbColor = FilmColors.textMuted,
            ),
        )
    }
}
