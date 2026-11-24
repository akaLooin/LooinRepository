package world.looin.server.service

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Effort
import world.looin.server.ai.Prompts
import world.looin.server.ai.Turn
import world.looin.server.db.Repository
import world.looin.shared.ChatRole
import world.looin.shared.ChatStreamEvent
import world.looin.shared.SendMessageRequest
import world.looin.shared.World

class NotFound(message: String) : Exception(message)

/** 1:1 대화. 응답을 스트리밍하고, 끝나면 백그라운드에서 기억을 추출한다. */
class ChatService(
    private val repo: Repository,
    private val brain: Brain,
    private val memory: MemoryService,
    private val background: CoroutineScope,
) {
    private val log = LoggerFactory.getLogger(ChatService::class.java)

    /** 최근 대화 몇 턴까지 모델에 보낼지. (Opus 5.5 는 1M 컨텍스트지만 비용·속도를 위해 제한) */
    private val historyLimit = 60

    fun stream(world: World, req: SendMessageRequest): Flow<ChatStreamEvent> = flow {
        val agent = repo.agent(world.id, req.agentId) ?: throw NotFound("agent not found")
        val conv = req.conversationId?.let { repo.conversation(world.id, it) ?: throw NotFound("conversation not found") }
            ?: repo.createConversation(world.id, agent.id, req.text.take(30).replace('\n', ' '))

        repo.addMessage(conv.id, ChatRole.USER, req.text)
        emit(ChatStreamEvent(ChatStreamEvent.Type.START, conversationId = conv.id))

        val owner = repo.profile(world.id)
        val history = repo.messages(conv.id).takeLast(historyLimit).map { Turn(it.role, it.content) }
        val brainReq = BrainRequest(
            stableSystem = Prompts.chatSystem(world, owner, agent),
            dynamicSystem = Prompts.memoryBlock(repo.memories(world.id)),
            turns = history,
            effort = Effort.MEDIUM,
            maxTokens = 32_000,
        )

        val sb = StringBuilder()
        try {
            brain.stream(brainReq).collect { piece ->
                sb.append(piece)
                emit(ChatStreamEvent(ChatStreamEvent.Type.DELTA, conversationId = conv.id, text = piece))
            }
        } catch (e: Exception) {
            log.error("chat stream failed", e)
            if (sb.isNotEmpty()) repo.addMessage(conv.id, ChatRole.ASSISTANT, sb.toString())
            emit(ChatStreamEvent(ChatStreamEvent.Type.ERROR, conversationId = conv.id, text = e.message ?: e.toString()))
            return@flow
        }
        val saved = repo.addMessage(conv.id, ChatRole.ASSISTANT, sb.toString())
        emit(ChatStreamEvent(ChatStreamEvent.Type.DONE, conversationId = conv.id, message = saved))

        background.launch {
            runCatching { memory.extractFromExchange(world, req.text, sb.toString()) }
                .onFailure { log.warn("memory extraction failed: {}", it.message) }
        }
    }
}
