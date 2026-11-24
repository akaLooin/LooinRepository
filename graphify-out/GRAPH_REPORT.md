# Graph Report - LooinRepository  (2026-11-24)

## Corpus Check
- 68 files · ~31,304 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 3, .xml 2, .properties 2)

## Summary
- 701 nodes · 1571 edges · 65 communities (31 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9340d57c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Space
- reviews.py
- Repository
- imgdiff.py
- LooinApi
- MeScreens.kt
- WorldScreens.kt
- Serializable
- Common.kt
- ClaudeBrain.kt
- replica-recon
- ConnectScreen.kt
- App
- Recon map: {{app}} ({{platform}})
- AppController
- replica-backend
- replica-build
- 실행하기
- Repository.kt
- ChatRole
- MainActivity.kt
- replica-brand
- replica-deploy
- replica-entrepreneur
- replica-test
- replica-architect
- replica-design
- replica-diff
- replica-launch
- Theme.kt
- AppSettings
- Brain
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- Looin World 아키텍처
- main.kt
- Deploy checklist: {{your app}}
- Settings.jvm.kt
- BrainInfo
- Looin World 로드맵
- Route
- Tab
- AppSettings
- AgentKind
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md

## God Nodes (most connected - your core abstractions)
1. `Repository` - 50 edges
2. `LooinApi` - 27 edges
3. `World` - 24 edges
4. `Space` - 24 edges
5. `OwnerProfile` - 21 edges
6. `Agent` - 20 edges
7. `Post` - 20 edges
8. `AppController` - 19 edges
9. `BrainRequest` - 19 edges
10. `Brain` - 17 edges

## Surprising Connections (you probably didn't know these)
- `왜 이렇게 만들었나` --references--> `Brain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `두뇌 설정 (서버 `ClaudeBrain`)` --references--> `ClaudeBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/ClaudeBrain.kt
- `두뇌 설정 (서버 `ClaudeBrain`)` --references--> `OfflineBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/OfflineBrain.kt
- `Chat` --references--> `Agent`  [EXTRACTED]
  composeApp/src/commonMain/kotlin/world/looin/app/AppController.kt → shared/src/commonMain/kotlin/world/looin/shared/Models.kt
- `SpaceRoute` --references--> `Space`  [EXTRACTED]
  composeApp/src/commonMain/kotlin/world/looin/app/AppController.kt → shared/src/commonMain/kotlin/world/looin/shared/Models.kt

## Import Cycles
- None detected.

## Communities (65 total, 34 thin omitted)

### Community 0 - "Space"
Cohesion: 0.08
Nodes (17): BrainRequest, Effort, HIGH, LOW, MEDIUM, Turn, JsonExtract, str() (+9 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Repository"
Cohesion: 0.10
Nodes (5): Db, newId(), now(), Repository, sha256()

### Community 3 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 8 - "Serializable"
Cohesion: 0.28
Nodes (14): AddMemoryRequest, ApiError, Comment, Conversation, CreateAgentRequest, CreateCommentRequest, CreatePostRequest, MeetingRequest (+6 more)

### Community 10 - "Common.kt"
Cohesion: 0.24
Nodes (7): AgentRow(), Avatar(), label(), SectionCard(), SectionTitle(), TopBar(), WorldScreen()

### Community 13 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 16 - "App"
Cohesion: 0.27
Nodes (7): Config, App, main(), module(), apiRoutes(), ApiTest, FakeBrain

### Community 18 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 19 - "AppController"
Cohesion: 0.36
Nodes (9): App(), AppController, Bubble(), ChatHubScreen(), ChatScreen(), timeAgo(), Feed(), Meetings() (+1 more)

### Community 20 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 21 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 22 - "실행하기"
Cohesion: 0.20
Nodes (8): 1) 서버 켜기 (집 PC 등), 2) Android 앱, 3) PC 앱, Looin World, 구조, 비용 참고, 실행하기, 테스트

### Community 23 - "Repository.kt"
Cohesion: 0.22
Nodes (6): Meeting, MeetingTurn, SpaceType, COMMUNITY, COMPANY, FORUM

### Community 24 - "ChatRole"
Cohesion: 0.20
Nodes (10): ChatMessage, ChatRole, ASSISTANT, USER, ChatStreamEvent, Type, DELTA, DONE (+2 more)

### Community 26 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 27 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 28 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 29 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 30 - "replica-architect"
Cohesion: 0.25
Nodes (7): Output, replica-architect, Step 1: the stack, Step 2: the schema, Step 3: the API, Step 4: the parts that bite, Step 5: build order

### Community 31 - "replica-design"
Cohesion: 0.25
Nodes (7): Output, replica-design, Step 1: measure, do not guess, Step 2: write the tokens, Step 3: component specs, Step 4: build the primitives, The rules

### Community 32 - "replica-diff"
Cohesion: 0.25
Nodes (7): Output, replica-diff, Step 1: feature parity, Step 2: layout diff, Step 3: behaviour diff, Step 4: the report, What parity means here

### Community 33 - "replica-launch"
Cohesion: 0.25
Nodes (7): Output, replica-launch, Step 1: landing page, Step 2: pricing, Step 3: store listing, Step 4: launch plan, The rules

### Community 36 - "Brain"
Cohesion: 0.36
Nodes (4): Brain, ChatService, NotFound, MemoryService

### Community 37 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 38 - "Looin World 아키텍처"
Cohesion: 0.29
Nodes (7): AI 수준에 대해 (솔직하게), Looin World 아키텍처, 데이터 모델, 두뇌 설정 (서버 `ClaudeBrain`), 멀티 유저 확장 계획 (나중에), 왜 이렇게 만들었나, 한눈에 보기

### Community 40 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 43 - "Looin World 로드맵"
Cohesion: 0.33
Nodes (5): ✅ 0단계 — 기반 (지금), 1단계 — 실제로 매일 쓰기, 2단계 — 깊이와 콘텐츠, 3단계 — 확장, Looin World 로드맵

### Community 44 - "Route"
Cohesion: 0.40
Nodes (5): Route, Chat, NewAgent, PostRoute, SpaceRoute

### Community 45 - "Tab"
Cohesion: 0.40
Nodes (5): Tab, Chat, Home, Me, World

### Community 47 - "AgentKind"
Cohesion: 0.40
Nodes (5): AgentKind, CHARACTER, CLONE, CORE, EMPLOYEE

## Knowledge Gaps
- **22 isolated node(s):** `PostRoute`, `NewAgent`, `Home`, `Chat`, `World` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 292 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Post` connect `Serializable` to `Space`, `Repository`, `LooinApi`, `WorldScreens.kt`, `LooinApi.kt`, `ApiTest.kt`, `Repository.kt`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `PostRoute`, `NewAgent`, `Home` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Space` be split into smaller, more focused modules?**
  _Cohesion score 0.07971014492753623 - nodes in this community are weakly interconnected._
- **Why does `Repository` connect `Repository` to `Space`, `Brain`, `Main.kt`, `App`, `Repository.kt`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `Brain` connect `Brain` to `Space`, `Looin World 아키텍처`, `BrainInfo`, `Main.kt`, `ClaudeBrain.kt`, `ApiTest.kt`, `App`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.10204081632653061 - nodes in this community are weakly interconnected._