package world.looin.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.decodeToImageBitmap
import world.looin.app.AppController
import world.looin.app.PickedFile
import world.looin.app.Route
import world.looin.app.rememberFilePicker
import world.looin.shared.AttachmentInfo
import world.looin.shared.ChatMessage
import world.looin.shared.ChatMode
import world.looin.shared.ChatRole
import world.looin.shared.ChatStreamEvent
import world.looin.shared.Conversation
import world.looin.shared.SendMessageRequest

/** "claude:claude-sonnet-5-5" → "Sonnet 5.5", "groq:openai/gpt-oss-120b" → "gpt-oss-120b (groq)" */
fun brainLabel(brain: String?): String? {
    if (brain.isNullOrBlank()) return null
    val provider = brain.substringBefore(':')
    val model = brain.substringAfter(':')
    if (provider == "claude") {
        val m = Regex("claude-([a-z]+)-(\\d+)(?:-(\\d+))?").find(model) ?: return model
        val name = m.groupValues[1].replaceFirstChar { it.uppercase() }
        return "$name ${m.groupValues[2]}" + (m.groupValues[3].takeIf { it.isNotEmpty() }?.let { ".$it" } ?: "")
    }
    return "${model.substringAfterLast('/')} (${provider})"
}

/** 보내기 전 첨부 목록의 한 항목 (올리는 중 / 올림 완료). */
private class Pending(val file: PickedFile, var uploaded: AttachmentInfo? = null, var failed: Boolean = false)

private enum class Phase { IDLE, THINKING, STREAMING }

@Composable
fun ChatScreen(c: AppController, route: Route.Chat) {
    val agent = route.agent
    val ownerName = c.overview?.owner?.let { it.nickname.ifBlank { it.name } }?.ifBlank { null } ?: "루인"
    var conversationId by remember(agent.id) { mutableStateOf(route.conversationId) }
    val messages = remember(agent.id) { mutableStateListOf<ChatMessage>() }
    var phase by remember { mutableStateOf(Phase.IDLE) }
    var streamTarget by remember { mutableStateOf("") }     // 서버에서 받은 전체 글
    var streamDone by remember { mutableStateOf<ChatMessage?>(null) }
    var input by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf(ChatMode.AUTO) }
    var conversations by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var menu by remember { mutableStateOf(false) }
    val pending = remember(agent.id) { mutableStateListOf<Pending>() }
    var uploading by remember { mutableStateOf(0) }
    var job by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(agent.id) {
        c.run({ it.conversations(agent.id) }) { list ->
            conversations = list
            if (conversationId == null) conversationId = list.firstOrNull()?.id
        }
    }
    LaunchedEffect(conversationId) {
        val id = conversationId ?: return@LaunchedEffect messages.clear()
        if (phase == Phase.IDLE) c.run({ it.messages(id) }) { messages.clear(); messages.addAll(it) }
    }

    val pick = rememberFilePicker { f ->
        if (f == null) return@rememberFilePicker
        if (f.bytes.size > 25 * 1024 * 1024) { c.error = "파일이 너무 커요 (최대 25MB)"; return@rememberFilePicker }
        val p = Pending(f)
        pending.add(p)
        uploading++
        c.run({ it.uploadFile(f.name, f.mime, f.bytes) }) { info ->
            p.uploaded = info; uploading--
            val i = pending.indexOf(p); if (i >= 0) { pending.removeAt(i); pending.add(i, p) } // 화면 갱신
        }
    }

    /** 타자기처럼 흘러나오던 글이 다 보이면 실제 메시지로 바꾼다. */
    fun finishStream() {
        streamDone?.let { messages.add(it) }
        streamDone = null; streamTarget = ""; phase = Phase.IDLE
    }

    fun send() {
        val text = input.trim()
        val ready = pending.mapNotNull { it.uploaded }
        if ((text.isEmpty() && ready.isEmpty()) || phase != Phase.IDLE || uploading > 0) return
        val api = c.api ?: return
        input = ""; pending.clear()
        messages.add(ChatMessage("local-${messages.size}", conversationId ?: "", ChatRole.USER, text, world.looin.app.nowMillis(), attachments = ready))
        phase = Phase.THINKING; streamTarget = ""; streamDone = null
        job = scope.launch {
            try {
                api.chatStream(SendMessageRequest(agent.id, text.ifEmpty { "이 파일을 읽어줘" }, conversationId, mode, ready.map { it.id })).collect { ev ->
                    when (ev.type) {
                        ChatStreamEvent.Type.START -> conversationId = ev.conversationId
                        ChatStreamEvent.Type.DELTA -> { phase = Phase.STREAMING; streamTarget += ev.text.orEmpty() }
                        ChatStreamEvent.Type.DONE -> { streamDone = ev.message; if (phase == Phase.THINKING) finishStream() }
                        ChatStreamEvent.Type.ERROR -> { c.error = ev.text; finishStream() }
                    }
                }
            } catch (e: Exception) {
                if (e !is kotlinx.coroutines.CancellationException) c.error = e.message
                if (streamTarget.isNotEmpty() && streamDone == null) {
                    streamDone = ChatMessage("partial-${messages.size}", conversationId ?: "", ChatRole.ASSISTANT, streamTarget, world.looin.app.nowMillis())
                }
                finishStream()
            }
        }
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        // ── 상단 바 ──
        TopBar(if (route.narrative) "📖 나의 서사" else "${agent.avatar} ${agent.name}", onBack = { c.pop(); c.refreshInbox() }) {
            Box {
                TextButton(onClick = { menu = true }) { Text("☰") }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("＋ 새 대화") }, onClick = { conversationId = null; messages.clear(); menu = false })
                    conversations.forEach { conv ->
                        DropdownMenuItem(
                            text = { Text("${conv.title} · ${timeAgo(conv.updatedAt)}", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            onClick = { conversationId = conv.id; menu = false },
                        )
                    }
                }
            }
        }

        // ── 대화 (아래에서부터 쌓인다) ──
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (messages.isEmpty() && phase == Phase.IDLE) {
                Column(Modifier.align(Alignment.Center).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    AkaelLogo(72)
                    Spacer(Modifier.height(16.dp))
                    Text("$ownerName 님, 무엇이든 말씀하세요", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text(agent.role, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
            }
            LazyColumn(
                Modifier.fillMaxSize(), state = listState, reverseLayout = true,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                if (phase == Phase.THINKING) item(key = "thinking") { ThinkingIndicator() }
                if (phase == Phase.STREAMING) item(key = "stream") {
                    AssistantMessage(agent.avatar, null) {
                        Typewriter(streamTarget, done = streamDone != null, onCaughtUp = { finishStream() })
                    }
                }
                items(messages.asReversed(), key = { it.id + it.createdAt }) { m ->
                    if (m.role == ChatRole.USER) UserMessage(m)
                    else AssistantMessage(agent.avatar, m) { SelectionContainer { MarkdownText(m.content) } }
                }
            }
        }

        // ── 나의 서사: 다음 질문 받기 ──
        if (route.narrative) Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.Center,
        ) {
            var asking by remember { mutableStateOf(false) }
            TextButton(
                onClick = {
                    asking = true
                    c.run({ it.nextNarrativeQuestion() }) { q -> conversationId = q.conversationId; messages.add(q.question); asking = false }
                },
                enabled = phase == Phase.IDLE && !asking,
            ) { Text(if (asking) "질문을 고르는 중…" else "📖 다음 질문 받기", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold) }
        }

        // ── 입력창 ──
        Composer(
            input = input, onInput = { input = it },
            pending = pending, onRemove = { pending.remove(it) },
            mode = mode, onMode = { mode = it },
            busy = phase != Phase.IDLE, uploading = uploading > 0,
            onAttach = pick, onSend = { send() }, onStop = { job?.cancel() },
        )
    }
}

// ───────────────────────── 메시지 ─────────────────────────

@Composable
private fun UserMessage(m: ChatMessage) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.End) {
        m.attachments.forEach { a -> AttachmentChip(a.name, a.mime, null, Modifier.padding(bottom = 6.dp)) }
        if (m.content.isNotBlank()) Box(
            Modifier.widthIn(max = 520.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp))
                .padding(horizontal = 16.dp, vertical = 11.dp),
        ) {
            SelectionContainer { Text(m.content, color = MaterialTheme.colorScheme.onPrimaryContainer, style = MaterialTheme.typography.bodyLarge) }
        }
    }
}

@Composable
private fun AssistantMessage(avatar: String, m: ChatMessage?, content: @Composable () -> Unit) {
    @Suppress("DEPRECATION") val clipboard = LocalClipboardManager.current
    run {
        Column(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Spark(16.dp, spinning = false)
                Spacer(Modifier.width(6.dp))
                Text(avatar, fontSize = 13.sp)
            }
            Spacer(Modifier.height(6.dp))
            content()
            if (m != null) Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                TextButton(onClick = { clipboard.setText(AnnotatedString(m.content)) }) {
                    Text("복사", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                brainLabel(m.brain)?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

/** 받은 글을 한 글자씩 "좌르르" 흘려 보여준다. 밀린 양이 많을수록 빨라져 늘 자연스럽게 따라잡는다. */
@Composable
private fun Typewriter(target: String, done: Boolean, onCaughtUp: () -> Unit) {
    var shown by remember { mutableStateOf(0) }
    val latestTarget by rememberUpdatedState(target)
    val latestDone by rememberUpdatedState(done)
    val caughtUp by rememberUpdatedState(onCaughtUp)
    LaunchedEffect(Unit) {
        while (true) {
            withFrameNanos { }
            val backlog = latestTarget.length - shown
            if (backlog > 0) shown += maxOf(1, backlog / 10)
            else if (latestDone) { caughtUp(); break }
        }
    }
    MarkdownText(hideOpenMarks(target.take(shown.coerceAtMost(target.length))) + if (shown < target.length || !done) " ▍" else "")
}

/** 쓰는 중이라 아직 닫히지 않은 ** 나 ` 는 잠깐 숨긴다 (기호가 깜빡이지 않게). */
private fun hideOpenMarks(t: String): String {
    var s = t
    if (Regex("\\*\\*").findAll(s).count() % 2 == 1) s.lastIndexOf("**").let { s = s.removeRange(it, it + 2) }
    val fences = Regex("```").findAll(s).count()
    val ticks = s.count { it == '`' } - fences * 3
    if (ticks % 2 == 1) s.lastIndexOf('`').let { s = s.removeRange(it, it + 1) }
    return s
}

/** 생각 중: 빛의 별이 돌며 숨쉬고, 글자가 은은하게 깜빡인다. */
@Composable
private fun ThinkingIndicator() {
    val t = rememberInfiniteTransition()
    val alpha by t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse))
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
        Spark(22.dp, spinning = true)
        Spacer(Modifier.width(10.dp))
        Text("생각 중", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = alpha), style = MaterialTheme.typography.bodyLarge)
    }
}

/** 네 갈래 빛의 별 (아이콘의 별과 같은 모양). spinning 이면 돌면서 커졌다 작아진다. */
@Composable
fun Spark(size: androidx.compose.ui.unit.Dp, spinning: Boolean) {
    val color = MaterialTheme.colorScheme.primary
    val t = rememberInfiniteTransition()
    val angle by t.animateFloat(0f, 360f, infiniteRepeatable(tween(2400, easing = LinearEasing)))
    val pulse by t.animateFloat(0.75f, 1.1f, infiniteRepeatable(tween(700), RepeatMode.Reverse))
    Canvas(
        Modifier.size(size).let { if (spinning) it.rotate(angle).scale(pulse) else it },
    ) {
        val c = Offset(this.size.width / 2, this.size.height / 2)
        val r = this.size.minDimension / 2
        val k = r * 0.18f
        val p = Path().apply {
            moveTo(c.x, c.y - r); lineTo(c.x + k, c.y - k); lineTo(c.x + r, c.y); lineTo(c.x + k, c.y + k)
            lineTo(c.x, c.y + r); lineTo(c.x - k, c.y + k); lineTo(c.x - r, c.y); lineTo(c.x - k, c.y - k); close()
        }
        drawPath(p, color)
    }
}

// ───────────────────────── 입력창 ─────────────────────────

@Composable
private fun Composer(
    input: String, onInput: (String) -> Unit,
    pending: List<Pending>, onRemove: (Pending) -> Unit,
    mode: ChatMode, onMode: (ChatMode) -> Unit,
    busy: Boolean, uploading: Boolean,
    onAttach: () -> Unit, onSend: () -> Unit, onStop: () -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    var modeMenu by remember { mutableStateOf(false) }
    val canSend = !busy && !uploading && (input.isNotBlank() || pending.any { it.uploaded != null })
    Surface(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
        shape = RoundedCornerShape(26.dp), color = cs.surface, tonalElevation = 2.dp, shadowElevation = 3.dp,
    ) {
        Column(Modifier.border(1.dp, cs.outline.copy(alpha = 0.5f), RoundedCornerShape(26.dp)).padding(horizontal = 14.dp, vertical = 10.dp)) {
            if (pending.isNotEmpty()) LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                items(pending.toList()) { p ->
                    AttachmentChip(
                        p.file.name, p.file.mime, p.file.bytes,
                        status = if (p.uploaded == null) "올리는 중…" else null,
                        onRemove = { onRemove(p) },
                    )
                }
            }
            BasicTextField(
                value = input, onValueChange = onInput,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = cs.onSurface),
                cursorBrush = SolidColor(cs.primary),
                maxLines = 8,
                modifier = Modifier.fillMaxWidth().heightIn(min = 28.dp),
                decorationBox = { inner ->
                    if (input.isEmpty()) Text("아카엘에게 말하기…", color = cs.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
                    inner()
                },
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                RoundIcon("+", filled = false, enabled = !busy, onClick = onAttach)
                Spacer(Modifier.width(8.dp))
                Box {
                    Text(
                        when (mode) { ChatMode.AUTO -> "자동"; ChatMode.FAST -> "빠르게"; ChatMode.DEEP -> "깊게"; ChatMode.BEST -> "최고" } + " ▾",
                        style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant,
                        modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable { modeMenu = true }.padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                    DropdownMenu(expanded = modeMenu, onDismissRequest = { modeMenu = false }) {
                        listOf(
                            ChatMode.AUTO to "자동 — 질문에 맞춰 고르기", ChatMode.FAST to "빠르게 — Haiku",
                            ChatMode.DEEP to "깊게 — Opus", ChatMode.BEST to "최고 — Fable",
                        ).forEach { (m, label) -> DropdownMenuItem(text = { Text(label) }, onClick = { onMode(m); modeMenu = false }) }
                    }
                }
                Spacer(Modifier.weight(1f))
                if (busy) RoundIcon("■", filled = true, enabled = true, onClick = onStop)
                else RoundIcon("↑", filled = true, enabled = canSend, onClick = onSend)
            }
        }
    }
}

@Composable
private fun RoundIcon(symbol: String, filled: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val bg = when { !filled -> cs.surfaceVariant; enabled -> cs.primary; else -> cs.surfaceVariant }
    val fg = when { !filled -> cs.onSurface; enabled -> cs.onPrimary; else -> cs.onSurfaceVariant }
    Box(
        Modifier.size(36.dp).clip(CircleShape).background(bg).clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(symbol, color = fg, fontSize = 18.sp, fontWeight = FontWeight.Bold) }
}

/** 첨부 파일 표시. 사진이면 작은 미리보기. */
@Composable
private fun AttachmentChip(
    name: String, mime: String, bytes: ByteArray?, modifier: Modifier = Modifier,
    status: String? = null, onRemove: (() -> Unit)? = null,
) {
    val cs = MaterialTheme.colorScheme
    val thumb = remember(bytes) {
        if (bytes != null && mime.startsWith("image/")) runCatching { bytes.decodeToImageBitmap() }.getOrNull() else null
    }
    Row(
        modifier.background(cs.surfaceVariant, RoundedCornerShape(12.dp)).padding(6.dp).widthIn(max = 240.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (thumb != null) Image(thumb, null, Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)), contentScale = ContentScale.Crop)
        else Box(Modifier.size(36.dp).background(cs.primaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
            Text(if (mime == "application/pdf" || name.endsWith(".pdf", true)) "PDF" else if (mime.startsWith("image/")) "IMG" else "TXT",
                fontSize = 10.sp, fontWeight = FontWeight.Bold, color = cs.onPrimaryContainer)
        }
        Column(Modifier.padding(horizontal = 8.dp).weight(1f, fill = false)) {
            Text(name, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium)
            status?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant) }
        }
        onRemove?.let { Text("✕", modifier = Modifier.clip(CircleShape).clickable(onClick = it).padding(6.dp), color = cs.onSurfaceVariant) }
    }
}


/** 화면 확인용: 가짜 대화로 채팅 화면 구성 요소를 그린다 (PC 에서 이미지로 저장해 검토). */
@Composable
fun ChatShowcase() {
    val now = world.looin.app.nowMillis()
    val pend = remember {
        listOf(
            Pending(PickedFile("기획서.pdf", "application/pdf", ByteArray(0))),
            Pending(PickedFile("notes.md", "text/plain", ByteArray(0)), uploaded = AttachmentInfo("x", "notes.md", "text/plain", 10)),
        )
    }
    Surface(color = MaterialTheme.colorScheme.background) { Column(Modifier.fillMaxSize()) {
        TopBar("✨ 아카엘", onBack = {}) { TextButton(onClick = {}) { Text("☰") } }
        Column(Modifier.weight(1f).padding(16.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            UserMessage(ChatMessage("1", "c", ChatRole.USER, "이 기획서 핵심만 정리해줘", now, attachments = listOf(AttachmentInfo("a", "기획서.pdf", "application/pdf", 1))))
            AssistantMessage("✨", ChatMessage("2", "c", ChatRole.ASSISTANT, "", now, brain = "claude:claude-sonnet-5-5")) {
                MarkdownText("## 핵심 요약\n기획서의 목표는 **아카엘을 매일 쓰는 습관** 만들기예요.\n\n- 첫째, 대화 기록을 `기억`으로 쌓기\n- 둘째, 매주 *성찰* 리포트\n\n> 작게 시작해서 꾸준히.\n\n```kotlin\nval akael = \"aka eL\"\n```")
            }
            ThinkingIndicator()
        }
        Composer("내일 회의 준비 도와줘", {}, pend, {}, ChatMode.AUTO, {}, busy = false, uploading = false, onAttach = {}, onSend = {}, onStop = {})
    } }
}

/** 화면 확인용: 생각 중 → 글이 흘러나오는 과정을 시간에 따라 재현 (프레임 시계 기준). */
@Composable
fun StreamShowcase() {
    val full = "좋아요, 루인 님! 내일 회의를 위해 **세 가지**만 준비하면 돼요.\n\n1. 회의 목표를 한 문장으로 정리하기\n2. 꼭 결정할 안건 2~3개 뽑기\n3. 끝나고 바로 할 일 적어두기\n\n> 짧고 분명하게 — 그게 아카엘 스타일이에요."
    var elapsed by remember { mutableStateOf(0L) }
    var start by remember { mutableStateOf(-1L) }
    LaunchedEffect(Unit) {
        while (true) withFrameNanos { t -> if (start < 0) start = t; elapsed = (t - start) / 1_000_000 }
    }
    // 1.2초 생각 → 이후 서버가 조각을 보내는 것처럼 약 40ms 마다 6글자씩 도착
    val arrived = if (elapsed < 1200) 0 else ((elapsed - 1200) / 40 * 6).toInt().coerceAtMost(full.length)
    Surface(color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            UserMessage(ChatMessage("1", "c", ChatRole.USER, "내일 회의 준비 도와줘", 0))
            if (arrived == 0) ThinkingIndicator()
            else AssistantMessage("✨", null) { Typewriter(full.take(arrived), done = arrived == full.length, onCaughtUp = {}) }
        }
    }
}
