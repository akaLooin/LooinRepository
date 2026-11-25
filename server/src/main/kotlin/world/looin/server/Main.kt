package world.looin.server

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.UserIdPrincipal
import io.ktor.server.auth.bearer
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.db.Db
import world.looin.server.db.Repository
import world.looin.server.service.ChatService
import world.looin.server.service.FileService
import world.looin.server.service.GrowthService
import world.looin.server.service.MemoryService
import world.looin.server.service.NotFound
import world.looin.server.service.StoryService
import world.looin.server.service.WorldSimService
import world.looin.shared.ApiError
import world.looin.shared.LooinJson
import java.io.File

/** 서버 전체에서 공유하는 구성 요소 묶음. */
class App(
    val config: Config,
    brainOverride: Brain? = null,
    /** 서버 환경 변수 (앱에서 입력한 두뇌 설정이 이 위에 덮어써진다). */
    private val baseEnv: Map<String, String> = emptyMap(),
) {
    val db = Db(File(config.dataDir, "looin.db")).apply { migrate() }
    val repo = Repository(db)
    val brainSettings = BrainSettingsStore(File(config.dataDir, "brain-settings.json"))
    private val switchable = SwitchableBrain(brainOverride ?: buildBrain(brainConfig(), repo))
    val brain: Brain = switchable
    val background = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val memory = MemoryService(repo, brain)
    val files = FileService(repo, File(config.dataDir, "files"))
    val chat = ChatService(repo, brain, memory, background, files)
    val sim = WorldSimService(repo, brain)
    val growth = GrowthService(repo, brain, sim, config.autoWorldHours, memory)
    val story = StoryService(repo, brain, config.zone, config.proactive)

    init {
        Seed.ensure(repo, config.ownerToken)
    }

    private fun brainConfig(): Config =
        if (baseEnv.isEmpty() && brainSettings.values().isEmpty()) config
        else Config.fromEnv(brainSettings.effectiveEnv(baseEnv))

    fun envForView(): Map<String, String> = baseEnv

    /** 앱에서 두뇌 설정을 바꾸면 호출 — 서버 재시작 없이 새 두뇌로 교체. */
    fun updateBrainSettings(changes: Map<String, String>) {
        brainSettings.update(changes)
        switchable.current = buildBrain(Config.fromEnv(brainSettings.effectiveEnv(baseEnv)), repo)
    }
}

fun main() {
    val log = LoggerFactory.getLogger("LooinWorld")
    val config = Config.fromEnv()
    val app = App(config, baseEnv = System.getenv())
    log.info("Looin World 서버 시작 — port={}, brain={} ({})", config.port, app.brain.info.provider, app.brain.info.model)
    if (System.getenv("LOOIN_OWNER_TOKEN").isNullOrBlank()) {
        log.info("앱 접속 토큰은 {} 파일에 있습니다.", File(config.dataDir, "owner_token.txt").absolutePath)
    }
    if (!app.brain.info.online) log.warn("두뇌 키가 아직 없어 오프라인 모드로 시작합니다. 앱의 '나 → 두뇌 설정'에서 키를 넣으면 바로 켜집니다.")
    app.growth.startAutoWorld(app.background)
    app.story.start(app.background)
    embeddedServer(Netty, port = config.port, host = "0.0.0.0") { module(app) }.start(wait = true)
}

/** 앱은 비밀번호를 "b64.<base64url>" 로 감싸 보낸다 (특수문자·한글 대응). 예전 방식(그대로)도 받는다. */
fun decodeToken(header: String): String? =
    if (header.startsWith("b64.")) runCatching { String(java.util.Base64.getUrlDecoder().decode(header.removePrefix("b64.")), Charsets.UTF_8) }.getOrNull()
    else header

fun Application.module(app: App) {
    install(ContentNegotiation) { json(LooinJson) }
    install(CallLogging)
    install(Authentication) {
        bearer("owner") {
            authenticate { cred -> decodeToken(cred.token)?.let { app.repo.userIdForToken(it) }?.let { UserIdPrincipal(it) } }
        }
    }
    install(StatusPages) {
        exception<NotFound> { call, e -> call.respond(HttpStatusCode.NotFound, ApiError(e.message ?: "not found")) }
        exception<IllegalArgumentException> { call, e -> call.respond(HttpStatusCode.BadRequest, ApiError(e.message ?: "bad request")) }
        exception<BadRequestException> { call, e -> call.respond(HttpStatusCode.BadRequest, ApiError(e.message ?: "bad request")) }
        exception<Throwable> { call, e ->
            LoggerFactory.getLogger("LooinWorld").error("unhandled", e)
            call.respond(HttpStatusCode.InternalServerError, ApiError(e.message ?: "server error"))
        }
    }
    routing {
        get("/health") { call.respond(mapOf("status" to "ok", "brain" to app.brain.info.provider)) }
        apiRoutes(app)
    }
}
