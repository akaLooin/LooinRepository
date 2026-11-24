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
import world.looin.server.ai.ClaudeBrain
import world.looin.server.ai.ClaudeBudget
import world.looin.server.ai.ProviderChainBrain
import world.looin.server.ai.TieredBrain
import world.looin.server.ai.OfflineBrain
import world.looin.server.db.Db
import world.looin.server.db.Repository
import world.looin.server.service.ChatService
import world.looin.server.service.GrowthService
import world.looin.server.service.MemoryService
import world.looin.server.service.NotFound
import world.looin.server.service.WorldSimService
import world.looin.shared.ApiError
import world.looin.shared.LooinJson
import java.io.File

/** 서버 전체에서 공유하는 구성 요소 묶음. */
class App(val config: Config, brainOverride: Brain? = null) {
    val db = Db(File(config.dataDir, "looin.db")).apply { migrate() }
    val repo = Repository(db)
    val brain: Brain = brainOverride ?: buildList<Brain> {
        // 1순위: Claude (Max 요금제의 월 API 크레딧, 예산·고르게 쓰기 적용)
        config.claude?.let { c ->
            add(ClaudeBrain(c.apiKey, c.model, ClaudeBudget(c.monthlyBudgetUsd, c.cycleStartDay, c.pacing), repo, c.fallbacks))
        }
        // 2순위: 무료 두뇌 사슬
        config.providers.takeIf { it.isNotEmpty() }?.let { add(ProviderChainBrain(it)) }
    }.let { tiers ->
        when (tiers.size) {
            0 -> OfflineBrain()
            1 -> tiers.single().let { if (it.premiumOnly) TieredBrain(tiers) else it }
            else -> TieredBrain(tiers)
        }
    }
    val background = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val memory = MemoryService(repo, brain)
    val chat = ChatService(repo, brain, memory, background)
    val sim = WorldSimService(repo, brain)
    val growth = GrowthService(repo, brain, sim, if (brain.info.online) config.autoWorldHours else 0.0)

    init {
        Seed.ensure(repo, config.ownerToken)
    }
}

fun main() {
    val log = LoggerFactory.getLogger("LooinWorld")
    val config = Config.fromEnv()
    val app = App(config)
    log.info("Looin World 서버 시작 — port={}, brain={} ({})", config.port, app.brain.info.provider, app.brain.info.model)
    if (System.getenv("LOOIN_OWNER_TOKEN").isNullOrBlank()) {
        log.info("앱 접속 토큰은 {} 파일에 있습니다.", File(config.dataDir, "owner_token.txt").absolutePath)
    }
    if (!app.brain.info.online) log.warn("두뇌 키(ANTHROPIC_API_KEY, GROQ_API_KEY 등)가 하나도 없어 오프라인 모드로 실행합니다.")
    app.growth.startAutoWorld(app.background)
    embeddedServer(Netty, port = config.port, host = "0.0.0.0") { module(app) }.start(wait = true)
}

fun Application.module(app: App) {
    install(ContentNegotiation) { json(LooinJson) }
    install(CallLogging)
    install(Authentication) {
        bearer("owner") {
            authenticate { cred -> app.repo.userIdForToken(cred.token)?.let { UserIdPrincipal(it) } }
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
