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
import world.looin.server.ai.Task
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

    /**
     * 디시 갤러리에서 쓰는 이름: 대부분 유동닉 "ㅇㅇ(121.147)" (주민마다 IP 앞자리가 고정), 가끔 고닉(주민 이름).
     * 레딧에서는 주민 이름 그대로 (앱에서 u/ 를 붙여 보여준다).
     */
    fun displayName(space: Space, agent: Agent): String {
        if (space.style != "DC") return agent.name
        if (Random.nextDouble() < 0.3) return agent.name
        val h = agent.id.hashCode().let { if (it < 0) -it else it }
        return "ㅇㅇ(${listOf(1, 39, 58, 110, 118, 121, 175, 211, 223)[h % 9]}.${h / 9 % 256})"
    }

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
                        BrainRequest(system, turns = listOf(Turn(ChatRole.USER, Prompts.newPostInstruction(recent, space.style))), effort = Effort.LOW, maxTokens = 4_000, task = Task.COMMUNITY),
                    )
                    val o = JsonExtract.obj(out)
                    val title = o.str("title")?.trim().orEmpty()
                    val body = o.str("body")?.trim().orEmpty()
                    val tag = o.str("tag")?.trim()?.takeIf { it.startsWith("[") && it.length <= 8 }
                    if (title.isNotEmpty() && body.isNotEmpty()) newPosts += repo.createPost(space.id, actor.id, displayName(space, actor), title, body, tag)
                } else {
                    val target = pickPostToComment(recent, actor) ?: return@runCatching
                    val comments = repo.comments(target.id)
                    val existing = comments.map { "${it.authorName}: ${it.body}" }
                    // 레딧은 댓글에 답글을 다는 일이 많다
                    val parent = if (space.style == "REDDIT" && comments.isNotEmpty() && Random.nextDouble() < 0.4)
                        comments.filter { it.authorAgentId != actor.id }.randomOrNull() else null
                    val out = brain.complete(
                        BrainRequest(system, turns = listOf(Turn(ChatRole.USER, Prompts.commentInstruction(target, existing, parent?.let { "${it.authorName}: ${it.body}" }))), effort = Effort.LOW, maxTokens = 2_000, task = Task.COMMUNITY),
                    )
                    val body = JsonExtract.obj(out).str("body")?.trim().orEmpty()
                    if (body.isNotEmpty()) newComments += repo.createComment(target.id, actor.id, displayName(space, actor), body, parent?.id)
                }
            }.onFailure { log.warn("tick action failed: {}", it.message) }
        }
        castVotes(space, members)
        return TickResult(newPosts, newComments)
    }

    /** 주민들의 추천/비추천과 조회수 — AI 를 부르지 않는 가벼운 활동 (비용 없음). */
    fun castVotes(space: Space, members: List<Agent>) {
        val recent = repo.posts(space.id, 30)
        if (recent.isEmpty()) return
        repeat(members.size.coerceAtMost(8)) {
            val p = recent.random()
            val critic = Random.nextDouble() < if (space.style == "DC") 0.2 else 0.15
            repo.votePost(p.id, if (critic) -1 else 1)
            repo.comments(p.id).randomOrNull()?.let { repo.voteComment(it.id, if (Random.nextDouble() < 0.8) 1 else -1) }
        }
        if (space.style == "DC") recent.take(15).forEach { repo.addViews(it.id, Random.nextInt(1, 25)) }
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
                        effort = Effort.LOW, maxTokens = 2_000, task = Task.COMMUNITY,
                    ),
                )
                JsonExtract.obj(out).str("body")?.trim()?.takeIf { it.isNotEmpty() }
                    ?.let { repo.createComment(post.id, actor.id, displayName(space, actor), it) }
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
                    effort = Effort.LOW, maxTokens = 2_000, task = Task.COMMUNITY,
                ),
            )
            val lastOwner = repo.comments(post.id).lastOrNull { it.authorAgentId == null }
            JsonExtract.obj(out).str("body")?.trim()?.takeIf { it.isNotEmpty() }
                ?.let { repo.createComment(post.id, author.id, post.authorName, it, if (space.style == "REDDIT") lastOwner?.id else null) }
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
                    effort = Effort.MEDIUM, maxTokens = 8_000, task = Task.MEETING,
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
                effort = Effort.MEDIUM, maxTokens = 8_000, task = Task.MEETING_SUMMARY,
            ),
        ).trim()
        return repo.saveMeeting(space.id, topic, turns, summary)
    }
}
