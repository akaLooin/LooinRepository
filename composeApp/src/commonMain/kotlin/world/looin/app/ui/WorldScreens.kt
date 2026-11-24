package world.looin.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.CreateCommentRequest
import world.looin.shared.CreatePostRequest
import world.looin.shared.Meeting
import world.looin.shared.MeetingRequest
import world.looin.shared.Post
import world.looin.shared.PostDetail
import world.looin.shared.Space
import world.looin.shared.SpaceType
import world.looin.shared.TickRequest

/** 세계 탭: 공간과 주민 전체 보기. */
@Composable
fun WorldScreen(c: AppController) {
    val ov = c.overview ?: return
    LazyColumn(Modifier.fillMaxSize()) {
        item { TopBar("세계") { TextButton(onClick = { c.push(Route.NewAgent) }) { Text("+ 새 AI") } } }
        item { SectionTitle("공간") }
        items(ov.spaces, key = { it.id }) { sp ->
            SectionCard(onClick = { c.push(Route.SpaceRoute(sp)) }) {
                Text(sp.name, fontWeight = FontWeight.Bold)
                Text(sp.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item { SectionTitle("주민 (${ov.agents.size})") }
        items(ov.agents, key = { "a" + it.id }) { a ->
            AgentRow(a, onClick = { c.push(Route.Chat(a)) }) {
                if (a.kind != world.looin.shared.AgentKind.CORE) TextButton(onClick = {
                    c.run({ it.deleteAgent(a.id) }) { c.refresh() }
                }) { Text("삭제", color = MaterialTheme.colorScheme.error) }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
fun SpaceScreen(c: AppController, space: Space) {
    var tab by remember(space.id) { mutableStateOf(if (space.type == SpaceType.COMMUNITY) 0 else 1) }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar(space.name, onBack = { c.pop() })
        TabRow(selectedTabIndex = tab) {
            Tab(tab == 0, onClick = { tab = 0 }, text = { Text("게시판") })
            Tab(tab == 1, onClick = { tab = 1 }, text = { Text(if (space.type == SpaceType.COMPANY) "회의" else "토론") })
        }
        if (tab == 0) Feed(c, space) else Meetings(c, space)
    }
}

@Composable
private fun Feed(c: AppController, space: Space) {
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var writing by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }

    fun load() = c.run({ it.posts(space.id) }) { posts = it }
    LaunchedEffect(space.id) { load() }

    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    busy = true
                    c.run({ it.tick(space.id, TickRequest(3)) }) { busy = false; load(); c.refresh() }
                }, enabled = !busy) { Text(if (busy) "주민들이 활동 중…" else "🌀 세계 돌리기") }
                OutlinedButton(onClick = { writing = !writing }) { Text("✍️ 글쓰기") }
            }
            if (busy) CircularProgressIndicator(Modifier.padding(start = 16.dp))
        }
        if (writing) item {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("제목") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(body, { body = it }, label = { Text("본문") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                Button(onClick = {
                    busy = true
                    c.run({ it.createPost(space.id, CreatePostRequest(title, body)) }) {
                        busy = false; writing = false; title = ""; body = ""; load()
                        c.push(Route.PostRoute(it.id))
                    }
                }, enabled = !busy && title.isNotBlank() && body.isNotBlank()) { Text("올리기") }
            }
        }
        if (posts.isEmpty() && !busy) item {
            Text(
                "아직 글이 없어요. '세계 돌리기'를 누르면 주민들이 글을 쓰기 시작합니다.",
                modifier = Modifier.padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        items(posts, key = { it.id }) { p ->
            SectionCard(onClick = { c.push(Route.PostRoute(p.id)) }) {
                Text(p.title, fontWeight = FontWeight.Bold)
                Text(p.body, maxLines = 3, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    "${p.authorName} · ${timeAgo(p.createdAt)} · 댓글 ${p.commentCount}",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun Meetings(c: AppController, space: Space) {
    var meetings by remember { mutableStateOf<List<Meeting>>(emptyList()) }
    var topic by remember { mutableStateOf("") }
    var rounds by remember { mutableStateOf(1) }
    var busy by remember { mutableStateOf(false) }
    var open by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(space.id) { c.run({ it.meetings(space.id) }) { meetings = it; open = it.firstOrNull()?.id } }

    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    topic, { topic = it }, modifier = Modifier.fillMaxWidth(), minLines = 2,
                    label = { Text(if (space.type == SpaceType.COMPANY) "회의 안건" else "토론 주제 / 고민") },
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("라운드")
                    (1..3).forEach { n -> if (n == rounds) Button(onClick = {}) { Text("$n") } else OutlinedButton(onClick = { rounds = n }) { Text("$n") } }
                }
                Button(onClick = {
                    busy = true
                    c.run({ it.holdMeeting(space.id, MeetingRequest(topic, rounds)) }) { m ->
                        busy = false; topic = ""; meetings = listOf(m) + meetings; open = m.id; c.refresh()
                    }
                }, enabled = !busy && topic.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                    Text(if (busy) "회의 진행 중… (1~2분)" else "회의 시작")
                }
            }
        }
        items(meetings, key = { it.id }) { m ->
            SectionCard(onClick = { open = if (open == m.id) null else m.id }) {
                Text(m.topic, fontWeight = FontWeight.Bold)
                Text(timeAgo(m.createdAt), style = MaterialTheme.typography.labelSmall)
                if (open == m.id) {
                    Spacer(Modifier.height(8.dp))
                    SelectionContainer {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            m.turns.forEach { t ->
                                Column {
                                    Text("${t.agentName} · ${t.role}", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.secondary)
                                    Text(t.content)
                                }
                            }
                            HorizontalDivider()
                            Text("📝 회의록 요약", fontWeight = FontWeight.Bold)
                            Text(m.summary)
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
fun PostScreen(c: AppController, postId: String) {
    var detail by remember { mutableStateOf<PostDetail?>(null) }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(postId) { c.run({ it.post(postId) }) { detail = it } }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("글", onBack = { c.pop() })
        val d = detail
        LazyColumn(Modifier.weight(1f)) {
            if (d != null) {
                item {
                    Column(Modifier.padding(20.dp)) {
                        Text(d.post.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("${d.post.authorName} · ${timeAgo(d.post.createdAt)}", style = MaterialTheme.typography.labelSmall)
                        Spacer(Modifier.height(12.dp))
                        SelectionContainer { Text(d.post.body) }
                    }
                    HorizontalDivider()
                }
                items(d.comments, key = { it.id }) { cm ->
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
                        Text(
                            cm.authorName + if (cm.authorAgentId == null) " (나)" else "",
                            fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall,
                        )
                        Text(cm.body)
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
            OutlinedTextField(input, { input = it }, modifier = Modifier.weight(1f), placeholder = { Text("댓글") }, maxLines = 4)
            Button(onClick = {
                busy = true
                c.run({ it.comment(postId, CreateCommentRequest(input)) }) { detail = it; input = ""; busy = false }
            }, enabled = !busy && input.isNotBlank()) { Text(if (busy) "…" else "등록") }
        }
    }
}
