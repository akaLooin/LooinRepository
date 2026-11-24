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
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.font.PDType1Font
import org.apache.pdfbox.pdmodel.font.Standard14Fonts
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.ClaudeBrain
import world.looin.server.ai.ClaudeBudget
import world.looin.server.ai.ClaudeModels
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.ai.TurnAttachment
import world.looin.server.ai.UsageLedger
import world.looin.shared.AttachmentInfo
import world.looin.shared.BrainInfo
import world.looin.shared.ChatMessage
import world.looin.shared.ChatRole
import world.looin.shared.LooinJson
import world.looin.shared.WorldOverview
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FilesTest {
    private class CapturingBrain : Brain {
        val seen = mutableListOf<BrainRequest>()
        override val info = BrainInfo("fake", "fake", true)
        override fun stream(req: BrainRequest): Flow<String> { seen += req; return flowOf("[]") }
    }

    private fun png(w: Int, h: Int): ByteArray =
        ByteArrayOutputStream().also { ImageIO.write(BufferedImage(w, h, BufferedImage.TYPE_INT_RGB), "png", it) }.toByteArray()

    private fun pdf(text: String): ByteArray = PDDocument().use { doc ->
        val page = PDPage(); doc.addPage(page)
        PDPageContentStream(doc, page).use { cs ->
            cs.beginText(); cs.setFont(PDType1Font(Standard14Fonts.FontName.HELVETICA), 12f)
            cs.newLineAtOffset(50f, 700f); cs.showText(text); cs.endText()
        }
        ByteArrayOutputStream().also { doc.save(it) }.toByteArray()
    }

    @Test
    fun uploadAndChatWithFiles() = testApplication {
        val token = "tok"
        val brain = CapturingBrain()
        val app = App(Config(0, Files.createTempDirectory("files").toFile(), token, emptyList(), 0.0, null), brain)
        application { module(app) }

        suspend fun upload(name: String, mime: String, bytes: ByteArray): AttachmentInfo {
            val r = client.post("/api/files?name=$name&mime=$mime") {
                bearerAuth(token); contentType(ContentType.Application.OctetStream); setBody(bytes)
            }
            assertEquals(HttpStatusCode.OK, r.status, r.bodyAsText())
            return LooinJson.decodeFromString(AttachmentInfo.serializer(), r.bodyAsText())
        }

        val txt = upload("note.md", "", "# 계획\n내일 할 일".toByteArray())
        assertEquals("text/plain", txt.mime)
        val big = upload("photo.png", "image/png", png(4000, 2000))
        assertTrue(big.size < png(4000, 2000).size || big.size > 0)
        val doc = upload("report.pdf", "application/pdf", pdf("Quarterly revenue grew"))
        assertEquals("application/pdf", doc.mime)
        val bad = client.post("/api/files?name=a.exe&mime=application/x-msdownload") {
            bearerAuth(token); contentType(ContentType.Application.OctetStream); setBody(byteArrayOf(1, 2, 3))
        }
        assertEquals(HttpStatusCode.BadRequest, bad.status)

        val ov = LooinJson.decodeFromString(WorldOverview.serializer(), client.get("/api/world") { bearerAuth(token) }.bodyAsText())
        val core = ov.agents.first { it.kind.name == "CORE" }
        client.post("/api/chat/stream") {
            bearerAuth(token); contentType(ContentType.Application.Json)
            setBody("""{"agentId":"${core.id}","text":"이 파일들 요약해줘","attachmentIds":["${txt.id}","${big.id}","${doc.id}"]}""")
        }.bodyAsText()

        val chatReq = brain.seen.first { it.task == Task.CHAT || it.task == Task.CHAT_DEEP }
        val last = chatReq.turns.last()
        assertEquals(3, last.attachments.size)
        assertTrue(last.attachments.first { it.name == "note.md" }.text!!.contains("내일 할 일"))
        assertTrue(last.attachments.first { it.name == "report.pdf" }.text!!.contains("Quarterly revenue grew"))
        val img = ImageIO.read(last.attachments.first { it.name == "photo.png" }.bytes!!.inputStream())
        assertEquals(1568, maxOf(img.width, img.height)) // 큰 사진은 줄어든다

        // 대화 기록에 첨부 정보가 남는다
        val convId = app.repo.conversations(ov.world.id, core.id).first().id
        val saved: List<ChatMessage> = app.repo.messages(convId)
        assertEquals(3, saved.first { it.role == ChatRole.USER }.attachments.size)
    }

    @Test
    fun claudeRequestCarriesImageAndDocumentBlocks() {
        val ledger = object : UsageLedger {
            override fun recordUsage(provider: String, inputTokens: Long, outputTokens: Long, cacheRead: Long, cacheWrite: Long, costUsd: Double) {}
            override fun spentSince(providerPrefix: String, sinceMillis: Long) = 0.0
        }
        val brain = ClaudeBrain("sk-test", ClaudeModels(), ClaudeBudget(100.0, 1, false), ledger)
        val req = BrainRequest(
            "sys",
            turns = listOf(
                Turn(
                    ChatRole.USER, "설명해줘",
                    listOf(
                        TurnAttachment("a.png", "image/png", png(10, 10), null),
                        TurnAttachment("b.pdf", "application/pdf", pdf("hello"), "hello"),
                        TurnAttachment("c.txt", "text/plain", null, "plain text"),
                    ),
                ),
            ),
            task = Task.CHAT,
        )
        val params = brain.buildParams(req, ClaudeModels().route(Task.CHAT))
        val json = params._body().toString()
        assertTrue("image" in json && "base64" in json, json.take(500))
        assertTrue("application/pdf" in json)
        assertTrue("plain text" in json)
        assertEquals("claude-sonnet-5-5", params.model().asString())
    }
}
