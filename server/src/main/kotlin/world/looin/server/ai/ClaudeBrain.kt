package world.looin.server.ai

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
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

/**
 * Claude API 기반 두뇌. 기본 모델은 claude-opus-5-5.
 *  - 적응형 사고(adaptive thinking)는 Opus 5.5 에서 항상 켜져 있고, 깊이는 effort 로 조절한다.
 *  - 시스템 프롬프트의 고정 부분은 프롬프트 캐시로 비용을 줄인다.
 *  - 안전 분류기에 의해 거절될 경우 서버 측 fallback(다른 모델로 재시도)을 기본으로 켠다.
 *    (LOOIN_FALLBACKS=off 로 끌 수 있다.)
 */
class ClaudeBrain(
    apiKey: String,
    private val model: String,
    private val useFallbacks: Boolean,
) : Brain {
    private val log = LoggerFactory.getLogger(ClaudeBrain::class.java)
    private val client: AnthropicClient = AnthropicOkHttpClient.builder().apiKey(apiKey).build()

    override val info = BrainInfo(provider = "anthropic", model = model, online = true)

    override fun stream(req: BrainRequest): Flow<String> = flow {
        val params = buildParams(req)
        // ifPresent 람다 안에서는 emit(suspend)을 부를 수 없어 잠시 담아둔다.
        val pending = ArrayDeque<String>()
        client.messages().createStreaming(params).use { response ->
            val it = response.stream().iterator()
            var stop: StopReason? = null
            while (it.hasNext()) {
                val event = it.next()
                event.contentBlockDelta().ifPresent { d -> d.delta().text().ifPresent { t -> pending.addLast(t.text()) } }
                event.messageDelta().ifPresent { d -> d.delta().stopReason().ifPresent { s -> stop = s } }
                while (pending.isNotEmpty()) emit(pending.removeFirst())
            }
            when (stop) {
                StopReason.REFUSAL -> emit("\n\n(이 요청은 모델의 안전 정책에 따라 답변이 중단되었어요.)")
                StopReason.MAX_TOKENS -> emit("\n\n(응답이 길어 중간에 잘렸어요.)")
                else -> Unit
            }
        }
    }.flowOn(Dispatchers.IO)

    private fun buildParams(req: BrainRequest): MessageCreateParams {
        val systemBlocks = buildList {
            add(
                TextBlockParam.builder()
                    .text(req.stableSystem)
                    .cacheControl(CacheControlEphemeral.builder().build())
                    .build(),
            )
            if (req.dynamicSystem.isNotBlank()) add(TextBlockParam.builder().text(req.dynamicSystem).build())
        }
        val b = MessageCreateParams.builder()
            .model(model)
            .maxTokens(req.maxTokens)
            .systemOfTextBlockParams(systemBlocks)
            .outputConfig(
                OutputConfig.builder().effort(
                    when (req.effort) {
                        Effort.LOW -> OutputConfig.Effort.LOW
                        Effort.MEDIUM -> OutputConfig.Effort.MEDIUM
                        Effort.HIGH -> OutputConfig.Effort.HIGH
                    },
                ).build(),
            )
        if (useFallbacks) {
            b.putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
            b.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
        }
        // API 는 user 로 시작해 user/assistant 가 번갈아 와야 한다 — 연속된 같은 역할은 합친다.
        val merged = mutableListOf<Turn>()
        for (t in req.turns.filter { it.text.isNotBlank() }) {
            val last = merged.lastOrNull()
            if (last != null && last.role == t.role) merged[merged.lastIndex] = last.copy(text = last.text + "\n\n" + t.text)
            else merged += t
        }
        while (merged.firstOrNull()?.role == ChatRole.ASSISTANT) merged.removeAt(0)
        if (merged.isEmpty()) merged += Turn(ChatRole.USER, "(시작)")
        merged.forEach { t -> if (t.role == ChatRole.USER) b.addUserMessage(t.text) else b.addAssistantMessage(t.text) }
        log.debug("Claude request: model={}, turns={}, effort={}", model, merged.size, req.effort)
        return b.build()
    }
}
