# Graph Report - LooinRepository  (2026-11-25)

## Corpus Check
- 94 files · ~56,126 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 6, .xml 5, .ttf 2)

## Summary
- 1241 nodes · 3162 edges · 95 communities (41 shown, 54 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc52b53`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OwnerProfile
- reviews.py
- Repository
- imgdiff.py
- Serializable
- Brain
- ChatScreens.kt
- with
- Main.kt
- Markdown.kt
- replica-recon
- .stream
- .one
- caddy
- Recon map: {{app}} ({{platform}})
- ProviderChainBrain
- replica-backend
- replica-build
- Task
- ClaudeBrain.kt
- FilePicker.android.kt
- MainActivity.kt
- replica-brand
- replica-deploy
- replica-entrepreneur
- replica-test
- replica-architect
- replica-design
- replica-diff
- replica-launch
- StoryService.kt
- AppSettings
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- Looin World 아키텍처
- Agent
- Deploy checklist: {{your app}}
- Settings.jvm.kt
- App.kt
- Looin World 로드맵
- .query
- Route
- AppSettings
- World
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- looinjson
- BrainRequest
- App
- MdBlock
- LooinApi
- FileService.kt
- oracle-cloud-init-short.sh
- 4단계 계획: 나만의 모델 만들기
- Phase
- Test
- steps
- build.yml
- FileService
- .claudeRequestCarriesImageAndDocumentBlocks

## God Nodes (most connected - your core abstractions)
1. `Repository` - 88 edges
2. `LooinApi` - 49 edges
3. `BrainRequest` - 45 edges
4. `World` - 44 edges
5. `Brain` - 34 edges
6. `Turn` - 31 edges
7. `AppController` - 30 edges
8. `Space` - 29 edges
9. `Task` - 27 edges
10. `App` - 25 edges

## Surprising Connections (you probably didn't know these)
- `왜 이렇게 만들었나` --references--> `Brain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `두뇌 계층 (`TieredBrain`)` --references--> `Task`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/Brain.kt
- `세계의 구성 (0.5)` --references--> `ChatService`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/service/ChatService.kt
- `세계의 구성 (0.5)` --references--> `WorldSimService`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/service/WorldSimService.kt
- `무료 두뇌 사슬 (`ProviderChainBrain`)` --references--> `ProviderChainBrain`  [INFERRED]
  docs/ARCHITECTURE.md → server/src/main/kotlin/world/looin/server/ai/ProviderChainBrain.kt

## Import Cycles
- None detected.

## Communities (95 total, 54 thin omitted)

### Community 0 - "OwnerProfile"
Cohesion: 0.24
Nodes (3): Prompts, Memory, OwnerProfile

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Repository"
Cohesion: 0.12
Nodes (6): newId(), now(), Repository, sha256(), Seed, Folder

### Community 3 - "imgdiff.py"
Cohesion: 0.07
Nodes (29): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+21 more)

### Community 4 - "Serializable"
Cohesion: 0.06
Nodes (61): ago(), CommunityDoor(), CommunityFeed(), CommunityPostScreen(), DcGallery(), DcPost(), Flair(), RedditFeed() (+53 more)

### Community 5 - "Brain"
Cohesion: 0.13
Nodes (13): AI 수준에 대해 (솔직하게), 두뇌 계층 (`TieredBrain`), 무료 두뇌 사슬 (`ProviderChainBrain`), Brain, BrainUnavailable, TieredBrain, OfflineBrain, SwitchableBrain (+5 more)

### Community 7 - "ChatScreens.kt"
Cohesion: 0.09
Nodes (16): PickedFile, AssistantMessage(), AttachmentChip(), brainLabel(), ChatScreen(), ChatShowcase(), Composer(), hideOpenMarks() (+8 more)

### Community 10 - "with"
Cohesion: 0.22
Nodes (9): with, distribution, files, java-version, make_latest, name, path, prerelease (+1 more)

### Community 11 - "Main.kt"
Cohesion: 0.10
Nodes (3): Providers, Preset, decodeToken()

### Community 13 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 14 - ".stream"
Cohesion: 0.16
Nodes (5): ClaudeBudget, Price, UsageLedger, UsageLedger, UsageLedger

### Community 17 - "caddy"
Cohesion: 0.11
Nodes (17): depends_on, environment, image, ports, restart, volumes, build, env_file (+9 more)

### Community 18 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 19 - "ProviderChainBrain"
Cohesion: 0.16
Nodes (6): ModelPicker, Provider, ProviderChainBrain, State, ThinkFilter, ProviderChainTest

### Community 20 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 21 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 22 - "Task"
Cohesion: 0.13
Nodes (15): Task, CHAT, CHAT_BEST, CHAT_DEEP, CHAT_LIGHT, COMMUNITY, GENERAL, MEETING (+7 more)

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

### Community 34 - "StoryService.kt"
Cohesion: 0.12
Nodes (5): Effort, HIGH, LOW, MEDIUM, Route

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
Cohesion: 0.13
Nodes (22): App(), AppController, BrainSettingsScreen(), ChatHubScreen(), AgentRow(), AkaelLogo(), Avatar(), label() (+14 more)

### Community 43 - "Looin World 로드맵"
Cohesion: 0.29
Nodes (6): ✅ 0.5 — 아카엘다운 경험, ✅ 0단계 — 기반 (지금), 1단계 — 실제로 매일 쓰기, 2단계 — 깊이와 콘텐츠, 3단계 — 확장, Looin World 로드맵

### Community 45 - "Route"
Cohesion: 0.08
Nodes (15): Route, BrainSettings, Chat, CommunityHub, NewAgent, PostRoute, SpaceRoute, Tab (+7 more)

### Community 47 - "World"
Cohesion: 0.22
Nodes (3): 세계의 구성 (0.5), StoryService, World

### Community 71 - "BrainRequest"
Cohesion: 0.15
Nodes (9): Looin World 의 학습과 성장, BrainRequest, Turn, ChatService, NotFound, routerToTask(), GrowthService, MemoryService (+1 more)

### Community 72 - "App"
Cohesion: 0.13
Nodes (11): BrainSettingsStore, Field, buildBrain(), Config, ClaudeConfig, App, main(), module() (+3 more)

### Community 73 - "MdBlock"
Cohesion: 0.36
Nodes (9): MdBlock, Bullet, Code, Heading, Numbered, Paragraph, Quote, Rule (+1 more)

### Community 74 - "LooinApi"
Cohesion: 0.12
Nodes (4): LooinApi, LooinApiException, CreateFolderRequest, VoteRequest

### Community 78 - "4단계 계획: 나만의 모델 만들기"
Cohesion: 0.40
Nodes (5): 4단계 계획: 나만의 모델 만들기, 더 나아가기, 데이터, 운영 — 솔직한 한계, 학습 (무료 GPU)

### Community 79 - "Phase"
Cohesion: 0.29
Nodes (5): rememberFilePicker(), Phase, IDLE, STREAMING, THINKING

### Community 85 - "steps"
Cohesion: 0.25
Nodes (8): runs-on, steps, jobs, build, if, name, run, uses

### Community 86 - "build.yml"
Cohesion: 0.29
Nodes (6): name, on, push, workflow_dispatch, permissions, contents

## Knowledge Gaps
- **49 isolated node(s):** `PostRoute`, `CommunityHub`, `NewAgent`, `BrainSettings`, `Home` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 464 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Repository` connect `Repository` to `OwnerProfile`, `StoryService.kt`, `Serializable`, `looinjson`, `Agent`, `BrainRequest`, `App`, `ProviderChainBrain.kt`, `Main.kt`, `.query`, `FileService.kt`, `World`, `.one`, `FileService`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `PostRoute`, `CommunityHub`, `NewAgent` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `LooinApi` connect `LooinApi` to `InboxWorker.kt`, `WorldScreens.kt`, `ProviderChainBrain.kt`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.12156448202959831 - nodes in this community are weakly interconnected._
- **Why does `ChatRole` connect `Serializable` to `Repository`, `StoryService.kt`, `Brain`, `looinjson`, `BrainRequest`, `ChatScreens.kt`, `ProviderChainBrain.kt`, `WorldFeaturesTest.kt`, `ClaudeBrain.kt`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._