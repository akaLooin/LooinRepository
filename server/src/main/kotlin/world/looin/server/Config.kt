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
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): Config {
            val dataDir = File(env["LOOIN_DATA_DIR"] ?: "data").apply { mkdirs() }
            return Config(
                port = env["PORT"]?.toIntOrNull() ?: 8080,
                dataDir = dataDir,
                ownerToken = env["LOOIN_OWNER_TOKEN"]?.takeIf { it.isNotBlank() } ?: loadOrCreateToken(dataDir),
                providers = Providers.fromEnv(env),
                autoWorldHours = env["LOOIN_AUTO_WORLD_HOURS"]?.toDoubleOrNull() ?: 6.0,
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
