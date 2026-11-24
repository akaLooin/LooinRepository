package world.looin.server.service

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import org.slf4j.LoggerFactory
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Effort
import world.looin.server.ai.JsonExtract
import world.looin.server.ai.Prompts
import world.looin.server.ai.Turn
import world.looin.server.ai.str
import world.looin.server.db.Repository
import world.looin.shared.Agent
import world.looin.shared.ChatRole
import world.looin.shared.Comment
import world.looin.shared.Meeting
import world.looin.shared.MeetingTurn
import world.looin.shared.Post
import world.looin.shared.Space
import world.looin.shared.TickResult
import world.looin.shared.World
import kotlin.random.Random

/**
 * 세계 시뮬레이션: 커뮤니티 주민들의 자발적 활동(글/댓글)과, 회사·포럼의 회의.
 * 비용을 통제하기 위해 자동 실행은 하지 않고 앱에서 요청할 때만 돌린다.
 * (나중에 스케줄러로 "하루 n번 세계가 움직이게" 할 수 있다.)
 */
class WorldSimService(private val repo: Repository, private val brain: Brain) {
    private val log = LoggerFactory.getLogger(WorldSimService::class.java)

    suspend fun tick(world: World, space: Space, actions: Int): TickResult {
        val members = repo.agents(world.id).filter { it.id in space.memberAgentIds }
        if (members.isEmpty()) return TickResult(emptyList(), emptyList())
        val owner = repo.profile(world.id)
        val newPosts = mutableListOf<Post>()
        val newComments = mutableListOf<Comment>()

        repeat(actions.coerceIn(1, 10)) {
            val actor = members.random()
            val recent = repo.posts(space.id, 30)
            // 글이 적으면 새 글 위주, 많으면 댓글 위주로.
            val writePost = recent.size < 3 || Random.nextDouble() < 0.35
            val system = Prompts.communityActorSystem(world, owner, space, actor)
            runCatching {
                if (writePost) {
                    val out = brain.complete(
                        BrainRequest(system, turns = listOf(Turn(ChatRole.USER, Prompts.newPostInstruction(recent))), effort = Effort.LOW, maxTokens = 4_000),
                    )
                    val o = JsonExtract.obj(out)
                    val title = o.str("title")?.trim().orEmpty()
                    val body = o.str("body")?.trim().orEmpty()
                    if (title.isNotEmpty() && body.isNotEmpty()) newPosts += repo.createPost(space.id, actor.id, actor.name, title, body)
                } else {
                    val target = pickPostToComment(recent, actor) ?: return@runCatching
                    val existing = repo.comments(target.id).map { "${it.authorName}: ${it.body}" }
                    val out = brain.complete(
                        BrainRequest(system, turns = listOf(Turn(ChatRole.USER, Prompts.commentInstruction(target, existing))), effort = Effort.LOW, maxTokens = 2_000),
                    )
                    val body = JsonExtract.obj(out).str("body")?.trim().orEmpty()
                    if (body.isNotEmpty()) newComments += repo.createComment(target.id, actor.id, actor.name, body)
                }
            }.onFailure { log.warn("tick action failed: {}", it.message) }
        }
        return TickResult(newPosts, newComments)
    }

    private fun pickPostToComment(recent: List<Post>, actor: Agent): Post? {
        val candidates = recent.filter { it.authorAgentId != actor.id }.take(10)
        if (candidates.isEmpty()) return null
        // 소유자가 쓴 글(authorAgentId == null)에 우선적으로 반응한다.
        return candidates.firstOrNull { it.authorAgentId == null && it.commentCount < 3 } ?: candidates.random()
    }

    /** 소유자가 직접 글을 쓰면 주민 몇 명이 바로 반응한다. */
    suspend fun reactToOwnerPost(world: World, space: Space, post: Post, reactions: Int = 2): List<Comment> {
        val members = repo.agents(world.id).filter { it.id in space.memberAgentIds }.shuffled().take(reactions)
        val owner = repo.profile(world.id)
        return members.mapNotNull { actor ->
            runCatching {
                val existing = repo.comments(post.id).map { "${it.authorName}: ${it.body}" }
                val out = brain.complete(
                    BrainRequest(
                        Prompts.communityActorSystem(world, owner, space, actor),
                        turns = listOf(Turn(ChatRole.USER, Prompts.commentInstruction(post, existing))),
                        effort = Effort.LOW, maxTokens = 2_000,
                    ),
                )
                JsonExtract.obj(out).str("body")?.trim()?.takeIf { it.isNotEmpty() }
                    ?.let { repo.createComment(post.id, actor.id, actor.name, it) }
            }.getOrNull()
        }
    }

    /** 내가 AI 의 글에 댓글을 달면 글쓴이가 답글을 단다. */
    suspend fun replyAsAuthor(world: World, space: Space, post: Post): Comment? {
        val author = post.authorAgentId?.let { repo.agent(world.id, it) } ?: return null
        val owner = repo.profile(world.id)
        return runCatching {
            val existing = repo.comments(post.id).map { "${it.authorName}: ${it.body}" }
            val out = brain.complete(
                BrainRequest(
                    Prompts.communityActorSystem(world, owner, space, author),
                    turns = listOf(Turn(ChatRole.USER, Prompts.commentInstruction(post, existing) + "\n너는 이 글의 작성자다. 마지막 댓글(소유자)에 답하라.")),
                    effort = Effort.LOW, maxTokens = 2_000,
                ),
            )
            JsonExtract.obj(out).str("body")?.trim()?.takeIf { it.isNotEmpty() }
                ?.let { repo.createComment(post.id, author.id, author.name, it) }
        }.getOrNull()
    }

    /**
     * 회의: 구성원들이 순서대로 발언(앞사람 발언을 듣고) → 서기가 요약.
     * 첫 라운드는 각자 독립된 관점을 내도록 병렬로, 이후 라운드는 순차로 진행한다.
     */
    suspend fun meeting(world: World, space: Space, topic: String, rounds: Int): Meeting {
        val members = repo.agents(world.id).filter { it.id in space.memberAgentIds }
        require(members.isNotEmpty()) { "이 공간에는 구성원이 없습니다" }
        val owner = repo.profile(world.id)
        val turns = mutableListOf<MeetingTurn>()

        fun transcript() = turns.joinToString("\n\n") { "[${it.agentName} / ${it.role}]\n${it.content}" }

        suspend fun speak(agent: Agent, round: Int): MeetingTurn {
            val instruction = buildString {
                appendLine("회의 안건: $topic")
                if (round == 0) appendLine("\n첫 발언이다. 너의 역할 관점에서 의견을 내라.")
                else appendLine("\n지금까지의 회의록:\n${transcript()}\n\n앞선 발언을 듣고 너의 두 번째 의견을 내라.")
            }
            val text = brain.complete(
                BrainRequest(
                    Prompts.meetingSpeakerSystem(world, owner, space, agent),
                    turns = listOf(Turn(ChatRole.USER, instruction)),
                    effort = Effort.MEDIUM, maxTokens = 8_000,
                ),
            ).trim()
            return MeetingTurn(agent.id, agent.name, agent.role, text)
        }

        coroutineScope { turns += members.map { async { speak(it, 0) } }.awaitAll() }
        for (r in 1 until rounds.coerceIn(1, 3)) for (m in members) turns += speak(m, r)

        val summary = brain.complete(
            BrainRequest(
                Prompts.meetingSummarySystem(world, owner, space),
                turns = listOf(Turn(ChatRole.USER, "안건: $topic\n\n회의록:\n${transcript()}")),
                effort = Effort.MEDIUM, maxTokens = 8_000,
            ),
        ).trim()
        return repo.saveMeeting(space.id, topic, turns, summary)
    }
}
