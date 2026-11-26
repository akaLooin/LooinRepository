package world.looin.app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import world.looin.shared.Agent
import world.looin.shared.LooinApi
import world.looin.shared.Space
import world.looin.shared.WorldOverview

/** 화면 이동 대상. 탭 위에 쌓이는 상세 화면들. */
sealed interface Route {
    /** narrative: "나의 서사 쌓기" 대화 (다음 질문 받기 버튼이 붙는다) */
    data class Chat(val agent: Agent, val conversationId: String? = null, val narrative: Boolean = false) : Route
    data class SpaceRoute(val space: Space) : Route
    data class PostRoute(val postId: String, val style: String = "") : Route
    data object CommunityHub : Route
    /** 디시 갤러리 하나 (갤러리 목록 → 갤러리) */
    data class BoardRoute(val space: Space, val board: world.looin.shared.Board) : Route
    data object Notifications : Route
    data object NewAgent : Route
    data object BrainSettings : Route
}

enum class Tab(val label: String, val icon: String) {
    Home("홈", "🏠"), Chat("대화", "💬"), World("세계", "🌐"), Me("나", "🪞")
}

/**
 * 서버 주소 정리. IP 만 넣으면(예: 140.238.1.2) 그 서버의 무료 HTTPS 주소
 * (https://140-238-1-2.sslip.io)로 바꿔준다 — 서버의 Caddy 가 이 주소로 인증서를 받는다.
 */
fun normalizeServerUrl(input: String): String {
    val t = input.trim().removeSuffix("/")
    val ip = Regex("^(?:https?://)?(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$").find(t)
    if (ip != null) {
        val (a, b, c, d) = ip.destructured
        val private = a == "10" || a == "127" || (a == "192" && b == "168") || (a == "172" && b.toInt() in 16..31) || a == "100"
        return if (private) "http://$a.$b.$c.$d:8080" else "https://$a-$b-$c-$d.sslip.io"
    }
    return if (t.startsWith("http://") || t.startsWith("https://")) t else "https://$t"
}

/** 앱 전체 상태. */
class AppController(private val scope: CoroutineScope) {
    var api: LooinApi? by mutableStateOf(null); private set
    /** 저장된 로그인으로 자동 접속하는 중 — 로그인 화면 대신 로고 화면을 보여준다. */
    var restoring by mutableStateOf(false); private set
    /** 아카엘이 먼저 말 건 소식 */
    var inbox: world.looin.shared.Inbox? by mutableStateOf(null); private set
    /** 앱 안 알림 (내 글 댓글, 답글, 커뮤니티 요약) */
    var notices: world.looin.shared.Notices? by mutableStateOf(null); private set
    /** 앱을 보는 중에 새 알림이 오면 위에서 살짝 내려오는 배너 */
    var banner: world.looin.shared.Notice? by mutableStateOf(null)
    private val seenNotices = mutableSetOf<String>()
    var overview: WorldOverview? by mutableStateOf(null); private set
    var error: String? by mutableStateOf(null)
    var loading by mutableStateOf(false); private set
    var tab by mutableStateOf(Tab.Home)
    val stack = mutableStateListOf<Route>()

    val serverUrl get() = AppSettings.get(KEY_URL) ?: ""
    val token get() = AppSettings.get(KEY_TOKEN) ?: ""

    init {
        if (serverUrl.isNotBlank() && token.isNotBlank()) {
            restoring = true
            connect(serverUrl, token) { restoring = false }
        }
    }

    fun connect(url: String, token: String, onDone: (Boolean) -> Unit = {}) {
        val normalized = normalizeServerUrl(url)
        val candidate = LooinApi(normalized, token.trim())
        loading = true
        scope.launch {
            try {
                val ov = candidate.overview()
                AppSettings.set(KEY_URL, normalized)
                AppSettings.set(KEY_TOKEN, token.trim())
                api?.close()
                api = candidate
                overview = ov
                error = null
                refreshInbox()
                onDone(true)
            } catch (e: Exception) {
                candidate.close()
                error = "연결 실패: ${e.message}"
                onDone(false)
            } finally {
                loading = false
            }
        }
    }

    fun disconnect() {
        api?.close(); api = null; overview = null; stack.clear()
        AppSettings.set(KEY_TOKEN, null)
    }

    fun refresh() {
        val a = api ?: return
        scope.launch {
            runCatching { a.overview() }.onSuccess { overview = it }.onFailure { error = it.message }
        }
        refreshInbox()
    }

    fun refreshInbox() {
        val a = api ?: return
        scope.launch { runCatching { a.inbox() }.onSuccess { inbox = it } }
        refreshNotices()
    }

    fun refreshNotices() {
        val a = api ?: return
        scope.launch {
            runCatching { a.notices() }.onSuccess { n ->
                val first = notices == null
                // 처음 불러올 때는 배너를 띄우지 않고, 그 뒤로 새로 생긴 안 읽은 알림만 배너로
                val fresh = n.items.firstOrNull { !it.read && it.id !in seenNotices }
                n.items.forEach { seenNotices += it.id }
                if (!first && fresh != null) banner = fresh
                notices = n
            }
        }
    }

    /** 알림을 눌렀을 때: 읽음 처리하고 해당 글/커뮤니티로 */
    fun openNotice(n: world.looin.shared.Notice) {
        banner = null
        run({ it.readNotices(n.id) }) { refreshNotices() }
        when {
            n.postId != null -> push(Route.PostRoute(n.postId!!, n.style))
            n.spaceId != null -> overview?.spaces?.firstOrNull { it.id == n.spaceId }?.let { push(Route.SpaceRoute(it)) }
        }
    }

    var openNoticesRequested by mutableStateOf(false)

    /** 대화 상대: 아카엘(중심 AI) */
    val core: Agent? get() = overview?.agents?.firstOrNull { it.kind == world.looin.shared.AgentKind.CORE }

    /** 알림을 눌러 들어왔을 때: 아카엘이 먼저 건 대화로 바로 이동 */
    var openInboxRequested by mutableStateOf(false)

    /** API 호출을 감싸 오류를 화면 상단에 보여준다. */
    fun <T> run(block: suspend (LooinApi) -> T, onResult: (T) -> Unit = {}) {
        val a = api ?: return
        scope.launch {
            try { onResult(block(a)) } catch (e: Exception) { error = e.message ?: e.toString() }
        }
    }

    /** 마지막 이동 방향 (화면 전환 애니메이션 방향에 쓴다) */
    var navForward by mutableStateOf(true); private set

    fun push(r: Route) { navForward = true; stack.add(r) }
    fun pop(): Boolean = if (stack.isNotEmpty()) { navForward = false; stack.removeAt(stack.lastIndex); true } else false

    companion object {
        const val KEY_URL = "server_url"
        const val KEY_TOKEN = "owner_token"
    }
}
