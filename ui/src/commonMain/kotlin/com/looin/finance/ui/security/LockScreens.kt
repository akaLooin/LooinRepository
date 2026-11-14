package com.looin.finance.ui.security

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TextAction
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import kotlinx.coroutines.delay
import kotlin.time.Clock

private fun nowMs() = Clock.System.now().toEpochMilliseconds()

/** PIN 자리 표시(채운 수만큼 주 색 점). */
@Composable
private fun PinDots(filled: Int, error: Boolean) {
    val c = Looin.colors
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.semantics { contentDescription = "PIN ${filled}자리 입력됨" }) {
        repeat(AppLock.PIN_LENGTH) { i ->
            val on = i < filled
            Box(Modifier.size(14.dp).clip(CircleShape)
                .then(if (on) Modifier.background(if (error) c.danger else c.primary) else Modifier.border(2.dp, if (error) c.danger else c.surfaceStrong, CircleShape)))
        }
    }
}

/** 숫자 키패드(시스템 키보드 없이). 왼쪽 아래는 [extra](지문 등). */
@Composable
fun PinPad(onDigit: (Char) -> Unit, onDelete: () -> Unit, extra: (@Composable () -> Unit)? = null) {
    val c = Looin.colors
    val rows = listOf("123", "456", "789")
    Column(Modifier.widthIn(max = 320.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { r ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { r.forEach { d -> Key(Modifier.weight(1f), "$d") { onDigit(d) } } }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f).height(60.dp), contentAlignment = Alignment.Center) { extra?.invoke() }
            Key(Modifier.weight(1f), "0") { onDigit('0') }
            Box(Modifier.weight(1f).height(60.dp).clip(RoundedCornerShape(16.dp)).clickable(onClick = onDelete)
                .semantics { contentDescription = "지우기" }, contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Filled.Backspace, null, tint = c.textSecondary)
            }
        }
    }
}

@Composable
private fun Key(modifier: Modifier, label: String, onClick: () -> Unit) {
    val c = Looin.colors
    Box(modifier.height(60.dp).clip(RoundedCornerShape(16.dp)).background(c.card).clickable(onClick = onClick)
        .semantics { contentDescription = label }, contentAlignment = Alignment.Center) {
        Text(label, style = LooinType.monthTitle.copy(fontSize = 24.sp, fontWeight = FontWeight.SemiBold), color = c.text)
    }
}

/**
 * 잠금 화면. 앱 전체를 덮고 아래 화면 터치를 막는다.
 * 지문·얼굴 인증이 켜져 있으면 처음 뜰 때 한 번 자동으로 묻는다.
 */
@Composable
fun LockScreen() {
    val c = Looin.colors
    val bio = LocalBiometric.current
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    var now by remember { mutableStateOf(nowMs()) }
    var forgot by remember { mutableStateOf(false) }
    val canBio = AppLock.biometricEnabled && bio.available
    LaunchedEffect(Unit) { if (canBio) bio.authenticate { AppLock.unlockWithBiometric() } }
    // 입력 제한 남은 시간 표시
    LaunchedEffect(AppLock.lockedOutUntil) { while (nowMs() < AppLock.lockedOutUntil) { now = nowMs(); delay(500) }; now = nowMs() }
    val waitSec = ((AppLock.lockedOutUntil - now + 999) / 1000).coerceAtLeast(0)

    Column(
        Modifier.fillMaxSize().background(c.bg)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {} // 아래 화면 터치 막기
            .statusBarsPadding().navigationBarsPadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(56.dp).clip(RoundedCornerShape(18.dp)).background(c.primarySoft), contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Lock, null, tint = c.primary)
        }
        Spacer(Modifier.height(16.dp))
        Text("루인 가계부", style = LooinType.monthTitle, color = c.text)
        Spacer(Modifier.height(6.dp))
        Text(
            when {
                waitSec > 0 -> "너무 많이 틀렸어요. ${waitSec}초 뒤에 다시 입력하세요"
                error -> "PIN이 맞지 않아요" + if (AppLock.failedTries > 0) " (${AppLock.failedTries}/${AppLock.MAX_TRIES})" else ""
                else -> "PIN ${AppLock.PIN_LENGTH}자리를 입력하세요"
            },
            style = LooinType.body, color = if (error || waitSec > 0) c.danger else c.textSecondary, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(20.dp))
        PinDots(pin.length, error)
        Spacer(Modifier.weight(1f))
        PinPad(
            onDigit = { d ->
                if (waitSec > 0 || pin.length >= AppLock.PIN_LENGTH) return@PinPad
                error = false
                pin += d
                if (pin.length == AppLock.PIN_LENGTH) {
                    val ok = AppLock.tryUnlock(pin, nowMs())
                    now = nowMs()
                    if (!ok) error = true
                    pin = ""
                }
            },
            onDelete = { pin = pin.dropLast(1) },
            extra = if (canBio) ({
                Box(Modifier.size(60.dp).clip(RoundedCornerShape(16.dp)).clickable { bio.authenticate { AppLock.unlockWithBiometric() } }
                    .semantics { contentDescription = "지문·얼굴로 잠금 해제" }, contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Fingerprint, null, tint = c.primary)
                }
            }) else null,
        )
        Spacer(Modifier.height(8.dp))
        TextAction("PIN을 잊었어요", { forgot = true }, color = c.textMuted)
    }
    if (forgot) {
        ConfirmDialog("PIN을 잊었을 때", "데이터를 지키기 위해 PIN을 되찾거나 건너뛸 방법은 없어요.\n\n" +
            "휴대폰 설정 → 앱 → 루인 가계부 → 저장공간에서 '데이터 삭제'를 하면 PIN과 함께 모든 기록이 지워져요. " +
            "백업 파일이 있다면 그 뒤 '백업에서 복원'으로 되살릴 수 있어요.", "확인", { forgot = false }) {}
    }
}

/** PIN 설정 흐름의 종류. */
enum class PinFlow { SET, CHANGE, DISABLE }

/**
 * PIN 켜기·바꾸기·끄기 화면. 바꾸기·끄기는 현재 PIN 을 먼저 확인하고, 새 PIN 은 두 번 입력받는다.
 */
@Composable
fun PinSetupScreen(flow: PinFlow, onDone: (String) -> Unit, onBack: () -> Unit) {
    val c = Looin.colors
    var step by remember { mutableStateOf(if (flow == PinFlow.SET) 1 else 0) } // 0 현재 PIN, 1 새 PIN, 2 새 PIN 확인
    var first by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val title = when (flow) { PinFlow.SET -> "앱 잠금 켜기"; PinFlow.CHANGE -> "PIN 바꾸기"; PinFlow.DISABLE -> "앱 잠금 끄기" }
    val prompt = when (step) { 0 -> "지금 쓰는 PIN을 입력하세요"; 1 -> "새 PIN ${AppLock.PIN_LENGTH}자리를 입력하세요"; else -> "한 번 더 입력하세요" }

    fun complete(p: String) {
        when (step) {
            0 -> if (AppLock.verify(p)) {
                if (flow == PinFlow.DISABLE) { AppLock.disable(); onDone("앱 잠금을 껐어요") } else { step = 1; message = null }
            } else message = "PIN이 맞지 않아요"
            1 -> { first = p; step = 2; message = null }
            else -> if (p == first) {
                AppLock.setPin(p); onDone(if (flow == PinFlow.SET) "앱 잠금을 켰어요" else "PIN을 바꿨어요")
            } else { step = 1; first = ""; message = "두 번 입력한 PIN이 달라요. 처음부터 다시 입력하세요" }
        }
    }

    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding()) {
        ScreenHeader(title, onBack)
        Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.weight(1f))
            Text(prompt, style = LooinType.sheetTitle, color = c.text)
            Spacer(Modifier.height(8.dp))
            SmallLabel(message ?: if (flow == PinFlow.DISABLE) "끄면 앱을 열 때 PIN을 묻지 않아요" else "PIN을 잊으면 되찾을 수 없어요. 백업 파일을 꼭 만들어 두세요",
                color = if (message != null) c.danger else c.textMuted)
            Spacer(Modifier.height(20.dp))
            PinDots(pin.length, message != null && pin.isEmpty())
            Spacer(Modifier.weight(1f))
            PinPad(onDigit = { d ->
                if (pin.length < AppLock.PIN_LENGTH) pin += d
                if (pin.length == AppLock.PIN_LENGTH) { val p = pin; pin = ""; complete(p) }
            }, onDelete = { pin = pin.dropLast(1) })
            Spacer(Modifier.height(12.dp))
        }
    }
}
