# Graph Report - LooinRepository  (2026-11-25)

## Corpus Check
- 103 files · ~154,483 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 1513 nodes · 4073 edges · 95 communities (69 shown, 26 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 120 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0c4154d`
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
- boot
- ui/minigames.ts
- GameScene
- scripts
- UI
- live.ts
- sprites.ts
- .panelHtml
- compilerOptions
- game.ts
- Net
- worldmap.ts
- Paint
- mannequin.ts
- Character
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
- state.ts
- contrast.py
- afk.ts
- alchemy.ts
- computeAfk
- json
- main.ts
- core/minigames.ts
- listing.py
- progress.test.ts
- dependencies
- argparse
- ui.ts
- buildApp
- build.ts
- Derived
- gear.ts
- stamps.ts
- design-page.ts
- Music
- ui
- 그림 규칙 (art spec)
- haveMat
- charSlots

## God Nodes (most connected - your core abstractions)
1. `applyAction()` - 97 edges
2. `World` - 56 edges
3. `Game` - 49 edges
4. `Account` - 44 edges
5. `countItem()` - 39 edges
6. `UI` - 39 edges
7. `Character` - 35 edges
8. `derive()` - 33 edges
9. `removeItem()` - 28 edges
10. `deserialize()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `장비 겉모습 (game/src/render/gear.ts)` --references--> `remoteGear()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/gear.ts
- `권한 모델 (이 게임에서 가장 중요한 결정)` --references--> `computeAfk()`  [INFERRED]
  replica/architecture.md → game/src/core/afk.ts
- `구조` --references--> `computeAfk()`  [INFERRED]
  replica/backend.md → game/src/core/afk.ts
- `색` --references--> `ramp()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts
- `색` --references--> `lineOf()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts

## Import Cycles
- 2-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/post.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/traps.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/alchemy.ts -> game/src/core/state.ts -> game/src/core/alchemy.ts`
- 2-file cycle: `game/src/core/cooking.ts -> game/src/core/state.ts -> game/src/core/cooking.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/worship.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/progress.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 2-file cycle: `game/src/core/build.ts -> game/src/core/state.ts -> game/src/core/build.ts`
- 2-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/companions.ts`
- 2-file cycle: `game/src/core/forge.ts -> game/src/core/state.ts -> game/src/core/forge.ts`
- 2-file cycle: `game/src/core/minigames.ts -> game/src/core/state.ts -> game/src/core/minigames.ts`
- 2-file cycle: `game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/stamps.ts`
- 3-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/post.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/post.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/alchemy.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/alchemy.ts`
- 3-file cycle: `game/src/core/cooking.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/cooking.ts`
- 3-file cycle: `game/src/core/progress.ts -> game/src/core/worship.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 3-file cycle: `game/src/core/build.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/build.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/minigames.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/minigames.ts`
- 3-file cycle: `game/src/core/forge.ts -> game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/forge.ts`

## Communities (95 total, 26 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.13
Nodes (35): applyAction(), fail(), ok(), res(), buildSettle(), cancelBuild(), upBuild(), buyKitchen() (+27 more)

### Community 1 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 2 - "worship.ts"
Cohesion: 0.15
Nodes (22): boltEvery(), chargeCap(), chargeNow(), chargeRate(), finishWorship(), lvOf(), PRAYER, PRAYER_MAX (+14 more)

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
Cohesion: 0.15
Nodes (19): chefMult(), hashStr(), Kitchen, kitchenAt(), kitchenSpeed(), KitchenUp, MEALS, mealsPerHour() (+11 more)

### Community 7 - "scene.ts"
Cohesion: 0.07
Nodes (27): NodeDef, SMASH_RANGE, lookOf(), DROP_LIFE, NodeInst, Player, SWING_TIME, SwingKind (+19 more)

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

### Community 43 - "progress.ts"
Cohesion: 0.08
Nodes (34): buildBonus(), owlValue(), petValue(), cookBonus(), ACHIEVEMENTS, BaseClass, baseClass(), CARD_PRESET_LV (+26 more)

### Community 45 - "ui/minigames.ts"
Cohesion: 0.11
Nodes (12): canvases, C, chargeGame(), Game, makeGame(), PlayKind, PlayResult, runGame() (+4 more)

### Community 47 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, migrate, start, test, typecheck

### Community 49 - "live.ts"
Cohesion: 0.13
Nodes (13): ChatLine, cleanText(), colour, Gear, GearMsg, itemId, Join, Msg (+5 more)

### Community 50 - "sprites.ts"
Cohesion: 0.15
Nodes (20): MANNEQUIN_WHITE, ROOT_X, C, grid(), HI, hslToHex(), lineOf(), mixHex() (+12 more)

### Community 51 - ".panelHtml"
Cohesion: 0.17
Nodes (18): anvilCap(), anvilRate(), canTeleportTo(), mapQuota(), mapUnlocked(), skillXpToNext(), iconUrl(), portraitUrl() (+10 more)

### Community 52 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 53 - "game.ts"
Cohesion: 0.24
Nodes (11): Action, ActionResult, AfkReport, Look, localBackend, NetState, onlineCache, ChatLine (+3 more)

### Community 55 - "worldmap.ts"
Cohesion: 0.17
Nodes (18): arch(), blob(), deco(), FILL, flower(), house(), MapRegion, peak() (+10 more)

### Community 56 - "Paint"
Cohesion: 0.33
Nodes (11): bigEye(), buildAll(), buildIcons(), buildItems(), buildMonsters(), buildObjects(), buildTheme(), buildWeapons() (+3 more)

### Community 57 - "mannequin.ts"
Cohesion: 0.08
Nodes (35): Anchors, bake(), bakeClip(), BakedClip, BASE, BASE_PX, BIG, cache (+27 more)

### Community 58 - "Character"
Cohesion: 0.14
Nodes (16): ClassId, CRITTER, StatKey, TRAP_MULT, TRAP_TIMES, trapSlots(), Upg, StarDef (+8 more)

### Community 59 - "data.ts"
Cohesion: 0.03
Nodes (58): AchieveDef, AFK_BASE, ANVIL, ASTRO_QUESTS, ATTACK_BARS, ATTACK_SLOTS, BribeDef, BribeEff (+50 more)

### Community 60 - "tasks.ts"
Cohesion: 0.15
Nodes (14): buyMerit(), claimTask(), MERIT_BY_ID, meritCost(), MeritDef, MeritEff, meritLv(), MERITS (+6 more)

### Community 61 - "forge.ts"
Cohesion: 0.26
Nodes (16): FORGE, emptySlot(), forgeBonus(), forgeCap(), forgeCollect(), forgeLoad(), forgeOil(), forgeProgress() (+8 more)

### Community 62 - "Looin Idle (가제)"
Cohesion: 0.20
Nodes (8): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 서버, 실행, 현재 들어간 것, SaveBackend

### Community 63 - "countItem"
Cohesion: 0.27
Nodes (15): depositShards(), hash(), offerStatue(), useSculptTools(), addItem(), advanceClass(), countItem(), removeItem() (+7 more)

### Community 64 - "World"
Cohesion: 0.18
Nodes (3): Platform, clamp(), World

### Community 65 - "Account"
Cohesion: 0.07
Nodes (19): Alch, Cook, Forge, Account, WorshipAcc, pg, dir, pool (+11 more)

### Community 66 - "world.ts"
Cohesion: 0.09
Nodes (21): CARD_BOSS_CHANCE, CLEAVE_RANGE, healPct(), MapDef, MonsterDef, NOVA_RADIUS, PortalDef, smashMult() (+13 more)

### Community 67 - "newAccount"
Cohesion: 0.13
Nodes (24): newAlch(), newBuild(), newOwl(), newCook(), newKitchen(), STORAGE_SIZE, newForge(), newMini() (+16 more)

### Community 68 - "companions.ts"
Cohesion: 0.24
Nodes (14): Owl, owlPerHour(), owlSettle(), owlUpgrade(), petFreeReady(), petOwned(), petPlus(), plusPet() (+6 more)

### Community 69 - "state.ts"
Cohesion: 0.09
Nodes (46): EquipSlot, stackGroup(), AccBonus, acceptQuest(), Activity, anvilPointsFree(), AnvilSlot, anvilSlotsOpen() (+38 more)

### Community 70 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 71 - "afk.ts"
Cohesion: 0.10
Nodes (25): AFK_MAX_SECONDS, AFK_MIN_SECONDS, ARENA, CARD_BY_ID, CARD_CHANCE, CARD_UNOWNED_MULT, ITEMS, MAPS (+17 more)

### Community 72 - "alchemy.ts"
Cohesion: 0.09
Nodes (29): alchBonus(), alchSettle(), BUBBLE_MAX_LV, bubbleCost(), BubbleDef, bubbleLv(), BUBBLES, bubbleValue() (+21 more)

### Community 73 - "computeAfk"
Cohesion: 0.09
Nodes (21): computeAfk(), settle(), anvilTick(), gainSkillXp(), noteKill(), API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정) (+13 more)

### Community 74 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 75 - "main.ts"
Cohesion: 0.18
Nodes (9): Sfx, DORIAN, MAJOR, MINOR, PENTA, Song, songFor(), SONGS (+1 more)

### Community 76 - "core/minigames.ts"
Cohesion: 0.16
Nodes (18): BLESS, blessCost(), BlessKey, buyBless(), finishGame(), finishTotem(), GameKind, gameReward() (+10 more)

### Community 77 - "listing.py"
Cohesion: 0.29
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 78 - "progress.test.ts"
Cohesion: 0.07
Nodes (31): owlCost(), COOK, MEAL, mealNeed(), spiceRate(), arenaWaves(), canSubclass(), CLASS_LEVEL (+23 more)

### Community 79 - "dependencies"
Cohesion: 0.10
Nodes (21): deleteCharacter(), SyncAccount, fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies (+13 more)

### Community 80 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

### Community 81 - "ui.ts"
Cohesion: 0.05
Nodes (42): BRIBES, CARDS, CLASS_NPC, CLASS_NPCS, CRYSTAL_ITEM, FacilityKind, gateTo(), HAIR_COLORS (+34 more)

### Community 82 - "buildApp"
Cohesion: 0.11
Nodes (16): Rng, acceptSync(), checkSync(), cumXp(), itemCount(), same(), clone(), look (+8 more)

### Community 83 - "build.ts"
Cohesion: 0.18
Nodes (11): BUILD, Build, buildCost(), BUILDING, BUILDINGS, BuildJob, buildRate(), buildSlots() (+3 more)

### Community 84 - "Derived"
Cohesion: 0.20
Nodes (9): AfkRates, afkRates(), foodCd(), GatherSkill, Derived, dmgTaken(), foodTotalHeal(), foodWait() (+1 more)

### Community 85 - "gear.ts"
Cohesion: 0.17
Nodes (11): GEAR, GearDef, gearKey(), GearOn, GOLD, MOSS, paintGear(), WOOD (+3 more)

### Community 86 - "stamps.ts"
Cohesion: 0.29
Nodes (10): bribeBonus(), buyBribe(), collectStamp(), STAMP_BY_ID, stampBonus(), stampCost(), stampsOpen(), stampValue() (+2 more)

### Community 87 - "design-page.ts"
Cohesion: 0.18
Nodes (6): bar, colors, menu, ART, FILL, pixelIcon()

### Community 90 - "ui"
Cohesion: 0.22
Nodes (5): achieveReady(), achCount(), starTalPoints(), tabs(), ui()

### Community 91 - "그림 규칙 (art spec)"
Cohesion: 0.25
Nodes (7): 그림 규칙 (art spec), 몬스터, 몸 방향 (2026-11-25), 장비 겉모습 (game/src/render/gear.ts), 지형, 캐릭터: 기본 마네킹 + 동작 프레임 + 붙임 지점, 해상도

### Community 92 - "haveMat"
Cohesion: 0.43
Nodes (7): upVial(), startBuild(), deliver(), postRefresh(), haveMat(), spendMat(), storageCount()

### Community 93 - "charSlots"
Cohesion: 0.47
Nodes (4): charSlots(), familyLevel(), dur(), esc()

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `game/package.json` to `main.ts`, `scene.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13015873015873017 - nodes in this community are weakly interconnected._
- **Why does `Game` connect `Game` to `World`, `Account`, `world.ts`, `newAccount`, `scene.ts`, `Live`, `main.ts`, `boot`, `GameScene`, `ui.ts`, `game.ts`, `Net`, `Character`, `.gearOf`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `worship.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Why does `World` connect `World` to `world.ts`, `state.ts`, `Game`, `scene.ts`, `GameScene`, `progress.test.ts`, `buildApp`, `Derived`, `game.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `game/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._