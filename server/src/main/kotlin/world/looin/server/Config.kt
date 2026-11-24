package world.looin.server

import java.io.File
import java.security.SecureRandom

/** 서버 설정. 모두 환경 변수로 바꿀 수 있다. */
data class Config(
    val port: Int,
    val dataDir: File,
    val ownerToken: String,
    val anthropicApiKey: String?,
    val model: String,
    val useFallbacks: Boolean,
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): Config {
            val dataDir = File(env["LOOIN_DATA_DIR"] ?: "data").apply { mkdirs() }
            return Config(
                port = env["PORT"]?.toIntOrNull() ?: 8080,
                dataDir = dataDir,
                ownerToken = env["LOOIN_OWNER_TOKEN"]?.takeIf { it.isNotBlank() } ?: loadOrCreateToken(dataDir),
                anthropicApiKey = env["ANTHROPIC_API_KEY"]?.takeIf { it.isNotBlank() },
                model = env["LOOIN_MODEL"]?.takeIf { it.isNotBlank() } ?: "claude-opus-5-5",
                useFallbacks = env["LOOIN_FALLBACKS"]?.lowercase() != "off",
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
