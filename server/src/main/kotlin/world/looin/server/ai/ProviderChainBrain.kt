package world.looin.server.ai

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.preparePost
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsChannel
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import org.slf4j.LoggerFactory
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole
import world.looin.shared.LooinJson
import world.looin.shared.ProviderStatus
import java.time.LocalDate
import java.time.ZoneOffset

/** OpenAI 호환 API 를 제공하는 공급자 하나 (Groq, Cerebras, OpenRouter, NVIDIA, Gemini, Ollama 등). */
data class Provider(
    val name: String,
    val baseUrl: String,
    val apiKey: String?,
    /** 비워두면 /models 목록에서 가장 좋은 공개 모델을 자동으로 고른다. */
    val model: String? = null,
    /** 무료 등급은 분당 토큰 한도가 작아 응답 길이를 제한한다. */
    val maxOutputTokens: Int = 4096,
    /** OpenRouter 처럼 무료/유료 모델이 섞인 곳은 무료(:free) 모델만 쓴다. */
    val freeOnly: Boolean = false,
)

/**
 * 무료 공개 모델 공급자들을 순서대로 이어 붙인 두뇌.
 *  - 앞의 공급자가 한도(429)·장애로 실패하면 다음 공급자로 넘어간다 → 무료 한도를 합쳐서 쓴다.
 *  - 실패한 공급자는 잠시 쉬게(cooldown) 한다.
 *  - 모델은 각 공급자의 목록에서 선호도 순으로 자동 선택한다 (공개 모델 순위가 자주 바뀌므로).
 *  - 응답에 섞여 나오는 <think>…</think> 추론 과정은 걸러낸다.
 */
class ProviderChainBrain(
    private val providers: List<Provider>,
    private val http: HttpClient = defaultClient(),
) : Brain {
    private val log = LoggerFactory.getLogger(ProviderChainBrain::class.java)

    private class State {
        var model: String? = null
        var cooldownUntil = 0L
        var day: LocalDate = LocalDate.now(ZoneOffset.UTC)
        var requestsToday = 0
        var lastError: String? = null
        var disabled = false
    }

    private val states = providers.associate { it.name to State() }
    private val discoverLock = Mutex()

    override val info: BrainInfo
        get() = BrainInfo(
            provider = providers.joinToString(" → ") { it.name },
            model = providers.firstNotNullOfOrNull { states[it.name]?.model ?: it.model } ?: "auto",
            online = true,
            providers = providers.map { p ->
                val s = states.getValue(p.name)
                ProviderStatus(
                    name = p.name,
                    model = s.model ?: p.model ?: "auto",
                    available = !s.disabled && s.cooldownUntil <= System.currentTimeMillis(),
                    requestsToday = s.requestsToday,
                    lastError = s.lastError,
                )
            },
        )

    override fun stream(req: BrainRequest): Flow<String> = flow {
        val errors = mutableListOf<String>()
        for (p in providers) {
            val s = states.getValue(p.name)
            if (s.disabled || s.cooldownUntil > System.currentTimeMillis()) continue
            val model = try {
                resolveModel(p, s)
            } catch (e: Exception) {
                fail(p, s, "모델 목록 실패: ${e.message}", 10 * 60_000L); errors += "${p.name}: ${e.message}"; continue
            } ?: run { fail(p, s, "쓸 수 있는 모델 없음", 60 * 60_000L); errors += "${p.name}: no model"; null }
                ?: continue

            var emitted = false
            val outcome = try {
                http.preparePost("${p.baseUrl.trimEnd('/')}/chat/completions") {
                    p.apiKey?.let { bearerAuth(it) }
                    contentType(ContentType.Application.Json)
                    setBody(LooinJson.encodeToString(JsonObject.serializer(), body(p, model, req)))
                }.execute { resp ->
                    if (!resp.status.isSuccess()) {
                        val text = resp.bodyAsText().take(300)
                        val code = resp.status.value
                        val wait = resp.headers["retry-after"]?.toDoubleOrNull()?.let { (it * 1000).toLong() }
                        when {
                            code == 401 || code == 403 -> { s.disabled = true; s.lastError = "인증 실패($code)" }
                            code == 404 -> { s.model = null; fail(p, s, "모델 없음($code)", 5 * 60_000L) }
                            code == 429 -> fail(p, s, "한도 초과(429)", wait ?: if (text.contains("day", true)) 60 * 60_000L else 60_000L)
                            else -> fail(p, s, "HTTP $code", wait ?: 30_000L)
                        }
                        return@execute "$code $text"
                    }
                    bump(s)
                    req.onProvider?.invoke("${p.name}:$model")
                    val ch = resp.bodyAsChannel()
                    val filter = ThinkFilter()
                    while (true) {
                        val line = ch.readUTF8Line() ?: break
                        if (!line.startsWith("data:")) continue
                        val data = line.removePrefix("data:").trim()
                        if (data == "[DONE]") break
                        val piece = runCatching {
                            val o = LooinJson.parseToJsonElement(data).jsonObject
                            val choice = (o["choices"] as? JsonArray)?.firstOrNull()?.jsonObject
                            ((choice?.get("delta") as? JsonObject)?.get("content") as? JsonPrimitive)?.contentOrNull
                        }.getOrNull() ?: continue
                        val clean = filter.feed(piece)
                        if (clean.isNotEmpty()) { emitted = true; emit(clean) }
                    }
                    filter.flush().takeIf { it.isNotEmpty() }?.let { emitted = true; emit(it) }
                    s.lastError = null
                    null
                }
            } catch (e: Exception) {
                if (emitted) throw e // 이미 일부를 보낸 뒤라면 다른 공급자로 이어 붙일 수 없다.
                fail(p, s, "연결 실패: ${e.message}", 60_000L)
                "${e.message}"
            }
            if (outcome == null) return@flow
            errors += "${p.name}: $outcome"
            log.warn("provider {} failed: {}", p.name, outcome)
        }
        throw IllegalStateException(
            if (errors.isEmpty()) "지금 쓸 수 있는 두뇌가 없어요 (모든 공급자가 한도 대기 중). 잠시 후 다시 시도하세요."
            else "모든 두뇌 공급자가 실패했어요: " + errors.joinToString(" / "),
        )
    }

    private fun body(p: Provider, model: String, req: BrainRequest): JsonObject = buildJsonObject {
        put("model", model)
        put("stream", true)
        put("max_tokens", minOf(req.maxTokens, p.maxOutputTokens.toLong()))
        put("temperature", if (req.effort == Effort.LOW) 0.9 else 0.7)
        putJsonArray("messages") {
            val system = listOf(req.stableSystem, req.dynamicSystem).filter { it.isNotBlank() }.joinToString("\n\n")
            addJsonObject { put("role", "system"); put("content", system) }
            normalizeTurns(req.turns).forEach { t ->
                addJsonObject {
                    put("role", if (t.role == ChatRole.USER) "user" else "assistant")
                    if (t.attachments.isEmpty()) put("content", t.text)
                    else putJsonArray("content") {
                        // 무료 두뇌: 사진은 이미지로(읽을 수 있는 모델만), PDF·텍스트는 뽑아둔 글자로 넘긴다
                        t.attachments.forEach { a ->
                            if (a.bytes != null && a.mime.startsWith("image/")) addJsonObject {
                                put("type", "image_url")
                                putJsonObject("image_url") {
                                    put("url", "data:${a.mime};base64," + java.util.Base64.getEncoder().encodeToString(a.bytes))
                                }
                            } else addJsonObject {
                                put("type", "text")
                                put("text", "<file name=\"${a.name}\">\n${(a.text ?: "(내용을 읽을 수 없음)").take(60_000)}\n</file>")
                            }
                        }
                        addJsonObject { put("type", "text"); put("text", t.text) }
                    }
                }
            }
        }
    }

    private fun fail(p: Provider, s: State, reason: String, coolMs: Long) {
        s.lastError = reason
        s.cooldownUntil = System.currentTimeMillis() + coolMs
        log.info("provider {} cooling down {}s: {}", p.name, coolMs / 1000, reason)
    }

    private fun bump(s: State) {
        val today = LocalDate.now(ZoneOffset.UTC)
        if (today != s.day) { s.day = today; s.requestsToday = 0 }
        s.requestsToday++
    }

    private suspend fun resolveModel(p: Provider, s: State): String? {
        p.model?.let { return it }
        s.model?.let { return it }
        return discoverLock.withLock {
            s.model ?: run {
                val resp = http.get("${p.baseUrl.trimEnd('/')}/models") { p.apiKey?.let { bearerAuth(it) } }
                check(resp.status.isSuccess()) { "HTTP ${resp.status.value}" }
                val ids = LooinJson.parseToJsonElement(resp.bodyAsText()).jsonObject["data"]?.jsonArray
                    ?.mapNotNull { (it.jsonObject["id"] as? JsonPrimitive)?.contentOrNull }.orEmpty()
                ModelPicker.pick(ids, p.freeOnly)
                    ?.let { if ("googleapis" in p.baseUrl) it.removePrefix("models/") else it }
                    .also {
                    s.model = it
                    log.info("provider {} → model {}", p.name, it)
                }
            }
        }
    }

    companion object {
        fun defaultClient() = HttpClient {
            install(HttpTimeout) {
                requestTimeoutMillis = 5 * 60_000L
                connectTimeoutMillis = 15_000L
                socketTimeoutMillis = 120_000L
            }
            expectSuccess = false
        }

        /** API 규칙: system 다음은 user 로 시작, user/assistant 가 번갈아. 연속된 같은 역할은 합친다. */
        fun normalizeTurns(turns: List<Turn>): List<Turn> {
            val merged = mutableListOf<Turn>()
            for (t in turns.filter { it.text.isNotBlank() || it.attachments.isNotEmpty() }) {
                val last = merged.lastOrNull()
                if (last != null && last.role == t.role) {
                    merged[merged.lastIndex] = last.copy(text = last.text + "\n\n" + t.text, attachments = last.attachments + t.attachments)
                } else merged += t
            }
            while (merged.firstOrNull()?.role == ChatRole.ASSISTANT) merged.removeAt(0)
            if (merged.isEmpty()) merged += Turn(ChatRole.USER, "(시작)")
            return merged
        }
    }
}

/** 공급자의 모델 목록에서 가장 쓸 만한 대화용 공개 모델을 고른다. */
object ModelPicker {
    /** 앞에 있을수록 선호. 공개 모델 순위가 바뀌면 이 목록만 고치면 된다 (또는 *_MODEL 환경 변수로 고정). */
    val preference = listOf(
        // 최상위 공개 모델 (무료로 풀리는 일은 드물지만, 보이면 우선)
        "kimi-k3", "deepseek-v4", "glm-5", "kimi-k2", "kimi", "deepseek-v3", "deepseek-r1", "deepseek",
        // 최전선 회사의 공식 무료 API — Google Gemini Flash, Mistral Large/Medium
        "gemini", "mistral-large", "mistral-medium",
        // 2026년 하반기 무료 등급의 주력: 큰 모델 우선
        "gpt-oss-120b", "nemotron-3-ultra", "nemotron", "glm-4", "llama-4-maverick", "qwen3", "qwen",
        "gemma-4", "gemma", "gpt-oss", "llama-4", "llama-3.3-70b", "mistral-small", "llama",
    )
    private val exclude = listOf(
        "embed", "whisper", "tts", "guard", "rerank", "audio", "image", "vision", "ocr", "moderation", "distil", "coder",
        "codestral", "devstral", "pixtral", "voxtral", "magistral",
    )

    fun pick(ids: List<String>, freeOnly: Boolean): String? {
        val usable = ids.filter { id ->
            val l = id.lowercase()
            exclude.none { it in l } && (!freeOnly || l.endsWith(":free"))
        }
        for (key in preference) {
            var hits = usable.filter { key in it.lowercase() }
            if (key == "gemini") {
                // 무료 한도가 작은 Pro·실험판 대신 Flash(경량 Lite 제외)의 가장 최신 버전
                hits = hits.filter { val l = it.lowercase(); "flash" in l && "lite" !in l && "live" !in l && "exp" !in l }
                if (hits.isNotEmpty()) return hits.maxByOrNull { versionScore(it) }
                continue
            }
            if (hits.isNotEmpty()) return hits.maxByOrNull { sizeScore(it) }
        }
        return usable.firstOrNull()
    }

    /** "gemini-3.5-flash" → 350 처럼 버전 숫자를 비교용 점수로. */
    private fun versionScore(id: String): Int =
        Regex("(\\d+)(?:\\.(\\d+))?").find(id.substringAfter("gemini"))
            ?.let { it.groupValues[1].toInt() * 100 + (it.groupValues[2].toIntOrNull() ?: 0) * 10 } ?: 0

    /** 이름에 들어 있는 파라미터 크기(예: 120b, 70b)가 클수록 우선. */
    private fun sizeScore(id: String): Int =
        Regex("(\\d+)b", RegexOption.IGNORE_CASE).findAll(id).mapNotNull { it.groupValues[1].toIntOrNull() }.maxOrNull() ?: 0
}

/** 스트림 조각 사이에 걸쳐 있는 <think>…</think> 구간을 제거한다. */
class ThinkFilter {
    private val buf = StringBuilder()
    private var inThink = false

    fun feed(piece: String): String {
        buf.append(piece)
        val out = StringBuilder()
        while (true) {
            if (inThink) {
                val end = buf.indexOf("</think>")
                if (end < 0) { keepTail("</think>".length - 1, emit = false, out = out); return out.toString() }
                buf.delete(0, end + "</think>".length); inThink = false
            } else {
                val start = buf.indexOf("<think>")
                if (start < 0) { keepTail("<think>".length - 1, emit = true, out = out); return out.toString().trimStartIfFirst() }
                out.append(buf, 0, start); buf.delete(0, start + "<think>".length); inThink = true
            }
        }
    }

    fun flush(): String = if (inThink) "" else buf.toString().also { buf.clear() }

    private var started = false
    private fun String.trimStartIfFirst(): String {
        if (started) return this
        val t = trimStart()
        if (t.isNotEmpty()) started = true
        return t
    }

    /** 태그가 조각 경계에서 잘렸을 수 있으므로 끝부분 일부는 남겨둔다. */
    private fun keepTail(n: Int, emit: Boolean, out: StringBuilder) {
        val cut = (buf.length - n).coerceAtLeast(0)
        if (emit) out.append(buf, 0, cut)
        buf.delete(0, cut)
    }
}

/** 환경 변수로 켜는 기본 공급자 목록. 키가 있는 것만 사슬에 들어간다. */
object Providers {
    private data class Preset(
        val name: String,
        val keyEnv: String,
        val baseUrl: String,
        val freeOnly: Boolean = false,
        val maxOut: Int = 4096,
        /** 목록 자동 선택이 위험한 곳(유료 모델이 섞인 곳)은 모델을 꼭 직접 지정해야 켜진다. */
        val requireModel: Boolean = false,
    )

    private val presets = listOf(
        // 최전선 회사의 공식 무료/무상 제공
        Preset("gemini", "GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai"),
        Preset("mistral", "MISTRAL_API_KEY", "https://api.mistral.ai/v1"),
        // OpenAI 데이터 공유 프로그램의 무상 토큰 — 하루 한도를 넘으면 충전 잔액에서 과금되므로 모델 직접 지정 필수
        Preset("openai", "OPENAI_API_KEY", "https://api.openai.com/v1", requireModel = true),
        // 공개 모델 무료 등급
        Preset("groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1"),
        Preset("cerebras", "CEREBRAS_API_KEY", "https://api.cerebras.ai/v1"),
        Preset("openrouter", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1", freeOnly = true),
        Preset("nvidia", "NVIDIA_API_KEY", "https://integrate.api.nvidia.com/v1"),
    )

    fun fromEnv(env: Map<String, String>): List<Provider> {
        val all = buildList {
            presets.forEach { p ->
                val key = env[p.keyEnv]?.takeIf { it.isNotBlank() } ?: return@forEach
                val upper = p.name.uppercase()
                val model = env["${upper}_MODEL"]?.takeIf { it.isNotBlank() }
                if (p.requireModel && model == null) {
                    LoggerFactory.getLogger(Providers::class.java).warn("{} 키가 있지만 {}_MODEL 이 없어 건너뜁니다.", p.name, upper)
                    return@forEach
                }
                add(
                    Provider(
                        p.name, p.baseUrl, key,
                        model = model,
                        maxOutputTokens = env["${upper}_MAX_TOKENS"]?.toIntOrNull() ?: p.maxOut,
                        freeOnly = p.freeOnly,
                    ),
                )
            }
            // 내 PC/서버에서 돌리는 Ollama 등 (키 불필요, 진짜 무제한)
            env["LOCAL_LLM_URL"]?.takeIf { it.isNotBlank() }?.let {
                add(Provider("local", it, env["LOCAL_LLM_KEY"], env["LOCAL_MODEL"], env["LOCAL_MAX_TOKENS"]?.toIntOrNull() ?: 4096))
            }
        }
        val order = env["LOOIN_PROVIDER_ORDER"]?.split(',')?.map { it.trim().lowercase() }?.filter { it.isNotEmpty() }
        return if (order == null) all else all.sortedBy { p -> order.indexOf(p.name).let { if (it < 0) Int.MAX_VALUE else it } }
    }
}
