package com.looin.filmcam.ui

import androidx.compose.foundation.background
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
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.looin.filmcam.FilmCamApp
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

/** S10 설정. v1: 그리드·플래시. 나머지는 다음 단계에서. */
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val app = LocalContext.current.applicationContext as FilmCamApp
    val settings = app.container.settings
    val prefs by remember { settings.cameraPrefs }.collectAsState(initial = CameraPrefs(false, FlashMode.OFF))
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().background(FilmColors.bg).systemBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(FilmSize.topBar).padding(horizontal = FilmSpace.s1), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(FilmSize.touchMin).clip(CircleShape).clickable(role = Role.Button, onClick = onBack)
                    .semantics { contentDescription = "뒤로" },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null, tint = FilmColors.text) }
            Text("설정", style = FilmText.xl, color = FilmColors.text, modifier = Modifier.semantics { heading() })
        }
        Column(
            Modifier.padding(FilmSpace.s4).clip(RoundedCornerShape(FilmRadius.md)).background(FilmColors.surface),
        ) {
            ToggleRow("그리드 표시", "뷰파인더에 3x3 선을 보여요", prefs.grid) { scope.launch { settings.setGrid(it) } }
            ToggleRow("볼륨 키로 촬영", "카메라 화면에서 볼륨 키를 누르면 셔터가 눌려요 (항상 켜짐)", true, enabled = false) {}
        }
        Text(
            "셀프 타이머, 셔터음, 현상 시간, 날짜 스탬프는 다음 업데이트에서 추가돼요.",
            style = FilmText.xs, color = FilmColors.textMuted, modifier = Modifier.padding(horizontal = FilmSpace.s4),
        )
    }
}

@Composable
private fun ToggleRow(title: String, sub: String, on: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = FilmSpace.s4, vertical = FilmSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
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
