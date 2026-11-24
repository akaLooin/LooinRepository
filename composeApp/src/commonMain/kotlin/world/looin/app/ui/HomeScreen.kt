package world.looin.app.ui

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
    val ov = c.overview ?: return
    val ownerName = ov.owner.nickname.ifBlank { ov.owner.name }.ifBlank { "루인" }
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(20.dp)) {
                Text(ov.world.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(4.dp))
                Text("$ownerName 님의 세계", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(6.dp))
                val b = ov.brain
                Text(
                    if (!b.online) "⚠️ 오프라인 모드 — 서버에 두뇌 키(ANTHROPIC_API_KEY, GEMINI_API_KEY 등)를 설정하세요"
                    else "🧠 두뇌: " + b.providers.joinToString(" → ") { p ->
                        (if (p.available) "" else "⏸") + "${p.name}(${p.model}" + (p.note?.let { " · $it" } ?: "") + ")"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (b.online) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
                )
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
        ov.spaces.forEach { sp ->
            item(sp.id) {
                SectionCard(onClick = { c.push(Route.SpaceRoute(sp)) }) {
                    val icon = when (sp.type) { SpaceType.COMMUNITY -> "🗨️"; SpaceType.COMPANY -> "🏢"; SpaceType.FORUM -> "🏛️" }
                    Text("$icon ${sp.name}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(sp.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("구성원 ${sp.memberAgentIds.size}명", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        item {
            if (ov.owner.bio.isBlank()) SectionCard(onClick = { c.tab = Tab.Me }) {
                Text("👋 먼저 '나' 탭에서 프로필을 채워주세요", fontWeight = FontWeight.SemiBold)
                Text(
                    "프로필과 기억이 쌓일수록 모든 AI 가 당신을 더 깊이 이해합니다.",
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
