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
    data class Chat(val agent: Agent, val conversationId: String? = null) : Route
    data class SpaceRoute(val space: Space) : Route
    data class PostRoute(val postId: String) : Route
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
    var overview: WorldOverview? by mutableStateOf(null); private set
    var error: String? by mutableStateOf(null)
    var loading by mutableStateOf(false); private set
    var tab by mutableStateOf(Tab.Home)
    val stack = mutableStateListOf<Route>()

    val serverUrl get() = AppSettings.get(KEY_URL) ?: ""
    val token get() = AppSettings.get(KEY_TOKEN) ?: ""

    init {
        if (serverUrl.isNotBlank() && token.isNotBlank()) connect(serverUrl, token)
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
    }

    /** API 호출을 감싸 오류를 화면 상단에 보여준다. */
    fun <T> run(block: suspend (LooinApi) -> T, onResult: (T) -> Unit = {}) {
        val a = api ?: return
        scope.launch {
            try { onResult(block(a)) } catch (e: Exception) { error = e.message ?: e.toString() }
        }
    }

    fun push(r: Route) { stack.add(r) }
    fun pop(): Boolean = if (stack.isNotEmpty()) { stack.removeAt(stack.lastIndex); true } else false

    companion object {
        const val KEY_URL = "server_url"
        const val KEY_TOKEN = "owner_token"
    }
}
