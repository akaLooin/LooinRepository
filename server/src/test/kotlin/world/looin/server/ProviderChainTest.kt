package world.looin.server

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.ModelPicker
import world.looin.server.ai.Provider
import world.looin.server.ai.ProviderChainBrain
import world.looin.server.ai.ThinkFilter
import world.looin.server.ai.Turn
import world.looin.shared.ChatRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProviderChainTest {
    private fun sse(vararg pieces: String) = pieces.joinToString("") {
        val esc = it.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
        "data: {\"choices\":[{\"delta\":{\"content\":\"$esc\"}}]}\n\n"
    } + "data: [DONE]\n\n"

    @Test
    fun fallsBackOn429AndStripsThinking() = runBlocking {
        val calls = mutableListOf<String>()
        val engine = MockEngine { req ->
            val host = req.url.host
            calls += "$host ${req.url.encodedPath}"
            when {
                host == "a.test" -> respond("""{"error":"rate limited per day"}""", HttpStatusCode.TooManyRequests)
                req.url.encodedPath.endsWith("/models") ->
                    respond(
                        """{"data":[{"id":"llama-3.1-8b"},{"id":"text-embed-1"},{"id":"qwen3-32b"},{"id":"gpt-oss-120b"},{"id":"gpt-oss-20b"}]}""",
                        HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json"),
                    )
                else -> respond(sse("<thi", "nk>속으로 생각</th", "ink>\n\n안녕", "하세요!"), HttpStatusCode.OK)
            }
        }
        val brain = ProviderChainBrain(
            listOf(Provider("a", "https://a.test/v1", "k", model = "m"), Provider("b", "https://b.test/v1", "k")),
            HttpClient(engine),
        )
        val out = brain.stream(BrainRequest("sys", turns = listOf(Turn(ChatRole.USER, "hi")))).toList().joinToString("")
        assertEquals("안녕하세요!", out)
        val status = brain.info.providers
        assertFalse(status.first { it.name == "a" }.available)
        assertEquals("qwen3-32b", status.first { it.name == "b" }.model)
        assertTrue(calls.any { it.startsWith("b.test") && it.endsWith("/chat/completions") })
    }

    @Test
    fun modelPickerPrefersStrongOpenModels() {
        assertEquals("deepseek/deepseek-v4:free", ModelPicker.pick(listOf("meta/llama-3.3-70b:free", "deepseek/deepseek-v4:free", "x/paid"), freeOnly = true))
        assertEquals("gpt-oss-120b", ModelPicker.pick(listOf("gpt-oss-20b", "gpt-oss-120b", "whisper-large"), freeOnly = false))
    }

    @Test
    fun thinkFilterHandlesSplitTags() {
        val f = ThinkFilter()
        val out = listOf("앞<thi", "nk>숨김</thi", "nk>뒤", "끝").joinToString("") { f.feed(it) } + f.flush()
        assertEquals("앞뒤끝", out)
    }
}
