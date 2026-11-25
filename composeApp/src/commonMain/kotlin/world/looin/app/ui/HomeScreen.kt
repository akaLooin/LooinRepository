package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.app.Tab
import world.looin.shared.AgentKind
import world.looin.shared.SpaceType

@Composable
fun HomeScreen(c: AppController) {
    androidx.compose.runtime.LaunchedEffect(Unit) { c.refreshInbox() }
    val ov = c.overview ?: return
    val ownerName = ov.owner.nickname.ifBlank { ov.owner.name }.ifBlank { "루인" }
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(20.dp)) {
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    AkaelLogo(52)
                    Column {
                        Text(ov.world.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                        Text("$ownerName 님의 세계", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(Modifier.height(6.dp))
                val b = ov.brain
                Text(
                    if (!b.online) "⚠️ 아직 두뇌 키가 없어요"
                    else "🧠 두뇌: " + b.providers.joinToString(" → ") { p ->
                        (if (p.available) "" else "⏸") + "${p.name}(${p.model}" + (p.note?.let { " · $it" } ?: "") + ")"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (b.online) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
                )
                if (!b.online) TextButton(onClick = { c.push(Route.BrainSettings) }) { Text("→ 두뇌 설정에서 키 넣기") }
                b.providers.filter { !it.available && it.lastError != null }.forEach { p ->
                    Text(
                        "⚠️ ${p.name}: ${p.lastError}",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
        item {
            val core = ov.agents.firstOrNull { it.kind == AgentKind.CORE }
            if (core != null) SectionCard(onClick = { c.push(Route.Chat(core)) }) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Avatar(core.avatar, 48)
                    Column {
                        Text("${core.name}에게 말 걸기", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(core.persona, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        // 아카엘이 먼저 말을 걸었을 때
        c.inbox?.takeIf { it.latest.isNotEmpty() && it.conversationId != null }?.let { inbox ->
            item {
                val core = c.core
                SectionCard(onClick = { core?.let { c.push(Route.Chat(it, inbox.conversationId)) } }) {
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text(if (inbox.unread > 0) "✨ 아카엘이 먼저 말을 걸었어요" else "✨ 아카엘이 건넨 말", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        if (inbox.unread > 0) Text(
                            "${inbox.unread}", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.background(MaterialTheme.colorScheme.primary, androidx.compose.foundation.shape.CircleShape).padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(inbox.latest.last().content.lineSequence().first(), maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
                    Text(timeAgo(inbox.latest.last().createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            val s = ov.stats
            SectionCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Stat("주민", ov.agents.size)
                    Stat("기억", s.memories)
                    Stat("글", s.posts)
                    Stat("댓글", s.comments)
                    Stat("회의", s.meetings)
                }
            }
        }
        item { SectionTitle("공간") }
        item {
            SectionCard(onClick = { c.push(Route.CommunityHub) }) {
                Text("🌐 AI 커뮤니티", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("r/looin · 루인 갤러리 — AI 주민들이 루인 님에 대해 이야기하는 곳", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        ov.spaces.filter { it.type == SpaceType.COMPANY }.forEach { sp ->
            item(sp.id) {
                SectionCard(onClick = { c.push(Route.SpaceRoute(sp)) }) {
                    Text("🏢 ${sp.name}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("내 고민을 안건으로 올리면 AI 임원진이 회의해요", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            if (ov.owner.bio.isBlank()) SectionCard(onClick = { c.tab = Tab.Me }) {
                Text("📖 '나' 탭에서 나의 서사를 쌓아보세요", fontWeight = FontWeight.SemiBold)
                Text(
                    "아카엘이 질문 하나를 던지면 답하기만 하면 돼요. 프로필은 아카엘이 알아서 정리해요.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun Stat(label: String, n: Int) {
    Column {
        Text("$n", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
