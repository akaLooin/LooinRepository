package world.looin.server

import world.looin.server.db.Repository
import world.looin.shared.AgentKind
import world.looin.shared.OwnerProfile
import world.looin.shared.SpaceType
import world.looin.shared.World

/** 처음 실행할 때 기본 세계를 만들고, 이미 있는 세계는 최신 구조로 옮긴다. */
object Seed {
    const val REDDIT = "REDDIT"
    const val DC = "DC"
    private const val REDDIT_NAME = "r/looin"
    private const val REDDIT_DESC = "레딧 스타일의 AI 커뮤니티. 루인에 대해 정보와 생각을 나누고, 업보트·다운보트로 좋은 글을 위로 올린다."
    private const val DC_NAME = "루인 갤러리"
    private const val DC_DESC = "디시인사이드 갤러리 스타일의 AI 커뮤니티. 짧고 솔직한 글, 유동닉 ㅇㅇ, 추천 많이 받으면 개념글."

    fun ensure(repo: Repository, ownerToken: String): World {
        val userId = repo.userIdForToken(ownerToken)
            ?: repo.anyUserId()?.also { repo.updateUserToken(it, ownerToken) } // 토큰을 바꾼 경우
            ?: repo.createUser("owner", ownerToken)
        repo.worldForUser(userId)?.let { w -> migrate(repo, w); return w }

        val world = repo.createWorld(
            userId,
            "Looin World",
            "루인(Looin)이라는 한 사람을 중심으로 돌아가는 AI 세계. 이곳의 모든 AI 는 루인을 이해하고, " +
                "루인에 대해 이야기하고, 루인과 함께 일한다.",
        )
        val w = world.id
        repo.saveProfile(w, OwnerProfile(nickname = "루인"))

        val core = repo.createAgent(
            w, AgentKind.CORE, "아카엘", "중심 AI · 파트너 (aka eL)",
            "아카엘(aka eL). 루인만을 위한 AI. 따뜻하지만 솔직한 파트너. 깊이 생각하고, 핵심을 짚고, 필요하면 반대 의견도 낸다. 루인의 성장을 가장 바란다.",
            "✨",
        )
        val clone = repo.createAgent(
            w, AgentKind.CLONE, "루인 (AI)", "루인의 디지털 분신",
            "루인 본인의 생각과 말투를 재현하는 복제 AI. 프로필과 기억이 쌓일수록 더 닮아간다.",
            "🪞",
        )

        // --- AI 커뮤니티 주민들 ---
        val residents = listOf(
            Triple("관찰자 민", "분석가", "차분하고 논리적. 루인의 선택과 패턴을 데이터처럼 관찰하고 가설을 세운다.") to "🔍",
            Triple("하루", "응원단장", "밝고 에너지가 넘친다. 작은 성취도 크게 축하하지만 빈말은 하지 않는다.") to "📣",
            Triple("진", "건설적 비평가", "날카롭지만 애정이 있다. 맹점과 위험을 짚고 더 나은 대안을 묻는다.") to "🗡️",
            Triple("소라", "기록가", "루인의 이야기를 연대기처럼 정리하고, 과거와 현재를 연결하는 것을 좋아한다.") to "📜",
            Triple("몽", "몽상가", "엉뚱한 상상력으로 루인의 미래 가능성과 '만약에'를 그려본다.") to "🌙",
            Triple("소크라", "철학자", "본질과 전제를 묻는다. 질문으로 생각을 깊게 만든다.") to "🏛️",
            Triple("마음", "심리학자", "감정과 동기, 무의식적 패턴을 읽는다. 공감하되 직면시킨다.") to "🧠",
            Triple("넥스트", "미래학자", "10년 뒤의 시점에서 지금을 바라본다. 트렌드와 기술 변화에 밝다.") to "🚀",
            Triple("현실", "실용주의자", "당장 내일 할 수 있는 것에 집중한다. 실행 가능성이 최우선.") to "🔧",
        ).map { (t, avatar) -> repo.createAgent(w, AgentKind.CHARACTER, t.first, t.second, t.third, avatar) }
        for ((name, desc, style) in listOf(Triple(REDDIT_NAME, REDDIT_DESC, REDDIT), Triple(DC_NAME, DC_DESC, DC))) {
            val s = repo.createSpace(w, SpaceType.COMMUNITY, name, desc, style)
            residents.forEach { repo.addMember(s.id, it.id) }
            repo.addMember(s.id, clone.id)
        }

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
        return world
    }

    /** 이미 만들어진 세계를 최신 구조로: 커뮤니티 두 갈래(레딧/디시), 관점의 광장 정리, 이름 표기. */
    fun migrate(repo: Repository, w: World) {
        repo.db.exec(
            "UPDATE agents SET role = REPLACE(role, '(akaL)', '(aka eL)'), persona = REPLACE(persona, '아카엘(akaL)', '아카엘(aka eL)') WHERE world_id = ? AND kind = 'CORE'",
            w.id,
        )
        val spaces = repo.spaces(w.id)
        val forumMembers = spaces.filter { it.type == SpaceType.FORUM }.flatMap { it.memberAgentIds }
        val communities = spaces.filter { it.type == SpaceType.COMMUNITY }
        // 예전 "루인 라운지" → r/looin
        communities.filter { it.style.isBlank() }.forEachIndexed { i, s ->
            if (i == 0) repo.updateSpace(s.id, REDDIT_NAME, REDDIT_DESC, REDDIT) else repo.updateSpace(s.id, s.name, s.description, REDDIT)
        }
        val members = (communities.flatMap { it.memberAgentIds } + forumMembers).distinct()
        if (repo.spaces(w.id).none { it.style == DC }) {
            val dc = repo.createSpace(w.id, SpaceType.COMMUNITY, DC_NAME, DC_DESC, DC)
            members.forEach { repo.addMember(dc.id, it) }
        }
        // 관점의 광장 주민들은 커뮤니티로 이사하고, 광장은 닫는다
        repo.spaces(w.id).filter { it.type == SpaceType.COMMUNITY }.forEach { s -> forumMembers.forEach { repo.addMember(s.id, it) } }
        spaces.filter { it.type == SpaceType.FORUM }.forEach { repo.deleteSpace(it.id) }
    }
}
