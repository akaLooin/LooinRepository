# Graph Report - LooinRepository  (2026-11-24)

## Corpus Check
- 91 files · ~92,928 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 1155 nodes · 2837 edges · 72 communities (50 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a1f4147`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- state.ts
- reviews.py
- GameScene
- game/package.json
- server/package.json
- imgdiff.py
- Live
- actions.ts
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
- Audio
- forge.ts
- app.ts
- scripts
- app.ts
- live.ts
- sprites.ts
- .panelHtml
- compilerOptions
- 백엔드 (Looin Idle 서버)
- stamps.ts
- world.ts
- scene.ts
- mannequin.ts
- Paint
- game.ts
- tasks.test.ts
- Looin Idle (가제)
- contrast.py
- Net
- 그림 규칙 (art spec)
- index.ts
- json
- tasks.ts
- listing.py
- argparse

## God Nodes (most connected - your core abstractions)
1. `applyAction()` - 55 edges
2. `World` - 49 edges
3. `Game` - 48 edges
4. `UI` - 34 edges
5. `derive()` - 31 edges
6. `countItem()` - 30 edges
7. `Account` - 28 edges
8. `Character` - 23 edges
9. `buildApp()` - 22 edges
10. `Live` - 21 edges

## Surprising Connections (you probably didn't know these)
- `권한 모델 (이 게임에서 가장 중요한 결정)` --references--> `computeAfk()`  [INFERRED]
  replica/architecture.md → game/src/core/afk.ts
- `구조` --references--> `computeAfk()`  [INFERRED]
  replica/backend.md → game/src/core/afk.ts
- `장비 겉모습 (game/src/render/gear.ts)` --references--> `remoteGear()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/gear.ts
- `색` --references--> `ramp()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts
- `색` --references--> `lineOf()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts

## Import Cycles
- 2-file cycle: `game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/stamps.ts`
- 2-file cycle: `game/src/core/forge.ts -> game/src/core/state.ts -> game/src/core/forge.ts`
- 2-file cycle: `game/src/core/progress.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 3-file cycle: `game/src/core/forge.ts -> game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/forge.ts`

## Communities (72 total, 22 thin omitted)

### Community 0 - "state.ts"
Cohesion: 0.09
Nodes (36): AFK_BASE, ANVIL, ATTACK_BARS, ATTACK_SLOTS, CARDS, INVENTORY_SIZE, ItemStats, SHOP (+28 more)

### Community 1 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 2 - "GameScene"
Cohesion: 0.10
Nodes (11): canSubclass(), NodeDef, NodeInst, WorldEvent, ensureTextures(), GameScene, label(), MobView (+3 more)

### Community 3 - "game/package.json"
Cohesion: 0.07
Nodes (32): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, devDependencies (+24 more)

### Community 4 - "server/package.json"
Cohesion: 0.10
Nodes (26): @electric-sql/pglite, tsx, @types/node, @types/pg, @types/ws, ws, author, description (+18 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 7 - "actions.ts"
Cohesion: 0.13
Nodes (39): applyAction(), fail(), ok(), res(), classLine(), buyForge(), alignSign(), claimAchievement() (+31 more)

### Community 8 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 10 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 11 - "정찰 지도: Legends of Idleon (Android 우선, 이후 iOS/PC)"
Cohesion: 0.12
Nodes (15): 구성 요소, 규모, 기능 표, 범위 밖 (복제할 수 없거나 해서는 안 되는 것), 새로 추가한 기능 행 (features.csv), 정찰 지도: Legends of Idleon (Android 우선, 이후 iOS/PC), 조작·UI 동작 (확인됨), 추가 정찰 (2026-11-17): 실제 플레이 방식과 UI (+7 more)

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

### Community 40 - "설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)"
Cohesion: 0.22
Nodes (8): API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정), 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장), 스키마, 스택, 조심할 부분, 클라이언트 구조 변경 (참고 화면 기준)

### Community 43 - "ui.ts"
Cohesion: 0.05
Nodes (80): AchieveDef, ACHIEVEMENTS, AFK_MAX_SECONDS, AFK_MIN_SECONDS, BaseClass, baseClass(), BonusKey, BribeDef (+72 more)

### Community 44 - "Audio"
Cohesion: 0.10
Nodes (8): Audio, Sfx, bar, colors, menu, ART, FILL, pixelIcon()

### Community 45 - "forge.ts"
Cohesion: 0.22
Nodes (19): FORGE, SMELTS, emptySlot(), forgeBonus(), forgeCap(), forgeCollect(), forgeLoad(), forgeOil() (+11 more)

### Community 46 - "app.ts"
Cohesion: 0.17
Nodes (12): fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3 (+4 more)

### Community 47 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, migrate, start, test, typecheck

### Community 48 - "app.ts"
Cohesion: 0.15
Nodes (16): HAIR_STYLES, deserialize(), serialize(), acceptSync(), SyncAccount, ActionSchema, buildApp(), sync() (+8 more)

### Community 49 - "live.ts"
Cohesion: 0.14
Nodes (13): ChatLine, cleanText(), colour, Gear, GearMsg, itemId, Join, Msg (+5 more)

### Community 50 - "sprites.ts"
Cohesion: 0.15
Nodes (20): MANNEQUIN_WHITE, ROOT_X, C, grid(), HI, hslToHex(), lineOf(), mixHex() (+12 more)

### Community 51 - ".panelHtml"
Cohesion: 0.10
Nodes (25): achieveReady(), anvilCap(), anvilRate(), canCraft(), haveMat(), recipeLock(), storageCount(), recipeTaskLock() (+17 more)

### Community 52 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 53 - "백엔드 (Looin Idle 서버)"
Cohesion: 0.22
Nodes (8): API, 구조, 배포 (사용자가 할 일), 백엔드 (Looin Idle 서버), 보안 점검표, 설계에서 바꾼 점 (architecture.md 대비), 아직 없는 것, 환경 변수

### Community 54 - "stamps.ts"
Cohesion: 0.17
Nodes (13): BribeEff, BRIBES, STAMP_GROW, STAMP_LV, StampDef, StampEff, bribeBonus(), STAMP_BY_ID (+5 more)

### Community 55 - "world.ts"
Cohesion: 0.05
Nodes (59): AfkRates, afkRates(), computeAfk(), settle(), CARD_BOSS_CHANCE, CARD_BY_ID, CARD_CHANCE, CARD_UNOWNED_MULT (+51 more)

### Community 56 - "scene.ts"
Cohesion: 0.07
Nodes (30): CLASS_NPC, CLASSES, FACILITY_NAMES, ITEMS, NPCS, GEAR, GearDef, gearKey() (+22 more)

### Community 57 - "mannequin.ts"
Cohesion: 0.09
Nodes (30): Anchors, bake(), bakeClip(), BakedClip, BASE, BASE_PX, BIG, cache (+22 more)

### Community 58 - "Paint"
Cohesion: 0.31
Nodes (11): bigEye(), buildAll(), buildIcons(), buildItems(), buildMonsters(), buildObjects(), buildTheme(), buildWeapons() (+3 more)

### Community 59 - "game.ts"
Cohesion: 0.24
Nodes (11): Action, ActionResult, AfkReport, Look, localBackend, NetState, onlineCache, ChatLine (+3 more)

### Community 60 - "tasks.test.ts"
Cohesion: 0.17
Nodes (15): RECIPES, STORAGE_SIZE, TELEPORTS_PER_DAY, newForge(), createCharacter(), emptyBars(), newAccount(), TASK_BY_ID (+7 more)

### Community 61 - "Looin Idle (가제)"
Cohesion: 0.20
Nodes (8): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 서버, 실행, 현재 들어간 것, SaveBackend

### Community 62 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 64 - "그림 규칙 (art spec)"
Cohesion: 0.29
Nodes (6): 그림 규칙 (art spec), 몬스터, 장비 겉모습 (game/src/render/gear.ts), 지형, 캐릭터: 기본 마네킹 + 동작 프레임 + 붙임 지점, 해상도

### Community 65 - "index.ts"
Cohesion: 0.08
Nodes (18): Forge, Account, pg, dir, pool, AppOptions, app, AccountRow (+10 more)

### Community 66 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 67 - "tasks.ts"
Cohesion: 0.14
Nodes (14): STAMPS, refillTeleports(), buyMerit(), MERIT_BY_ID, meritCost(), MeritDef, MeritEff, meritLv() (+6 more)

### Community 68 - "listing.py"
Cohesion: 0.29
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 69 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

## Knowledge Gaps
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Game` connect `Game` to `index.ts`, `GameScene`, `.openLive`, `Live`, `ui.ts`, `Audio`, `world.ts`, `scene.ts`, `game.ts`, `Looin Idle (가제)`, `Net`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `state.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08858858858858859 - nodes in this community are weakly interconnected._
- **Why does `World` connect `world.ts` to `index.ts`, `GameScene`, `Game`, `stamps.ts`, `scene.ts`, `game.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `GameScene` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Why does `phaser` connect `game/package.json` to `scene.ts`, `Audio`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `game/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._