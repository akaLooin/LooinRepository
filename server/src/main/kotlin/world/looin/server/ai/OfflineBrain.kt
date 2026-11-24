package world.looin.server.ai

import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import world.looin.shared.BrainInfo

/**
 * API 키가 없을 때 쓰는 임시 두뇌. 실제 AI 는 아니지만 앱/서버 흐름 전체를
 * 비용 없이 시험해볼 수 있게 해준다.
 */
class OfflineBrain : Brain {
    override val info = BrainInfo(provider = "offline", model = "none", online = false)

    override fun stream(req: BrainRequest): Flow<String> = flow {
        val last = req.turns.lastOrNull()?.text.orEmpty()
        val reply = when {
            req.stableSystem.contains("JSON") && req.stableSystem.contains("\"title\"") ->
                """{"title": "오프라인 모드의 글", "body": "ANTHROPIC_API_KEY 를 설정하면 진짜 AI 주민들이 글을 쓰기 시작해요."}"""
            req.stableSystem.contains("JSON 배열") -> "[]"
            req.stableSystem.contains("JSON") -> """{"body": "(오프라인 모드 댓글)"}"""
            else -> "지금은 오프라인 모드예요. 서버에 ANTHROPIC_API_KEY 를 설정하면 제가 진짜로 생각하고 대답할 수 있어요.\n\n받은 메시지: \"${last.take(200)}\""
        }
        for (chunk in reply.chunked(12)) {
            emit(chunk)
            delay(15)
        }
    }
}
