package world.looin.server

import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.builtins.ListSerializer
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.ClaudeBrain
import world.looin.server.ai.ClaudeBudget
import world.looin.server.ai.ClaudeModels
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.ai.UsageLedger
import world.looin.server.service.StoryService
import world.looin.shared.AgentKind
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole
import world.looin.shared.Conversation
import world.looin.shared.Folder
import world.looin.shared.Inbox
import world.looin.shared.LooinJson
import world.looin.shared.NarrativeQuestion
import world.looin.shared.Post
import world.looin.shared.SpaceType
import world.looin.shared.WorldOverview
import java.nio.file.Files
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WorldFeaturesTest {
    private class ScriptBrain : Brain {
        val seen = mutableListOf<BrainRequest>()
        override val info = BrainInfo("fake", "fake", true)
        override fun stream(req: BrainRequest): Flow<String> {
            seen += req
            val out = when (req.task) {
                Task.NARRATIVE -> "[어린 시절] 어릴 때 가장 좋아했던 놀이는 뭐였어?"
                Task.PROACTIVE -> "요즘 관심 있는 책이 있는지 궁금해."
                Task.PROFILE -> """{"bio":"이야기를 좋아하는 사람","interests":"책, 산책"}"""
                Task.MEMORY -> """[{"category":"경험","content":"어릴 때 블록 놀이를 좋아했다","importance":4}]"""
                Task.COMMUNITY -> if (req.turns.last().text.contains("새 글")) """{"tag":"[일반]","title":"루인 근황","body":"요즘 뭐하냐 ㅋㅋ"}""" else """{"body":"ㄹㅇ ㅋㅋ"}"""
                else -> "좋은 이야기네요."
            }
            return flowOf(out)
        }
    }

    private val token = "tok-123456789"
    private fun newApp(brain: Brain = ScriptBrain()) =
        App(Config(0, Files.createTempDirectory("wf").toFile(), token, emptyList(), 0.0, null, proactive = false, zone = ZoneId.of("Asia/Seoul")), brain)

    @Test
    fun newWorldHasTwoCommunitiesAndNoForum() {
        val app = newApp()
        val w = app.repo.worldForUser(app.repo.anyUserId()!!)!!
        val spaces = app.repo.spaces(w.id)
        assertEquals(setOf("REDDIT", "DC"), spaces.filter { it.type == SpaceType.COMMUNITY }.map { it.style }.toSet())
        assertTrue(spaces.none { it.type == SpaceType.FORUM })
        assertEquals("아카엘", app.repo.agents(w.id).first { it.kind == AgentKind.CORE }.name)
    }

    @Test
    fun oldWorldIsMigrated() {
        val app = newApp()
        val repo = app.repo
        val w = repo.worldForUser(repo.anyUserId()!!)!!
        // 예전 구조 흉내: 커뮤니티 하나(스타일 없음) + 관점의 광장
        repo.spaces(w.id).filter { it.type == SpaceType.COMMUNITY }.forEach { repo.deleteSpace(it.id) }
        val lounge = repo.createSpace(w.id, SpaceType.COMMUNITY, "루인 라운지", "old")
        val forum = repo.createSpace(w.id, SpaceType.FORUM, "관점의 광장", "old")
        val philosopher = repo.createAgent(w.id, AgentKind.CHARACTER, "소크라", "철학자", "p", "🏛️")
        repo.addMember(forum.id, philosopher.id)
        Seed.migrate(repo, w)
        Seed.migrate(repo, w) // 두 번 돌려도 같아야 한다
        val spaces = repo.spaces(w.id)
        assertTrue(spaces.none { it.type == SpaceType.FORUM })
        assertEquals("r/looin", spaces.first { it.id == lounge.id }.name)
        assertEquals(1, spaces.count { it.style == "DC" })
        assertTrue(spaces.filter { it.type == SpaceType.COMMUNITY }.all { philosopher.id in it.memberAgentIds })
    }

    @Test
    fun foldersVotesAndSorting() = testApplication {
        val app = newApp()
        application { module(app) }
        val ov = LooinJson.decodeFromString(WorldOverview.serializer(), client.get("/api/world") { bearerAuth(token) }.bodyAsText())
        val core = ov.agents.first { it.kind == AgentKind.CORE }
        client.post("/api/chat/stream") {
            bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"agentId":"${core.id}","text":"안녕"}""")
        }.bodyAsText()
        val folder = LooinJson.decodeFromString(Folder.serializer(), client.post("/api/folders") {
            bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"name":"공부"}""")
        }.bodyAsText())
        val conv = LooinJson.decodeFromString(ListSerializer(Conversation.serializer()), client.get("/api/conversations") { bearerAuth(token) }.bodyAsText()).first()
        val moved = LooinJson.decodeFromString(Conversation.serializer(), client.put("/api/conversations/${conv.id}") {
            bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"folderId":"${folder.id}","title":"첫 대화"}""")
        }.bodyAsText())
        assertEquals(folder.id, moved.folderId)
        assertEquals("첫 대화", moved.title)
        client.put("/api/conversations/${conv.id}") { bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"folderId":""}""") }
        assertNull(app.repo.conversation(ov.world.id, conv.id)!!.folderId)

        // 디시 갤러리: 글을 쓰면 유동닉이 섞이고, 추천·조회수가 쌓인다
        val dc = ov.spaces.first { it.style == "DC" }
        val tick = client.post("/api/spaces/${dc.id}/tick") { bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"actions":4}""") }.bodyAsText()
        assertTrue(tick.contains("[일반]"))
        val posts = LooinJson.decodeFromString(ListSerializer(Post.serializer()), client.get("/api/spaces/${dc.id}/posts?sort=new") { bearerAuth(token) }.bodyAsText())
        assertTrue(posts.isNotEmpty())
        val p = posts.first()
        val voted = LooinJson.decodeFromString(Post.serializer(), client.post("/api/posts/${p.id}/vote") {
            bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"delta":-1}""")
        }.bodyAsText())
        assertEquals(p.score - 1, voted.score)
        assertEquals(p.downs + 1, voted.downs)
        repeat(6) { app.repo.votePost(p.id, 1) }
        val best = LooinJson.decodeFromString(ListSerializer(Post.serializer()), client.get("/api/spaces/${dc.id}/posts?sort=best") { bearerAuth(token) }.bodyAsText())
        assertTrue(best.all { it.score >= 5 } && best.any { it.id == p.id })
    }

    @Test
    fun narrativeAndProactive() = testApplication {
        val brain = ScriptBrain()
        val app = newApp(brain)
        application { module(app) }
        val q = LooinJson.decodeFromString(NarrativeQuestion.serializer(), client.post("/api/narrative/next") { bearerAuth(token) }.bodyAsText())
        assertTrue(q.question.content.startsWith("[어린 시절]"))
        assertEquals(0, q.answered)
        val ov = LooinJson.decodeFromString(WorldOverview.serializer(), client.get("/api/world") { bearerAuth(token) }.bodyAsText())
        val core = ov.agents.first { it.kind == AgentKind.CORE }
        client.post("/api/chat/stream") {
            bearerAuth(token); contentType(ContentType.Application.Json)
            setBody("""{"agentId":"${core.id}","text":"블록 놀이를 제일 좋아했어","conversationId":"${q.conversationId}"}""")
        }.bodyAsText()
        // 서사 답변: 답장 프롬프트에 서사 규칙이 붙고, 백그라운드에서 기억·프로필이 자란다
        assertTrue(brain.seen.any { it.stableSystem.contains("나의 서사 쌓기") })
        runBlocking { repeat(50) { if (app.repo.profile(ov.world.id).interests.isNotEmpty()) return@runBlocking; kotlinx.coroutines.delay(50) } }
        assertEquals("책, 산책", app.repo.profile(ov.world.id).interests)

        // 먼저 말 걸기 (시험용 즉시 실행) → 소식함에 안 읽은 메시지
        client.post("/api/inbox/now") { bearerAuth(token) }
        val inbox = LooinJson.decodeFromString(Inbox.serializer(), client.get("/api/inbox") { bearerAuth(token) }.bodyAsText())
        assertEquals(1, inbox.unread)
        assertTrue(inbox.latest.last().content.contains("궁금"))
        client.get("/api/conversations/${inbox.conversationId}/messages") { bearerAuth(token) }
        assertEquals(0, LooinJson.decodeFromString(Inbox.serializer(), client.get("/api/inbox") { bearerAuth(token) }.bodyAsText()).unread)
    }

    @Test
    fun proactiveRespectsActivityAndLimits() = runBlocking {
        val app = newApp()
        val w = app.repo.worldForUser(app.repo.anyUserId()!!)!!
        val story = StoryService(app.repo, app.brain, ZoneId.of("Asia/Seoul"), true)
        // 방금 소유자가 말했다면 (앱 사용 중) 먼저 말 걸지 않는다
        val core = app.repo.agents(w.id).first { it.kind == AgentKind.CORE }
        val c = app.repo.createConversation(w.id, core.id, "t")
        app.repo.addMessage(c.id, ChatRole.USER, "hi")
        assertNull(story.maybeReachOut(w))
        assertNotNull(story.maybeReachOut(w, force = true))
        assertEquals(0, story.growthLevel(w))
    }

    @Test
    fun webSearchToolIsAddedForNews() {
        val ledger = object : UsageLedger {
            override fun recordUsage(provider: String, inputTokens: Long, outputTokens: Long, cacheRead: Long, cacheWrite: Long, costUsd: Double) {}
            override fun spentSince(providerPrefix: String, sinceMillis: Long) = 0.0
        }
        val brain = ClaudeBrain("sk-test", ClaudeModels(), ClaudeBudget(100.0, 1, false), ledger)
        val req = BrainRequest("sys", turns = listOf(Turn(ChatRole.USER, "뉴스")), task = Task.PROACTIVE, webSearch = true)
        val json = brain.buildParams(req, ClaudeModels().route(Task.PROACTIVE))._body().toString()
        assertTrue("web_search_20260209" in json, json.take(300))
    }
}
