# Graph Report - LooinRepository  (2026-11-25)

## Corpus Check
- 109 files · ~187,924 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 1806 nodes · 5117 edges · 105 communities (80 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27698ae6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- actions.ts
- reviews.py
- worship.ts
- game/package.json
- server/package.json
- imgdiff.py
- ui.ts
- afk.ts
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
- Live
- build-log.md
- components.md
- progress.ts
- main.ts
- ui/minigames.ts
- World
- scripts
- breeding.ts
- live.ts
- sprites.ts
- api.test.ts
- compilerOptions
- game.ts
- Net
- worldmap.ts
- Paint
- mannequin.ts
- state.ts
- data.ts
- tasks.ts
- forge.ts
- Looin Idle (가제)
- countItem
- Account
- Store
- world.ts
- newAccount
- companions.ts
- core.test.ts
- contrast.py
- Audio
- alchemy.ts
- haveMat
- json
- .panelHtml
- core/minigames.ts
- listing.py
- post.ts
- dependencies
- argparse
- build.ts
- app.ts
- BonusKey
- alchSettle
- 그림 규칙 (art spec)
- UI
- original.test.ts
- 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)
- gear.ts
- traps.ts
- progress.test.ts
- SqlStore
- shrines.ts
- tasks.test.ts
- Music
- devDependencies
- design-page.ts
- 백엔드 (Looin Idle 서버)
- upBubble
- anvilTick
- scripts
- fixAlch
- upLiquid

## God Nodes (most connected - your core abstractions)
1. `applyAction()` - 133 edges
2. `World` - 56 edges
3. `Account` - 55 edges
4. `Game` - 49 edges
5. `countItem()` - 41 edges
6. `UI` - 40 edges
7. `Character` - 39 edges
8. `deserialize()` - 38 edges
9. `derive()` - 35 edges
10. `newAccount()` - 34 edges

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
- 2-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/post.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/traps.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/alchemy.ts -> game/src/core/state.ts -> game/src/core/alchemy.ts`
- 2-file cycle: `game/src/core/cooking.ts -> game/src/core/state.ts -> game/src/core/cooking.ts`
- 2-file cycle: `game/src/core/breeding.ts -> game/src/core/state.ts -> game/src/core/breeding.ts`
- 2-file cycle: `game/src/core/shrines.ts -> game/src/core/state.ts -> game/src/core/shrines.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/worship.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/build.ts -> game/src/core/state.ts -> game/src/core/build.ts`
- 2-file cycle: `game/src/core/lab.ts -> game/src/core/state.ts -> game/src/core/lab.ts`
- 2-file cycle: `game/src/core/progress.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 2-file cycle: `game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/stamps.ts`
- 2-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/companions.ts`
- 2-file cycle: `game/src/core/forge.ts -> game/src/core/state.ts -> game/src/core/forge.ts`
- 2-file cycle: `game/src/core/minigames.ts -> game/src/core/state.ts -> game/src/core/minigames.ts`
- 3-file cycle: `game/src/core/arcade.ts -> game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/arcade.ts`
- 3-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/post.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/post.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/progress.ts -> game/src/core/traps.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/traps.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/alchemy.ts -> game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/alchemy.ts`

## Communities (105 total, 25 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.08
Nodes (59): applyAction(), fail(), ok(), res(), toggleBig(), arcadeSettle(), poppySettle(), shootBall() (+51 more)

### Community 1 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 2 - "worship.ts"
Cohesion: 0.13
Nodes (24): accClassSkillMult(), classSkillMult(), boltEvery(), chargeCap(), chargeNow(), chargeRate(), lvOf(), PRAYER (+16 more)

### Community 3 - "game/package.json"
Cohesion: 0.13
Nodes (18): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, keywords (+10 more)

### Community 4 - "server/package.json"
Cohesion: 0.10
Nodes (26): @electric-sql/pglite, tsx, @types/node, @types/pg, @types/ws, ws, author, description (+18 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 6 - "ui.ts"
Cohesion: 0.08
Nodes (42): chefMult(), COOK, CookAcc, hashStr(), Kitchen, kitchenSpeed(), KitchenUp, MEAL (+34 more)

### Community 7 - "afk.ts"
Cohesion: 0.14
Nodes (20): settle(), AFK_MIN_SECONDS, CARD_BY_ID, CARD_CHANCE, CARD_UNOWNED_MULT, crystalOf(), crystals, GatherSkill (+12 more)

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

### Community 38 - "Game"
Cohesion: 0.17
Nodes (3): serialize(), Game, boot()

### Community 43 - "progress.ts"
Cohesion: 0.07
Nodes (42): arcadeBonus(), poppyBonus(), breedBonus(), owlValue(), petValue(), cookBonus(), ACHIEVEMENTS, CARD_PRESET_LV (+34 more)

### Community 44 - "main.ts"
Cohesion: 0.15
Nodes (9): Sfx, DORIAN, MAJOR, MINOR, PENTA, Song, songFor(), SONGS (+1 more)

### Community 45 - "ui/minigames.ts"
Cohesion: 0.11
Nodes (13): canvases, C, chargeGame(), Game, makeGame(), PlayKind, PlayResult, runGame() (+5 more)

### Community 46 - "World"
Cohesion: 0.05
Nodes (24): arenaOf(), Platform, Rng, Derived, lookOf(), clamp(), World, WorldEvent (+16 more)

### Community 47 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, migrate, start, test, typecheck

### Community 48 - "breeding.ts"
Cohesion: 0.09
Nodes (43): ARENA_COOLDOWN, ARENA_TEAM, arenaPower(), arenaWave(), BAcc, BPet, breedLevel(), breedSettle() (+35 more)

### Community 49 - "live.ts"
Cohesion: 0.13
Nodes (13): ChatLine, cleanText(), colour, Gear, GearMsg, itemId, Join, Msg (+5 more)

### Community 50 - "sprites.ts"
Cohesion: 0.12
Nodes (24): TALENTS, ROOT_X, ART, C, frameDefs, grid(), HI, hslToHex() (+16 more)

### Community 51 - "api.test.ts"
Cohesion: 0.13
Nodes (10): pg, dir, pool, app, AccountRow, MemoryStore, migrate(), Row (+2 more)

### Community 52 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 53 - "game.ts"
Cohesion: 0.20
Nodes (12): Action, ActionResult, AfkReport, Look, Input, localBackend, NetState, onlineCache (+4 more)

### Community 55 - "worldmap.ts"
Cohesion: 0.17
Nodes (18): arch(), blob(), deco(), FILL, flower(), house(), MapRegion, peak() (+10 more)

### Community 56 - "Paint"
Cohesion: 0.33
Nodes (11): bigEye(), buildAll(), buildIcons(), buildItems(), buildMonsters(), buildObjects(), buildTheme(), buildWeapons() (+3 more)

### Community 57 - "mannequin.ts"
Cohesion: 0.08
Nodes (37): GEAR, Anchors, bake(), bakeClip(), BakedClip, BASE, BASE_PX, BIG (+29 more)

### Community 58 - "state.ts"
Cohesion: 0.07
Nodes (36): AFK_BASE, ANVIL, ATTACK_BARS, ATTACK_SLOTS, BIRTH_SIGNS, CARDS, ClassId, FOOD_SLOTS (+28 more)

### Community 59 - "data.ts"
Cohesion: 0.03
Nodes (88): AchieveDef, ArenaDef, ASTRO_QUESTS, BribeDef, CARAVAN_QUESTS, CARD_MAX_TIER, CARD_TIERS, CardBonus (+80 more)

### Community 60 - "tasks.ts"
Cohesion: 0.14
Nodes (14): STAMPS, buyMerit(), MERIT_BY_ID, meritCost(), MeritDef, MeritEff, meritLv(), MERITS (+6 more)

### Community 61 - "forge.ts"
Cohesion: 0.21
Nodes (19): FORGE, SMELTS, buyForge(), emptySlot(), forgeBonus(), forgeCap(), forgeCollect(), forgeLoad() (+11 more)

### Community 62 - "Looin Idle (가제)"
Cohesion: 0.20
Nodes (8): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 서버, 실행, 현재 들어간 것, SaveBackend

### Community 63 - "countItem"
Cohesion: 0.13
Nodes (27): depositShards(), BribeEff, BRIBES, STAMP_GROW, STAMP_LV, StampDef, StampEff, placeObol() (+19 more)

### Community 64 - "Account"
Cohesion: 0.11
Nodes (19): Alch, ARC, ARCADE, Arcade, newArcade(), newPoppy(), POPPY, Poppy (+11 more)

### Community 66 - "world.ts"
Cohesion: 0.06
Nodes (37): BaseClass, CARD_BOSS_CHANCE, CLASS_LEVEL, CLASS_NPCS, CLEAVE_RANGE, FACILITY_NAMES, healPct(), MapDef (+29 more)

### Community 67 - "newAccount"
Cohesion: 0.15
Nodes (22): newAlch(), fixBreed(), newBreed(), newBuild(), newOwl(), newForge(), newLab(), newTotem() (+14 more)

### Community 68 - "companions.ts"
Cohesion: 0.12
Nodes (21): Owl, owlCost(), owlPerHour(), owlSettle(), owlUpgrade(), petOwned(), petPlus(), plusPet() (+13 more)

### Community 69 - "core.test.ts"
Cohesion: 0.09
Nodes (45): AfkRates, afkRates(), computeAfk(), stackGroup(), takeObol(), acceptQuest(), addItem(), addItemSome() (+37 more)

### Community 70 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 72 - "alchemy.ts"
Cohesion: 0.07
Nodes (29): ADJ, AlchAcc, B(), BUBBLE_MAX_LV, BUBBLES, BUBBLES_PER, CauldronDef, CauldronId (+21 more)

### Community 73 - "haveMat"
Cohesion: 0.27
Nodes (12): upVial(), petFreeReady(), pullPet(), deliver(), orderReward(), postRefresh(), streakNow(), buildShrine() (+4 more)

### Community 74 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 75 - ".panelHtml"
Cohesion: 0.13
Nodes (20): cardNext(), gateTo(), achieveProgress(), achieveReady(), canTeleportTo(), gateChecks(), gateOpen(), mapQuota() (+12 more)

### Community 76 - "core/minigames.ts"
Cohesion: 0.17
Nodes (15): BLESS, BlessKey, finishGame(), GameKind, gameReward(), GAMES, hourKey(), legacyTotemSouls() (+7 more)

### Community 77 - "listing.py"
Cohesion: 0.29
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 78 - "post.ts"
Cohesion: 0.12
Nodes (17): MAPS, WORLDS, BOX_BY_ID, boxCost(), BoxDef, BOXES, COMPANIES, CompanyDef (+9 more)

### Community 79 - "dependencies"
Cohesion: 0.17
Nodes (12): fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3 (+4 more)

### Community 80 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

### Community 81 - "build.ts"
Cohesion: 0.09
Nodes (32): ATOM_MAX, atomBonus(), atomCost(), ATOMS, bookHours(), BUILD, BUILD_MAP, buildBonus() (+24 more)

### Community 82 - "app.ts"
Cohesion: 0.12
Nodes (16): HAIR_STYLES, deleteCharacter(), acceptSync(), SyncAccount, ActionSchema, buildApp(), sync(), withAccount() (+8 more)

### Community 83 - "BonusKey"
Cohesion: 0.14
Nodes (14): BubbleDef, SigilDef, VialDef, ArcadeBonus, SpeciesDef, AtomDef, BuildingDef, MealDef (+6 more)

### Community 84 - "alchSettle"
Cohesion: 0.25
Nodes (11): alchSettle(), assignAlch(), bigSlots(), brewNeed(), brewRate(), charsAt(), liquidCap(), liquidOpen() (+3 more)

### Community 85 - "그림 규칙 (art spec)"
Cohesion: 0.22
Nodes (8): remoteGear(), 그림 규칙 (art spec), 몬스터, 몸 방향 (2026-11-25), 장비 겉모습 (game/src/render/gear.ts), 지형, 캐릭터: 기본 마네킹 + 동작 프레임 + 붙임 지점, 해상도

### Community 86 - "UI"
Cohesion: 0.08
Nodes (27): baseClass(), classLine(), classTier(), isHiddenLine(), maxTierOf(), signSlots(), talentTab(), achCount() (+19 more)

### Community 87 - "original.test.ts"
Cohesion: 0.06
Nodes (39): SIGILS, BREED, RARITY_MULT, BUILDING, COG_HOURS, SALTS, AFK_MAX_SECONDS, ARENAS (+31 more)

### Community 89 - "설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)"
Cohesion: 0.22
Nodes (8): API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정), 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장), 스키마, 스택, 조심할 부분, 클라이언트 구조 변경 (참고 화면 기준)

### Community 90 - "gear.ts"
Cohesion: 0.18
Nodes (10): CLASSES, GearDef, GearOn, GOLD, MOSS, paintGear(), WOOD, HEAD_DROP (+2 more)

### Community 91 - "traps.ts"
Cohesion: 0.15
Nodes (18): hash(), CRITTER, SHINY_BONUS, SHINY_CHANCE, shinyLevel(), TRAP_BOX, TRAP_BOXES, TRAP_TIMES (+10 more)

### Community 92 - "progress.test.ts"
Cohesion: 0.11
Nodes (18): ARENA, arenaWaves(), canSubclass(), HIDDEN_CLASS, HIDDEN_TIERS, nextClasses(), STACK_BASE, SUBCLASS_LEVEL (+10 more)

### Community 93 - "SqlStore"
Cohesion: 0.22
Nodes (3): Sql, SqlStore, toRow()

### Community 94 - "shrines.ts"
Cohesion: 0.20
Nodes (10): TOWNS, charsOn(), newShrines(), SHRINE, SHRINE_MAX, shrineNeed(), shrineRate(), SHRINES (+2 more)

### Community 95 - "tasks.test.ts"
Cohesion: 0.25
Nodes (6): RECIPES, SHOP, STORAGE_SIZE, TASK_BY_ID, look, setup()

### Community 97 - "devDependencies"
Cohesion: 0.20
Nodes (9): devDependencies, @capacitor/cli@^7.6.10, typescript@^5.9.3, vite@^6.4.6, vitest@^3.2.7, typescript, vitest, @capacitor/cli (+1 more)

### Community 98 - "design-page.ts"
Cohesion: 0.22
Nodes (6): bar, colors, menu, ART, FILL, pixelIcon()

### Community 99 - "백엔드 (Looin Idle 서버)"
Cohesion: 0.22
Nodes (8): API, 구조, 배포 (사용자가 할 일), 백엔드 (Looin Idle 서버), 보안 점검표, 설계에서 바꾼 점 (architecture.md 대비), 아직 없는 것, 환경 변수

### Community 100 - "upBubble"
Cohesion: 0.25
Nodes (8): alchBonus(), bubbleCost(), bubbleFound(), bubbleLv(), bubbleValue(), sigilLv(), upBubble(), vialValue()

### Community 101 - "anvilTick"
Cohesion: 0.38
Nodes (6): anvilCap(), anvilRate(), anvilSlotsOpen(), anvilTick(), equipStats(), syncSlots()

### Community 102 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, android, build, dev, test

## Knowledge Gaps
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `game/package.json` to `world.ts`, `main.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08361581920903954 - nodes in this community are weakly interconnected._
- **Why does `World` connect `World` to `world.ts`, `core.test.ts`, `Game`, `api.test.ts`, `game.ts`, `progress.test.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `worship.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Why does `Game` connect `Game` to `Account`, `world.ts`, `newAccount`, `ui.ts`, `Live`, `main.ts`, `World`, `game.ts`, `Net`, `state.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `game/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._