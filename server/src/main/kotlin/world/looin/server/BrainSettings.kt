package world.looin.server

import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.ClaudeBrain
import world.looin.server.ai.ClaudeBudget
import world.looin.server.ai.OfflineBrain
import world.looin.server.ai.ProviderChainBrain
import world.looin.server.ai.TieredBrain
import world.looin.server.ai.UsageLedger
import world.looin.shared.BrainInfo
import world.looin.shared.BrainSetting
import world.looin.shared.LooinJson
import java.io.File
import java.nio.file.Files
import java.nio.file.attribute.PosixFilePermissions

/**
 * 앱에서 입력한 두뇌 설정(API 키 등)을 서버의 data/brain-settings.json 에 저장한다.
 * 서버 환경 변수보다 앱에서 입력한 값이 우선한다. 파일은 소유자만 읽을 수 있게 저장한다.
 */
class BrainSettingsStore(private val file: File) {
    data class Field(val key: String, val label: String, val help: String, val secret: Boolean)

    companion object {
        val FIELDS = listOf(
            Field("ANTHROPIC_API_KEY", "Claude API 키", "1순위 두뇌. Max 월 크레딧이 연결된 Console 조직의 키 (sk-ant-…)", true),
            Field("CLAUDE_MONTHLY_BUDGET_USD", "Claude 월 예산 (달러)", "이번 결제 주기에 아카엘이 쓸 최대 금액. 기본 100", false),
            Field("CLAUDE_CYCLE_START_DAY", "크레딧 들어오는 날 (매달 며칠)", "claude.ai 결제 화면의 '다음 크레딧' 날짜", false),
            Field("CLAUDE_PACING", "한 달에 고르게 쓰기", "on / off. 기본 on", false),
            Field("GEMINI_API_KEY", "Google Gemini 키", "예비 두뇌 (AIza…)", true),
            Field("GROQ_API_KEY", "Groq 키", "예비 두뇌 (gsk_…)", true),
            Field("MISTRAL_API_KEY", "Mistral 키", "예비 두뇌", true),
            Field("CEREBRAS_API_KEY", "Cerebras 키", "예비 두뇌", true),
            Field("NVIDIA_API_KEY", "NVIDIA 키", "예비 두뇌 (nvapi-…)", true),
            Field("OPENROUTER_API_KEY", "OpenRouter 키", "예비 두뇌 (무료 모델만)", true),
        )
        private val KEYS = FIELDS.map { it.key }.toSet()
        private val ser = MapSerializer(String.serializer(), String.serializer())
    }

    @Volatile private var values: Map<String, String> = load()

    private fun load(): Map<String, String> =
        if (!file.exists()) emptyMap()
        else runCatching { LooinJson.decodeFromString(ser, file.readText()) }.getOrDefault(emptyMap()).filterKeys { it in KEYS }

    fun values(): Map<String, String> = values

    @Synchronized
    fun update(changes: Map<String, String>) {
        val next = values.toMutableMap()
        changes.filterKeys { it in KEYS }.forEach { (k, v) ->
            val t = v.trim()
            if (t.isEmpty()) next.remove(k) else next[k] = t
        }
        file.parentFile?.mkdirs()
        file.writeText(LooinJson.encodeToString(ser, next))
        runCatching { Files.setPosixFilePermissions(file.toPath(), PosixFilePermissions.fromString("rw-------")) }
        values = next
    }

    /** 실제로 쓰는 설정: 환경 변수 위에 앱 입력값을 덮어쓴다. */
    fun effectiveEnv(base: Map<String, String>): Map<String, String> = base + values

    fun view(base: Map<String, String>): List<BrainSetting> = FIELDS.map { f ->
        val fromApp = values[f.key]
        val fromEnv = base[f.key]?.takeIf { it.isNotBlank() }
        val v = fromApp ?: fromEnv
        BrainSetting(
            key = f.key, label = f.label, help = f.help, secret = f.secret, isSet = v != null,
            preview = v?.let { if (f.secret) "…" + it.takeLast(4) else it },
            source = when { fromApp != null -> "app"; fromEnv != null -> "env"; else -> null },
        )
    }
}

/** 설정(Config)으로 두뇌 계층을 만든다: [Claude] → [무료 사슬], 아무 키도 없으면 오프라인. */
fun buildBrain(config: Config, ledger: UsageLedger): Brain {
    val tiers = buildList<Brain> {
        config.claude?.let { c ->
            add(ClaudeBrain(c.apiKey, c.models, ClaudeBudget(c.monthlyBudgetUsd, c.cycleStartDay, c.pacing), ledger, c.fallbacks))
        }
        config.providers.takeIf { it.isNotEmpty() }?.let { add(ProviderChainBrain(it)) }
    }
    return when {
        tiers.isEmpty() -> OfflineBrain()
        tiers.size == 1 && !tiers.single().premiumOnly -> tiers.single()
        else -> TieredBrain(tiers)
    }
}

/** 실행 중에 두뇌를 갈아끼울 수 있게 감싼다 (앱에서 키를 바꾸면 서버 재시작 없이 반영). */
class SwitchableBrain(initial: Brain) : Brain {
    private val log = LoggerFactory.getLogger(SwitchableBrain::class.java)
    @Volatile var current: Brain = initial
        set(value) { field = value; log.info("두뇌 교체: {}", value.info.provider) }

    override val info: BrainInfo get() = current.info
    override val premiumOnly: Boolean get() = current.premiumOnly
    override fun stream(req: BrainRequest): Flow<String> = current.stream(req)
}
