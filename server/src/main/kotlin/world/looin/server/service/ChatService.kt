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
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.db.Repository
import world.looin.shared.ChatMode
import world.looin.shared.ChatRole
import world.looin.shared.ChatStreamEvent
import world.looin.shared.SendMessageRequest
import world.looin.shared.World

class NotFound(message: String) : Exception(message)

/** 라우터 출력(LIGHT / NORMAL / DEEP)을 일의 종류로. */
fun routerToTask(out: String): Task {
    val u = out.uppercase()
    return when {
        "DEEP" in u -> Task.CHAT_DEEP
        "LIGHT" in u -> Task.CHAT_LIGHT
        else -> Task.CHAT
    }
}

/** 1:1 대화. 응답을 스트리밍하고, 끝나면 백그라운드에서 기억을 추출한다. */
class ChatService(
    private val repo: Repository,
    private val brain: Brain,
    private val memory: MemoryService,
    private val background: CoroutineScope,
    private val files: FileService,
) {
    private val log = LoggerFactory.getLogger(ChatService::class.java)

    /** 최근 대화 몇 개까지 모델에 보낼지. 무료 등급은 분당 토큰 한도가 작아 짧게 유지한다. */
    private val historyLimit = 20

    /**
     * 대화 모드 → 일의 종류. AUTO 면 가벼운 모델(Haiku)에게 질문 난이도를 먼저 물어본다
     * (한 번에 0.1원 수준). 판단이 실패하면 평소 대화로.
     */
    private suspend fun chooseTask(req: SendMessageRequest, history: List<Turn>): Task = when (req.mode) {
        ChatMode.FAST -> Task.CHAT_LIGHT
        ChatMode.DEEP -> Task.CHAT_DEEP
        ChatMode.BEST -> Task.CHAT_BEST
        // Claude 를 지금 못 쓰면(예산·크레딧) 모델 선택이 의미 없으니 판단을 건너뛴다 — 무료 한도 절약.
        // 파일이 붙어 있으면 가벼운 모델 대신 최소 Sonnet 급으로
        ChatMode.AUTO -> if (req.attachmentIds.isNotEmpty()) {
            if (brain.info.providers.none { it.name == "claude" && it.available }) Task.CHAT
            else runCatching { routerToTask(routerAsk(req, history)) }.getOrDefault(Task.CHAT).let { if (it == Task.CHAT_LIGHT) Task.CHAT else it }
        } else if (brain.info.providers.none { it.name == "claude" && it.available }) Task.CHAT else runCatching {
            val context = history.dropLast(1).takeLast(2).joinToString("\n") { "${it.role}: ${it.text.take(300)}" }
            val out = brain.complete(
                BrainRequest(
                    stableSystem = Prompts.ROUTER_SYSTEM,
                    turns = listOf(Turn(ChatRole.USER, (if (context.isBlank()) "" else "이전 맥락:\n$context\n\n") + "새 메시지:\n${req.text.take(2000)}")),
                    effort = Effort.LOW, maxTokens = 1_000, task = Task.ROUTER,
                ),
            )
            routerToTask(out)
        }.getOrDefault(Task.CHAT)
    }

    private suspend fun routerAsk(req: SendMessageRequest, history: List<Turn>): String {
        val context = history.dropLast(1).takeLast(2).joinToString("\n") { "${it.role}: ${it.text.take(300)}" }
        return brain.complete(
            BrainRequest(
                stableSystem = Prompts.ROUTER_SYSTEM,
                turns = listOf(Turn(ChatRole.USER, (if (context.isBlank()) "" else "이전 맥락:\n$context\n\n") + "새 메시지 (파일 첨부됨):\n${req.text.take(2000)}")),
                effort = Effort.LOW, maxTokens = 1_000, task = Task.ROUTER,
            ),
        )
    }

    fun stream(world: World, req: SendMessageRequest): Flow<ChatStreamEvent> = flow {
        val agent = repo.agent(world.id, req.agentId) ?: throw NotFound("agent not found")
        val conv = req.conversationId?.let { repo.conversation(world.id, it) ?: throw NotFound("conversation not found") }
            ?: repo.createConversation(world.id, agent.id, req.text.take(30).replace('\n', ' '))

        val attached = req.attachmentIds.distinct().take(10).mapNotNull { files.info(world, it) }
        repo.addMessage(conv.id, ChatRole.USER, req.text, attachments = attached)
        emit(ChatStreamEvent(ChatStreamEvent.Type.START, conversationId = conv.id))

        val owner = repo.profile(world.id)
        val recent = repo.messages(conv.id).takeLast(historyLimit)
        // 첨부 파일은 최근 6개 메시지 안의 것만 실제로 넘기고, 그보다 오래된 건 이름만 남긴다 (비용 절약)
        val history = recent.mapIndexed { i, m ->
            if (m.attachments.isEmpty()) Turn(m.role, m.content)
            else if (i >= recent.size - 6) Turn(m.role, m.content, m.attachments.mapNotNull { files.load(world, it.id) })
            else Turn(m.role, m.content + "\n\n[첨부했던 파일: " + m.attachments.joinToString { it.name } + "]")
        }
        var usedBrain: String? = null
        val task = chooseTask(req, history)
        val brainReq = BrainRequest(
            stableSystem = Prompts.chatSystem(world, owner, agent),
            dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(40)),
            turns = history,
            maxTokens = 4_096,
            onProvider = { usedBrain = it },
            task = task,
            effort = if (task == Task.CHAT_DEEP || task == Task.CHAT_BEST) Effort.HIGH else Effort.MEDIUM,
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
            val note = if (attached.isEmpty()) "" else "\n(첨부한 파일: " + attached.joinToString { it.name } + ")"
            runCatching { memory.extractFromExchange(world, req.text + note, sb.toString()) }
                .onFailure { log.warn("memory extraction failed: {}", it.message) }
        }
    }
}
