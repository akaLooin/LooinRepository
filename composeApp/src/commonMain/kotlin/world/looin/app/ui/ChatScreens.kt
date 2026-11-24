package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.ChatMessage
import world.looin.shared.ChatRole
import world.looin.shared.ChatStreamEvent
import world.looin.shared.Conversation
import world.looin.shared.SendMessageRequest

/** 대화 탭: 말 걸 상대 고르기. */
@Composable
fun ChatHubScreen(c: AppController) {
    val ov = c.overview ?: return
    Column(Modifier.fillMaxSize()) {
        TopBar("대화") { TextButton(onClick = { c.push(Route.NewAgent) }) { Text("+ 새 AI") } }
        LazyColumn {
            items(ov.agents, key = { it.id }) { a -> AgentRow(a, onClick = { c.push(Route.Chat(a)) }) }
        }
    }
}

@Composable
fun ChatScreen(c: AppController, route: Route.Chat) {
    val agent = route.agent
    var conversationId by remember(agent.id) { mutableStateOf(route.conversationId) }
    val messages = remember(agent.id) { mutableStateListOf<ChatMessage>() }
    var streaming by remember { mutableStateOf<String?>(null) }
    var input by remember { mutableStateOf("") }
    var conversations by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var menu by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(agent.id) {
        c.run({ it.conversations(agent.id) }) { list ->
            conversations = list
            if (conversationId == null) conversationId = list.firstOrNull()?.id
        }
    }
    LaunchedEffect(conversationId) {
        val id = conversationId ?: return@LaunchedEffect messages.clear()
        c.run({ it.messages(id) }) { messages.clear(); messages.addAll(it) }
    }
    LaunchedEffect(messages.size, streaming) {
        val n = messages.size + (if (streaming != null) 1 else 0)
        if (n > 0) listState.animateScrollToItem(n - 1)
    }

    fun send() {
        val text = input.trim()
        if (text.isEmpty() || streaming != null) return
        val api = c.api ?: return
        input = ""
        messages.add(ChatMessage("local-${messages.size}", conversationId ?: "", ChatRole.USER, text, world.looin.app.nowMillis()))
        streaming = ""
        scope.launch {
            try {
                api.chatStream(SendMessageRequest(agent.id, text, conversationId)).collect { ev ->
                    when (ev.type) {
                        ChatStreamEvent.Type.START -> conversationId = ev.conversationId
                        ChatStreamEvent.Type.DELTA -> streaming = (streaming ?: "") + (ev.text ?: "")
                        ChatStreamEvent.Type.DONE -> { ev.message?.let { messages.add(it) }; streaming = null }
                        ChatStreamEvent.Type.ERROR -> { c.error = ev.text; streaming = null }
                    }
                }
            } catch (e: Exception) {
                c.error = e.message
            } finally {
                streaming?.takeIf { it.isNotEmpty() }?.let {
                    messages.add(ChatMessage("partial", conversationId ?: "", ChatRole.ASSISTANT, it, world.looin.app.nowMillis()))
                }
                streaming = null
            }
        }
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("${agent.avatar} ${agent.name}", onBack = { c.pop() }) {
            Box {
                TextButton(onClick = { menu = true }) { Text("대화 목록") }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("＋ 새 대화") }, onClick = { conversationId = null; messages.clear(); menu = false })
                    conversations.forEach { conv ->
                        DropdownMenuItem(
                            text = { Text("${conv.title} · ${timeAgo(conv.updatedAt)}") },
                            onClick = { conversationId = conv.id; menu = false },
                        )
                    }
                }
            }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), state = listState, contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp)) {
            if (messages.isEmpty() && streaming == null) item {
                Text(
                    "${agent.name}와(과)의 새 대화. ${agent.persona}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(12.dp),
                )
            }
            items(messages, key = { it.id + it.createdAt }) { m -> Bubble(m.role, m.content) }
            streaming?.let { s -> item { Bubble(ChatRole.ASSISTANT, s.ifEmpty { "생각 중…" }) } }
        }
        Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(input, { input = it }, modifier = Modifier.weight(1f), placeholder = { Text("메시지") }, maxLines = 6)
            Button(onClick = { send() }, enabled = streaming == null && input.isNotBlank()) { Text("보내기") }
        }
    }
}

@Composable
private fun Bubble(role: ChatRole, text: String) {
    val mine = role == ChatRole.USER
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        Box(
            Modifier.widthIn(max = 560.dp)
                .background(
                    if (mine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                    RoundedCornerShape(16.dp),
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            SelectionContainer {
                Text(text, color = if (mine) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}
