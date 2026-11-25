package world.looin.shared

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.preparePost
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsChannel
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json

val LooinJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
}

class LooinApiException(message: String) : Exception(message)

/**
 * Looin World 서버 클라이언트. Android / PC 앱이 공통으로 사용한다.
 * @param baseUrl 예: http://192.168.0.10:8080
 * @param token  서버의 LOOIN_OWNER_TOKEN 과 같은 값
 */
class LooinApi(baseUrl: String, private val token: String) {
    private val base = baseUrl.trimEnd('/')

    private val http = HttpClient {
        install(ContentNegotiation) { json(LooinJson) }
        install(HttpTimeout) {
            requestTimeoutMillis = 10 * 60 * 1000L
            socketTimeoutMillis = 5 * 60 * 1000L
            connectTimeoutMillis = 15_000L
        }
        defaultRequest { contentType(ContentType.Application.Json) }
        expectSuccess = false
    }

    /**
     * 비밀번호에 특수문자·한글·공백이 있어도 HTTP 헤더에 안전하게 실리도록 base64url 로 감싸 보낸다.
     * 서버는 "b64." 로 시작하면 풀어서 비교한다.
     */
    @OptIn(kotlin.io.encoding.ExperimentalEncodingApi::class)
    private val headerToken: String = "b64." + kotlin.io.encoding.Base64.UrlSafe.encode(token.encodeToByteArray())

    private fun HttpRequestBuilder.auth() = bearerAuth(headerToken)
    private fun url(path: String) = "$base/api$path"

    private suspend inline fun <reified T> HttpResponse.ok(): T {
        if (!status.isSuccess()) {
            val raw = bodyAsText()
            val msg = runCatching { LooinJson.decodeFromString(ApiError.serializer(), raw).error }.getOrDefault(raw)
            throw LooinApiException("${status.value}: $msg")
        }
        return body()
    }

    suspend fun health(): Map<String, String> = http.get("$base/health").ok()

    suspend fun overview(): WorldOverview = http.get(url("/world")) { auth() }.ok()

    // --- 프로필 & 기억 ---
    suspend fun profile(): OwnerProfile = http.get(url("/profile")) { auth() }.ok()
    suspend fun saveProfile(p: OwnerProfile): OwnerProfile = http.put(url("/profile")) { auth(); setBody(p) }.ok()
    suspend fun memories(): List<Memory> = http.get(url("/memories")) { auth() }.ok()
    suspend fun addMemory(r: AddMemoryRequest): Memory = http.post(url("/memories")) { auth(); setBody(r) }.ok()
    suspend fun deleteMemory(id: String) { http.delete(url("/memories/$id")) { auth() }.ok<Map<String, Boolean>>() }

    // --- 에이전트 ---
    suspend fun agents(): List<Agent> = http.get(url("/agents")) { auth() }.ok()
    suspend fun createAgent(r: CreateAgentRequest): Agent = http.post(url("/agents")) { auth(); setBody(r) }.ok()
    suspend fun deleteAgent(id: String) { http.delete(url("/agents/$id")) { auth() }.ok<Map<String, Boolean>>() }

    // --- 채팅 ---
    suspend fun conversations(agentId: String): List<Conversation> =
        http.get(url("/agents/$agentId/conversations")) { auth() }.ok()

    suspend fun messages(conversationId: String): List<ChatMessage> =
        http.get(url("/conversations/$conversationId/messages")) { auth() }.ok()

    /** 응답을 토큰 단위로 받아온다. */
    fun chatStream(req: SendMessageRequest): Flow<ChatStreamEvent> = flow {
        http.preparePost(url("/chat/stream")) { auth(); setBody(req) }.execute { resp ->
            if (!resp.status.isSuccess()) throw LooinApiException("${resp.status.value}: ${resp.bodyAsText()}")
            val ch = resp.bodyAsChannel()
            while (true) {
                val line = ch.readUTF8Line() ?: break
                if (!line.startsWith("data:")) continue
                val payload = line.removePrefix("data:").trim()
                if (payload.isEmpty()) continue
                emit(LooinJson.decodeFromString(ChatStreamEvent.serializer(), payload))
            }
        }
    }

    // --- 공간 (커뮤니티 / 컴퍼니 / 포럼) ---
    suspend fun spaces(): List<Space> = http.get(url("/spaces")) { auth() }.ok()
    /** sort: hot / new / top (레딧), new / best (디시 개념글) */
    suspend fun posts(spaceId: String, sort: String = "new"): List<Post> =
        http.get(url("/spaces/$spaceId/posts")) { auth(); url { parameters.append("sort", sort) } }.ok()
    suspend fun votePost(postId: String, delta: Int): Post = http.post(url("/posts/$postId/vote")) { auth(); setBody(VoteRequest(delta)) }.ok()
    suspend fun voteComment(commentId: String, delta: Int): Comment =
        http.post(url("/comments/$commentId/vote")) { auth(); setBody(VoteRequest(delta)) }.ok()
    suspend fun post(postId: String): PostDetail = http.get(url("/posts/$postId")) { auth() }.ok()
    suspend fun createPost(spaceId: String, r: CreatePostRequest): Post =
        http.post(url("/spaces/$spaceId/posts")) { auth(); setBody(r) }.ok()
    suspend fun comment(postId: String, r: CreateCommentRequest): PostDetail =
        http.post(url("/posts/$postId/comments")) { auth(); setBody(r) }.ok()
    suspend fun tick(spaceId: String, r: TickRequest = TickRequest()): TickResult =
        http.post(url("/spaces/$spaceId/tick")) { auth(); setBody(r) }.ok()
    suspend fun meetings(spaceId: String): List<Meeting> = http.get(url("/spaces/$spaceId/meetings")) { auth() }.ok()
    suspend fun holdMeeting(spaceId: String, r: MeetingRequest): Meeting =
        http.post(url("/spaces/$spaceId/meetings")) { auth(); setBody(r) }.ok()

    // --- 대화 목록 / 폴더 ---
    suspend fun allConversations(): List<Conversation> = http.get(url("/conversations")) { auth() }.ok()
    suspend fun updateConversation(id: String, r: UpdateConversationRequest): Conversation =
        http.put(url("/conversations/$id")) { auth(); setBody(r) }.ok()
    suspend fun deleteConversation(id: String) { http.delete(url("/conversations/$id")) { auth() }.ok<Map<String, Boolean>>() }
    suspend fun folders(): List<Folder> = http.get(url("/folders")) { auth() }.ok()
    suspend fun createFolder(name: String): Folder = http.post(url("/folders")) { auth(); setBody(CreateFolderRequest(name)) }.ok()
    suspend fun renameFolder(id: String, name: String): Folder = http.put(url("/folders/$id")) { auth(); setBody(CreateFolderRequest(name)) }.ok()
    suspend fun deleteFolder(id: String) { http.delete(url("/folders/$id")) { auth() }.ok<Map<String, Boolean>>() }

    // --- 나의 서사 / 소식함 ---
    suspend fun nextNarrativeQuestion(): NarrativeQuestion = http.post(url("/narrative/next")) { auth() }.ok()
    suspend fun inbox(): Inbox = http.get(url("/inbox")) { auth() }.ok()

    // --- 파일 ---
    /** 파일을 서버에 올린다 (최대 25MB). 돌려받은 id 를 SendMessageRequest.attachmentIds 에 넣는다. */
    suspend fun uploadFile(name: String, mime: String, bytes: ByteArray): AttachmentInfo =
        http.post(url("/files")) {
            auth()
            url { parameters.append("name", name); parameters.append("mime", mime) }
            contentType(ContentType.Application.OctetStream)
            setBody(bytes)
        }.ok()

    // --- 두뇌 설정 ---
    suspend fun brainSettings(): BrainSettingsView = http.get(url("/settings/brain")) { auth() }.ok()
    suspend fun updateBrainSettings(u: BrainSettingsUpdate): BrainSettingsView =
        http.put(url("/settings/brain")) { auth(); setBody(u) }.ok()

    // --- 성장 ---
    suspend fun growth(): GrowthStatus = http.get(url("/growth")) { auth() }.ok()
    suspend fun insights(): List<Insight> = http.get(url("/growth/insights")) { auth() }.ok()
    suspend fun reflect(): Insight = http.post(url("/growth/reflect")) { auth() }.ok()

    fun close() = http.close()
}
