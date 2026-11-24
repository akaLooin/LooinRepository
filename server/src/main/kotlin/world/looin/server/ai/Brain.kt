package world.looin.server.ai

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.toList
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole

/** 생각의 깊이. 잡담·배경 활동은 LOW, 대화는 MEDIUM~HIGH. */
enum class Effort { LOW, MEDIUM, HIGH }

/** 무슨 일인지 — 두뇌가 이걸 보고 알맞은 모델을 고른다 (예: 기억 정리는 가벼운 모델, 성찰은 깊은 모델). */
enum class Task {
    CHAT_LIGHT, CHAT, CHAT_DEEP, CHAT_BEST,
    ROUTER, MEMORY, REFLECTION, MEETING, MEETING_SUMMARY, COMMUNITY, GENERAL,
}

/** 두뇌에 넘기는 첨부 파일. bytes: 사진·PDF 원본, text: 뽑아둔 글자 (텍스트 파일·PDF). */
class TurnAttachment(val name: String, val mime: String, val bytes: ByteArray?, val text: String?)

data class Turn(val role: ChatRole, val text: String, val attachments: List<TurnAttachment> = emptyList())

data class BrainRequest(
    /** 자주 바뀌지 않는 시스템 지시 (페르소나 등) — 프롬프트 캐시 대상. */
    val stableSystem: String,
    /** 매번 바뀔 수 있는 맥락 (기억, 최근 글 목록 등). */
    val dynamicSystem: String = "",
    val turns: List<Turn>,
    val effort: Effort = Effort.MEDIUM,
    val maxTokens: Long = 16_000,
    val task: Task = Task.GENERAL,
    /** false 면 비싼(유료/한정) 두뇌는 건너뛴다 — 커뮤니티 잡담 같은 배경 활동용. */
    val premium: Boolean = true,
    /** 실제로 답한 두뇌 이름을 알려준다 (기록·학습 데이터 출처 표시용). */
    val onProvider: ((String) -> Unit)? = null,
)

/** 이 두뇌는 지금 쓸 수 없다 (예산 소진, 한도 대기 등) — 다음 두뇌로 넘어가라는 신호. */
class BrainUnavailable(message: String) : Exception(message)

/**
 * "두뇌" 추상화. 지금은 무료 공개 모델 공급자 사슬(ProviderChainBrain)을 쓰고,
 * 나중에 내가 파인튜닝한 모델이나 로컬 모델로 바꿔도 나머지 코드는 그대로 둔다.
 */
interface Brain {
    val info: BrainInfo

    /** true 면 premium 요청에만 쓰인다. */
    val premiumOnly: Boolean get() = false

    /** 응답 텍스트를 조각 단위로 흘려보낸다. */
    fun stream(req: BrainRequest): Flow<String>

    suspend fun complete(req: BrainRequest): String = stream(req).toList().joinToString("")
}

/**
 * 여러 두뇌를 우선순위대로 묶는다. 앞의 두뇌가 쓸 수 없거나(예산·한도) 답을 시작하기 전에
 * 실패하면 다음 두뇌로 넘어간다. 예: [Claude (Max 월 크레딧)] → [무료 두뇌 사슬]
 */
class TieredBrain(private val tiers: List<Brain>) : Brain {
    override val info: BrainInfo
        get() {
            val infos = tiers.map { it.info }
            return BrainInfo(
                provider = infos.joinToString(" → ") { it.provider },
                model = infos.firstOrNull { it.online }?.model ?: "none",
                online = infos.any { it.online },
                providers = infos.flatMap { it.providers },
            )
        }

    override fun stream(req: BrainRequest): kotlinx.coroutines.flow.Flow<String> = kotlinx.coroutines.flow.flow {
        var last: Throwable? = null
        for (b in tiers) {
            if (!req.premium && b.premiumOnly) continue
            var emitted = false
            try {
                b.stream(req).collect { emitted = true; emit(it) }
                return@flow
            } catch (e: kotlin.coroutines.cancellation.CancellationException) {
                throw e
            } catch (e: Throwable) {
                if (emitted) throw e
                last = e
            }
        }
        throw last ?: IllegalStateException("쓸 수 있는 두뇌가 없어요")
    }
}
