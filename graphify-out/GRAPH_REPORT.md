# Graph Report - LooinRepository  (2026-11-24)

## Corpus Check
- 81 files · ~43,078 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 6, .xml 4, .ttf 2)

## Summary
- 960 nodes · 2224 edges · 69 communities (34 shown, 35 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1be9173`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Effort
- reviews.py
- Repository
- imgdiff.py
- Serializable
- Brain
- ChatScreens.kt
- .stream
- ApiTest.kt
- steps
- Main.kt
- replica-recon
- Test
- Common.kt
- caddy
- Recon map: {{app}} ({{platform}})
- ProviderChainBrain
- replica-backend
- replica-build
- Task
- ClaudeBrain.kt
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
- Deploy checklist: {{your app}}
- Settings.jvm.kt
- App.kt
- Looin World 로드맵
- ChatRole
- AppController.kt
- AppSettings
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- BrainRequest
- oracle-cloud-init-short.sh

## God Nodes (most connected - your core abstractions)
1. `Repository` - 63 edges
2. `LooinApi` - 34 edges
3. `BrainRequest` - 34 edges
4. `World` - 30 edges
5. `Brain` - 27 edges
6. `Space` - 24 edges
7. `OwnerProfile` - 22 edges
8. `App` - 21 edges
9. `Post` - 21 edges
10. `Task` - 21 edges

## Surprising Connections (you probably didn't know these)
- `왜 이렇게 만들었나` --references--> `Brain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `무료 두뇌 사슬 (`ProviderChainBrain`)` --references--> `ProviderChainBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/ProviderChainBrain.kt
- `두뇌 계층 (`TieredBrain`)` --references--> `TieredBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `무료 두뇌 사슬 (`ProviderChainBrain`)` --references--> `OfflineBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/OfflineBrain.kt
- `Looin World 의 학습과 성장` --references--> `MemoryService`  [INFERRED]
  docs/GROWTH.md → server/src/main/kotlin/world/looin/server/service/MemoryService.kt

## Import Cycles
- None detected.

## Communities (69 total, 35 thin omitted)

### Community 0 - "Effort"
Cohesion: 0.50
Nodes (4): Effort, HIGH, LOW, MEDIUM

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Repository"
Cohesion: 0.05
Nodes (21): Prompts, Db, newId(), now(), Repository, sha256(), Seed, GrowthService (+13 more)

### Community 3 - "imgdiff.py"
Cohesion: 0.07
Nodes (29): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+21 more)

### Community 4 - "Serializable"
Cohesion: 0.06
Nodes (37): apiRoutes(), NotFound, LooinApi, LooinApiException, AddMemoryRequest, AgentKind, CHARACTER, CLONE (+29 more)

### Community 5 - "Brain"
Cohesion: 0.24
Nodes (9): Brain, TieredBrain, ClaudeBrain, UsageLedger, OfflineBrain, buildBrain(), SwitchableBrain, FakeBrain (+1 more)

### Community 9 - "ApiTest.kt"
Cohesion: 0.06
Nodes (6): JsonExtract, str(), SpaceType, COMMUNITY, COMPANY, FORUM

### Community 10 - "steps"
Cohesion: 0.08
Nodes (23): runs-on, steps, jobs, build, name, on, push, workflow_dispatch (+15 more)

### Community 11 - "Main.kt"
Cohesion: 0.06
Nodes (16): 4단계 계획: 나만의 모델 만들기, Looin World 의 학습과 성장, 더 나아가기, 데이터, 운영 — 솔직한 한계, 학습 (무료 GPU), BrainSettingsStore, Field (+8 more)

### Community 13 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 14 - "Test"
Cohesion: 0.42
Nodes (3): ClaudeTierTest, Free, Premium

### Community 16 - "Common.kt"
Cohesion: 0.14
Nodes (5): AgentRow(), AkaelLogo(), Avatar(), label(), ConnectScreen()

### Community 17 - "caddy"
Cohesion: 0.11
Nodes (17): depends_on, environment, image, ports, restart, volumes, build, env_file (+9 more)

### Community 18 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 19 - "ProviderChainBrain"
Cohesion: 0.09
Nodes (8): ModelPicker, Provider, ProviderChainBrain, State, Providers, Preset, ThinkFilter, ProviderChainTest

### Community 20 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 21 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 22 - "Task"
Cohesion: 0.13
Nodes (15): AI 수준에 대해 (솔직하게), 두뇌 계층 (`TieredBrain`), 무료 두뇌 사슬 (`ProviderChainBrain`), Task, CHAT, CHAT_BEST, CHAT_DEEP, CHAT_LIGHT (+7 more)

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
Cohesion: 0.08
Nodes (20): DEBIAN_FRONTEND, oracle-cloud-init.sh script, Looin World 아키텍처, 데이터 모델, 멀티 유저 확장 계획 (나중에), 왜 이렇게 만들었나, 한눈에 보기, 1) 서버 만들기 (Oracle 콘솔) (+12 more)

### Community 40 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 42 - "App.kt"
Cohesion: 0.14
Nodes (17): App(), AppController, BrainSettingsScreen(), ChatHubScreen(), ChatScreen(), SectionCard(), SectionTitle(), timeAgo() (+9 more)

### Community 43 - "Looin World 로드맵"
Cohesion: 0.33
Nodes (5): ✅ 0단계 — 기반 (지금), 1단계 — 실제로 매일 쓰기, 2단계 — 깊이와 콘텐츠, 3단계 — 확장, Looin World 로드맵

### Community 44 - "ChatRole"
Cohesion: 0.16
Nodes (4): BrainUnavailable, ChatRole, ASSISTANT, USER

### Community 45 - "AppController.kt"
Cohesion: 0.12
Nodes (11): Route, BrainSettings, Chat, NewAgent, PostRoute, SpaceRoute, Tab, Chat (+3 more)

### Community 71 - "BrainRequest"
Cohesion: 0.22
Nodes (4): BrainRequest, Turn, ChatService, routerToTask()

## Knowledge Gaps
- **40 isolated node(s):** `BrainSettings`, `NewAgent`, `PostRoute`, `HIGH`, `LOW` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 382 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Repository` connect `Repository` to `Brain`, `BrainRequest`, `.stream`, `ApiTest.kt`, `Main.kt`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `BrainSettings`, `NewAgent`, `PostRoute` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `Post` connect `Repository` to `ApiTest.kt`, `Serializable`, `WorldScreens.kt`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.05319776009431182 - nodes in this community are weakly interconnected._
- **Why does `ChatRole` connect `ChatRole` to `Repository`, `Serializable`, `BrainRequest`, `ChatScreens.kt`, `ApiTest.kt`, `ProviderChainBrain`, `ClaudeBrain.kt`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._