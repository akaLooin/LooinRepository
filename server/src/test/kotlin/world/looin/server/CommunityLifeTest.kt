package world.looin.server

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.Task
import world.looin.server.service.CommunityPulse
import world.looin.shared.BrainInfo
import world.looin.shared.SpaceType
import java.nio.file.Files
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CommunityLifeTest {
    private class ScriptBrain : Brain {
        val seen = mutableListOf<BrainRequest>()
        override val info = BrainInfo("fake", "fake", true)
        override fun stream(req: BrainRequest): Flow<String> {
            seen += req
            return flowOf(
                when (req.task) {
                    Task.COMMUNITY -> if (req.turns.last().text.contains("새 글")) """{"tag":"[토론]","title":"주민 글","body":"내용"}""" else """{"body":"좋네요"}"""
                    Task.MEMORY -> """[{"category":"일","content":"커뮤니티에서 프로젝트 이야기를 했다","importance":3}]"""
                    Task.MEETING_SUMMARY -> "오늘은 차분했다.\n## 게시판별 이야기\n- r/looin: 루인의 글"
                    else -> "ok"
                },
            )
        }
    }

    private val zone = ZoneId.of("Asia/Seoul")

    private fun setup(): Triple<App, CommunityPulse, ScriptBrain> {
        val brain = ScriptBrain()
        val app = App(Config(0, Files.createTempDirectory("life").toFile(), "tok-123456789", emptyList(), 0.0, null, proactive = false, zone = zone), brain)
        return Triple(app, CommunityPulse(app.repo, app.brain, app.sim, zone, dailyCap = 48), brain)
    }

    @Test
    fun boardsExistForBothCommunities() {
        val (app, _, _) = setup()
        val w = app.repo.worldForUser(app.repo.anyUserId()!!)!!
        val spaces = app.repo.spaces(w.id).filter { it.type == SpaceType.COMMUNITY }
        assertTrue(spaces.all { app.repo.boards(it.id).size == 5 })
        val dc = spaces.first { it.style == "DC" }
        assertEquals("루인 갤러리", app.repo.boards(dc.id).first().name)
    }

    @Test
    fun ownerPostGetsReactionsLaterWithNotifications() = runBlocking {
        val (app, pulse, _) = setup()
        val repo = app.repo
        val w = repo.worldForUser(repo.anyUserId()!!)!!
        val reddit = repo.spaces(w.id).first { it.style == "REDDIT" }
        val board = repo.boards(reddit.id)[2]
        val post = repo.createPost(reddit.id, null, "루인", "내 글", "본문", "[토론]", board.id)
        app.sim.ownerPosted(w, reddit, post)
        val pending = repo.pendingCount(w.id)
        assertTrue(pending in 2..4)

        // 지금 시각엔 아직 아무 반응도 없다
        pulse.beat(w, ZonedDateTime.now(zone), Random(1))
        assertEquals(0, repo.comments(post.id).size)

        // 두 시간 뒤: 예약된 반응이 모두 도착하고, 알림이 쌓인다
        pulse.beat(w, ZonedDateTime.now(zone).plusHours(2), Random(1))
        assertEquals(pending, repo.comments(post.id).size)
        assertTrue(repo.notices(w.id).count { it.kind == "COMMENT" && it.postId == post.id } == pending)

        // 내가 AI 글에 댓글 → 글쓴이 답글 예약 → 도착하면 REPLY 알림
        val aiPost = repo.createPost(reddit.id, reddit.memberAgentIds.first(), "관찰자 민", "AI 글", "본문", null, board.id)
        val mine = repo.createComment(aiPost.id, null, "루인", "제 생각은요")
        app.sim.ownerCommented(w, reddit, aiPost, mine)
        pulse.beat(w, ZonedDateTime.now(zone).plusHours(3), Random(1))
        val replies = repo.comments(aiPost.id).filter { it.parentId == mine.id }
        assertTrue(replies.isNotEmpty())
        assertTrue(repo.notices(w.id).any { it.kind == "REPLY" && it.postId == aiPost.id })
        assertTrue(repo.unreadNotices(w.id) > 0)
        repo.readNotices(w.id, null)
        assertEquals(0, repo.unreadNotices(w.id))
    }

    @Test
    fun spontaneousActivityFollowsCapAndGoesToBoards() = runBlocking {
        val (app, _, _) = setup()
        val repo = app.repo
        val w = repo.worldForUser(repo.anyUserId()!!)!!
        val pulse = CommunityPulse(repo, app.brain, app.sim, zone, dailyCap = 3)
        // 저녁 시간대에 주사위가 늘 "활동"이 나오도록 해도 하루 상한(3)을 넘지 않는다
        val evening = ZonedDateTime.now(zone).withHour(20)
        val alwaysAct = object : Random() { override fun nextBits(bitCount: Int) = 0 }
        repeat(10) { pulse.beat(w, evening, alwaysAct) }
        repo.spaces(w.id).filter { it.type == SpaceType.COMMUNITY }.forEach { s ->
            assertEquals(3, repo.activitySince(s.id, 0))
            assertTrue(repo.posts(s.id, 50).all { it.boardId != null })
        }
        assertTrue(CommunityPulse.hourlyRate(20) > CommunityPulse.hourlyRate(4))
    }

    @Test
    fun digestAndLearningFromCommunity() = runBlocking {
        val (app, pulse, brain) = setup()
        val repo = app.repo
        val w = repo.worldForUser(repo.anyUserId()!!)!!
        val dc = repo.spaces(w.id).first { it.style == "DC" }
        val p = repo.createPost(dc.id, null, "루인", "프로젝트 근황", "앱 만들고 있음", "[일반]", repo.boards(dc.id)[2].id)
        repo.createComment(p.id, dc.memberAgentIds.first(), "ㅇㅇ(1.2)", "ㄹㅇ 대단")
        val d = pulse.makeDigest(w, dc, notify = true)
        assertTrue(d.content.contains("게시판별 이야기"))
        assertTrue(brain.seen.last().turns.last().text.contains("루인 (본인)"))
        assertTrue(repo.notices(w.id).any { it.kind == "DIGEST" })

        // 주민들도 아카엘이 이해한 루인을 안다 (기억이 커뮤니티 활동 프롬프트에 들어간다)
        repo.addMemory(w.id, "일", "앱을 만들고 있다", "chat", 4)
        app.sim.act(w, dc)
        assertTrue(brain.seen.last { it.task == Task.COMMUNITY }.dynamicSystem.contains("앱을 만들고 있다"))
    }
}
