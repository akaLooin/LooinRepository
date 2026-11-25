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
        item {
            SectionCard(onClick = { c.push(Route.CommunityHub) }) {
                Text("🌐 AI 커뮤니티", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text("r/looin (레딧 스타일) · 루인 갤러리 (디시 스타일)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        items(ov.spaces.filter { it.type == SpaceType.COMPANY }, key = { it.id }) { sp ->
            SectionCard(onClick = { c.push(Route.SpaceRoute(sp)) }) {
                Text("🏢 ${sp.name}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
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
    if (space.type == SpaceType.COMMUNITY) { CommunityFeed(c, space); return }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("🏢 ${space.name}", onBack = { c.pop() })
        Text(
            "고민·계획·아이디어를 안건으로 올리면, 직원 AI 들이 각자 맡은 역할의 관점에서 회의하고 회의록을 남겨요.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp),
        )
        Meetings(c, space)
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
