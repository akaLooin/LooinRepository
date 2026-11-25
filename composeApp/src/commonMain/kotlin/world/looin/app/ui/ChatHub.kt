package world.looin.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.Conversation
import world.looin.shared.Folder
import world.looin.shared.UpdateConversationRequest

/**
 * 대화 탭: 모든 대화를 한곳에. 위쪽 폴더 칩으로 분류해서 보고, 각 대화의 ⋮ 메뉴로
 * 이름 바꾸기 · 폴더로 옮기기 · 삭제. "＋ 새 대화"로 상대를 골라 시작.
 */
@Composable
fun ChatHubScreen(c: AppController) {
    val ov = c.overview ?: return
    var conversations by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var folders by remember { mutableStateOf<List<Folder>>(emptyList()) }
    var selected by remember { mutableStateOf<String?>(null) }   // null = 전체
    var picking by remember { mutableStateOf(false) }
    var dialog by remember { mutableStateOf<Pair<String, (String) -> Unit>?>(null) } // 제목 + 확인 동작
    var folderMenu by remember { mutableStateOf<Folder?>(null) }

    fun load() {
        c.run({ it.allConversations() }) { conversations = it }
        c.run({ it.folders() }) { folders = it }
    }
    LaunchedEffect(Unit) { load() }
    val agents = ov.agents.associateBy { it.id }

    Column(Modifier.fillMaxSize()) {
        TopBar("대화") { TextButton(onClick = { picking = true }) { Text("＋ 새 대화") } }

        // 폴더 칩
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
        ) {
            item { FilterChip(selected = selected == null, onClick = { selected = null }, label = { Text("전체") }) }
            items(folders, key = { it.id }) { f ->
                Box {
                    FilterChip(
                        selected = selected == f.id, onClick = { if (selected == f.id) folderMenu = f else selected = f.id },
                        label = { Text("📁 ${f.name}") },
                    )
                    DropdownMenu(expanded = folderMenu?.id == f.id, onDismissRequest = { folderMenu = null }) {
                        DropdownMenuItem(text = { Text("이름 바꾸기") }, onClick = {
                            folderMenu = null
                            dialog = "폴더 이름" to { name -> c.run({ it.renameFolder(f.id, name) }) { load() } }
                        })
                        DropdownMenuItem(text = { Text("폴더 삭제 (대화는 남아요)", color = MaterialTheme.colorScheme.error) }, onClick = {
                            folderMenu = null; selected = null
                            c.run({ it.deleteFolder(f.id) }) { load() }
                        })
                    }
                }
            }
            item {
                FilterChip(selected = false, onClick = {
                    dialog = "새 폴더" to { name -> c.run({ it.createFolder(name) }) { load() } }
                }, label = { Text("＋ 폴더") })
            }
        }
        if (selected != null) Text(
            "폴더 칩을 한 번 더 누르면 이름 바꾸기·삭제", style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 20.dp),
        )

        val shown = conversations.filter { selected == null || it.folderId == selected }
            .sortedWith(compareByDescending<Conversation> { it.unread > 0 }.thenByDescending { it.updatedAt })
        LazyColumn(Modifier.weight(1f)) {
            if (shown.isEmpty()) item {
                Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("💬", fontSize = 40.sp)
                    Text(if (selected == null) "아직 대화가 없어요" else "이 폴더는 비어 있어요", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("대화의 ⋮ 메뉴에서 폴더로 옮길 수 있어요", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            items(shown, key = { it.id }) { conv ->
                val agent = agents[conv.agentId]
                var menu by remember { mutableStateOf(false) }
                Row(
                    Modifier.animateItem().fillMaxWidth().clickable {
                        agent?.let { c.push(Route.Chat(it, conv.id, narrative = conv.kind == "NARRATIVE")) }
                    }.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Avatar(
                        when (conv.kind) { "NARRATIVE" -> "📖"; "PROACTIVE" -> "✨"; else -> agent?.avatar ?: "💬" }, 44,
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(conv.title, fontWeight = if (conv.unread > 0) FontWeight.Bold else FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            listOfNotNull(agent?.name, folders.firstOrNull { it.id == conv.folderId }?.let { "📁 ${it.name}" }, timeAgo(conv.updatedAt)).joinToString(" · "),
                            style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (conv.unread > 0) Box(Modifier.size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                        Text("${conv.unread}", color = MaterialTheme.colorScheme.onPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Box {
                        TextButton(onClick = { menu = true }) { Text("⋮", fontSize = 18.sp) }
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                            DropdownMenuItem(text = { Text("이름 바꾸기") }, onClick = {
                                menu = false
                                dialog = "대화 이름" to { name -> c.run({ it.updateConversation(conv.id, UpdateConversationRequest(title = name)) }) { load() } }
                            })
                            folders.filter { it.id != conv.folderId }.forEach { f ->
                                DropdownMenuItem(text = { Text("📁 ${f.name}(으)로 옮기기") }, onClick = {
                                    menu = false
                                    c.run({ it.updateConversation(conv.id, UpdateConversationRequest(folderId = f.id)) }) { load() }
                                })
                            }
                            if (conv.folderId != null) DropdownMenuItem(text = { Text("폴더에서 빼기") }, onClick = {
                                menu = false
                                c.run({ it.updateConversation(conv.id, UpdateConversationRequest(folderId = "")) }) { load() }
                            })
                            if (folders.isEmpty()) DropdownMenuItem(text = { Text("＋ 새 폴더 만들어 옮기기") }, onClick = {
                                menu = false
                                dialog = "새 폴더" to { name ->
                                    c.run({ api -> api.createFolder(name).also { f -> api.updateConversation(conv.id, UpdateConversationRequest(folderId = f.id)) } }) { load() }
                                }
                            })
                            HorizontalDivider()
                            DropdownMenuItem(text = { Text("삭제", color = MaterialTheme.colorScheme.error) }, onClick = {
                                menu = false
                                c.run({ it.deleteConversation(conv.id) }) { load() }
                            })
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // 새 대화: 상대 고르기
    if (picking) AlertDialog(
        onDismissRequest = { picking = false },
        title = { Text("누구와 이야기할까요?") },
        text = {
            LazyColumn(Modifier.height(360.dp)) {
                items(ov.agents, key = { it.id }) { a ->
                    AgentRow(a, onClick = { picking = false; c.push(Route.Chat(a, conversationId = null)) })
                }
            }
        },
        confirmButton = { TextButton(onClick = { picking = false }) { Text("닫기") } },
    )

    dialog?.let { (title, onOk) ->
        var text by remember(title) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { dialog = null },
            title = { Text(title) },
            text = { OutlinedTextField(text, { text = it }, singleLine = true, shape = RoundedCornerShape(14.dp)) },
            confirmButton = { TextButton(onClick = { onOk(text.trim()); dialog = null }, enabled = text.isNotBlank()) { Text("확인") } },
            dismissButton = { TextButton(onClick = { dialog = null }) { Text("취소") } },
        )
    }
}
