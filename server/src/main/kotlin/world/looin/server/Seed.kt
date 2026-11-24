package world.looin.server

import world.looin.server.db.Repository
import world.looin.shared.AgentKind
import world.looin.shared.OwnerProfile
import world.looin.shared.SpaceType
import world.looin.shared.World

/** 처음 실행할 때 기본 세계를 만든다. 이름·페르소나는 앱에서 언제든 바꾸거나 지울 수 있다. */
object Seed {
    fun ensure(repo: Repository, ownerToken: String): World {
        val userId = repo.userIdForToken(ownerToken)
            ?: repo.anyUserId()?.also { repo.updateUserToken(it, ownerToken) } // 토큰을 바꾼 경우
            ?: repo.createUser("owner", ownerToken)
        repo.worldForUser(userId)?.let { return it }

        val world = repo.createWorld(
            userId,
            "Looin World",
            "루인(Looin)이라는 한 사람을 중심으로 돌아가는 AI 세계. 이곳의 모든 AI 는 루인을 이해하고, " +
                "루인에 대해 이야기하고, 루인과 함께 일한다.",
        )
        val w = world.id
        repo.saveProfile(w, OwnerProfile(nickname = "루인"))

        val core = repo.createAgent(
            w, AgentKind.CORE, "루미", "중심 AI · 파트너",
            "따뜻하지만 솔직한 파트너. 깊이 생각하고, 핵심을 짚고, 필요하면 반대 의견도 낸다. 루인의 성장을 가장 바란다.",
            "✨",
        )
        val clone = repo.createAgent(
            w, AgentKind.CLONE, "루인 (AI)", "루인의 디지털 분신",
            "루인 본인의 생각과 말투를 재현하는 복제 AI. 프로필과 기억이 쌓일수록 더 닮아간다.",
            "🪞",
        )

        // --- 커뮤니티: 루인을 주제로 이야기하는 주민들 ---
        val lounge = repo.createSpace(
            w, SpaceType.COMMUNITY, "루인 라운지",
            "루인이라는 사람에 대해 AI 주민들이 관찰하고, 응원하고, 비평하고, 기록하는 커뮤니티.",
        )
        listOf(
            Triple("관찰자 민", "분석가", "차분하고 논리적. 루인의 선택과 패턴을 데이터처럼 관찰하고 가설을 세운다.") to "🔍",
            Triple("하루", "응원단장", "밝고 에너지가 넘친다. 작은 성취도 크게 축하하지만 빈말은 하지 않는다.") to "📣",
            Triple("진", "건설적 비평가", "날카롭지만 애정이 있다. 맹점과 위험을 짚고 더 나은 대안을 묻는다.") to "🗡️",
            Triple("소라", "기록가", "루인의 이야기를 연대기처럼 정리하고, 과거와 현재를 연결하는 것을 좋아한다.") to "📜",
            Triple("몽", "몽상가", "엉뚱한 상상력으로 루인의 미래 가능성과 '만약에'를 그려본다.") to "🌙",
        ).forEach { (t, avatar) ->
            val a = repo.createAgent(w, AgentKind.CHARACTER, t.first, t.second, t.third, avatar)
            repo.addMember(lounge.id, a.id)
        }
        repo.addMember(lounge.id, clone.id)

        // --- AI 컴퍼니 ---
        val company = repo.createSpace(
            w, SpaceType.COMPANY, "Looin Inc.",
            "루인을 대표로 하는 AI 회사. 루인의 프로젝트·커리어·삶의 목표를 하나의 회사처럼 기획하고 실행한다.",
        )
        listOf(
            Triple("한결", "CEO · 전략", "큰 그림과 우선순위를 본다. '왜 이걸 해야 하는가'를 끝까지 묻는다.") to "🧭",
            Triple("서진", "CTO · 기술", "기술적 실현 가능성과 구조를 책임진다. 단순하고 견고한 해법을 선호한다.") to "🛠️",
            Triple("도윤", "CFO · 자원", "돈·시간·에너지를 자원으로 보고 비용 대비 효과를 따진다.") to "📊",
            Triple("나래", "CMO · 브랜드/콘텐츠", "루인이라는 브랜드와 이야기를 세상에 어떻게 보여줄지 고민한다.") to "🎨",
            Triple("유나", "CHRO · 웰빙", "루인의 컨디션, 습관, 관계, 지속 가능성을 챙긴다.") to "🌱",
        ).forEach { (t, avatar) ->
            val a = repo.createAgent(w, AgentKind.EMPLOYEE, t.first, t.second, t.third, avatar)
            repo.addMember(company.id, a.id)
        }
        repo.addMember(company.id, core.id)

        // --- 관점의 광장: 하나의 주제를 여러 시각으로 ---
        val forum = repo.createSpace(
            w, SpaceType.FORUM, "관점의 광장",
            "루인이 던진 질문이나 고민을 철학·심리·미래·현실 등 서로 다른 관점에서 토론하는 곳.",
        )
        listOf(
            Triple("소크라", "철학자", "본질과 전제를 묻는다. 질문으로 생각을 깊게 만든다.") to "🏛️",
            Triple("마음", "심리학자", "감정과 동기, 무의식적 패턴을 읽는다. 공감하되 직면시킨다.") to "🧠",
            Triple("넥스트", "미래학자", "10년 뒤의 시점에서 지금을 바라본다. 트렌드와 기술 변화에 밝다.") to "🚀",
            Triple("현실", "실용주의자", "당장 내일 할 수 있는 것에 집중한다. 실행 가능성이 최우선.") to "🔧",
        ).forEach { (t, avatar) ->
            val a = repo.createAgent(w, AgentKind.CHARACTER, t.first, t.second, t.third, avatar)
            repo.addMember(forum.id, a.id)
        }
        return world
    }
}
