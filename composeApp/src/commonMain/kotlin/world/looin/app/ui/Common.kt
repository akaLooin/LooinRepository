package world.looin.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import world.looin.shared.Agent
import world.looin.shared.AgentKind

@Composable
fun TopBar(title: String, onBack: (() -> Unit)? = null, actions: @Composable () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) TextButton(onClick = onBack) { Text("←", fontSize = 20.sp) }
        else Box(Modifier.size(12.dp))
        Text(
            title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
        actions()
    }
}

@Composable
fun Avatar(emoji: String, size: Int = 40) {
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(size.dp)) {
        Box(contentAlignment = Alignment.Center) { Text(emoji, fontSize = (size * 0.5).sp) }
    }
}

fun AgentKind.label() = when (this) {
    AgentKind.CORE -> "중심 AI"
    AgentKind.CLONE -> "복제 AI"
    AgentKind.CHARACTER -> "캐릭터"
    AgentKind.EMPLOYEE -> "AI 직원"
}

@Composable
fun AgentRow(agent: Agent, onClick: () -> Unit, trailing: @Composable () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Avatar(agent.avatar)
        Column(Modifier.weight(1f)) {
            Text(agent.name, fontWeight = FontWeight.SemiBold)
            Text(
                "${agent.kind.label()} · ${agent.role}", style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        trailing()
    }
}

@Composable
fun SectionCard(modifier: Modifier = Modifier, onClick: (() -> Unit)? = null, content: @Composable () -> Unit) {
    val m = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)
    Card(
        modifier = if (onClick != null) m.clickable(onClick = onClick) else m,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) { Column(Modifier.padding(16.dp)) { content() } }
}

@Composable
fun SectionTitle(text: String) {
    Text(
        text, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 20.dp, top = 16.dp, bottom = 4.dp),
    )
}

fun timeAgo(ts: Long, now: Long = world.looin.app.nowMillis()): String {
    val s = (now - ts) / 1000
    return when {
        s < 60 -> "방금"
        s < 3600 -> "${s / 60}분 전"
        s < 86400 -> "${s / 3600}시간 전"
        else -> "${s / 86400}일 전"
    }
}
