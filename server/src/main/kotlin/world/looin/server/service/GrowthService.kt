package world.looin.server.service

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Effort
import world.looin.server.ai.Prompts
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.db.Repository
import world.looin.shared.ChatRole
import world.looin.shared.GrowthStatus
import world.looin.shared.Insight
import world.looin.shared.LooinJson
import world.looin.shared.SpaceType
import world.looin.shared.World

/**
 * 성장 시스템.
 *  1) 기억   — 대화마다 나에 대한 사실을 쌓는다 (MemoryService).
 *  2) 성찰   — 쌓인 기억과 최근 대화를 되돌아보며 "AI 가 이해한 나"를 새 버전으로 다시 쓴다.
 *              최신 버전은 모든 AI 의 대화에 들어간다. 버전 기록이 곧 성장 기록.
 *  3) 학습   — 내 대화를 학습 데이터(JSONL)로 내보내, 무료 GPU(Kaggle/Colab)에서
 *              공개 모델을 "나처럼" 파인튜닝할 수 있게 한다 (docs/GROWTH.md).
 *  + 자동 세계 — 서버가 켜져 있는 동안 주기적으로 주민 활동과 성찰을 스스로 돌린다.
 */
class GrowthService(
    private val repo: Repository,
    private val brain: Brain,
    private val sim: WorldSimService,
    private val autoHours: Double,
) {
    private val log = LoggerFactory.getLogger(GrowthService::class.java)
    @Volatile var nextAutoRunAt: Long? = null; private set

    fun status(world: World) = GrowthStatus(
        latest = repo.latestInsight(world.id),
        versions = repo.insights(world.id).size,
        memories = repo.memories(world.id).size,
        trainingExamples = repo.ownerReplyPairs(world.id).size,
        autoWorld = autoHours > 0 && brain.info.online,
        nextAutoRunAt = nextAutoRunAt,
    )

    suspend fun reflect(world: World): Insight {
        val owner = repo.profile(world.id)
        val memories = repo.memories(world.id)
        val previous = repo.latestInsight(world.id)
        val recent = repo.recentOwnerMessages(world.id, 40).reversed()
        val material = buildString {
            appendLine("## 프로필"); appendLine(Prompts.ownerBlock(owner)); appendLine()
            appendLine("## 기억 (${memories.size}개)")
            memories.take(200).forEach { appendLine("- [${it.category}] ${it.content}") }
            appendLine()
            if (recent.isNotEmpty()) {
                appendLine("## 소유자가 최근에 한 말 (말투·관심사 참고)")
                recent.forEach { appendLine("- ${it.take(300)}") }
                appendLine()
            }
            appendLine("## 이전 버전의 이해 (v${previous?.version ?: 0})")
            appendLine(previous?.content ?: "(처음 쓰는 것이다)")
        }
        val text = brain.complete(
            BrainRequest(
                stableSystem = Prompts.reflectionSystem(owner),
                turns = listOf(Turn(ChatRole.USER, material)),
                effort = Effort.HIGH,
                maxTokens = 4_000,
                task = Task.REFLECTION,
            ),
        ).trim()
        require(text.isNotEmpty()) { "성찰 결과가 비어 있습니다" }
        return repo.addInsight(world.id, text, memories.size)
    }

    /** 성찰이 필요한가: 마지막 성찰 이후 기억이 5개 이상 늘었을 때. */
    fun needsReflection(world: World): Boolean {
        val last = repo.latestInsight(world.id)
        val count = repo.memories(world.id).size
        return count - (last?.basedOnMemories ?: 0) >= 5
    }

    /** 내 말투를 배우는 학습 데이터: 대화 형식 JSONL (OpenAI/HF chat 포맷, Unsloth 등에서 바로 사용). */
    fun exportTrainingJsonl(world: World): String {
        val owner = repo.profile(world.id)
        val system = "너는 ${Prompts.ownerName(owner)} 본인이다. 그 사람의 생각과 말투 그대로 대답한다."
        return repo.ownerReplyPairs(world.id).joinToString("\n") { (prompt, reply) ->
            LooinJson.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    putJsonArray("messages") {
                        addJsonObject { put("role", "system"); put("content", system) }
                        addJsonObject { put("role", "user"); put("content", prompt) }
                        addJsonObject { put("role", "assistant"); put("content", reply) }
                    }
                },
            )
        }
    }

    /** 서버가 켜져 있는 동안 세계가 스스로 움직인다. 무료 한도를 아끼려고 간격·활동 수를 작게 잡는다. */
    fun startAutoWorld(scope: CoroutineScope) {
        if (autoHours <= 0) return
        val periodMs = (autoHours * 3_600_000).toLong()
        scope.launch {
            delay(60_000) // 서버 시작 직후는 피한다
            while (true) {
                // 두뇌 키가 아직 없으면(오프라인) 이번 회차는 쉰다 — 앱에서 키를 넣으면 다음 회차부터 움직인다.
                if (brain.info.online) for (world in repo.allWorlds()) {
                    runCatching {
                        repo.spaces(world.id).filter { it.type == SpaceType.COMMUNITY }.forEach { sim.tick(world, it, 2) }
                        if (needsReflection(world)) reflect(world)
                    }.onFailure { log.warn("auto world failed: {}", it.message) }
                }
                nextAutoRunAt = System.currentTimeMillis() + periodMs
                delay(periodMs)
            }
        }
        nextAutoRunAt = System.currentTimeMillis() + 60_000
    }
}
