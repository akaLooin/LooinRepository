package world.looin.server.service

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Effort
import world.looin.server.ai.JsonExtract
import world.looin.server.ai.Prompts
import world.looin.server.ai.Task
import world.looin.server.ai.Turn
import world.looin.server.ai.str
import world.looin.server.db.Repository
import world.looin.shared.ChatRole
import world.looin.shared.Memory
import world.looin.shared.World

/**
 * 장기 기억. 지금은 "중요도 + 최신순" 상위 N개를 프롬프트에 넣는 단순한 방식.
 * 기억이 많아지면 임베딩 검색(관련 기억만 꺼내기)으로 교체한다 — 인터페이스는 그대로 둔다.
 */
class MemoryService(private val repo: Repository, private val brain: Brain) {

    /** 쌓인 기억과 이해로 프로필을 다시 정리한다 (서사 답변 뒤, 성찰 뒤). 이름·닉네임은 건드리지 않는다. */
    suspend fun synthesizeProfile(world: World) {
        if (!brain.info.online) return
        val owner = repo.profile(world.id)
        val out = brain.complete(
            BrainRequest(
                stableSystem = Prompts.profileSynthesisSystem(owner),
                dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(150)),
                turns = listOf(Turn(ChatRole.USER, "지금 프로필:\n${Prompts.ownerBlock(owner)}\n\n새로 정리한 프로필 JSON:")),
                effort = Effort.LOW, maxTokens = 3_000, task = Task.PROFILE,
            ),
        )
        val o = JsonExtract.obj(out) ?: return
        fun pick(key: String, old: String) = o.str(key)?.trim()?.takeIf { it.isNotEmpty() } ?: old
        repo.saveProfile(
            world.id,
            owner.copy(
                bio = pick("bio", owner.bio), values = pick("values", owner.values), interests = pick("interests", owner.interests),
                goals = pick("goals", owner.goals), speakingStyle = pick("speakingStyle", owner.speakingStyle),
            ),
        )
    }

    suspend fun extractFromExchange(world: World, userText: String, assistantText: String): List<Memory> {
        if (userText.isBlank() || !brain.info.online) return emptyList()
        val owner = repo.profile(world.id)
        val known = repo.memories(world.id).take(100).joinToString("\n") { "- ${it.content}" }
        val out = brain.complete(
            BrainRequest(
                stableSystem = Prompts.memoryExtractionSystem(owner) + "\n\nJSON 배열 형식만 출력.",
                dynamicSystem = if (known.isBlank()) "" else "이미 알고 있는 사실:\n$known",
                turns = listOf(Turn(ChatRole.USER, "소유자: $userText\n\nAI: ${assistantText.take(4000)}")),
                effort = Effort.LOW,
                maxTokens = 4_000,
                task = Task.MEMORY,
            ),
        )
        val items = JsonExtract.arr(out) ?: return emptyList()
        return items.mapNotNull { el ->
            val content = el.str("content")?.trim().orEmpty()
            if (content.isEmpty()) return@mapNotNull null
            val importance = ((el as? JsonObject)?.get("importance") as? JsonPrimitive)?.intOrNull ?: 3
            repo.addMemory(world.id, el.str("category") ?: "기타", content, "chat", importance)
        }
    }
}
