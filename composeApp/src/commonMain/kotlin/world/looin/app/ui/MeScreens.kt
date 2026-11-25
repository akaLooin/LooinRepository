package world.looin.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import world.looin.app.AppController
import world.looin.app.Route
import world.looin.shared.AddMemoryRequest
import world.looin.shared.AgentKind
import world.looin.shared.CreateAgentRequest
import world.looin.shared.GrowthStatus
import world.looin.shared.Insight
import world.looin.shared.Memory
import world.looin.shared.OwnerProfile

/** 나 탭: 프로필(모든 AI 가 나를 이해하는 기반)과 기억 관리. */
@Composable
fun MeScreen(c: AppController) {
    var profile by remember { mutableStateOf(c.overview?.owner ?: OwnerProfile()) }
    var memories by remember { mutableStateOf<List<Memory>>(emptyList()) }
    var newMemory by remember { mutableStateOf("") }
    var saved by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var growth by remember { mutableStateOf<GrowthStatus?>(null) }
    var insights by remember { mutableStateOf<List<Insight>>(emptyList()) }
    var reflecting by remember { mutableStateOf(false) }
    var showHistory by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        c.run({ it.profile() }) { profile = it }
        c.run({ it.memories() }) { memories = it }
        c.run({ it.growth() }) { growth = it }
    }

    LazyColumn(Modifier.fillMaxSize()) {
        item {
            TopBar("나") {
                TextButton(onClick = { c.push(Route.BrainSettings) }) { Text("🧠 두뇌 설정") }
                TextButton(onClick = { c.disconnect() }) { Text("로그아웃") }
            }
        }
        // ── 나의 서사 쌓기 ──
        item {
            var asking by remember { mutableStateOf(false) }
            SectionCard {
                Text("📖 나의 서사 쌓기", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text(
                    "아카엘이 루인 님에 대해 궁금한 질문을 하나 던져요. 채팅하듯 답하고, 필요하면 사진·파일도 붙여 주세요. " +
                        "답이 쌓일수록 아래 프로필과 기억을 아카엘이 알아서 정리해요.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                Button(onClick = {
                    asking = true
                    c.run({ it.nextNarrativeQuestion() }) { q ->
                        asking = false
                        c.core?.let { core -> c.push(Route.Chat(core, q.conversationId, narrative = true)) }
                    }
                }, enabled = !asking, modifier = Modifier.fillMaxWidth()) { Text(if (asking) "아카엘이 질문을 고르는 중…" else "질문 받기") }
            }
        }

        item { SectionTitle("🌱 성장 — AI 들이 이해한 나") }
        item {
            val g = growth
            SectionCard {
                val latest = g?.latest
                if (latest == null) {
                    Text("아직 성찰 기록이 없어요. 대화로 기억이 쌓이면 자동으로, 또는 아래 버튼으로 지금 성찰할 수 있어요.")
                } else {
                    Text("v${latest.version} · 기억 ${latest.basedOnMemories}개 기반 · ${timeAgo(latest.createdAt)}", style = MaterialTheme.typography.labelSmall)
                    Spacer(Modifier.height(6.dp))
                    androidx.compose.foundation.text.selection.SelectionContainer { Text(latest.content) }
                }
                Spacer(Modifier.height(8.dp))
                if (g != null) Text(
                    "기억 ${g.memories} · 성찰 ${g.versions}회 · 학습 예문 ${g.trainingExamples}개" +
                        if (g.autoWorld) " · 자동 세계 켜짐" else "",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = {
                        reflecting = true
                        c.run({ it.reflect() }) { c.run({ api -> api.growth() }) { s -> growth = s; reflecting = false } }
                    }, enabled = !reflecting) { Text(if (reflecting) "성찰 중…" else "지금 성찰하기") }
                    if ((g?.versions ?: 0) > 1) OutlinedButton(onClick = {
                        showHistory = !showHistory
                        if (showHistory) c.run({ it.insights() }) { insights = it }
                    }) { Text(if (showHistory) "기록 닫기" else "성장 기록") }
                }
            }
        }
        if (showHistory) items(insights.drop(1), key = { "i" + it.id }) { ins ->
            SectionCard {
                Text("v${ins.version} · ${timeAgo(ins.createdAt)}", fontWeight = FontWeight.SemiBold)
                Text(ins.content, style = MaterialTheme.typography.bodySmall)
            }
        }
        item { SectionTitle("프로필 — 아카엘이 서사와 대화로 정리해요") }
        item {
            SectionCard {
                @Composable
                fun line(label: String, value: String) {
                    if (value.isBlank()) return
                    Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    Text(value, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(8.dp))
                }
                line("이름", listOf(profile.name, profile.nickname).filter { it.isNotBlank() }.joinToString(" · "))
                line("소개", profile.bio); line("가치관", profile.values); line("관심사", profile.interests)
                line("목표", profile.goals); line("말투", profile.speakingStyle)
                if (listOf(profile.bio, profile.values, profile.interests, profile.goals).all { it.isBlank() })
                    Text("아직 비어 있어요. 위의 '질문 받기'로 서사를 쌓아보세요.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                TextButton(onClick = { editing = !editing }) { Text(if (editing) "직접 고치기 닫기" else "✏ 직접 고치기") }
            }
        }
        if (editing) item {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                @Composable
                fun field(label: String, value: String, lines: Int = 1, set: (String) -> Unit) =
                    OutlinedTextField(value, { set(it); saved = false }, label = { Text(label) }, minLines = lines, modifier = Modifier.fillMaxWidth())
                field("이름", profile.name) { profile = profile.copy(name = it) }
                field("닉네임 (AI 들이 부르는 이름)", profile.nickname) { profile = profile.copy(nickname = it) }
                field("나를 소개하면", profile.bio, 3) { profile = profile.copy(bio = it) }
                field("가치관", profile.values, 2) { profile = profile.copy(values = it) }
                field("관심사", profile.interests, 2) { profile = profile.copy(interests = it) }
                field("목표", profile.goals, 2) { profile = profile.copy(goals = it) }
                field("말투 / 표현 습관", profile.speakingStyle, 2) { profile = profile.copy(speakingStyle = it) }
                Button(onClick = { c.run({ it.saveProfile(profile) }) { saved = true; c.refresh() } }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (saved) "저장됨 ✓" else "프로필 저장")
                }
            }
        }
        item { SectionTitle("기억 (${memories.size}) — 대화에서 자동으로 쌓이고, 직접 추가/삭제할 수 있어요") }
        item {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(newMemory, { newMemory = it }, modifier = Modifier.weight(1f), placeholder = { Text("기억시킬 사실") })
                Button(onClick = {
                    c.run({ it.addMemory(AddMemoryRequest("기타", newMemory, 3)) }) { memories = listOf(it) + memories; newMemory = "" }
                }, enabled = newMemory.isNotBlank()) { Text("추가") }
            }
        }
        items(memories, key = { it.id }) { m ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(m.content)
                    Text("${m.category} · 중요도 ${m.importance} · ${m.source}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                TextButton(onClick = { c.run({ it.deleteMemory(m.id) }) { memories = memories - m } }) { Text("✕") }
            }
        }
        item { Spacer(Modifier.height(32.dp)) }
    }
}

/** 새 AI 만들기: 캐릭터 / 복제 AI / AI 직원. */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun NewAgentScreen(c: AppController) {
    val ov = c.overview ?: return
    var kind by remember { mutableStateOf(AgentKind.CHARACTER) }
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("") }
    var persona by remember { mutableStateOf("") }
    var avatar by remember { mutableStateOf("🙂") }
    var spaceIds by remember { mutableStateOf(setOf<String>()) }

    LazyColumn(Modifier.fillMaxSize()) {
        item { TopBar("새 AI 만들기", onBack = { c.pop() }) }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(AgentKind.CHARACTER, AgentKind.CLONE, AgentKind.EMPLOYEE).forEach { k ->
                        FilterChip(selected = kind == k, onClick = { kind = k }, label = { Text(k.label()) })
                    }
                }
                Text(
                    when (kind) {
                        AgentKind.CLONE -> "실존 인물을 복제한 AI. 지금은 나의 또 다른 분신을, 나중엔 다른 사람의 복제 AI 를 이 세계에 초대하는 데 쓰입니다."
                        AgentKind.EMPLOYEE -> "AI 컴퍼니에서 역할을 맡을 직원."
                        else -> "자유롭게 상상한 캐릭터."
                    },
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(avatar, { avatar = it.take(4) }, label = { Text("아바타 (이모지)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(name, { name = it }, label = { Text("이름") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(role, { role = it }, label = { Text("역할 (예: 여행 가이드, CTO)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(persona, { persona = it }, label = { Text("페르소나 — 성격, 말투, 관점, 배경") }, minLines = 4, modifier = Modifier.fillMaxWidth())
                Text("참여할 공간", fontWeight = FontWeight.SemiBold)
                ov.spaces.forEach { s ->
                    Row(
                        Modifier.fillMaxWidth().clickable { spaceIds = if (s.id in spaceIds) spaceIds - s.id else spaceIds + s.id },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(s.id in spaceIds, onCheckedChange = null)
                        Text(s.name)
                    }
                }
                Button(onClick = {
                    c.run({ it.createAgent(CreateAgentRequest(kind, name, role, persona, avatar, spaceIds.toList())) }) { a ->
                        c.refresh(); c.pop(); c.push(Route.Chat(a))
                    }
                }, enabled = name.isNotBlank() && persona.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("만들기") }
                OutlinedButton(onClick = { c.pop() }, modifier = Modifier.fillMaxWidth()) { Text("취소") }
            }
        }
    }
}
