# Graph Report - LooinRepository  (2026-11-24)

## Corpus Check
- 81 files · ~41,612 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 6, .xml 4, .properties 2)

## Summary
- 957 nodes · 2217 edges · 72 communities (34 shown, 38 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `068cf109`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- WorldSimService.kt
- reviews.py
- Repository
- imgdiff.py
- Serializable
- Brain
- ChatScreens.kt
- Config
- steps
- Main.kt
- replica-recon
- BrainSettingsStore
- App
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
- Tab
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
9. `Task` - 21 edges
10. `Post` - 21 edges

## Surprising Connections (you probably didn't know these)
- `왜 이렇게 만들었나` --references--> `Brain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `무료 두뇌 사슬 (`ProviderChainBrain`)` --references--> `ProviderChainBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/ProviderChainBrain.kt
- `Looin World 의 학습과 성장` --references--> `MemoryService`  [INFERRED]
  docs/GROWTH.md → server/src/main/kotlin/world/looin/server/service/MemoryService.kt
- `두뇌 계층 (`TieredBrain`)` --references--> `TieredBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `무료 두뇌 사슬 (`ProviderChainBrain`)` --references--> `OfflineBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/OfflineBrain.kt

## Import Cycles
- None detected.

## Communities (72 total, 38 thin omitted)

### Community 0 - "WorldSimService.kt"
Cohesion: 0.11
Nodes (9): Effort, HIGH, LOW, MEDIUM, JsonExtract, str(), ChatRole, ASSISTANT (+1 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Repository"
Cohesion: 0.07
Nodes (14): Prompts, Db, newId(), now(), Repository, sha256(), Seed, WorldSimService (+6 more)

### Community 3 - "imgdiff.py"
Cohesion: 0.07
Nodes (27): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+19 more)

### Community 4 - "Serializable"
Cohesion: 0.05
Nodes (46): apiRoutes(), NotFound, LooinApi, LooinApiException, AddMemoryRequest, AgentKind, CHARACTER, CLONE (+38 more)

### Community 5 - "Brain"
Cohesion: 0.15
Nodes (10): Brain, TieredBrain, OfflineBrain, buildBrain(), SwitchableBrain, FakeBrain, ClaudeTierTest, Free (+2 more)

### Community 7 - "ChatScreens.kt"
Cohesion: 0.11
Nodes (8): Route, BrainSettings, Chat, NewAgent, PostRoute, SpaceRoute, brainLabel(), Bubble()

### Community 8 - "Config"
Cohesion: 0.31
Nodes (3): Config, ClaudeConfig, ApiTest

### Community 10 - "steps"
Cohesion: 0.08
Nodes (23): runs-on, steps, jobs, build, name, on, push, workflow_dispatch (+15 more)

### Community 11 - "Main.kt"
Cohesion: 0.14
Nodes (4): decodeToken(), main(), module(), ApiError

### Community 13 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 15 - "App"
Cohesion: 0.29
Nodes (4): App, ChatService, GrowthService, MemoryService

### Community 16 - "Common.kt"
Cohesion: 0.15
Nodes (5): AgentRow(), AkaelLogo(), Avatar(), label(), ConnectScreen()

### Community 17 - "caddy"
Cohesion: 0.11
Nodes (17): depends_on, environment, image, ports, restart, volumes, build, env_file (+9 more)

### Community 18 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 19 - "ProviderChainBrain"
Cohesion: 0.14
Nodes (9): Turn, ModelPicker, Provider, ProviderChainBrain, State, Providers, Preset, ThinkFilter (+1 more)

### Community 20 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 21 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 22 - "Task"
Cohesion: 0.12
Nodes (16): AI 수준에 대해 (솔직하게), 두뇌 계층 (`TieredBrain`), 무료 두뇌 사슬 (`ProviderChainBrain`), Task, CHAT, CHAT_BEST, CHAT_DEEP, CHAT_LIGHT (+8 more)

### Community 23 - "ClaudeBrain.kt"
Cohesion: 0.09
Nodes (6): ClaudeBrain, ClaudeBudget, ClaudeModels, Route, Price, UsageLedger

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
Cohesion: 0.06
Nodes (26): DEBIAN_FRONTEND, oracle-cloud-init.sh script, Looin World 아키텍처, 데이터 모델, 멀티 유저 확장 계획 (나중에), 왜 이렇게 만들었나, 한눈에 보기, 1) 서버 만들기 (Oracle 콘솔) (+18 more)

### Community 40 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 42 - "App.kt"
Cohesion: 0.14
Nodes (17): App(), AppController, BrainSettingsScreen(), ChatHubScreen(), ChatScreen(), SectionCard(), SectionTitle(), timeAgo() (+9 more)

### Community 43 - "Looin World 로드맵"
Cohesion: 0.33
Nodes (5): ✅ 0단계 — 기반 (지금), 1단계 — 실제로 매일 쓰기, 2단계 — 깊이와 콘텐츠, 3단계 — 확장, Looin World 로드맵

### Community 45 - "Tab"
Cohesion: 0.40
Nodes (5): Tab, Chat, Home, Me, World

## Knowledge Gaps
- **40 isolated node(s):** `BrainSettings`, `NewAgent`, `PostRoute`, `CHAT`, `CHAT_BEST` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 382 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Repository` connect `Repository` to `WorldSimService.kt`, `Serializable`, `ApiTest.kt`, `Main.kt`, `App`, `ClaudeBrain.kt`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `BrainSettings`, `NewAgent`, `PostRoute` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WorldSimService.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.1076923076923077 - nodes in this community are weakly interconnected._
- **Why does `Post` connect `Repository` to `WorldSimService.kt`, `ApiTest.kt`, `Serializable`, `WorldScreens.kt`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `ChatRole` connect `WorldSimService.kt` to `Repository`, `Serializable`, `BrainRequest`, `ChatScreens.kt`, `ApiTest.kt`, `ProviderChainTest.kt`, `ProviderChainBrain`, `ClaudeBrain.kt`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.06907894736842106 - nodes in this community are weakly interconnected._