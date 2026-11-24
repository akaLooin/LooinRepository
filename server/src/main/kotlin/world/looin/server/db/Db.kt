package world.looin.server.db

import java.io.File
import java.sql.Connection
import java.sql.DriverManager
import java.sql.PreparedStatement
import java.sql.ResultSet

/**
 * 가벼운 SQLite 래퍼. 개인용(소유자 1명) 단계에서는 연결 하나 + 직렬화로 충분하다.
 * 여러 사람이 쓰게 되면 PostgreSQL 로 옮기는 것을 전제로 SQL 은 표준에 가깝게 쓴다.
 */
class Db(file: File) {
    private val conn: Connection = DriverManager.getConnection("jdbc:sqlite:${file.absolutePath}").apply {
        createStatement().use {
            it.execute("PRAGMA foreign_keys = ON")
            it.execute("PRAGMA journal_mode = WAL")
        }
    }
    private val lock = Any()

    fun <T> tx(block: Db.() -> T): T = synchronized(lock) {
        conn.autoCommit = false
        try {
            block().also { conn.commit() }
        } catch (e: Throwable) {
            conn.rollback(); throw e
        } finally {
            conn.autoCommit = true
        }
    }

    fun exec(sql: String, vararg args: Any?): Int = synchronized(lock) {
        conn.prepareStatement(sql).use { it.bind(args); it.executeUpdate() }
    }

    fun <T> query(sql: String, vararg args: Any?, map: (ResultSet) -> T): List<T> = synchronized(lock) {
        conn.prepareStatement(sql).use { st ->
            st.bind(args)
            st.executeQuery().use { rs -> buildList { while (rs.next()) add(map(rs)) } }
        }
    }

    fun <T> one(sql: String, vararg args: Any?, map: (ResultSet) -> T): T? = query(sql, *args, map = map).firstOrNull()

    fun count(sql: String, vararg args: Any?): Int = one(sql, *args) { it.getInt(1) } ?: 0

    private fun PreparedStatement.bind(args: Array<out Any?>) {
        args.forEachIndexed { i, v -> setObject(i + 1, v) }
    }

    fun migrate() {
        SCHEMA.split(";").map { it.trim() }.filter { it.isNotEmpty() }.forEach { exec(it) }
        // 컬럼 추가는 이미 있으면 실패하므로 조용히 넘긴다.
        ADDED_COLUMNS.forEach { runCatching { exec(it) } }
    }

    companion object {
        private val ADDED_COLUMNS = listOf(
            // 이 답을 쓴 두뇌 (예: "claude:claude-opus-5-5", "groq:openai/gpt-oss-120b")
            "ALTER TABLE messages ADD COLUMN brain TEXT",
        )
        private val SCHEMA = """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS worlds (
              id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
              description TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS profiles (
              world_id TEXT PRIMARY KEY REFERENCES worlds(id) ON DELETE CASCADE, json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS agents (
              id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
              kind TEXT NOT NULL, name TEXT NOT NULL, handle TEXT NOT NULL, role TEXT NOT NULL,
              persona TEXT NOT NULL, avatar TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS spaces (
              id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
              type TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS space_members (
              space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
              PRIMARY KEY (space_id, agent_id));
            CREATE TABLE IF NOT EXISTS posts (
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              author_agent_id TEXT, author_name TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
              created_at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS idx_posts_space ON posts(space_id, created_at);
            CREATE TABLE IF NOT EXISTS comments (
              id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
              author_agent_id TEXT, author_name TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
            CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
              agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, title TEXT NOT NULL,
              updated_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
              role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
            CREATE TABLE IF NOT EXISTS memories (
              id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
              category TEXT NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL, importance INTEGER NOT NULL,
              created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS meetings (
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              topic TEXT NOT NULL, turns_json TEXT NOT NULL, summary TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS insights (
              id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
              version INTEGER NOT NULL, content TEXT NOT NULL, based_on_memories INTEGER NOT NULL, created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS brain_usage (
              provider TEXT NOT NULL, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
              cache_read INTEGER NOT NULL, cache_write INTEGER NOT NULL, cost_usd REAL NOT NULL, created_at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS idx_usage ON brain_usage(provider, created_at)
        """.trimIndent()
    }
}
