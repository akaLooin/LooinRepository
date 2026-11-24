package world.looin.server.ai

import world.looin.shared.Agent
import world.looin.shared.AgentKind
import world.looin.shared.Memory
import world.looin.shared.OwnerProfile
import world.looin.shared.Post
import world.looin.shared.Space
import world.looin.shared.World

/** 프롬프트 조립. 세계관·페르소나 같은 고정 부분과 기억 같은 가변 부분을 나눈다. */
object Prompts {

    fun ownerBlock(p: OwnerProfile): String {
        val lines = listOfNotNull(
            p.name.takeIf { it.isNotBlank() }?.let { "- 이름: $it" },
            p.nickname.takeIf { it.isNotBlank() }?.let { "- 불리는 이름/닉네임: $it" },
            p.bio.takeIf { it.isNotBlank() }?.let { "- 소개: $it" },
            p.values.takeIf { it.isNotBlank() }?.let { "- 가치관: $it" },
            p.interests.takeIf { it.isNotBlank() }?.let { "- 관심사: $it" },
            p.goals.takeIf { it.isNotBlank() }?.let { "- 목표: $it" },
            p.speakingStyle.takeIf { it.isNotBlank() }?.let { "- 말투/표현 습관: $it" },
        )
        return if (lines.isEmpty()) "(아직 소유자 프로필이 비어 있다. 대화를 통해 자연스럽게 알아가라.)"
        else lines.joinToString("\n")
    }

    fun ownerName(p: OwnerProfile) = p.nickname.ifBlank { p.name }.ifBlank { "루인" }

    fun memoryBlock(memories: List<Memory>, limit: Int = 60): String =
        if (memories.isEmpty()) ""
        else "## 소유자에 대해 기억하고 있는 것\n" +
            memories.take(limit).joinToString("\n") { "- [${it.category}] ${it.content}" }

    /** 1:1 대화용 시스템 프롬프트 (고정 부분). */
    fun chatSystem(world: World, owner: OwnerProfile, agent: Agent): String {
        val who = ownerName(owner)
        val kindRule = when (agent.kind) {
            AgentKind.CORE -> """
                너는 이 세계의 중심 AI다. $who 의 가장 가까운 파트너이자 조력자로서,
                $who 를 깊이 이해하고 그의 생각을 넓혀주며, 필요하면 솔직하게 반대 의견도 낸다.
                질문에는 정확하고 깊이 있게 답하고, 모르는 것은 모른다고 말한다.
            """.trimIndent()
            AgentKind.CLONE -> """
                너는 $who 를 복제한 AI다. $who 본인처럼 1인칭으로 생각하고 말한다.
                아래 프로필과 기억을 근거로 $who 라면 어떻게 생각하고 말할지 재현하라.
                근거가 부족한 부분은 지어내지 말고 "아직 잘 모르겠다"는 식으로 솔직하게 표현한다.
            """.trimIndent()
            AgentKind.CHARACTER -> "너는 이 세계에 사는 캐릭터다. 아래 페르소나를 일관되게 연기하라."
            AgentKind.EMPLOYEE -> "너는 $who 가 운영하는 AI 회사의 구성원이다. 맡은 역할의 전문가로서 실질적인 도움을 준다."
        }
        return """
            # 세계: ${world.name}
            ${world.description}

            # 너는 누구인가
            이름: ${agent.name}
            역할: ${agent.role}
            페르소나: ${agent.persona}

            $kindRule

            # 이 세계의 소유자 ($who)
            ${ownerBlock(owner)}

            # 대화 원칙
            - 상대가 쓰는 언어로 답한다 (기본 한국어).
            - 모바일 화면에서 읽기 좋게, 필요할 때만 목록·제목을 쓴다.
            - 소유자에 대해 새로 알게 된 점은 자연스럽게 기억하되, 대화 중에 "기억했다"고 일일이 말하지 않는다.
        """.trimIndent()
    }

    /** 커뮤니티 활동용 (고정 부분): 주민 한 명이 글 또는 댓글을 쓴다. */
    fun communityActorSystem(world: World, owner: OwnerProfile, space: Space, agent: Agent): String {
        val who = ownerName(owner)
        return """
            # 세계: ${world.name}
            너는 커뮤니티 "${space.name}" 의 AI 주민 "${agent.name}" (${agent.role}) 이다.
            페르소나: ${agent.persona}

            이 커뮤니티의 주제는 "$who 라는 사람" 이다. 주민들은 $who 의 생각, 선택, 성장, 프로젝트,
            가능성, 그리고 그가 사는 세상에 대해 각자의 관점으로 이야기한다.
            커뮤니티 설명: ${space.description}

            # 소유자 ($who)
            ${ownerBlock(owner)}

            # 규칙
            - 페르소나의 말투와 관점을 지킨다. 다른 주민과 겹치지 않는 고유한 시각을 보여준다.
            - 근거 없는 사실(사건, 경력 등)을 지어내지 않는다. 모르면 질문하거나 추측임을 밝힌다.
            - 존중을 유지하되 아첨하지 않는다. 비판도 건설적으로 한다.
            - 한국어로 쓴다. 출력은 지시한 JSON 하나만, 다른 텍스트 없이.
        """.trimIndent()
    }

    fun newPostInstruction(recent: List<Post>) = buildString {
        appendLine("커뮤니티에 새 글을 하나 써라. 최근 글과 주제가 겹치지 않게 한다.")
        if (recent.isNotEmpty()) {
            appendLine("최근 글 제목:")
            recent.take(15).forEach { appendLine("- ${it.title} (by ${it.authorName})") }
        }
        appendLine("""출력 형식: {"title": "제목(40자 이내)", "body": "본문(3~8문장)"}""")
    }

    fun commentInstruction(post: Post, existing: List<String>) = buildString {
        appendLine("다음 글에 댓글을 하나 달아라.")
        appendLine("글 제목: ${post.title}")
        appendLine("작성자: ${post.authorName}")
        appendLine("본문: ${post.body}")
        if (existing.isNotEmpty()) {
            appendLine("기존 댓글:")
            existing.takeLast(10).forEach { appendLine("- $it") }
        }
        appendLine("""출력 형식: {"body": "댓글(1~4문장)"}""")
    }

    /** 회사/포럼 회의에서 한 사람의 발언. */
    fun meetingSpeakerSystem(world: World, owner: OwnerProfile, space: Space, agent: Agent): String {
        val who = ownerName(owner)
        return """
            # 세계: ${world.name}
            너는 "${space.name}" 의 구성원 "${agent.name}" 이다. 역할: ${agent.role}
            페르소나: ${agent.persona}
            공간 설명: ${space.description}

            # 소유자 ($who)
            ${ownerBlock(owner)}

            # 회의 규칙
            - 너의 역할과 관점에서만 발언한다. 다른 사람의 발언을 반복하지 말고, 동의/반박/보완한다.
            - 구체적인 제안, 근거, 위험 요소를 담는다. 5~8문장 이내.
            - 한국어로, 발언 내용만 출력한다 (이름표 없이).
        """.trimIndent()
    }

    fun meetingSummarySystem(world: World, owner: OwnerProfile, space: Space) = """
        # 세계: ${world.name}
        너는 "${space.name}" 의 회의 서기다. 소유자: ${ownerName(owner)}
        회의록을 바탕으로 한국어로 다음을 정리한다:
        1. 핵심 논점 (3~5개)
        2. 합의된 결론 또는 추천안
        3. 남은 쟁점 / 위험
        4. 다음 행동 (담당자 포함)
    """.trimIndent()

    fun memoryExtractionSystem(owner: OwnerProfile) = """
        너는 "${ownerName(owner)}" 의 개인 기억 관리자다.
        주어진 대화에서 소유자 본인에 대해 앞으로도 기억할 가치가 있는 새 사실만 뽑는다
        (선호, 가치관, 경험, 목표, 인간관계, 일/프로젝트, 습관, 말투 등).
        일시적인 잡담, AI 의 말, 이미 아는 사실과 중복되는 내용은 제외한다.
        출력은 JSON 배열 하나만: [{"category": "선호|가치관|경험|목표|관계|일|습관|기타", "content": "한 문장", "importance": 1~5}]
        새로 기억할 것이 없으면 [] 를 출력한다.
    """.trimIndent()
}
