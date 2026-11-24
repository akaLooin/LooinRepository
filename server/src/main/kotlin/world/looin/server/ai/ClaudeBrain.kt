package world.looin.server.ai

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.errors.AnthropicServiceException
import com.anthropic.models.messages.CacheControlEphemeral
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.OutputConfig
import com.anthropic.models.messages.StopReason
import com.anthropic.models.messages.TextBlockParam
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import org.slf4j.LoggerFactory
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole
import world.looin.shared.ProviderStatus
import java.time.LocalDate
import java.time.ZoneId

/** 사용량 기록소 (Repository 가 구현). */
interface UsageLedger {
    fun recordUsage(provider: String, inputTokens: Long, outputTokens: Long, cacheRead: Long, cacheWrite: Long, costUsd: Double)
    fun spentSince(providerPrefix: String, sinceMillis: Long): Double
}

/** 100만 토큰당 달러. */
data class Price(val input: Double, val output: Double, val cacheRead: Double, val cacheWrite: Double) {
    fun cost(input: Long, output: Long, cacheRead: Long, cacheWrite: Long) =
        (input * this.input + output * this.output + cacheRead * this.cacheRead + cacheWrite * this.cacheWrite) / 1_000_000.0

    companion object {
        fun forModel(model: String): Price = when {
            "fable-5-2" in model || "mythos-5-2" in model -> Price(8.0, 40.0, 0.20, 10.0)
            "fable" in model || "mythos" in model -> Price(10.0, 50.0, 1.0, 12.5)
            "opus-5-5" in model -> Price(4.0, 20.0, 0.20, 5.0)
            "sonnet-5-5" in model -> Price(2.0, 10.0, 0.10, 2.5)
            "haiku-5-5" in model -> Price(0.10, 0.50, 0.01, 0.125)
            else -> Price(5.0, 25.0, 0.50, 6.25) // 모르는 모델은 넉넉하게(비싸게) 잡는다
        }
    }
}

/**
 * 월 예산 + 고르게 쓰기(pacing).
 * 결제 주기 시작일부터 오늘까지 지난 날짜 비율만큼만 쓰게 해서, 월초에 크레딧을 다 써버리지 않게 한다.
 */
class ClaudeBudget(
    val monthlyUsd: Double,
    private val cycleStartDay: Int,
    private val pacing: Boolean,
    private val zone: ZoneId = ZoneId.systemDefault(),
    private val today: () -> LocalDate = { LocalDate.now(zone) },
) {
    fun cycleStart(): LocalDate {
        val t = today()
        fun startIn(month: LocalDate) = month.withDayOfMonth(minOf(cycleStartDay, month.lengthOfMonth()))
        val thisMonth = startIn(t.withDayOfMonth(1))
        return if (!t.isBefore(thisMonth)) thisMonth else startIn(t.withDayOfMonth(1).minusMonths(1))
    }

    fun cycleStartMillis(): Long = cycleStart().atStartOfDay(zone).toInstant().toEpochMilli()

    /** 오늘까지 쓸 수 있는 누적 금액. */
    fun allowedSoFar(): Double {
        if (!pacing) return monthlyUsd
        val start = cycleStart()
        val next = start.withDayOfMonth(1).plusMonths(1).let { it.withDayOfMonth(minOf(cycleStartDay, it.lengthOfMonth())) }
        val days = (next.toEpochDay() - start.toEpochDay()).toDouble()
        val elapsed = (today().toEpochDay() - start.toEpochDay() + 1).toDouble()
        return monthlyUsd * minOf(1.0, elapsed / days)
    }
}

/**
 * 일의 종류별로 Claude 모델을 나눠 쓴다. 같은 크레딧으로 훨씬 오래 쓰기 위해서.
 *  - fast (Haiku)  : 기억 정리, 커뮤니티 활동, 질문 난이도 판단, 가벼운 대화
 *  - chat (Sonnet) : 평소 대화, 아이디어 회의, 회의록
 *  - deep (Opus)   : 깊은 고민, 하루 한 번의 성찰 (오래 남는 "노트"라 좋은 모델로)
 *  - best (Fable)  : 직접 "최고"를 골랐을 때만
 */
data class ClaudeModels(
    val fast: String = "claude-haiku-5-5",
    val chat: String = "claude-sonnet-5-5",
    val deep: String = "claude-opus-5-5",
    val best: String = "claude-fable-5-2",
) {
    data class Route(val model: String, val effort: Effort)

    fun route(task: Task): Route = when (task) {
        Task.ROUTER, Task.MEMORY, Task.COMMUNITY -> Route(fast, Effort.LOW)
        Task.CHAT_LIGHT -> Route(fast, Effort.MEDIUM)
        Task.CHAT, Task.GENERAL, Task.MEETING -> Route(chat, Effort.MEDIUM)
        Task.MEETING_SUMMARY -> Route(chat, Effort.HIGH)
        Task.CHAT_DEEP, Task.REFLECTION -> Route(deep, Effort.HIGH)
        Task.CHAT_BEST -> Route(best, Effort.HIGH)
    }

    /** 서버 측 거절 대비(fallbacks)를 지원하는 모델인가 (Haiku 5.5 는 미지원). */
    fun supportsFallbacks(model: String) = "haiku" !in model

    fun all() = listOf(fast, chat, deep, best)
}

/**
 * Claude 두뇌 — Claude Max/Ultra/Team 요금제에 포함된 **월 API 크레딧**으로 쓴다.
 * (구독 로그인을 앱에 연결하는 것은 Anthropic 약관상 허용되지 않으므로, 요금제에 연결한
 *  Claude Console 조직의 API 키를 쓴다. 구독의 주간 사용 한도와는 별개의 크레딧이다.)
 *  - 월 예산·고르게 쓰기를 넘으면, 크레딧이 바닥나면, 오류가 나면 → 다음 두뇌(무료 사슬)로 넘긴다.
 *  - 적응형 사고(Opus 5.5 는 항상 켜짐) + effort 로 깊이 조절, 고정 시스템 프롬프트는 캐시.
 */
class ClaudeBrain(
    apiKey: String,
    private val models: ClaudeModels,
    private val budget: ClaudeBudget,
    private val ledger: UsageLedger,
    private val useFallbacks: Boolean = true,
) : Brain {
    private val log = LoggerFactory.getLogger(ClaudeBrain::class.java)
    private val client: AnthropicClient = AnthropicOkHttpClient.builder().apiKey(apiKey).build()
    @Volatile private var cooldownUntil = 0L
    @Volatile private var lastError: String? = null

    override val premiumOnly = true

    private fun spent() = ledger.spentSince("claude", budget.cycleStartMillis())

    override val info: BrainInfo
        get() {
            val spent = spent()
            val available = cooldownUntil <= System.currentTimeMillis() && spent < budget.allowedSoFar()
            return BrainInfo(
                provider = "claude", model = models.chat, online = true,
                providers = listOf(
                    ProviderStatus(
                        name = "claude", model = "자동(Haiku·Sonnet·Opus·Fable)", available = available, requestsToday = 0, lastError = lastError,
                        note = "이번 주기 $%.2f / $%.0f (오늘까지 $%.2f 허용)".format(spent, budget.monthlyUsd, budget.allowedSoFar()),
                    ),
                ),
            )
        }

    override fun stream(req: BrainRequest): Flow<String> = flow {
        if (cooldownUntil > System.currentTimeMillis()) throw BrainUnavailable("claude 대기 중: $lastError")
        val spent = spent()
        if (spent >= budget.allowedSoFar()) throw BrainUnavailable("claude 예산 도달 ($%.2f)".format(spent))

        val route = models.route(req.task)
        val model = route.model
        val price = Price.forModel(model)
        val pending = ArrayDeque<String>()
        var stop: StopReason? = null
        var inTok = 0L; var outTok = 0L; var cacheRead = 0L; var cacheWrite = 0L
        var emitted = false
        try {
            client.messages().createStreaming(buildParams(req, route)).use { response ->
                val it = response.stream().iterator()
                while (it.hasNext()) {
                    val event = it.next()
                    event.messageStart().ifPresent { s ->
                        val u = s.message().usage()
                        inTok = u.inputTokens()
                        cacheRead = u.cacheReadInputTokens().orElse(0L)
                        cacheWrite = u.cacheCreationInputTokens().orElse(0L)
                    }
                    event.contentBlockDelta().ifPresent { d -> d.delta().text().ifPresent { t -> pending.addLast(t.text()) } }
                    event.messageDelta().ifPresent { d ->
                        d.delta().stopReason().ifPresent { s -> stop = s }
                        outTok = d.usage().outputTokens()
                    }
                    while (pending.isNotEmpty()) {
                        if (!emitted) { emitted = true; req.onProvider?.invoke("claude:$model") }
                        emit(pending.removeFirst())
                    }
                }
            }
        } catch (e: AnthropicServiceException) {
            val msg = e.message.orEmpty()
            val code = e.statusCode()
            lastError = when {
                "credit balance" in msg.lowercase() -> "이번 달 크레딧 소진"
                code == 401 -> "API 키가 만료됐거나 잘못됨 — Console 에서 새 키를 만들어 서버에 넣어주세요"
                code == 403 -> "API 키 권한 없음"
                code == 429 -> "요청 한도(429)"
                else -> "HTTP $code"
            }
            cooldownUntil = System.currentTimeMillis() + when {
                "크레딧" in lastError!! -> 6 * 3_600_000L
                code == 401 || code == 403 -> 30 * 60_000L
                else -> 60_000L
            }
            log.warn("claude failed: {}", msg.take(200))
            if (!emitted) throw BrainUnavailable(lastError!!) else throw e
        } catch (e: Exception) {
            if (e is kotlin.coroutines.cancellation.CancellationException) throw e
            lastError = "연결 실패"; cooldownUntil = System.currentTimeMillis() + 60_000L
            if (!emitted) throw BrainUnavailable("claude 연결 실패: ${e.message}") else throw e
        } finally {
            if (inTok + outTok > 0) ledger.recordUsage("claude:$model", inTok, outTok, cacheRead, cacheWrite, price.cost(inTok, outTok, cacheRead, cacheWrite))
        }
        lastError = null
        when (stop) {
            StopReason.REFUSAL -> emit("\n\n(이 요청은 모델의 안전 정책에 따라 답변이 중단되었어요.)")
            StopReason.MAX_TOKENS -> emit("\n\n(응답이 길어 중간에 잘렸어요.)")
            else -> Unit
        }
    }.flowOn(Dispatchers.IO)

    private fun buildParams(req: BrainRequest, route: ClaudeModels.Route): MessageCreateParams {
        val model = route.model
        val systemBlocks = buildList {
            add(TextBlockParam.builder().text(req.stableSystem).cacheControl(CacheControlEphemeral.builder().build()).build())
            if (req.dynamicSystem.isNotBlank()) add(TextBlockParam.builder().text(req.dynamicSystem).build())
        }
        val b = MessageCreateParams.builder()
            .model(model)
            .maxTokens(maxOf(req.maxTokens, 16_000L))
            .systemOfTextBlockParams(systemBlocks)
            .outputConfig(
                OutputConfig.builder().effort(
                    when (route.effort) {
                        Effort.LOW -> OutputConfig.Effort.LOW
                        Effort.MEDIUM -> OutputConfig.Effort.MEDIUM
                        Effort.HIGH -> OutputConfig.Effort.HIGH
                    },
                ).build(),
            )
        if (useFallbacks && models.supportsFallbacks(model)) {
            // 안전 분류기가 거절하면 서버에서 다른 모델로 이어서 답하게 한다.
            b.putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
            b.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
        }
        ProviderChainBrain.normalizeTurns(req.turns).forEach { t ->
            if (t.role == ChatRole.USER) b.addUserMessage(t.text) else b.addAssistantMessage(t.text)
        }
        return b.build()
    }
}
