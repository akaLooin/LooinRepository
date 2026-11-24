package world.looin.server.ai

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.toList
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole

/** 생각의 깊이. 잡담·배경 활동은 LOW, 대화는 MEDIUM~HIGH. */
enum class Effort { LOW, MEDIUM, HIGH }

data class Turn(val role: ChatRole, val text: String)

data class BrainRequest(
    /** 자주 바뀌지 않는 시스템 지시 (페르소나 등) — 프롬프트 캐시 대상. */
    val stableSystem: String,
    /** 매번 바뀔 수 있는 맥락 (기억, 최근 글 목록 등). */
    val dynamicSystem: String = "",
    val turns: List<Turn>,
    val effort: Effort = Effort.MEDIUM,
    val maxTokens: Long = 16_000,
)

/**
 * "두뇌" 추상화. 지금은 무료 공개 모델 공급자 사슬(ProviderChainBrain)을 쓰고,
 * 나중에 내가 파인튜닝한 모델이나 로컬 모델로 바꿔도 나머지 코드는 그대로 둔다.
 */
interface Brain {
    val info: BrainInfo

    /** 응답 텍스트를 조각 단위로 흘려보낸다. */
    fun stream(req: BrainRequest): Flow<String>

    suspend fun complete(req: BrainRequest): String = stream(req).toList().joinToString("")
}
