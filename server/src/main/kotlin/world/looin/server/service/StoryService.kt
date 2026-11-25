package world.looin.server.service

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Effort
import world.looin.server.ai.Prompts
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.db.Repository
import world.looin.shared.AgentKind
import world.looin.shared.ChatMessage
import world.looin.shared.ChatRole
import world.looin.shared.Conversation
import world.looin.shared.Inbox
import world.looin.shared.NarrativeQuestion
import world.looin.shared.World
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.random.Random

/**
 * 나의 서사 쌓기 + 아카엘이 먼저 말 걸기.
 *  - 서사: 아카엘이 질문 하나를 던지고, 소유자는 채팅처럼 (파일도 붙여서) 답한다. 답이 쌓이면 기억·프로필이 자란다.
 *  - 먼저 말 걸기: 소유자가 앱을 쓰지 않을 때, 낮 시간에 가끔 질문·최신 이슈·제안을 보낸다.
 *    아카엘이 성장할수록(기억·성찰·서사가 쌓일수록) 더 자주, 더 다양하게.
 */
class StoryService(
    private val repo: Repository,
    private val brain: Brain,
    private val zone: ZoneId,
    private val proactiveEnabled: Boolean,
) {
    private val log = LoggerFactory.getLogger(StoryService::class.java)

    companion object {
        const val NARRATIVE = "NARRATIVE"
        const val PROACTIVE = "PROACTIVE"
    }

    private fun coreAgent(world: World) = repo.agents(world.id).first { it.kind == AgentKind.CORE }

    private fun conversationOf(world: World, kind: String, title: String): Conversation =
        repo.conversationOfKind(world.id, kind) ?: repo.createConversation(world.id, coreAgent(world).id, title, kind)

    // ───────────── 나의 서사 쌓기 ─────────────

    suspend fun nextQuestion(world: World): NarrativeQuestion {
        val conv = conversationOf(world, NARRATIVE, "📖 나의 서사")
        val owner = repo.profile(world.id)
        val history = repo.messages(conv.id)
        val asked = history.filter { it.role == ChatRole.ASSISTANT }.map { it.content.lineSequence().first().take(150) }
        var used: String? = null
        val q = brain.complete(
            BrainRequest(
                stableSystem = Prompts.narrativeQuestionSystem(owner),
                dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(80)),
                turns = listOf(
                    Turn(
                        ChatRole.USER,
                        "프로필:\n${Prompts.ownerBlock(owner)}\n\n" +
                            (if (asked.isEmpty()) "아직 던진 질문이 없다. 첫 질문이다." else "이미 던진 질문:\n" + asked.takeLast(40).joinToString("\n") { "- $it" }) +
                            "\n\n다음 질문 하나:",
                    ),
                ),
                task = Task.NARRATIVE, effort = Effort.MEDIUM, maxTokens = 2_000,
                onProvider = { used = it },
            ),
        ).trim()
        require(q.isNotBlank()) { "질문을 만들지 못했어요" }
        val msg = repo.addMessage(conv.id, ChatRole.ASSISTANT, q, used)
        return NarrativeQuestion(conv.id, msg, history.count { it.role == ChatRole.USER })
    }

    // ───────────── 먼저 말 걸기 ─────────────

    /** 성장 단계 0~5: 기억·성찰·서사 답변이 쌓일수록 올라간다. */
    fun growthLevel(world: World): Int {
        val memories = repo.memories(world.id).size
        val insights = repo.insights(world.id).size
        val answers = repo.conversationOfKind(world.id, NARRATIVE)?.let { c -> repo.messages(c.id).count { it.role == ChatRole.USER } } ?: 0
        return (memories / 8 + insights + answers / 3).coerceIn(0, 5)
    }

    fun inbox(world: World): Inbox {
        val conv = repo.conversationOfKind(world.id, PROACTIVE) ?: return Inbox(null, 0, emptyList())
        return Inbox(conv.id, conv.unread, repo.messages(conv.id).filter { it.role == ChatRole.ASSISTANT }.takeLast(5))
    }

    /**
     * 보낼 때가 되었으면 한 통 보낸다. force=true 면 시간·빈도 조건을 건너뛴다 (앱의 "지금 말 걸어줘").
     * @return 보낸 메시지, 안 보냈으면 null
     */
    suspend fun maybeReachOut(world: World, force: Boolean = false): ChatMessage? {
        if (!brain.info.online) return null
        val now = ZonedDateTime.now(zone)
        val nowMs = now.toInstant().toEpochMilli()
        val level = growthLevel(world)
        val perDay = 1 + level / 2                                   // 하루 1~3번
        val conv = conversationOf(world, PROACTIVE, "✨ 아카엘이 먼저")
        val sent = repo.messages(conv.id).filter { it.role == ChatRole.ASSISTANT }
        if (!force) {
            if (now.hour < 9 || now.hour >= 22) return null           // 밤에는 조용히
            if (nowMs - repo.lastOwnerMessageAt(world.id) < 90 * 60_000L) return null  // 지금 앱을 쓰는 중이면 방해하지 않음
            val todayStart = now.toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli()
            if (sent.count { it.createdAt >= todayStart } >= perDay) return null
            val gap = (13 * 3_600_000L) / perDay
            if (nowMs - (sent.lastOrNull()?.createdAt ?: 0L) < gap) return null
            if (Random.nextDouble() > 0.2) return null               // 정해진 시각이 아니라 가끔, 불쑥
        }
        val claudeOk = brain.info.providers.any { it.name == "claude" && it.available }
        val kind = when {
            level == 0 -> "QUESTION"
            else -> {
                val r = Random.nextDouble()
                when {
                    r < 0.3 && claudeOk -> "NEWS"
                    r < 0.55 -> "SUGGESTION"
                    else -> "QUESTION"
                }
            }
        }
        val owner = repo.profile(world.id)
        val core = coreAgent(world)
        val time = now.format(DateTimeFormatter.ofPattern("M월 d일 EEEE a h시", Locale.KOREAN))
        var used: String? = null
        val text = brain.complete(
            BrainRequest(
                stableSystem = Prompts.chatSystem(world, owner, core),
                dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(40)),
                turns = listOf(Turn(ChatRole.USER, Prompts.proactiveInstruction(kind, sent.map { it.content }, time))),
                task = Task.PROACTIVE, effort = Effort.MEDIUM, maxTokens = 3_000,
                webSearch = kind == "NEWS",
                onProvider = { used = it },
            ),
        ).trim()
        if (text.isBlank()) return null
        val msg = repo.addMessage(conv.id, ChatRole.ASSISTANT, text, used)
        repo.addUnread(conv.id)
        log.info("아카엘이 먼저 말을 걸었습니다 ({}, 성장 단계 {})", kind, level)
        return msg
    }

    fun start(scope: CoroutineScope) {
        if (!proactiveEnabled) return
        scope.launch {
            delay(5 * 60_000L)
            while (true) {
                for (world in repo.allWorlds()) runCatching { maybeReachOut(world) }.onFailure { log.warn("reach out failed: {}", it.message) }
                delay(20 * 60_000L)
            }
        }
    }
}
