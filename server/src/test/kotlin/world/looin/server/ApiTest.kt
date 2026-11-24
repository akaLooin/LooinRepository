package world.looin.server

import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.shared.BrainInfo
import world.looin.shared.ChatStreamEvent
import world.looin.shared.LooinJson
import world.looin.shared.Meeting
import world.looin.shared.Post
import world.looin.shared.SpaceType
import world.looin.shared.TickResult
import world.looin.shared.WorldOverview
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** 프롬프트 종류에 따라 그럴듯한 출력을 돌려주는 가짜 두뇌. */
private class FakeBrain : Brain {
    override val info = BrainInfo("fake", "fake", online = true)
    override fun stream(req: BrainRequest): Flow<String> {
        val instr = req.turns.last().text
        val out = when {
            req.stableSystem.contains("기억 관리자") -> """[{"category":"선호","content":"커피를 좋아한다","importance":4}]"""
            instr.contains("새 글을") -> """{"title":"테스트 글","body":"본문입니다."}"""
            instr.contains("댓글을") -> """{"body":"좋은 글이네요."}"""
            else -> "안녕하세요, 저는 가짜 두뇌예요."
        }
        return flowOf(*out.chunked(5).toTypedArray())
    }
}

class ApiTest {
    private val token = "test-token"

    private fun newApp(): App {
        val dir = Files.createTempDirectory("looin").toFile()
        return App(Config(0, dir, token, null, "fake", false), FakeBrain())
    }

    @Test
    fun fullFlow() = testApplication {
        val app = newApp()
        application { module(app) }

        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/world").status)

        val ov = LooinJson.decodeFromString(WorldOverview.serializer(), client.get("/api/world") { bearerAuth(token) }.bodyAsText())
        assertEquals("Looin World", ov.world.name)
        assertEquals(3, ov.spaces.size)
        val core = ov.agents.first { it.kind.name == "CORE" }

        // 채팅 스트림
        val raw = client.post("/api/chat/stream") {
            bearerAuth(token); contentType(ContentType.Application.Json)
            setBody("""{"agentId":"${core.id}","text":"나는 커피를 좋아해"}""")
        }.bodyAsText()
        val events = raw.lines().filter { it.startsWith("data:") }
            .map { LooinJson.decodeFromString(ChatStreamEvent.serializer(), it.removePrefix("data:").trim()) }
        assertEquals(ChatStreamEvent.Type.START, events.first().type)
        assertEquals(ChatStreamEvent.Type.DONE, events.last().type)
        assertEquals("안녕하세요, 저는 가짜 두뇌예요.", events.last().message!!.content)

        // 커뮤니티 활동
        val lounge = ov.spaces.first { it.type == SpaceType.COMMUNITY }
        val tick = LooinJson.decodeFromString(
            TickResult.serializer(),
            client.post("/api/spaces/${lounge.id}/tick") {
                bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"actions":4}""")
            }.bodyAsText(),
        )
        assertTrue(tick.newPosts.isNotEmpty())

        // 내가 쓴 글에 주민이 반응
        val myPost = LooinJson.decodeFromString(
            Post.serializer(),
            client.post("/api/spaces/${lounge.id}/posts") {
                bearerAuth(token); contentType(ContentType.Application.Json)
                setBody("""{"title":"안녕","body":"첫 글"}""")
            }.bodyAsText(),
        )
        assertEquals(2, myPost.commentCount)

        // 회사 회의
        val company = ov.spaces.first { it.type == SpaceType.COMPANY }
        val meeting = LooinJson.decodeFromString(
            Meeting.serializer(),
            client.post("/api/spaces/${company.id}/meetings") {
                bearerAuth(token); contentType(ContentType.Application.Json); setBody("""{"topic":"올해 목표","rounds":1}""")
            }.bodyAsText(),
        )
        assertEquals(company.memberAgentIds.size, meeting.turns.size)
        assertTrue(meeting.summary.isNotBlank())
    }
}
