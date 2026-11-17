# Graph Report - LooinRepository  (2026-11-17)

## Corpus Check
- 79 files · ~66,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 912 nodes · 2052 edges · 56 communities (39 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `724eed44`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- core.test.ts
- reviews.py
- sprites.ts
- package.json
- server/package.json
- imgdiff.py
- World
- .panelHtml
- replica-recon
- ExampleInstrumentedTest.java
- Recon map: {{app}} ({{platform}})
- 정찰 지도: Legends of Idleon (Android 우선, 이후 iOS/PC)
- compilerOptions
- replica-backend
- replica-build
- replica-brand
- replica-deploy
- replica-entrepreneur
- replica-test
- replica-architect
- replica-design
- replica-diff
- replica-launch
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- Deploy checklist: {{your app}}
- CLAUDE.md
- MainActivity.java
- graphify-stop.sh
- bug-report.md
- test-plan.md
- Game
- 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)
- build-log.md
- components.md
- ui.ts
- world.ts
- Account
- app.ts
- state.ts
- buildApp
- live.ts
- api.test.ts
- SqlStore
- compilerOptions
- 백엔드 (Looin Idle 서버)
- derive
- Looin Idle (가제)

## God Nodes (most connected - your core abstractions)
1. `World` - 48 edges
2. `Game` - 47 edges
3. `applyAction()` - 31 edges
4. `derive()` - 24 edges
5. `UI` - 22 edges
6. `Character` - 22 edges
7. `boot()` - 21 edges
8. `Account` - 21 edges
9. `buildApp()` - 21 edges
10. `Live` - 19 edges

## Surprising Connections (you probably didn't know these)
- `권한 모델 (이 게임에서 가장 중요한 결정)` --references--> `computeAfk()`  [INFERRED]
  replica/architecture.md → game/src/core/afk.ts
- `구조` --references--> `computeAfk()`  [INFERRED]
  replica/backend.md → game/src/core/afk.ts
- `멀티 전환을 위한 설계` --references--> `SaveBackend`  [INFERRED]
  game/README.md → game/src/game.ts
- `구조` --references--> `SaveBackend`  [INFERRED]
  game/README.md → game/src/game.ts
- `AccountRow` --references--> `Account`  [EXTRACTED]
  server/src/store.ts → game/src/core/state.ts

## Import Cycles
- None detected.

## Communities (56 total, 17 thin omitted)

### Community 0 - "core.test.ts"
Cohesion: 0.16
Nodes (35): applyAction(), fail(), ok(), res(), RECIPES, stackGroup(), addItem(), addItemSome() (+27 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "sprites.ts"
Cohesion: 0.16
Nodes (23): AXE, buildAll(), buildItems(), buildLook(), buildMonsters(), buildObjects(), buildTheme(), buildWeapons() (+15 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (32): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, devDependencies (+24 more)

### Community 4 - "server/package.json"
Cohesion: 0.08
Nodes (32): @electric-sql/pglite, tsx, @types/node, @types/pg, @types/ws, ws, author, description (+24 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 6 - "World"
Cohesion: 0.05
Nodes (27): FACILITY_NAMES, MonsterDef, NodeDef, Platform, PortalDef, SMASH_RANGE, Derived, clamp() (+19 more)

### Community 7 - ".panelHtml"
Cohesion: 0.07
Nodes (18): Audio, Sfx, iconUrl(), portraitUrl(), bar, colors, menu, ART (+10 more)

### Community 8 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 10 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 11 - "정찰 지도: Legends of Idleon (Android 우선, 이후 iOS/PC)"
Cohesion: 0.18
Nodes (10): 구성 요소, 규모, 기능 표, 범위 밖 (복제할 수 없거나 해서는 안 되는 것), 정찰 지도: Legends of Idleon (Android 우선, 이후 iOS/PC), 추정 데이터 모델, 출처, 핵심 루프 (+2 more)

### Community 12 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 13 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 14 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 15 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 16 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 17 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 18 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 19 - "replica-architect"
Cohesion: 0.25
Nodes (7): Output, replica-architect, Step 1: the stack, Step 2: the schema, Step 3: the API, Step 4: the parts that bite, Step 5: build order

### Community 20 - "replica-design"
Cohesion: 0.25
Nodes (7): Output, replica-design, Step 1: measure, do not guess, Step 2: write the tokens, Step 3: component specs, Step 4: build the primitives, The rules

### Community 21 - "replica-diff"
Cohesion: 0.25
Nodes (7): Output, replica-diff, Step 1: feature parity, Step 2: layout diff, Step 3: behaviour diff, Step 4: the report, What parity means here

### Community 22 - "replica-launch"
Cohesion: 0.25
Nodes (7): Output, replica-launch, Step 1: landing page, Step 2: pricing, Step 3: store listing, Step 4: launch plan, The rules

### Community 23 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 24 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 38 - "Game"
Cohesion: 0.06
Nodes (19): 구조, 멀티 전환을 위한 설계, Action, ActionResult, AfkReport, Look, serialize(), Game (+11 more)

### Community 40 - "설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)"
Cohesion: 0.22
Nodes (8): API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정), 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장), 스키마, 스택, 조심할 부분, 클라이언트 구조 변경 (참고 화면 기준)

### Community 43 - "ui.ts"
Cohesion: 0.07
Nodes (42): AFK_BASE, ANVIL, CARD_SLOTS, CardDef, cardNext(), CLASS_NPC, ClassDef, CLASSES (+34 more)

### Community 44 - "world.ts"
Cohesion: 0.08
Nodes (40): computeAfk(), settle(), AFK_MAX_SECONDS, AFK_MIN_SECONDS, CARD_BOSS_CHANCE, CARD_CHANCE, CARD_UNOWNED_MULT, CARDS (+32 more)

### Community 45 - "Account"
Cohesion: 0.15
Nodes (6): Account, AppOptions, AccountRow, MemoryStore, Row, Store

### Community 46 - "app.ts"
Cohesion: 0.11
Nodes (19): SyncAccount, fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies, fastify@^5.12.8 (+11 more)

### Community 47 - "state.ts"
Cohesion: 0.13
Nodes (23): CLASS_LEVEL, INVENTORY_SIZE, MAX_CHARACTERS, StackGroup, STORAGE_SIZE, acceptQuest(), Activity, AnvilSlot (+15 more)

### Community 48 - "buildApp"
Cohesion: 0.19
Nodes (14): createCharacter(), deserialize(), newAccount(), acceptSync(), setup(), clone(), look, play() (+6 more)

### Community 49 - "live.ts"
Cohesion: 0.16
Nodes (10): ChatLine, cleanText(), colour, Join, Msg, PlayerInfo, Pos, registerLive() (+2 more)

### Community 50 - "api.test.ts"
Cohesion: 0.22
Nodes (7): pg, dir, pool, app, migrate(), look, setup()

### Community 51 - "SqlStore"
Cohesion: 0.20
Nodes (4): Sql, SqlStore, toRow(), makeStores()

### Community 52 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 53 - "백엔드 (Looin Idle 서버)"
Cohesion: 0.22
Nodes (8): API, 구조, 배포 (사용자가 할 일), 백엔드 (Looin Idle 서버), 보안 점검표, 설계에서 바꾼 점 (architecture.md 대비), 아직 없는 것, 환경 변수

### Community 55 - "derive"
Cohesion: 0.33
Nodes (8): AfkRates, afkRates(), cardTier(), GatherSkill, derive(), dmgTaken(), equipStats(), hitChance()

### Community 56 - "Looin Idle (가제)"
Cohesion: 0.33
Nodes (5): Looin Idle (가제), 다음 단계(제안), 서버, 실행, 현재 들어간 것

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `World` connect `World` to `core.test.ts`, `Game`, `world.ts`, `buildApp`, `api.test.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05875251509054326 - nodes in this community are weakly interconnected._
- **Why does `Game` connect `Game` to `World`, `.panelHtml`, `ui.ts`, `world.ts`, `Account`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Why does `phaser` connect `package.json` to `World`, `.panelHtml`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._