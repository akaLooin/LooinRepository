# Graph Report - LooinRepository  (2026-11-24)

## Corpus Check
- 74 files · ~35,154 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 5, .xml 2, .properties 2)

## Summary
- 802 nodes · 1833 edges · 68 communities (29 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cbfd8f1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Space
- reviews.py
- Repository
- imgdiff.py
- LooinApi
- Common.kt
- WorldScreens.kt
- ChatScreens.kt
- Serializable
- steps
- Main.kt
- replica-recon
- ProviderChainBrain
- ProviderChainTest.kt
- Config
- looin
- Recon map: {{app}} ({{platform}})
- replica-backend
- replica-build
- ThinkFilter
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
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- Looin World 아키텍처
- ApiTest.kt
- Deploy checklist: {{your app}}
- Settings.jvm.kt
- AppController
- Looin World 로드맵
- MemoryService.kt
- ConnectScreen.kt
- AppSettings
- Tab
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- HomeScreen.kt

## God Nodes (most connected - your core abstractions)
1. `Repository` - 60 edges
2. `World` - 30 edges
3. `LooinApi` - 30 edges
4. `Space` - 24 edges
5. `BrainRequest` - 23 edges
6. `OwnerProfile` - 22 edges
7. `Agent` - 20 edges
8. `Post` - 20 edges
9. `Brain` - 19 edges
10. `AppController` - 19 edges

## Surprising Connections (you probably didn't know these)
- `왜 이렇게 만들었나` --references--> `Brain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `두뇌 설정 (서버 `ProviderChainBrain`)` --references--> `ProviderChainBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/ProviderChainBrain.kt
- `두뇌 설정 (서버 `ProviderChainBrain`)` --references--> `OfflineBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/OfflineBrain.kt
- `Looin World 의 학습과 성장` --references--> `MemoryService`  [INFERRED]
  docs/GROWTH.md → server/src/main/kotlin/world/looin/server/service/MemoryService.kt
- `Chat` --references--> `Agent`  [EXTRACTED]
  composeApp/src/commonMain/kotlin/world/looin/app/AppController.kt → shared/src/commonMain/kotlin/world/looin/shared/Models.kt

## Import Cycles
- None detected.

## Communities (68 total, 39 thin omitted)

### Community 0 - "Space"
Cohesion: 0.08
Nodes (24): Brain, BrainRequest, Effort, HIGH, LOW, MEDIUM, Turn, str() (+16 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Repository"
Cohesion: 0.08
Nodes (8): Db, newId(), now(), Repository, sha256(), ChatMessage, Conversation, Insight

### Community 3 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 5 - "Common.kt"
Cohesion: 0.22
Nodes (9): AgentRow(), Avatar(), label(), SectionCard(), SectionTitle(), timeAgo(), TopBar(), MeScreen() (+1 more)

### Community 7 - "ChatScreens.kt"
Cohesion: 0.11
Nodes (5): Route, Chat, NewAgent, PostRoute, SpaceRoute

### Community 8 - "Serializable"
Cohesion: 0.07
Nodes (37): module(), apiRoutes(), Seed, NotFound, AddMemoryRequest, AgentKind, CHARACTER, CLONE (+29 more)

### Community 10 - "steps"
Cohesion: 0.12
Nodes (16): runs-on, steps, jobs, build, name, on, push, workflow_dispatch (+8 more)

### Community 13 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 14 - "ProviderChainBrain"
Cohesion: 0.42
Nodes (3): Provider, ProviderChainBrain, State

### Community 16 - "Config"
Cohesion: 0.22
Nodes (4): Providers, Preset, Config, main()

### Community 17 - "looin"
Cohesion: 0.25
Nodes (7): build, env_file, ports, restart, volumes, services, looin

### Community 18 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 20 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 21 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

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

### Community 37 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 38 - "Looin World 아키텍처"
Cohesion: 0.07
Nodes (26): AI 수준에 대해 (솔직하게), Looin World 아키텍처, 데이터 모델, 두뇌 설정 (서버 `ProviderChainBrain`), 멀티 유저 확장 계획 (나중에), 왜 이렇게 만들었나, 한눈에 보기, 1) 서버 만들기 (+18 more)

### Community 40 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 42 - "AppController"
Cohesion: 0.40
Nodes (8): App(), AppController, Bubble(), ChatHubScreen(), ChatScreen(), Feed(), Meetings(), SpaceScreen()

### Community 43 - "Looin World 로드맵"
Cohesion: 0.33
Nodes (5): ✅ 0단계 — 기반 (지금), 1단계 — 실제로 매일 쓰기, 2단계 — 깊이와 콘텐츠, 3단계 — 확장, Looin World 로드맵

### Community 47 - "Tab"
Cohesion: 0.40
Nodes (5): Tab, Chat, Home, Me, World

## Knowledge Gaps
- **22 isolated node(s):** `NewAgent`, `PostRoute`, `HIGH`, `LOW`, `MEDIUM` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 321 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Repository` connect `Repository` to `Space`, `Serializable`, `Main.kt`, `ProviderChainBrain.kt`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `NewAgent`, `PostRoute`, `HIGH` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Space` be split into smaller, more focused modules?**
  _Cohesion score 0.07958707958707958 - nodes in this community are weakly interconnected._
- **Why does `Post` connect `Space` to `Repository`, `LooinApi`, `WorldScreens.kt`, `ApiTest.kt`, `Serializable`, `ProviderChainBrain.kt`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `Looin World 의 학습과 성장` connect `Looin World 아키텍처` to `Space`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.08461131676361713 - nodes in this community are weakly interconnected._