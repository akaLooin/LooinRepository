# Graph Report - LooinRepository  (2026-11-25)

## Corpus Check
- 107 files · ~171,895 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 1649 nodes · 4588 edges · 97 communities (76 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0ae93a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- actions.ts
- reviews.py
- worship.ts
- game/package.json
- server/package.json
- imgdiff.py
- cooking.ts
- scene.ts
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
- Audio
- ui/minigames.ts
- GameScene
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
- World
- Account
- world.ts
- newAccount
- companions.ts
- core.test.ts
- contrast.py
- server-rules.test.ts
- ui.ts
- upgrade.ts
- json
- .panelHtml
- core/minigames.ts
- listing.py
- post.ts
- dependencies
- argparse
- build.ts
- app.ts
- shrines.ts
- Rng
- 그림 규칙 (art spec)
- UI
- lab.ts
- 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)
- gear.ts
- traps.ts
- progress.test.ts
- SqlStore
- stamps.ts
- tasks.test.ts
- .useSkill

## God Nodes (most connected - your core abstractions)
1. `applyAction()` - 111 edges
2. `World` - 56 edges
3. `Account` - 51 edges
4. `Game` - 49 edges
5. `UI` - 40 edges
6. `countItem()` - 39 edges
7. `Character` - 37 edges
8. `derive()` - 35 edges
9. `newAccount()` - 32 edges
10. `deserialize()` - 32 edges

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
- 2-file cycle: `game/src/core/shrines.ts -> game/src/core/state.ts -> game/src/core/shrines.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/worship.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/lab.ts -> game/src/core/state.ts -> game/src/core/lab.ts`
- 2-file cycle: `game/src/core/minigames.ts -> game/src/core/state.ts -> game/src/core/minigames.ts`
- 2-file cycle: `game/src/core/progress.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 2-file cycle: `game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/stamps.ts`
- 2-file cycle: `game/src/core/build.ts -> game/src/core/state.ts -> game/src/core/build.ts`
- 2-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/companions.ts`
- 2-file cycle: `game/src/core/forge.ts -> game/src/core/state.ts -> game/src/core/forge.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/post.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/post.ts`
- 3-file cycle: `game/src/core/progress.ts -> game/src/core/traps.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/traps.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/alchemy.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/alchemy.ts`
- 3-file cycle: `game/src/core/cooking.ts -> game/src/core/lab.ts -> game/src/core/state.ts -> game/src/core/cooking.ts`
- 3-file cycle: `game/src/core/cooking.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/cooking.ts`

## Communities (97 total, 21 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.11
Nodes (42): applyAction(), fail(), ok(), res(), alchSettle(), upLiquid(), owlSettle(), owlUpgrade() (+34 more)

### Community 1 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 2 - "worship.ts"
Cohesion: 0.14
Nodes (24): accClassSkillMult(), classSkillMult(), boltEvery(), chargeCap(), chargeNow(), chargeRate(), finishWorship(), lvOf() (+16 more)

### Community 3 - "game/package.json"
Cohesion: 0.07
Nodes (32): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, devDependencies (+24 more)

### Community 4 - "server/package.json"
Cohesion: 0.10
Nodes (26): @electric-sql/pglite, tsx, @types/node, @types/pg, @types/ws, ws, author, description (+18 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 6 - "cooking.ts"
Cohesion: 0.12
Nodes (30): buyKitchen(), claimSpices(), CookAcc, cookSettle(), hashStr(), Kitchen, kitchenAt(), KitchenUp (+22 more)

### Community 7 - "scene.ts"
Cohesion: 0.09
Nodes (22): CLASS_LEVEL, CLASS_NPCS, FACILITY_NAMES, ITEMS, NPCS, SMASH_RANGE, DROP_LIFE, HURT_TIME (+14 more)

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
Cohesion: 0.06
Nodes (46): breedBonus(), buildBonus(), owlValue(), petValue(), COOK, cookBonus(), MEALS, recipeChance() (+38 more)

### Community 44 - "Audio"
Cohesion: 0.06
Nodes (17): Audio, Sfx, DORIAN, MAJOR, MINOR, Music, PENTA, Song (+9 more)

### Community 45 - "ui/minigames.ts"
Cohesion: 0.11
Nodes (12): canvases, C, chargeGame(), Game, makeGame(), PlayKind, PlayResult, runGame() (+4 more)

### Community 46 - "GameScene"
Cohesion: 0.09
Nodes (16): NodeDef, acceptQuest(), currentQuest(), noteKill(), qs(), questProgress(), NodeInst, WorldEvent (+8 more)

### Community 47 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, migrate, start, test, typecheck

### Community 48 - "breeding.ts"
Cohesion: 0.12
Nodes (32): BPet, BREED, breedSettle(), BreedUp, breedXpToNext(), eggRate(), fenceCap(), gainXp() (+24 more)

### Community 49 - "live.ts"
Cohesion: 0.13
Nodes (13): ChatLine, cleanText(), colour, Gear, GearMsg, itemId, Join, Msg (+5 more)

### Community 50 - "sprites.ts"
Cohesion: 0.13
Nodes (23): MANNEQUIN_WHITE, ART, C, frameDefs, grid(), HI, hslToHex(), ITEM_ICON (+15 more)

### Community 51 - "api.test.ts"
Cohesion: 0.22
Nodes (7): pg, dir, pool, app, migrate(), look, setup()

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
Cohesion: 0.09
Nodes (32): Anchors, bake(), bakeClip(), BakedClip, BASE, BASE_PX, BIG, cache (+24 more)

### Community 58 - "state.ts"
Cohesion: 0.06
Nodes (44): AFK_BASE, ANVIL, ATTACK_BARS, BIRTH_SIGNS, CARDS, ClassId, FOOD_SLOTS, foodCd() (+36 more)

### Community 59 - "data.ts"
Cohesion: 0.03
Nodes (67): AchieveDef, AFK_MIN_SECONDS, ASTRO_QUESTS, ATTACK_SLOTS, BribeDef, BribeEff, CARAVAN_QUESTS, CARD_MAX_TIER (+59 more)

### Community 60 - "tasks.ts"
Cohesion: 0.13
Nodes (15): STAMPS, shopLeft(), buyMerit(), MERIT_BY_ID, meritCost(), MeritDef, MeritEff, meritLv() (+7 more)

### Community 61 - "forge.ts"
Cohesion: 0.23
Nodes (18): FORGE, SMELTS, emptySlot(), forgeBonus(), forgeCap(), forgeCollect(), forgeLoad(), forgeOil() (+10 more)

### Community 62 - "Looin Idle (가제)"
Cohesion: 0.20
Nodes (8): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 서버, 실행, 현재 들어간 것, SaveBackend

### Community 63 - "countItem"
Cohesion: 0.17
Nodes (25): depositShards(), offerStatue(), useSculptTools(), collectStamp(), stampsOpen(), upgradeStamp(), addItem(), advanceClass() (+17 more)

### Community 64 - "World"
Cohesion: 0.18
Nodes (4): arenaWaves(), Platform, clamp(), World

### Community 65 - "Account"
Cohesion: 0.09
Nodes (14): Alch, Breed, Cook, Forge, MiniState, TotemState, PostOffice, Account (+6 more)

### Community 66 - "world.ts"
Cohesion: 0.08
Nodes (33): ARENA, BaseClass, CARD_BOSS_CHANCE, CARD_BY_ID, CARD_CHANCE, CARD_UNOWNED_MULT, CLEAVE_RANGE, crystalOf() (+25 more)

### Community 67 - "newAccount"
Cohesion: 0.16
Nodes (22): newAlch(), newBreed(), newBuild(), newOwl(), newForge(), newLab(), newTotem(), newPost() (+14 more)

### Community 68 - "companions.ts"
Cohesion: 0.12
Nodes (21): Owl, owlCost(), owlPerHour(), petFreeReady(), petOwned(), petPlus(), plusPet(), pullPet() (+13 more)

### Community 69 - "core.test.ts"
Cohesion: 0.21
Nodes (20): AfkRates, afkRates(), computeAfk(), settle(), GatherSkill, MAPS, MONSTERS, anvilTick() (+12 more)

### Community 70 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 71 - "server-rules.test.ts"
Cohesion: 0.28
Nodes (6): run(), sweep(), clone(), look, play(), setup()

### Community 72 - "ui.ts"
Cohesion: 0.10
Nodes (29): alchBonus(), BUBBLE_MAX_LV, bubbleCost(), bubbleLv(), BUBBLES, bubbleValue(), CauldronDef, CauldronId (+21 more)

### Community 73 - "upgrade.ts"
Cohesion: 0.28
Nodes (8): hash(), EquipSlot, ItemStats, SLOT_NAMES, STONE_BY_ID, upSlotsOf(), upLeft(), upRoll()

### Community 74 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 75 - ".panelHtml"
Cohesion: 0.13
Nodes (25): gateTo(), stackGroup(), orderReward(), streakNow(), anvilCap(), canTeleportTo(), gateChecks(), gateOpen() (+17 more)

### Community 76 - "core/minigames.ts"
Cohesion: 0.18
Nodes (16): BLESS, BlessKey, finishGame(), GameKind, gameReward(), GAMES, hourKey(), legacyTotemSouls() (+8 more)

### Community 77 - "listing.py"
Cohesion: 0.29
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 78 - "post.ts"
Cohesion: 0.12
Nodes (18): WORLDS, BOX_BY_ID, boxCost(), BoxDef, BOXES, boxValue(), COMPANIES, CompanyDef (+10 more)

### Community 79 - "dependencies"
Cohesion: 0.17
Nodes (12): fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3 (+4 more)

### Community 80 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

### Community 81 - "build.ts"
Cohesion: 0.15
Nodes (22): upBubble(), upVial(), BUILD, Build, buildCost(), BUILDING, BUILDINGS, BuildJob (+14 more)

### Community 82 - "app.ts"
Cohesion: 0.13
Nodes (15): HAIR_STYLES, deleteCharacter(), acceptSync(), SyncAccount, ActionSchema, buildApp(), sync(), withAccount() (+7 more)

### Community 83 - "shrines.ts"
Cohesion: 0.10
Nodes (21): BubbleDef, VialDef, SpeciesDef, BuildingDef, MealDef, BonusKey, TOWNS, LabNodeDef (+13 more)

### Community 84 - "Rng"
Cohesion: 0.21
Nodes (4): Rng, Derived, minibossKey(), minibossOpen()

### Community 85 - "그림 규칙 (art spec)"
Cohesion: 0.22
Nodes (8): remoteGear(), 그림 규칙 (art spec), 몬스터, 몸 방향 (2026-11-25), 장비 겉모습 (game/src/render/gear.ts), 지형, 캐릭터: 기본 마네킹 + 동작 프레임 + 붙임 지점, 해상도

### Community 86 - "UI"
Cohesion: 0.11
Nodes (17): baseClass(), canSubclass(), classLine(), classTier(), maxTierOf(), nextClasses(), worldOf(), achieveProgress() (+9 more)

### Community 87 - "lab.ts"
Cohesion: 0.14
Nodes (18): chefMult(), kitchenSpeed(), atStation(), charOf(), dist(), LAB, Lab, LAB_NODE (+10 more)

### Community 89 - "설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)"
Cohesion: 0.10
Nodes (16): API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정), 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장), 스키마, 스택, 조심할 부분, 클라이언트 구조 변경 (참고 화면 기준) (+8 more)

### Community 90 - "gear.ts"
Cohesion: 0.13
Nodes (13): CLASSES, lookOf(), GearDef, gearKey(), GearOn, gearPos(), GOLD, MOSS (+5 more)

### Community 91 - "traps.ts"
Cohesion: 0.17
Nodes (15): CRITTER, SHINY_BONUS, SHINY_CHANCE, shinyLevel(), TRAP_BOX, TRAP_BOXES, TrapBoxDef, trapSlots() (+7 more)

### Community 92 - "progress.test.ts"
Cohesion: 0.13
Nodes (13): HIDDEN_CLASS, HIDDEN_TIERS, STACK_BASE, SUBCLASS_LEVEL, TALENT_PRESET_LV, TIER_LEVEL, TRAP_TIMES, WORLD2 (+5 more)

### Community 93 - "SqlStore"
Cohesion: 0.20
Nodes (4): Sql, SqlStore, toRow(), makeStores()

### Community 94 - "stamps.ts"
Cohesion: 0.31
Nodes (9): BRIBES, STAMP_LV, bribeBonus(), buyBribe(), STAMP_BY_ID, stampBonus(), stampCost(), stampValue() (+1 more)

### Community 95 - "tasks.test.ts"
Cohesion: 0.25
Nodes (6): RECIPES, SHOP, STORAGE_SIZE, TASK_BY_ID, look, setup()

## Knowledge Gaps
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `game/package.json` to `Audio`, `scene.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10741971207087486 - nodes in this community are weakly interconnected._
- **Why does `World` connect `World` to `.useSkill`, `world.ts`, `core.test.ts`, `Game`, `server-rules.test.ts`, `scene.ts`, `GameScene`, `api.test.ts`, `Rng`, `game.ts`, `progress.test.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `worship.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Why does `computeAfk()` connect `core.test.ts` to `actions.ts`, `Game`, `progress.ts`, `GameScene`, `app.ts`, `Rng`, `game.ts`, `설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)`, `progress.test.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `game/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._