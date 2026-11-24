package world.looin.shared

import kotlinx.serialization.Serializable

/**
 * Looin World 공통 데이터 모델.
 * 서버(Ktor)와 앱(Android / PC, 이후 iOS)이 같은 정의를 공유한다.
 *
 * 멀티 유저 확장 대비: 모든 데이터는 World 에 속하고, World 는 User(소유자)에 속한다.
 * 지금은 소유자 한 명(나)만 있지만, 나중에 다른 사람이 자기 World 를 만들거나
 * 자신의 복제 AI(CLONE)를 다른 World 에 "입주"시키는 구조로 넓힐 수 있다.
 */

@Serializable
enum class AgentKind {
    /** 세계의 중심 AI — 나를 가장 잘 아는 개인 비서/파트너. */
    CORE,
    /** 실제 사람을 복제한 AI (나 자신, 또는 나중에 들어올 다른 사람들). */
    CLONE,
    /** 임의로 만든 가상 캐릭터. */
    CHARACTER,
    /** AI 컴퍼니 등 조직에서 역할을 맡은 AI 직원. */
    EMPLOYEE,
}

@Serializable
enum class SpaceType {
    /** 나를 주제로 이야기하는 AI 커뮤니티 (게시판). */
    COMMUNITY,
    /** 나를 중심으로 운영되는 AI 회사. 회의·보고서·의사결정. */
    COMPANY,
    /** 특정 주제를 여러 관점에서 토론하는 공간. */
    FORUM,
}

@Serializable
data class World(
    val id: String,
    val ownerId: String,
    val name: String,
    val description: String,
    val createdAt: Long,
)

@Serializable
data class Agent(
    val id: String,
    val worldId: String,
    val kind: AgentKind,
    val name: String,
    val handle: String,
    val role: String,
    val persona: String,
    val avatar: String,
    val createdAt: Long,
)

@Serializable
data class Space(
    val id: String,
    val worldId: String,
    val type: SpaceType,
    val name: String,
    val description: String,
    val memberAgentIds: List<String> = emptyList(),
)

@Serializable
data class Post(
    val id: String,
    val spaceId: String,
    val authorAgentId: String?,
    val authorName: String,
    val title: String,
    val body: String,
    val createdAt: Long,
    val commentCount: Int = 0,
)

@Serializable
data class Comment(
    val id: String,
    val postId: String,
    val authorAgentId: String?,
    val authorName: String,
    val body: String,
    val createdAt: Long,
)

@Serializable
data class PostDetail(val post: Post, val comments: List<Comment>)

@Serializable
data class Conversation(
    val id: String,
    val agentId: String,
    val title: String,
    val updatedAt: Long,
)

@Serializable
enum class ChatRole { USER, ASSISTANT }

@Serializable
data class ChatMessage(
    val id: String,
    val conversationId: String,
    val role: ChatRole,
    val content: String,
    val createdAt: Long,
)

/** 나(소유자)에 대한 기본 프로필. 모든 AI 가 "나"를 이해하는 출발점. */
@Serializable
data class OwnerProfile(
    val name: String = "",
    val nickname: String = "",
    val bio: String = "",
    val values: String = "",
    val interests: String = "",
    val speakingStyle: String = "",
    val goals: String = "",
)

/** 대화 등에서 쌓이는 나에 대한 기억 한 조각. */
@Serializable
data class Memory(
    val id: String,
    val category: String,
    val content: String,
    val source: String,
    val importance: Int,
    val createdAt: Long,
)

@Serializable
data class MeetingTurn(val agentId: String, val agentName: String, val role: String, val content: String)

@Serializable
data class Meeting(
    val id: String,
    val spaceId: String,
    val topic: String,
    val turns: List<MeetingTurn>,
    val summary: String,
    val createdAt: Long,
)

@Serializable
data class WorldOverview(
    val world: World,
    val owner: OwnerProfile,
    val agents: List<Agent>,
    val spaces: List<Space>,
    val stats: WorldStats,
    val brain: BrainInfo,
)

@Serializable
data class WorldStats(val posts: Int, val comments: Int, val memories: Int, val conversations: Int, val meetings: Int)

@Serializable
data class BrainInfo(val provider: String, val model: String, val online: Boolean)

// ---------- 요청 ----------

@Serializable
data class SendMessageRequest(val agentId: String, val text: String, val conversationId: String? = null)

@Serializable
data class CreateAgentRequest(
    val kind: AgentKind,
    val name: String,
    val role: String,
    val persona: String,
    val avatar: String = "🙂",
    val spaceIds: List<String> = emptyList(),
)

@Serializable
data class CreatePostRequest(val title: String, val body: String)

@Serializable
data class CreateCommentRequest(val body: String)

/** 커뮤니티의 AI 들이 스스로 활동하게 한다 (글/댓글 생성). */
@Serializable
data class TickRequest(val actions: Int = 3)

@Serializable
data class TickResult(val newPosts: List<Post>, val newComments: List<Comment>)

@Serializable
data class MeetingRequest(val topic: String, val rounds: Int = 1)

@Serializable
data class AddMemoryRequest(val category: String, val content: String, val importance: Int = 3)

// ---------- 스트리밍 ----------

/** 채팅 응답 스트림 이벤트 (서버 → 앱, text/event-stream 의 data 줄 하나 = JSON 하나). */
@Serializable
data class ChatStreamEvent(
    val type: Type,
    val conversationId: String? = null,
    val text: String? = null,
    val message: ChatMessage? = null,
) {
    @Serializable
    enum class Type { START, DELTA, DONE, ERROR }
}

@Serializable
data class ApiError(val error: String)
