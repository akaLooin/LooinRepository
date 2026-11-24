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

    /** 최근 대화 몇 개까지 모델에 보낼지. 무료 등급은 분당 토큰 한도가 작아 짧게 유지한다. */
    private val historyLimit = 20

    fun stream(world: World, req: SendMessageRequest): Flow<ChatStreamEvent> = flow {
        val agent = repo.agent(world.id, req.agentId) ?: throw NotFound("agent not found")
        val conv = req.conversationId?.let { repo.conversation(world.id, it) ?: throw NotFound("conversation not found") }
            ?: repo.createConversation(world.id, agent.id, req.text.take(30).replace('\n', ' '))

        repo.addMessage(conv.id, ChatRole.USER, req.text)
        emit(ChatStreamEvent(ChatStreamEvent.Type.START, conversationId = conv.id))

        val owner = repo.profile(world.id)
        val history = repo.messages(conv.id).takeLast(historyLimit).map { Turn(it.role, it.content) }
        var usedBrain: String? = null
        val brainReq = BrainRequest(
            stableSystem = Prompts.chatSystem(world, owner, agent),
            dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(40)),
            turns = history,
            effort = Effort.MEDIUM,
            maxTokens = 4_096,
            onProvider = { usedBrain = it },
        )

        val sb = StringBuilder()
        try {
            brain.stream(brainReq).collect { piece ->
                sb.append(piece)
                emit(ChatStreamEvent(ChatStreamEvent.Type.DELTA, conversationId = conv.id, text = piece))
            }
        } catch (e: Exception) {
            log.error("chat stream failed", e)
            if (sb.isNotEmpty()) repo.addMessage(conv.id, ChatRole.ASSISTANT, sb.toString(), usedBrain)
            emit(ChatStreamEvent(ChatStreamEvent.Type.ERROR, conversationId = conv.id, text = e.message ?: e.toString()))
            return@flow
        }
        val saved = repo.addMessage(conv.id, ChatRole.ASSISTANT, sb.toString(), usedBrain)
        emit(ChatStreamEvent(ChatStreamEvent.Type.DONE, conversationId = conv.id, message = saved))

        background.launch {
            runCatching { memory.extractFromExchange(world, req.text, sb.toString()) }
                .onFailure { log.warn("memory extraction failed: {}", it.message) }
        }
    }
}
