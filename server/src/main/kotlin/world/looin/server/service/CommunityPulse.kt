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
import world.looin.shared.ChatRole
import world.looin.shared.Digest
import world.looin.shared.Space
import world.looin.shared.SpaceType
import world.looin.shared.World
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.random.Random

/**
 * 커뮤니티의 시계. 진짜 사람들이 있는 곳처럼:
 *  - 시간대마다 활동량이 다르다 (새벽엔 뜸하고 저녁엔 북적임). 4분마다 주사위를 굴려 글·댓글·답글이 불쑥 올라온다.
 *  - 내 글·댓글에 대한 반응은 예약된 시각(몇 분~한 시간 뒤)에 하나씩 도착한다.
 *  - 매일 밤 9시쯤, 그날 커뮤니티에서 나온 이야기를 요약해 알림으로 보낸다.
 * 하루 활동량에 상한을 둬서 비용을 통제한다 (주민 활동은 가장 저렴한 Haiku).
 */
class CommunityPulse(
    private val repo: Repository,
    private val brain: Brain,
    private val sim: WorldSimService,
    private val zone: ZoneId,
    private val dailyCap: Int,
) {
    private val log = LoggerFactory.getLogger(CommunityPulse::class.java)

    companion object {
        const val CHECK_MINUTES = 4L

        /** 시간대별 시간당 활동 수 (한국 시간 기준). */
        fun hourlyRate(hour: Int): Double = when (hour) {
            in 0..1 -> 1.5
            in 2..6 -> 0.3
            in 7..8 -> 1.5
            in 9..11 -> 2.5
            in 12..13 -> 3.5
            in 14..17 -> 2.5
            in 18..20 -> 4.0
            else -> 4.5
        }
    }

    /** 한 번의 검사: 예약된 반응 처리 → 공간마다 자발적 활동 → 밤이면 요약. */
    suspend fun beat(world: World, now: ZonedDateTime = ZonedDateTime.now(zone), random: Random = Random) {
        if (!brain.info.online) return
        val nowMs = now.toInstant().toEpochMilli()
        repo.takeDue(world.id, nowMs).forEach { t ->
            runCatching { sim.runScheduled(world, t) }.onFailure { log.warn("scheduled reaction failed: {}", it.message) }
        }
        val communities = repo.spaces(world.id).filter { it.type == SpaceType.COMMUNITY }
        for (space in communities) {
            val since = nowMs - 24 * 3_600_000L
            val chance = hourlyRate(now.hour) * CHECK_MINUTES / 60.0
            if (repo.activitySince(space.id, since) < dailyCap && random.nextDouble() < chance) {
                runCatching { sim.act(world, space) }.onFailure { log.warn("community act failed: {}", it.message) }
            }
            if (random.nextDouble() < 0.25) sim.castVotes(space, repo.agents(world.id).filter { it.id in space.memberAgentIds }, rounds = 2)
            // 밤 9시대: 하루에 한 번 요약
            if (now.hour == 21) {
                val last = repo.latestDigest(space.id)?.createdAt ?: 0L
                if (nowMs - last > 20 * 3_600_000L) runCatching { makeDigest(world, space, notify = true) }
                    .onFailure { log.warn("digest failed: {}", it.message) }
            }
        }
    }

    /**
     * 커뮤니티 요약: 지난 요약 이후(없으면 최근 24시간) 올라온 글과 댓글을 게시판별로 묶어,
     * 주민들끼리 나눈 이야기 · 내가 한 이야기와 반응 · 거기서 나온 나에 대한 정보를 정리한다.
     */
    suspend fun makeDigest(world: World, space: Space, notify: Boolean): Digest {
        val nowMs = System.currentTimeMillis()
        val since = repo.latestDigest(space.id)?.createdAt ?: (nowMs - 24 * 3_600_000L)
        val boards = repo.boards(space.id).associateBy { it.id }
        val posts = repo.posts(space.id, 200).filter { it.createdAt >= since }
        val newComments = repo.commentsSince(space.id, since)
        require(posts.isNotEmpty() || newComments.isNotEmpty()) { "요약할 새 이야기가 아직 없어요" }
        val owner = repo.profile(world.id)
        val ownerName = Prompts.ownerName(owner)
        val material = buildString {
            posts.groupBy { it.boardId }.forEach { (bid, ps) ->
                appendLine("### 게시판: ${boards[bid]?.name ?: "기타"}")
                ps.forEach { p ->
                    val who = if (p.authorAgentId == null) "$ownerName (본인)" else p.authorName
                    appendLine("- [글] ${p.tag ?: ""} ${p.title} — $who (추천 ${p.score}, 댓글 ${p.commentCount})")
                    appendLine("  ${p.body.take(300).replace('\n', ' ')}")
                    repo.comments(p.id).take(8).forEach { c ->
                        appendLine("    · ${if (c.authorAgentId == null) "$ownerName (본인)" else c.authorName}: ${c.body.take(160).replace('\n', ' ')}")
                    }
                }
            }
            val olderPostComments = newComments.filter { (p, _) -> posts.none { it.id == p.id } }
            if (olderPostComments.isNotEmpty()) {
                appendLine("### 예전 글에 새로 달린 댓글")
                olderPostComments.take(30).forEach { (p, c) ->
                    appendLine("- '${p.title}' ← ${if (c.authorAgentId == null) "$ownerName (본인)" else c.authorName}: ${c.body.take(160).replace('\n', ' ')}")
                }
            }
        }
        val content = brain.complete(
            BrainRequest(
                stableSystem = Prompts.digestSystem(space.name, ownerName),
                turns = listOf(Turn(ChatRole.USER, material.take(60_000))),
                task = Task.MEETING_SUMMARY, effort = Effort.MEDIUM, maxTokens = 4_000,
            ),
        ).trim()
        require(content.isNotBlank()) { "요약을 만들지 못했어요" }
        val d = repo.saveDigest(space.id, content, posts.size)
        if (notify) repo.addNotice(world.id, "DIGEST", "📰 ${space.name} 오늘의 요약", content.lineSequence().firstOrNull { it.isNotBlank() && !it.startsWith("#") } ?: content.take(80), null, space.style, space.id)
        return d
    }

    fun start(scope: CoroutineScope) {
        scope.launch {
            delay(2 * 60_000L)
            while (true) {
                for (world in repo.allWorlds()) runCatching { beat(world) }.onFailure { log.warn("pulse failed: {}", it.message) }
                delay(CHECK_MINUTES * 60_000L + Random.nextLong(0, 60_000L))
            }
        }
    }
}
