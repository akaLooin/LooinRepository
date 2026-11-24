package world.looin.server.db

import kotlinx.serialization.builtins.ListSerializer
import world.looin.shared.Agent
import world.looin.shared.AgentKind
import world.looin.shared.ChatMessage
import world.looin.shared.ChatRole
import world.looin.shared.Comment
import world.looin.shared.Conversation
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

fun newId(): String = UUID.randomUUID().toString()
fun now(): Long = System.currentTimeMillis()
fun sha256(s: String): String =
    MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

/** 모든 조회는 worldId 로 범위를 제한한다 — 나중에 여러 사용자/월드가 생겨도 데이터가 섞이지 않도록. */
class Repository(val db: Db) {

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

    fun createSpace(worldId: String, type: SpaceType, name: String, description: String): Space {
        val s = Space(newId(), worldId, type, name, description)
        db.exec("INSERT INTO spaces VALUES (?,?,?,?,?)", s.id, s.worldId, s.type.name, s.name, s.description)
        return s
    }

    fun addMember(spaceId: String, agentId: String) =
        db.exec("INSERT OR IGNORE INTO space_members(space_id, agent_id) VALUES (?, ?)", spaceId, agentId)

    private fun members(spaceId: String): List<String> =
        db.query("SELECT agent_id FROM space_members WHERE space_id = ?", spaceId) { it.getString(1) }

    // ---------- posts / comments ----------
    fun posts(spaceId: String, limit: Int = 100): List<Post> = db.query(
        """SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS cc
           FROM posts p WHERE p.space_id = ? ORDER BY p.created_at DESC LIMIT ?""",
        spaceId, limit,
    ) { it.post() }

    fun post(worldId: String, postId: String): Post? = db.one(
        """SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS cc
           FROM posts p JOIN spaces s ON p.space_id = s.id WHERE s.world_id = ? AND p.id = ?""",
        worldId, postId,
    ) { it.post() }

    fun createPost(spaceId: String, authorAgentId: String?, authorName: String, title: String, body: String): Post {
        val p = Post(newId(), spaceId, authorAgentId, authorName, title, body, now())
        db.exec("INSERT INTO posts VALUES (?,?,?,?,?,?,?)", p.id, p.spaceId, p.authorAgentId, p.authorName, p.title, p.body, p.createdAt)
        return p
    }

    fun comments(postId: String): List<Comment> =
        db.query("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at", postId) { it.comment() }

    fun createComment(postId: String, authorAgentId: String?, authorName: String, body: String): Comment {
        val c = Comment(newId(), postId, authorAgentId, authorName, body, now())
        db.exec("INSERT INTO comments VALUES (?,?,?,?,?,?)", c.id, c.postId, c.authorAgentId, c.authorName, c.body, c.createdAt)
        return c
    }

    // ---------- conversations ----------
    fun conversations(worldId: String, agentId: String): List<Conversation> = db.query(
        "SELECT * FROM conversations WHERE world_id = ? AND agent_id = ? ORDER BY updated_at DESC", worldId, agentId,
    ) { it.conversation() }

    fun conversation(worldId: String, id: String): Conversation? =
        db.one("SELECT * FROM conversations WHERE world_id = ? AND id = ?", worldId, id) { it.conversation() }

    fun createConversation(worldId: String, agentId: String, title: String): Conversation {
        val c = Conversation(newId(), agentId, title, now())
        db.exec("INSERT INTO conversations VALUES (?,?,?,?,?)", c.id, worldId, c.agentId, c.title, c.updatedAt)
        return c
    }

    fun messages(conversationId: String): List<ChatMessage> =
        db.query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid", conversationId) { it.message() }

    fun addMessage(conversationId: String, role: ChatRole, content: String): ChatMessage {
        val m = ChatMessage(newId(), conversationId, role, content, now())
        db.tx {
            exec("INSERT INTO messages VALUES (?,?,?,?,?)", m.id, m.conversationId, m.role.name, m.content, m.createdAt)
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

    /** 내가 보낸 메시지와 그 직전 AI 메시지 쌍 — 나중에 "나처럼 말하는 모델"을 학습시킬 재료. */
    fun ownerReplyPairs(worldId: String, limit: Int = 5000): List<Pair<String, String>> = db.query(
        """SELECT prev.content AS prompt, m.content AS reply
           FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           JOIN messages prev ON prev.conversation_id = m.conversation_id AND prev.role = 'ASSISTANT'
             AND prev.created_at = (SELECT MAX(p2.created_at) FROM messages p2
                                    WHERE p2.conversation_id = m.conversation_id AND p2.role = 'ASSISTANT' AND p2.created_at < m.created_at)
           WHERE c.world_id = ? AND m.role = 'USER' ORDER BY m.created_at LIMIT ?""",
        worldId, limit,
    ) { it.getString("prompt") to it.getString("reply") }

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
    private fun ResultSet.space() = Space(getString("id"), getString("world_id"), SpaceType.valueOf(getString("type")), getString("name"), getString("description"))
    private fun ResultSet.post() = Post(
        getString("id"), getString("space_id"), getString("author_agent_id"), getString("author_name"),
        getString("title"), getString("body"), getLong("created_at"), getInt("cc"),
    )
    private fun ResultSet.comment() = Comment(getString("id"), getString("post_id"), getString("author_agent_id"), getString("author_name"), getString("body"), getLong("created_at"))
    private fun ResultSet.conversation() = Conversation(getString("id"), getString("agent_id"), getString("title"), getLong("updated_at"))
    private fun ResultSet.message() = ChatMessage(getString("id"), getString("conversation_id"), ChatRole.valueOf(getString("role")), getString("content"), getLong("created_at"))
    private fun ResultSet.memory() = Memory(getString("id"), getString("category"), getString("content"), getString("source"), getInt("importance"), getLong("created_at"))
    private fun ResultSet.insight() =
        Insight(getString("id"), getInt("version"), getString("content"), getInt("based_on_memories"), getLong("created_at"))
    private fun ResultSet.meeting() = Meeting(
        getString("id"), getString("space_id"), getString("topic"),
        LooinJson.decodeFromString(turnsSer, getString("turns_json")), getString("summary"), getLong("created_at"),
    )
}
