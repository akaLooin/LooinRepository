package world.looin.server

import world.looin.server.ai.Provider
import world.looin.server.ai.Providers
import java.io.File
import java.security.SecureRandom

/** 서버 설정. 모두 환경 변수로 바꿀 수 있다. */
data class Config(
    val port: Int,
    val dataDir: File,
    val ownerToken: String,
    /** 두뇌 공급자 사슬 (앞에서부터 시도). 비어 있으면 오프라인 모드. */
    val providers: List<Provider>,
    /** 세계가 스스로 움직이는 간격(시간). 0 이면 끔. */
    val autoWorldHours: Double,
    /** Claude (Max 요금제 월 API 크레딧). 키가 없으면 무료 두뇌만 쓴다. */
    val claude: ClaudeConfig? = null,
    /** 아카엘이 먼저 말 걸기 */
    val proactive: Boolean = true,
    val zone: java.time.ZoneId = java.time.ZoneId.of("Asia/Seoul"),
    /** 커뮤니티 하나당 하루 최대 AI 활동 수 (0 이면 자동 활동 끔) */
    val communityDailyCap: Int = 48,
) {
    data class ClaudeConfig(
        val apiKey: String,
        val models: world.looin.server.ai.ClaudeModels,
        val monthlyBudgetUsd: Double,
        val cycleStartDay: Int,
        val pacing: Boolean,
        val fallbacks: Boolean,
    )

    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): Config {
            val dataDir = File(env["LOOIN_DATA_DIR"] ?: "data").apply { mkdirs() }
            return Config(
                port = env["PORT"]?.toIntOrNull() ?: 8080,
                dataDir = dataDir,
                ownerToken = env["LOOIN_OWNER_TOKEN"]?.takeIf { it.isNotBlank() } ?: loadOrCreateToken(dataDir),
                providers = Providers.fromEnv(env),
                autoWorldHours = env["LOOIN_AUTO_WORLD_HOURS"]?.toDoubleOrNull() ?: 6.0,
                proactive = env["LOOIN_PROACTIVE"]?.lowercase() != "off",
                communityDailyCap = env["LOOIN_COMMUNITY_DAILY"]?.toIntOrNull() ?: 48,
                zone = runCatching { java.time.ZoneId.of(env["LOOIN_TZ"] ?: "Asia/Seoul") }.getOrDefault(java.time.ZoneId.of("Asia/Seoul")),
                claude = env["ANTHROPIC_API_KEY"]?.takeIf { it.isNotBlank() }?.let { key ->
                    ClaudeConfig(
                        apiKey = key,
                        models = world.looin.server.ai.ClaudeModels().let { d ->
                            fun e(k: String, def: String) = env[k]?.takeIf { it.isNotBlank() } ?: def
                            world.looin.server.ai.ClaudeModels(
                                fast = e("CLAUDE_MODEL_FAST", d.fast),
                                chat = e("CLAUDE_MODEL_CHAT", d.chat),
                                deep = e("CLAUDE_MODEL_DEEP", d.deep),
                                best = e("CLAUDE_MODEL_BEST", d.best),
                            )
                        },
                        monthlyBudgetUsd = env["CLAUDE_MONTHLY_BUDGET_USD"]?.toDoubleOrNull() ?: 100.0,
                        cycleStartDay = env["CLAUDE_CYCLE_START_DAY"]?.toIntOrNull()?.coerceIn(1, 31) ?: 1,
                        pacing = env["CLAUDE_PACING"]?.lowercase() != "off",
                        fallbacks = env["CLAUDE_FALLBACKS"]?.lowercase() != "off",
                    )
                },
            )
        }

        /** 토큰을 따로 정하지 않으면 한 번 만들어 data/owner_token.txt 에 저장한다. */
        private fun loadOrCreateToken(dataDir: File): String {
            val f = File(dataDir, "owner_token.txt")
            if (f.exists()) return f.readText().trim()
            val bytes = ByteArray(24).also { SecureRandom().nextBytes(it) }
            val token = bytes.joinToString("") { "%02x".format(it) }
            f.writeText(token)
            return token
        }
    }
}
