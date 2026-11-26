package world.looin.server.db

import kotlinx.serialization.builtins.ListSerializer
import world.looin.shared.Agent
import world.looin.shared.AttachmentInfo
import world.looin.shared.AgentKind
import world.looin.shared.ChatMessage
import world.looin.shared.ChatRole
import world.looin.shared.Comment
import world.looin.shared.Board
import world.looin.shared.Conversation
import world.looin.shared.Digest
import world.looin.shared.Notice
import world.looin.shared.Folder
import world.looin.shared.Insight
import world.looin.shared.LooinJson
import world.looin.shared.Meeting
import world.looin.shared.MeetingTurn
import world.looin.shared.Memory
import world.looin.shared.OwnerProfile
import world.looin.shared.Post
import world.looin.shared.Space
import world.looin.shared.SpaceType
import world.looin.shared.World
import world.looin.shared.WorldStats
import java.security.MessageDigest
import java.sql.ResultSet
import java.util.UUID

/** 출력을 모델 학습에 쓰는 것을 약관으로 제한하는 상용 두뇌들 (학습 데이터에서 제외). */
val COMMERCIAL_BRAINS = listOf("claude", "openai", "gemini", "mistral")

fun newId(): String = UUID.randomUUID().toString()
fun now(): Long = System.currentTimeMillis()
fun sha256(s: String): String =
    MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

/** 모든 조회는 worldId 로 범위를 제한한다 — 나중에 여러 사용자/월드가 생겨도 데이터가 섞이지 않도록. */
class Repository(val db: Db) : world.looin.server.ai.UsageLedger {

    // ---------- users / worlds ----------
    fun userIdForToken(token: String): String? =
        db.one("SELECT id FROM users WHERE token_hash = ?", sha256(token)) { it.getString(1) }

    fun createUser(name: String, token: String): String = newId().also {
        db.exec("INSERT INTO users(id, name, token_hash, created_at) VALUES (?,?,?,?)", it, name, sha256(token), now())
    }

    fun anyUserId(): String? = db.one("SELECT id FROM users ORDER BY created_at LIMIT 1") { it.getString(1) }

    fun updateUserToken(userId: String, token: String) =
        db.exec("UPDATE users SET token_hash = ? WHERE id = ?", sha256(token), userId)

    fun worldForUser(userId: String): World? =
        db.one("SELECT * FROM worlds WHERE owner_id = ? ORDER BY created_at LIMIT 1", userId) { it.world() }

    fun createWorld(ownerId: String, name: String, description: String): World {
        val w = World(newId(), ownerId, name, description, now())
        db.exec("INSERT INTO worlds VALUES (?,?,?,?,?)", w.id, w.ownerId, w.name, w.description, w.createdAt)
        return w
    }

    fun stats(worldId: String) = WorldStats(
        posts = db.count("SELECT COUNT(*) FROM posts p JOIN spaces s ON p.space_id = s.id WHERE s.world_id = ?", worldId),
        comments = db.count(
            "SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id JOIN spaces s ON p.space_id = s.id WHERE s.world_id = ?",
            worldId,
        ),
        memories = db.count("SELECT COUNT(*) FROM memories WHERE world_id = ?", worldId),
        conversations = db.count("SELECT COUNT(*) FROM conversations WHERE world_id = ?", worldId),
        meetings = db.count("SELECT COUNT(*) FROM meetings m JOIN spaces s ON m.space_id = s.id WHERE s.world_id = ?", worldId),
    )

    // ---------- profile ----------
    fun profile(worldId: String): OwnerProfile =
        db.one("SELECT json FROM profiles WHERE world_id = ?", worldId) {
            LooinJson.decodeFromString(OwnerProfile.serializer(), it.getString(1))
        } ?: OwnerProfile()

    fun saveProfile(worldId: String, p: OwnerProfile) {
        db.exec(
            "INSERT INTO profiles(world_id, json) VALUES (?, ?) ON CONFLICT(world_id) DO UPDATE SET json = excluded.json",
            worldId, LooinJson.encodeToString(OwnerProfile.serializer(), p),
        )
    }

    // ---------- agents ----------
    fun agents(worldId: String): List<Agent> =
        db.query("SELECT * FROM agents WHERE world_id = ? ORDER BY created_at", worldId) { it.agent() }

    fun agent(worldId: String, id: String): Agent? =
        db.one("SELECT * FROM agents WHERE world_id = ? AND id = ?", worldId, id) { it.agent() }

    fun createAgent(worldId: String, kind: AgentKind, name: String, role: String, persona: String, avatar: String): Agent {
        val handle = name.lowercase().replace(Regex("[^\\p{L}\\p{N}]+"), "_").trim('_').ifEmpty { "agent" } +
            "_" + newId().take(4)
        val a = Agent(newId(), worldId, kind, name, handle, role, persona, avatar, now())
        db.exec(
            "INSERT INTO agents VALUES (?,?,?,?,?,?,?,?,?)",
            a.id, a.worldId, a.kind.name, a.name, a.handle, a.role, a.persona, a.avatar, a.createdAt,
        )
        return a
    }

    fun deleteAgent(worldId: String, id: String): Boolean =
        db.exec("DELETE FROM agents WHERE world_id = ? AND id = ? AND kind <> 'CORE'", worldId, id) > 0

    // ---------- spaces ----------
    fun spaces(worldId: String): List<Space> =
        db.query("SELECT * FROM spaces WHERE world_id = ? ORDER BY rowid", worldId) { it.space() }
            .map { it.copy(memberAgentIds = members(it.id)) }

    fun space(worldId: String, id: String): Space? =
        db.one("SELECT * FROM spaces WHERE world_id = ? AND id = ?", worldId, id) { it.space() }
            ?.let { it.copy(memberAgentIds = members(it.id)) }

    fun createSpace(worldId: String, type: SpaceType, name: String, description: String, style: String = ""): Space {
        val s = Space(newId(), worldId, type, name, description, style = style)
        db.exec(
            "INSERT INTO spaces(id, world_id, type, name, description, style) VALUES (?,?,?,?,?,?)",
            s.id, s.worldId, s.type.name, s.name, s.description, style,
        )
        return s
    }

    fun updateSpace(spaceId: String, name: String, description: String, style: String) =
        db.exec("UPDATE spaces SET name = ?, description = ?, style = ? WHERE id = ?", name, description, style, spaceId)

    fun deleteSpace(spaceId: String) = db.exec("DELETE FROM spaces WHERE id = ?", spaceId)

    fun addMember(spaceId: String, agentId: String) =
        db.exec("INSERT OR IGNORE INTO space_members(space_id, agent_id) VALUES (?, ?)", spaceId, agentId)

    private fun members(spaceId: String): List<String> =
        db.query("SELECT agent_id FROM space_members WHERE space_id = ?", spaceId) { it.getString(1) }

    // ---------- posts / comments ----------
    fun posts(spaceId: String, limit: Int = 100, boardId: String? = null): List<Post> = db.query(
        """SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS cc
           FROM posts p WHERE p.space_id = ? AND (? IS NULL OR p.board_id = ?) ORDER BY p.created_at DESC LIMIT ?""",
        spaceId, boardId, boardId, limit,
    ) { it.post() }

    // ---------- boards (서브레딧 / 갤러리) ----------
    fun boards(spaceId: String): List<Board> = db.query(
        """SELECT b.*, (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id) AS pc,
                  (SELECT MAX(created_at) FROM posts p WHERE p.board_id = b.id) AS lp
           FROM boards b WHERE b.space_id = ? ORDER BY b.created_at, b.rowid""", spaceId,
    ) { Board(it.getString("id"), it.getString("space_id"), it.getString("name"), it.getString("description"), it.getInt("pc"), it.getLong("lp").takeIf { v -> v > 0 }) }

    fun createBoard(spaceId: String, name: String, description: String): Board {
        val b = Board(newId(), spaceId, name.trim().take(40), description.trim().take(200))
        db.exec("INSERT INTO boards VALUES (?,?,?,?,?)", b.id, b.spaceId, b.name, b.description, now())
        return b
    }

    fun assignOrphanPosts(spaceId: String, boardId: String) =
        db.exec("UPDATE posts SET board_id = ? WHERE space_id = ? AND board_id IS NULL", boardId, spaceId)

    // ---------- notifications ----------
    fun addNotice(worldId: String, kind: String, title: String, body: String, postId: String?, style: String, spaceId: String?): Notice {
        val n = Notice(newId(), kind, title.take(120), body.take(300), postId, style, spaceId, now(), false)
        db.exec("INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?,?,0)", n.id, worldId, n.kind, n.title, n.body, postId, style, spaceId, n.createdAt)
        return n
    }

    fun notices(worldId: String, limit: Int = 60): List<Notice> = db.query(
        "SELECT * FROM notifications WHERE world_id = ? ORDER BY created_at DESC LIMIT ?", worldId, limit,
    ) {
        Notice(it.getString("id"), it.getString("kind"), it.getString("title"), it.getString("body"), it.getString("post_id"),
            it.getString("style"), it.getString("space_id"), it.getLong("created_at"), it.getInt("read") == 1)
    }

    fun unreadNotices(worldId: String): Int = db.count("SELECT COUNT(*) FROM notifications WHERE world_id = ? AND read = 0", worldId)

    fun readNotices(worldId: String, id: String?) =
        if (id == null) db.exec("UPDATE notifications SET read = 1 WHERE world_id = ?", worldId)
        else db.exec("UPDATE notifications SET read = 1 WHERE world_id = ? AND id = ?", worldId, id)

    // ---------- digests (커뮤니티 요약) ----------
    fun latestDigest(spaceId: String): Digest? = db.one(
        "SELECT * FROM digests WHERE space_id = ? ORDER BY created_at DESC LIMIT 1", spaceId,
    ) { Digest(it.getString("id"), it.getString("space_id"), it.getString("content"), it.getInt("posts_covered"), it.getLong("created_at")) }

    fun saveDigest(spaceId: String, content: String, postsCovered: Int): Digest {
        val d = Digest(newId(), spaceId, content, postsCovered, now())
        db.exec("INSERT INTO digests VALUES (?,?,?,?,?)", d.id, spaceId, content, postsCovered, d.createdAt)
        return d
    }

    fun commentsSince(spaceId: String, since: Long): List<Pair<Post, Comment>> = db.query(
        """SELECT c.*, p.title AS ptitle FROM comments c JOIN posts p ON c.post_id = p.id
           WHERE p.space_id = ? AND c.created_at >= ? ORDER BY c.created_at""", spaceId, since,
    ) { rs -> Post(rs.getString("post_id"), spaceId, null, "", rs.getString("ptitle"), "", 0) to rs.comment() }

    // ---------- 예약된 반응 (진짜 사람처럼 시간차를 두고) ----------
    data class Scheduled(val id: String, val worldId: String, val spaceId: String, val kind: String, val postId: String, val commentId: String?, val agentId: String?, val dueAt: Long)

    fun schedule(worldId: String, spaceId: String, kind: String, postId: String, commentId: String?, agentId: String?, dueAt: Long) =
        db.exec("INSERT INTO scheduled_actions VALUES (?,?,?,?,?,?,?,?)", newId(), worldId, spaceId, kind, postId, commentId, agentId, dueAt)

    /** 때가 된 예약을 꺼내고 지운다. */
    fun takeDue(worldId: String, nowMs: Long): List<Scheduled> = db.tx {
        val due = query("SELECT * FROM scheduled_actions WHERE world_id = ? AND due_at <= ? ORDER BY due_at LIMIT 10", worldId, nowMs) {
            Scheduled(it.getString("id"), it.getString("world_id"), it.getString("space_id"), it.getString("kind"), it.getString("post_id"),
                it.getString("comment_id"), it.getString("agent_id"), it.getLong("due_at"))
        }
        due.forEach { exec("DELETE FROM scheduled_actions WHERE id = ?", it.id) }
        due
    }

    fun pendingCount(worldId: String): Int = db.count("SELECT COUNT(*) FROM scheduled_actions WHERE world_id = ?", worldId)

    fun logActivity(spaceId: String) = db.exec("INSERT INTO activity_log VALUES (?, ?)", spaceId, now())
    fun activitySince(spaceId: String, since: Long): Int =
        db.count("SELECT COUNT(*) FROM activity_log WHERE space_id = ? AND created_at >= ?", spaceId, since)

    /** 정렬: hot(점수를 시간으로 나눔) / top(점수) / best(디시 개념글: 추천 5 이상) / new */
    fun sortedPosts(spaceId: String, sort: String, boardId: String? = null): List<Post> {
        val all = posts(spaceId, 300, boardId)
        val now = now()
        return when (sort) {
            "hot" -> all.sortedByDescending { (it.score + 1) / Math.pow((now - it.createdAt) / 3_600_000.0 + 2, 1.5) }
            "top" -> all.sortedByDescending { it.score }
            "best" -> all.filter { it.score >= 5 }
            else -> all
        }.take(100)
    }

    fun votePost(postId: String, delta: Int) {
        if (delta >= 0) db.exec("UPDATE posts SET score = score + ? WHERE id = ?", delta, postId)
        else db.exec("UPDATE posts SET score = score + ?, downs = downs + ? WHERE id = ?", delta, -delta, postId)
    }

    fun addViews(postId: String, n: Int) = db.exec("UPDATE posts SET views = views + ? WHERE id = ?", n, postId)

    fun voteComment(commentId: String, delta: Int) = db.exec("UPDATE comments SET score = score + ? WHERE id = ?", delta, commentId)

    fun comment(worldId: String, commentId: String): Comment? = db.one(
        """SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id JOIN spaces s ON p.space_id = s.id
           WHERE s.world_id = ? AND c.id = ?""", worldId, commentId,
    ) { it.comment() }

    fun post(worldId: String, postId: String): Post? = db.one(
        """SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS cc
           FROM posts p JOIN spaces s ON p.space_id = s.id WHERE s.world_id = ? AND p.id = ?""",
        worldId, postId,
    ) { it.post() }

    fun createPost(spaceId: String, authorAgentId: String?, authorName: String, title: String, body: String, tag: String? = null, boardId: String? = null): Post {
        val p = Post(newId(), spaceId, authorAgentId, authorName, title, body, now(), tag = tag, boardId = boardId)
        db.exec(
            "INSERT INTO posts(id, space_id, author_agent_id, author_name, title, body, created_at, tag, board_id) VALUES (?,?,?,?,?,?,?,?,?)",
            p.id, p.spaceId, p.authorAgentId, p.authorName, p.title, p.body, p.createdAt, tag, boardId,
        )
        return p
    }

    fun comments(postId: String): List<Comment> =
        db.query("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at", postId) { it.comment() }

    fun createComment(postId: String, authorAgentId: String?, authorName: String, body: String, parentId: String? = null): Comment {
        val c = Comment(newId(), postId, authorAgentId, authorName, body, now(), parentId = parentId)
        db.exec(
            "INSERT INTO comments(id, post_id, author_agent_id, author_name, body, created_at, parent_id) VALUES (?,?,?,?,?,?,?)",
            c.id, c.postId, c.authorAgentId, c.authorName, c.body, c.createdAt, parentId,
        )
        return c
    }

    // ---------- conversations ----------
    fun conversations(worldId: String, agentId: String): List<Conversation> = db.query(
        "SELECT * FROM conversations WHERE world_id = ? AND agent_id = ? ORDER BY updated_at DESC", worldId, agentId,
    ) { it.conversation() }

    fun conversation(worldId: String, id: String): Conversation? =
        db.one("SELECT * FROM conversations WHERE world_id = ? AND id = ?", worldId, id) { it.conversation() }

    fun createConversation(worldId: String, agentId: String, title: String, kind: String = "CHAT"): Conversation {
        val c = Conversation(newId(), agentId, title, now(), kind = kind)
        db.exec(
            "INSERT INTO conversations(id, world_id, agent_id, title, updated_at, kind) VALUES (?,?,?,?,?,?)",
            c.id, worldId, c.agentId, c.title, c.updatedAt, kind,
        )
        return c
    }

    fun allConversations(worldId: String): List<Conversation> =
        db.query("SELECT * FROM conversations WHERE world_id = ? ORDER BY updated_at DESC", worldId) { it.conversation() }

    fun conversationOfKind(worldId: String, kind: String): Conversation? =
        db.one("SELECT * FROM conversations WHERE world_id = ? AND kind = ? ORDER BY updated_at DESC LIMIT 1", worldId, kind) { it.conversation() }

    fun updateConversation(worldId: String, id: String, title: String?, folderId: String?) {
        title?.takeIf { it.isNotBlank() }?.let { db.exec("UPDATE conversations SET title = ? WHERE world_id = ? AND id = ?", it.trim().take(60), worldId, id) }
        folderId?.let { db.exec("UPDATE conversations SET folder_id = ? WHERE world_id = ? AND id = ?", it.ifBlank { null }, worldId, id) }
    }

    fun deleteConversation(worldId: String, id: String): Boolean =
        db.exec("DELETE FROM conversations WHERE world_id = ? AND id = ?", worldId, id) > 0

    fun markRead(conversationId: String) = db.exec("UPDATE conversations SET unread = 0 WHERE id = ?", conversationId)
    fun addUnread(conversationId: String) = db.exec("UPDATE conversations SET unread = unread + 1 WHERE id = ?", conversationId)

    /** 소유자가 마지막으로 말한 시각 (앱을 쓰고 있는지 판단). */
    fun lastOwnerMessageAt(worldId: String): Long = db.one(
        "SELECT MAX(m.created_at) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.world_id = ? AND m.role = 'USER'",
        worldId,
    ) { it.getLong(1) } ?: 0L

    // ---------- folders ----------
    fun folders(worldId: String): List<Folder> =
        db.query("SELECT * FROM folders WHERE world_id = ? ORDER BY created_at", worldId) { Folder(it.getString("id"), it.getString("name"), it.getLong("created_at")) }

    fun createFolder(worldId: String, name: String): Folder {
        val f = Folder(newId(), name.trim().take(30), now())
        db.exec("INSERT INTO folders VALUES (?,?,?,?)", f.id, worldId, f.name, f.createdAt)
        return f
    }

    fun renameFolder(worldId: String, id: String, name: String): Folder? {
        db.exec("UPDATE folders SET name = ? WHERE world_id = ? AND id = ?", name.trim().take(30), worldId, id)
        return folders(worldId).firstOrNull { it.id == id }
    }

    fun deleteFolder(worldId: String, id: String): Boolean = db.tx {
        exec("UPDATE conversations SET folder_id = NULL WHERE world_id = ? AND folder_id = ?", worldId, id)
        exec("DELETE FROM folders WHERE world_id = ? AND id = ?", worldId, id) > 0
    }

    fun messages(conversationId: String): List<ChatMessage> =
        db.query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid", conversationId) { it.message() }

    fun addMessage(
        conversationId: String, role: ChatRole, content: String, brain: String? = null,
        attachments: List<AttachmentInfo> = emptyList(),
    ): ChatMessage {
        val m = ChatMessage(newId(), conversationId, role, content, now(), brain, attachments)
        db.tx {
            exec(
                "INSERT INTO messages(id, conversation_id, role, content, created_at, brain, attachments) VALUES (?,?,?,?,?,?,?)",
                m.id, m.conversationId, m.role.name, m.content, m.createdAt, brain,
                attachments.takeIf { it.isNotEmpty() }?.joinToString(",") { it.id },
            )
            exec("UPDATE conversations SET updated_at = ? WHERE id = ?", m.createdAt, conversationId)
        }
        return m
    }

    // ---------- memories ----------
    fun memories(worldId: String): List<Memory> = db.query(
        "SELECT * FROM memories WHERE world_id = ? ORDER BY importance DESC, created_at DESC", worldId,
    ) { it.memory() }

    fun addMemory(worldId: String, category: String, content: String, source: String, importance: Int): Memory {
        val m = Memory(newId(), category, content, source, importance.coerceIn(1, 5), now())
        db.exec("INSERT INTO memories VALUES (?,?,?,?,?,?,?)", m.id, worldId, m.category, m.content, m.source, m.importance, m.createdAt)
        return m
    }

    fun deleteMemory(worldId: String, id: String): Boolean =
        db.exec("DELETE FROM memories WHERE world_id = ? AND id = ?", worldId, id) > 0

    // ---------- meetings ----------
    private val turnsSer = ListSerializer(MeetingTurn.serializer())

    fun meetings(spaceId: String): List<Meeting> =
        db.query("SELECT * FROM meetings WHERE space_id = ? ORDER BY created_at DESC", spaceId) { it.meeting() }

    fun saveMeeting(spaceId: String, topic: String, turns: List<MeetingTurn>, summary: String): Meeting {
        val m = Meeting(newId(), spaceId, topic, turns, summary, now())
        db.exec(
            "INSERT INTO meetings VALUES (?,?,?,?,?,?)",
            m.id, m.spaceId, m.topic, LooinJson.encodeToString(turnsSer, turns), m.summary, m.createdAt,
        )
        return m
    }

    // ---------- insights (성장 기록) ----------
    fun latestInsight(worldId: String): Insight? =
        db.one("SELECT * FROM insights WHERE world_id = ? ORDER BY version DESC LIMIT 1", worldId) { it.insight() }

    fun insights(worldId: String): List<Insight> =
        db.query("SELECT * FROM insights WHERE world_id = ? ORDER BY version DESC", worldId) { it.insight() }

    fun addInsight(worldId: String, content: String, basedOnMemories: Int): Insight {
        val version = (db.one("SELECT MAX(version) FROM insights WHERE world_id = ?", worldId) { it.getInt(1) } ?: 0) + 1
        val i = Insight(newId(), version, content, basedOnMemories, now())
        db.exec("INSERT INTO insights VALUES (?,?,?,?,?,?)", i.id, worldId, i.version, i.content, i.basedOnMemories, i.createdAt)
        return i
    }

    /**
     * 내가 보낸 메시지와 그 직전 AI 메시지 쌍 — 나중에 "나처럼 말하는 모델"을 학습시킬 재료.
     * 상용 모델(Claude 등)이 쓴 글은 약관상 모델 학습에 쓰지 않는 것이 안전하므로 기본으로 뺀다.
     */
    fun ownerReplyPairs(worldId: String, limit: Int = 5000, excludeCommercial: Boolean = true): List<Pair<String, String>> = db.query(
        """SELECT prev.content AS prompt, m.content AS reply
           FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           JOIN messages prev ON prev.conversation_id = m.conversation_id AND prev.role = 'ASSISTANT'
             AND prev.created_at = (SELECT MAX(p2.created_at) FROM messages p2
                                    WHERE p2.conversation_id = m.conversation_id AND p2.role = 'ASSISTANT' AND p2.created_at < m.created_at)
           WHERE c.world_id = ? AND m.role = 'USER'
             AND (? = 0 OR prev.brain IS NULL OR NOT (${COMMERCIAL_BRAINS.joinToString(" OR ") { "prev.brain LIKE '$it%'" }}))
           ORDER BY m.created_at LIMIT ?""",
        worldId, if (excludeCommercial) 1 else 0, limit,
    ) { it.getString("prompt") to it.getString("reply") }

    // ---------- 첨부 파일 ----------
    fun saveAttachment(worldId: String, name: String, mime: String, size: Long, text: String?): AttachmentInfo {
        val a = AttachmentInfo(newId(), name, mime, size)
        db.exec("INSERT INTO attachments VALUES (?,?,?,?,?,?,?)", a.id, worldId, a.name, a.mime, a.size, text, now())
        return a
    }

    /** 첨부 정보 + 뽑아둔 글자 (PDF·텍스트). */
    fun attachment(worldId: String, id: String): Pair<AttachmentInfo, String?>? =
        db.one("SELECT * FROM attachments WHERE world_id = ? AND id = ?", worldId, id) {
            AttachmentInfo(it.getString("id"), it.getString("name"), it.getString("mime"), it.getLong("size")) to it.getString("text")
        }

    private fun attachmentInfos(ids: List<String>): List<AttachmentInfo> = ids.mapNotNull { id ->
        db.one("SELECT id, name, mime, size FROM attachments WHERE id = ?", id) {
            AttachmentInfo(it.getString("id"), it.getString("name"), it.getString("mime"), it.getLong("size"))
        }
    }

    // ---------- 두뇌 사용량 (유료 크레딧 예산 관리) ----------
    override fun recordUsage(provider: String, inputTokens: Long, outputTokens: Long, cacheRead: Long, cacheWrite: Long, costUsd: Double) {
        db.exec("INSERT INTO brain_usage VALUES (?,?,?,?,?,?,?)", provider, inputTokens, outputTokens, cacheRead, cacheWrite, costUsd, now())
    }

    override fun spentSince(providerPrefix: String, sinceMillis: Long): Double =
        db.one("SELECT COALESCE(SUM(cost_usd), 0) FROM brain_usage WHERE provider LIKE ? AND created_at >= ?", "$providerPrefix%", sinceMillis) {
            it.getDouble(1)
        } ?: 0.0

    fun conversationsWithMessages(worldId: String): List<Pair<Conversation, List<ChatMessage>>> =
        db.query("SELECT * FROM conversations WHERE world_id = ? ORDER BY updated_at", worldId) { it.conversation() }
            .map { it to messages(it.id) }

    fun recentOwnerMessages(worldId: String, limit: Int): List<String> = db.query(
        """SELECT m.content FROM messages m JOIN conversations c ON m.conversation_id = c.id
           WHERE c.world_id = ? AND m.role = 'USER' ORDER BY m.created_at DESC LIMIT ?""",
        worldId, limit,
    ) { it.getString(1) }

    fun allWorlds(): List<World> = db.query("SELECT * FROM worlds") { it.world() }

    // ---------- row mappers ----------
    private fun ResultSet.world() = World(getString("id"), getString("owner_id"), getString("name"), getString("description"), getLong("created_at"))
    private fun ResultSet.agent() = Agent(
        getString("id"), getString("world_id"), AgentKind.valueOf(getString("kind")), getString("name"), getString("handle"),
        getString("role"), getString("persona"), getString("avatar"), getLong("created_at"),
    )
    private fun ResultSet.space() = Space(
        getString("id"), getString("world_id"), SpaceType.valueOf(getString("type")), getString("name"), getString("description"),
        style = getString("style") ?: "",
    )
    private fun ResultSet.post() = Post(
        getString("id"), getString("space_id"), getString("author_agent_id"), getString("author_name"),
        getString("title"), getString("body"), getLong("created_at"), getInt("cc"),
        score = getInt("score"), views = getInt("views"), tag = getString("tag"), downs = getInt("downs"),
        boardId = getString("board_id"),
    )
    private fun ResultSet.comment() = Comment(
        getString("id"), getString("post_id"), getString("author_agent_id"), getString("author_name"), getString("body"), getLong("created_at"),
        score = getInt("score"), parentId = getString("parent_id"),
    )
    private fun ResultSet.conversation() = Conversation(
        getString("id"), getString("agent_id"), getString("title"), getLong("updated_at"),
        folderId = getString("folder_id"), kind = getString("kind") ?: "CHAT", unread = getInt("unread"),
    )
    private fun ResultSet.message() = ChatMessage(
        getString("id"), getString("conversation_id"), ChatRole.valueOf(getString("role")), getString("content"), getLong("created_at"),
        getString("brain"),
        getString("attachments")?.split(',')?.filter { it.isNotBlank() }?.let { ids -> attachmentInfos(ids) } ?: emptyList(),
    )
    private fun ResultSet.memory() = Memory(getString("id"), getString("category"), getString("content"), getString("source"), getInt("importance"), getLong("created_at"))
    private fun ResultSet.insight() =
        Insight(getString("id"), getInt("version"), getString("content"), getInt("based_on_memories"), getLong("created_at"))
    private fun ResultSet.meeting() = Meeting(
        getString("id"), getString("space_id"), getString("topic"),
        LooinJson.decodeFromString(turnsSer, getString("turns_json")), getString("summary"), getLong("created_at"),
    )
}
