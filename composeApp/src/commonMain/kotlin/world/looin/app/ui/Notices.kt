package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.Notice

private fun icon(n: Notice) = when (n.kind) { "REPLY" -> "↩"; "DIGEST" -> "📰"; else -> "💬" }

/** 알림함: 내 글에 달린 댓글, 내 댓글에 달린 답글, 커뮤니티 요약. 누르면 바로 그 글로. */
@Composable
fun NotificationsScreen(c: AppController) {
    LaunchedEffect(Unit) { c.refreshNotices() }
    val items = c.notices?.items.orEmpty()
    Column(Modifier.fillMaxSize()) {
        TopBar("🔔 알림", onBack = { c.pop() }) {
            if ((c.notices?.unread ?: 0) > 0) TextButton(onClick = { c.run({ it.readNotices() }) { c.refreshNotices() } }) { Text("모두 읽음") }
        }
        LazyColumn(Modifier.weight(1f)) {
            if (items.isEmpty()) item {
                Column(Modifier.fillMaxWidth().padding(48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🔔", fontSize = 40.sp)
                    Text("아직 알림이 없어요", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("커뮤니티에 글을 쓰면 반응이 오는 대로 여기 쌓여요", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            items(items, key = { it.id }) { n ->
                Row(
                    Modifier.animateItem().fillMaxWidth()
                        .background(if (n.read) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f))
                        .clickable { c.openNotice(n) }.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Text(icon(n), fontSize = 18.sp)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(n.title, fontWeight = if (n.read) FontWeight.Normal else FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(n.body, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(timeAgo(n.createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (!n.read) Box(Modifier.padding(top = 6.dp).size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

/** 앱을 보는 중 새 알림이 오면 위에서 내려오는 배너. 누르면 바로 그 글로. */
@Composable
fun NoticeBanner(n: Notice, onClick: () -> Unit) {
    Surface(
        Modifier.fillMaxWidth().padding(12.dp).clip(RoundedCornerShape(18.dp)).clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp), shadowElevation = 8.dp, tonalElevation = 3.dp,
        color = MaterialTheme.colorScheme.surface,
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(icon(n), fontSize = 20.sp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(n.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(n.body, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("보기", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** 알림 종 + 안 읽은 수. 홈과 커뮤니티 상단에 둔다. */
@Composable
fun BellButton(c: AppController) {
    val unread = c.notices?.unread ?: 0
    Box(Modifier.clip(CircleShape).clickable { c.push(Route.Notifications) }.padding(10.dp)) {
        Text("🔔", fontSize = 20.sp)
        if (unread > 0) Box(
            Modifier.align(Alignment.TopEnd).size(16.dp).clip(CircleShape).background(MaterialTheme.colorScheme.error),
            contentAlignment = Alignment.Center,
        ) { Text(if (unread > 9) "9+" else "$unread", color = MaterialTheme.colorScheme.onError, fontSize = 9.sp, fontWeight = FontWeight.Bold) }
    }
}
