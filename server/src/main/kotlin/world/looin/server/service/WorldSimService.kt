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
 * 세계 시뮬레이션: 커뮤니티 주민들의 활동(글/댓글/답글/추천)과 회사 회의.
 * 언제 움직일지는 CommunityPulse 가 정한다 (시간대별로 랜덤하게, 내 글엔 시간차를 두고 반응).
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

    private fun members(world: World, space: Space) = repo.agents(world.id).filter { it.id in space.memberAgentIds }

    /** 주민 한 명의 요청. 주민들도 아카엘이 이해한 루인(성찰·기억)을 알고 있다 — 내가 한 말이 커뮤니티에도 퍼진다. */
    private fun actorRequest(world: World, space: Space, actor: Agent, instruction: String, maxTokens: Long) = BrainRequest(
        Prompts.communityActorSystem(world, repo.profile(world.id), space, actor),
        dynamicSystem = Prompts.understandingBlock(repo.latestInsight(world.id), repo.memories(world.id).take(30)),
        turns = listOf(Turn(ChatRole.USER, instruction)),
        effort = Effort.LOW, maxTokens = maxTokens, task = Task.COMMUNITY,
    )

    /** 주민이 글을 하나 쓴다. 게시판(서브레딧/갤러리)을 골라 그 주제에 맞게. */
    suspend fun writePost(world: World, space: Space, actor: Agent): Post? {
        val boards = repo.boards(space.id)
        val board = if (boards.isEmpty()) null else if (Random.nextDouble() < 0.3) boards.first() else boards.random()
        val recent = repo.posts(space.id, 20, board?.id)
        val instruction = (board?.let { "게시판: ${it.name} — ${it.description}\n이 게시판 주제에 맞는 글이어야 한다.\n\n" } ?: "") +
            Prompts.newPostInstruction(recent, space.style)
        val o = JsonExtract.obj(brain.complete(actorRequest(world, space, actor, instruction, 4_000)))
        val title = o.str("title")?.trim().orEmpty()
        val body = o.str("body")?.trim().orEmpty()
        val tag = o.str("tag")?.trim()?.takeIf { it.startsWith("[") && it.length <= 8 }
        if (title.isEmpty() || body.isEmpty()) return null
        repo.logActivity(space.id)
        return repo.createPost(space.id, actor.id, displayName(space, actor), title, body, tag, board?.id)
    }

    /** 주민이 댓글(또는 답글)을 단다. 내 글/내 댓글에 달리면 앱 알림이 생긴다. */
    suspend fun writeComment(world: World, space: Space, actor: Agent, post: Post, parent: Comment?): Comment? {
        val existing = repo.comments(post.id).map { "${it.authorName}: ${it.body}" }
        val note = if (parent?.authorAgentId == null && parent != null) "\n(답글 대상은 이 세계의 주인공, 루인 본인이다.)" else ""
        val body = JsonExtract.obj(
            brain.complete(actorRequest(world, space, actor, Prompts.commentInstruction(post, existing, parent?.let { "${it.authorName}: ${it.body}" }) + note, 2_000)),
        ).str("body")?.trim().orEmpty()
        if (body.isEmpty()) return null
        val name = if (actor.id == post.authorAgentId) post.authorName else displayName(space, actor)
        val c = repo.createComment(post.id, actor.id, name, body, parent?.id)
        repo.logActivity(space.id)
        when {
            parent != null && parent.authorAgentId == null -> repo.addNotice(
                world.id, "REPLY", "↩ ${if (space.style == "DC") name else "u/$name"} 님이 내 댓글에 답글", body, post.id, space.style, space.id,
            )
            post.authorAgentId == null -> repo.addNotice(
                world.id, "COMMENT", "💬 '${post.title.take(24)}'에 새 댓글", "${if (space.style == "DC") name else "u/$name"}: $body", post.id, space.style, space.id,
            )
        }
        return c
    }

    /** 자발적 활동 한 번: 새 글 / 댓글 / 답글 중 하나. */
    suspend fun act(world: World, space: Space): Any? {
        val ms = members(world, space)
        if (ms.isEmpty()) return null
        val actor = ms.random()
        val recent = repo.posts(space.id, 30)
        val r = Random.nextDouble()
        return when {
            recent.size < 3 || r < 0.3 -> writePost(world, space, actor)
            else -> {
                val post = pickPostToComment(recent, actor) ?: return writePost(world, space, actor)
                val comments = repo.comments(post.id)
                val parent = if (comments.isNotEmpty() && Random.nextDouble() < (if (space.style == "REDDIT") 0.4 else 0.15))
                    comments.filter { it.authorAgentId != actor.id }.randomOrNull() else null
                writeComment(world, space, actor, post, parent)
            }
        }
    }

    /** 앱의 "빨리감기": 지금 바로 몇 번 활동시킨다. */
    suspend fun tick(world: World, space: Space, actions: Int): TickResult {
        val newPosts = mutableListOf<Post>()
        val newComments = mutableListOf<Comment>()
        repeat(actions.coerceIn(1, 10)) {
            runCatching { act(world, space) }.onSuccess {
                when (it) { is Post -> newPosts += it; is Comment -> newComments += it }
            }.onFailure { log.warn("tick action failed: {}", it.message) }
        }
        castVotes(space, members(world, space))
        return TickResult(newPosts, newComments)
    }

    /** 주민들의 추천/비추천과 조회수 — AI 를 부르지 않는 가벼운 활동 (비용 없음). */
    fun castVotes(space: Space, members: List<Agent>, rounds: Int = members.size.coerceAtMost(8)) {
        val recent = repo.posts(space.id, 30)
        if (recent.isEmpty()) return
        repeat(rounds) {
            val p = recent.random()
            val critic = Random.nextDouble() < if (space.style == "DC") 0.2 else 0.15
            repo.votePost(p.id, if (critic) -1 else 1)
            repo.comments(p.id).randomOrNull()?.let { repo.voteComment(it.id, if (Random.nextDouble() < 0.8) 1 else -1) }
        }
        if (space.style == "DC") recent.take(15).forEach { repo.addViews(it.id, Random.nextInt(0, 6)) }
    }

    private fun pickPostToComment(recent: List<Post>, actor: Agent): Post? {
        val candidates = recent.filter { it.authorAgentId != actor.id }.take(12)
        if (candidates.isEmpty()) return null
        // 댓글이 적은 글, 그리고 루인이 쓴 글에 더 끌린다
        return candidates.firstOrNull { it.authorAgentId == null && it.commentCount < 4 && Random.nextDouble() < 0.5 }
            ?: candidates.minByOrNull { it.commentCount + Random.nextInt(0, 4) }
    }

    // ───────── 내가 글/댓글을 쓰면: 바로가 아니라 사람처럼 시간차를 두고 반응이 온다 ─────────

    /** 내 글: 3분~1시간 반 사이에 주민 2~4명이 띄엄띄엄 댓글을 단다. */
    fun ownerPosted(world: World, space: Space, post: Post) {
        val now = System.currentTimeMillis()
        val ms = members(world, space).shuffled().take(Random.nextInt(2, 5))
        var t = now
        ms.forEach { a ->
            t += Random.nextLong(3, 35) * 60_000L
            repo.schedule(world.id, space.id, "COMMENT", post.id, null, a.id, t)
        }
    }

    /** 내 댓글: AI 글쓴이가 2~40분 뒤 답글, 가끔 다른 주민도 끼어든다. */
    fun ownerCommented(world: World, space: Space, post: Post, comment: Comment) {
        val now = System.currentTimeMillis()
        post.authorAgentId?.let { repo.schedule(world.id, space.id, "REPLY", post.id, comment.id, it, now + Random.nextLong(2, 40) * 60_000L) }
        if (Random.nextDouble() < 0.35) {
            members(world, space).filter { it.id != post.authorAgentId }.randomOrNull()?.let {
                repo.schedule(world.id, space.id, "REPLY", post.id, comment.id, it.id, now + Random.nextLong(10, 90) * 60_000L)
            }
        }
    }

    /** 때가 된 예약 반응을 실행한다. */
    suspend fun runScheduled(world: World, task: Repository.Scheduled) {
        val space = repo.space(world.id, task.spaceId) ?: return
        val post = repo.post(world.id, task.postId) ?: return
        val actor = task.agentId?.let { repo.agent(world.id, it) } ?: members(world, space).randomOrNull() ?: return
        val parent = task.commentId?.let { id -> repo.comments(post.id).firstOrNull { it.id == id } }
        writeComment(world, space, actor, post, parent)
        if (Random.nextDouble() < 0.7) repo.votePost(post.id, 1)
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
