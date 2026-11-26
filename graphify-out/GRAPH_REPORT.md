# Graph Report - LooinRepository  (2026-11-26)

## Corpus Check
- 109 files · ~202,615 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 10, (none) 9, .csv 2)

## Summary
- 1878 nodes · 5315 edges · 99 communities (75 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b2f0d1c`
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
- world.ts
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
- GameScene
- scripts
- breeding.ts
- live.ts
- sprites.ts
- Account
- compilerOptions
- game.ts
- Net
- worldmap.ts
- Paint
- mannequin.ts
- state.ts
- data.ts
- tasks.ts
- core.test.ts
- Looin Idle (가제)
- countItem
- World
- obols.ts
- scene.ts
- newAccount
- companions.ts
- UI
- contrast.py
- stamps.ts
- alchemy.ts
- .refresh
- json
- gainSkillXp
- upgrade.ts
- listing.py
- post.ts
- dependencies
- argparse
- build.ts
- buildApp
- BonusKey
- core/minigames.ts
- Audio
- .panelHtml
- original.test.ts
- 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)
- gear.ts
- traps.ts
- server-rules.test.ts
- api.test.ts
- haveMat
- Music
- classLine
- design-page.ts
- 백엔드 (Looin Idle 서버)

## God Nodes (most connected - your core abstractions)
1. `applyAction()` - 144 edges
2. `World` - 56 edges
3. `Account` - 55 edges
4. `Game` - 49 edges
5. `UI` - 45 edges
6. `countItem()` - 44 edges
7. `Character` - 39 edges
8. `deserialize()` - 39 edges
9. `derive()` - 37 edges
10. `newAccount()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `권한 모델 (이 게임에서 가장 중요한 결정)` --references--> `computeAfk()`  [INFERRED]
  replica/architecture.md → game/src/core/afk.ts
- `구조` --references--> `computeAfk()`  [INFERRED]
  replica/backend.md → game/src/core/afk.ts
- `장비 겉모습 (game/src/render/gear.ts)` --references--> `remoteGear()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/gear.ts
- `색` --references--> `lineOf()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts
- `색` --references--> `ramp()`  [INFERRED]
  replica/design/art-spec.md → game/src/render/sprites.ts

## Import Cycles
- 2-file cycle: `game/src/core/arcade.ts -> game/src/core/state.ts -> game/src/core/arcade.ts`
- 2-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/post.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/traps.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/alchemy.ts -> game/src/core/state.ts -> game/src/core/alchemy.ts`
- 2-file cycle: `game/src/core/cooking.ts -> game/src/core/state.ts -> game/src/core/cooking.ts`
- 2-file cycle: `game/src/core/shrines.ts -> game/src/core/state.ts -> game/src/core/shrines.ts`
- 2-file cycle: `game/src/core/state.ts -> game/src/core/worship.ts -> game/src/core/state.ts`
- 2-file cycle: `game/src/core/progress.ts -> game/src/core/state.ts -> game/src/core/progress.ts`
- 2-file cycle: `game/src/core/breeding.ts -> game/src/core/state.ts -> game/src/core/breeding.ts`
- 2-file cycle: `game/src/core/build.ts -> game/src/core/state.ts -> game/src/core/build.ts`
- 2-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/companions.ts`
- 2-file cycle: `game/src/core/forge.ts -> game/src/core/state.ts -> game/src/core/forge.ts`
- 2-file cycle: `game/src/core/lab.ts -> game/src/core/state.ts -> game/src/core/lab.ts`
- 2-file cycle: `game/src/core/minigames.ts -> game/src/core/state.ts -> game/src/core/minigames.ts`
- 2-file cycle: `game/src/core/stamps.ts -> game/src/core/state.ts -> game/src/core/stamps.ts`
- 3-file cycle: `game/src/core/arcade.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/arcade.ts`
- 3-file cycle: `game/src/core/arcade.ts -> game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/arcade.ts`
- 3-file cycle: `game/src/core/post.ts -> game/src/core/state.ts -> game/src/core/progress.ts -> game/src/core/post.ts`
- 3-file cycle: `game/src/core/companions.ts -> game/src/core/state.ts -> game/src/core/post.ts -> game/src/core/companions.ts`
- 3-file cycle: `game/src/core/progress.ts -> game/src/core/traps.ts -> game/src/core/state.ts -> game/src/core/progress.ts`

## Communities (99 total, 24 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.09
Nodes (55): applyAction(), fail(), ok(), res(), arcadeSettle(), poppySettle(), shootBall(), upPoppy() (+47 more)

### Community 1 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 2 - "worship.ts"
Cohesion: 0.13
Nodes (25): classSkillMult(), trapYield(), boltEvery(), chargeCap(), chargeNow(), chargeRate(), finishWorship(), lvOf() (+17 more)

### Community 3 - "game/package.json"
Cohesion: 0.07
Nodes (32): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, devDependencies (+24 more)

### Community 4 - "server/package.json"
Cohesion: 0.10
Nodes (26): @electric-sql/pglite, tsx, @types/node, @types/pg, @types/ws, ws, author, description (+18 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 6 - "ui.ts"
Cohesion: 0.06
Nodes (53): bubbleCost(), BUBBLES, chefMult(), COOK, CookAcc, hashStr(), Kitchen, kitchenSpeed() (+45 more)

### Community 7 - "world.ts"
Cohesion: 0.11
Nodes (37): AfkRates, afkRates(), computeAfk(), settle(), bossDefAt(), CARD_BY_ID, CARD_CHANCE, CARD_UNOWNED_MULT (+29 more)

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
Cohesion: 0.07
Nodes (40): breedBonus(), atomBonus(), buildBonus(), owlValue(), petValue(), cookBonus(), ACHIEVEMENTS, BaseClass (+32 more)

### Community 44 - "main.ts"
Cohesion: 0.16
Nodes (9): Sfx, DORIAN, MAJOR, MINOR, PENTA, Song, songFor(), SONGS (+1 more)

### Community 45 - "ui/minigames.ts"
Cohesion: 0.11
Nodes (14): canvases, C, chargeGame(), dartsGame(), Game, makeGame(), PlayKind, PlayResult (+6 more)

### Community 47 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, migrate, start, test, typecheck

### Community 48 - "breeding.ts"
Cohesion: 0.08
Nodes (45): ARENA_COOLDOWN, ARENA_TEAM, arenaPower(), arenaWave(), BAcc, BPet, breedLevel(), breedSettle() (+37 more)

### Community 49 - "live.ts"
Cohesion: 0.13
Nodes (13): ChatLine, cleanText(), colour, Gear, GearMsg, itemId, Join, Msg (+5 more)

### Community 50 - "sprites.ts"
Cohesion: 0.13
Nodes (23): ROOT_X, ART, C, grid(), HI, hslToHex(), ITEM_ICON, lineOf() (+15 more)

### Community 51 - "Account"
Cohesion: 0.07
Nodes (17): Alch, Breed, Build, Cook, Forge, Lab, Account, TaskDef (+9 more)

### Community 52 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 53 - "game.ts"
Cohesion: 0.13
Nodes (19): Action, ActionResult, AfkReport, ClassId, SkillKey, PostState, StarDef, Character (+11 more)

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
Cohesion: 0.06
Nodes (40): AFK_BASE, ANVIL, arenaWaves(), ATTACK_BARS, ATTACK_SLOTS, BIRTH_SIGNS, BOSS_TIERS, CARDS (+32 more)

### Community 59 - "data.ts"
Cohesion: 0.02
Nodes (95): accClassSkillMult(), AchieveDef, AFK_MIN_SECONDS, ALCHEMIST_QUESTS, ArenaDef, ASTRO_QUESTS, BribeDef, CARAVAN_QUESTS (+87 more)

### Community 60 - "tasks.ts"
Cohesion: 0.08
Nodes (25): DEEP_MAPS, STAMPS, WORLDS, refillTeleports(), best(), BOSSES, buyMerit(), Daily (+17 more)

### Community 61 - "core.test.ts"
Cohesion: 0.16
Nodes (20): goldenValue(), stackGroup(), addItemSome(), anvilPointsFree(), canReturn(), collectAnvil(), derive(), equipCard() (+12 more)

### Community 62 - "Looin Idle (가제)"
Cohesion: 0.20
Nodes (8): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 서버, 실행, 현재 들어간 것, SaveBackend

### Community 63 - "countItem"
Cohesion: 0.17
Nodes (25): depositShards(), forgeOil(), placeObol(), offerStatue(), useSculptTools(), collectStamp(), addItem(), advanceClass() (+17 more)

### Community 64 - "World"
Cohesion: 0.14
Nodes (4): arenaOf(), Derived, clamp(), World

### Community 65 - "obols.ts"
Cohesion: 0.12
Nodes (16): FAMILY_OBOL_SLOTS, OBOL, OBOL_SHAPES, OBOL_THEMES, OBOL_TIERS, ObolDef, obolItems(), obolName() (+8 more)

### Community 66 - "scene.ts"
Cohesion: 0.07
Nodes (30): CLASS_LEVEL, CLASS_NPCS, FACILITY_NAMES, NodeDef, NPCS, SMASH_RANGE, lookOf(), DROP_LIFE (+22 more)

### Community 67 - "newAccount"
Cohesion: 0.07
Nodes (49): newAlch(), newArcade(), newPoppy(), newBreed(), newBuild(), newOwl(), FORGE, RECIPES (+41 more)

### Community 68 - "companions.ts"
Cohesion: 0.12
Nodes (19): Owl, owlCost(), owlPerHour(), petOwned(), petPlus(), plusPet(), PullResult, rand() (+11 more)

### Community 69 - "UI"
Cohesion: 0.24
Nodes (3): signSlots(), josa(), UI

### Community 70 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 71 - "stamps.ts"
Cohesion: 0.17
Nodes (16): BribeEff, BRIBES, STAMP_GROW, STAMP_LV, StampDef, StampEff, labMult(), bribeBonus() (+8 more)

### Community 72 - "alchemy.ts"
Cohesion: 0.06
Nodes (48): ADJ, AlchAcc, alchBonus(), alchSettle(), assignAlch(), B(), bigSlots(), brewNeed() (+40 more)

### Community 73 - ".refresh"
Cohesion: 0.21
Nodes (5): StatKey, esc(), icon(), tabs(), ui()

### Community 74 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 75 - "gainSkillXp"
Cohesion: 0.11
Nodes (19): baseClass(), crystalOf(), healPct(), smashMult(), anvilCap(), anvilRate(), anvilSlotsOpen(), anvilTick() (+11 more)

### Community 76 - "upgrade.ts"
Cohesion: 0.40
Nodes (4): EquipSlot, ItemStats, SLOT_NAMES, STONE_BY_ID

### Community 77 - "listing.py"
Cohesion: 0.29
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 78 - "post.ts"
Cohesion: 0.10
Nodes (21): PRODUCTS, BOX_BY_ID, boxCost(), BoxDef, BOXES, boxValue(), COMPANIES, CompanyDef (+13 more)

### Community 79 - "dependencies"
Cohesion: 0.17
Nodes (12): fastify, @fastify/cors, @fastify/websocket, jose, zod, dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3 (+4 more)

### Community 80 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

### Community 81 - "build.ts"
Cohesion: 0.07
Nodes (46): ATOM_MAX, atomCost(), ATOMS, bookHours(), BUILD, BUILD_MAP, BUILDING, BUILDINGS (+38 more)

### Community 82 - "buildApp"
Cohesion: 0.14
Nodes (16): HAIR_STYLES, deleteCharacter(), serialize(), acceptSync(), SyncAccount, ActionSchema, buildApp(), sync() (+8 more)

### Community 83 - "BonusKey"
Cohesion: 0.06
Nodes (37): BubbleDef, SigilDef, VialDef, ARC, ARCADE, Arcade, ArcadeBonus, arcadeBonus() (+29 more)

### Community 84 - "core/minigames.ts"
Cohesion: 0.15
Nodes (18): BLESS, BlessKey, buyMiniUp(), finishGame(), GameKind, gameReward(), GAMES, hourKey() (+10 more)

### Community 86 - ".panelHtml"
Cohesion: 0.10
Nodes (30): canSubclass(), classTier(), maxTierOf(), nextClasses(), questGoalText(), upSlotsOf(), achieveProgress(), achieveReady() (+22 more)

### Community 87 - "original.test.ts"
Cohesion: 0.06
Nodes (39): SIGILS, BREED, RARITY_MULT, COG_HOURS, SALTS, AFK_MAX_SECONDS, ARENAS, CRYSTAL_CHANCE (+31 more)

### Community 89 - "설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장)"
Cohesion: 0.22
Nodes (8): API, 구현 순서, 권한 모델 (이 게임에서 가장 중요한 결정), 설계: Looin Idle (방치형 횡스크롤 RPG, 1월드부터 단계 확장), 스키마, 스택, 조심할 부분, 클라이언트 구조 변경 (참고 화면 기준)

### Community 90 - "gear.ts"
Cohesion: 0.10
Nodes (18): CLASSES, GearDef, GearOn, GOLD, MOSS, paintGear(), remoteGear(), WOOD (+10 more)

### Community 91 - "traps.ts"
Cohesion: 0.18
Nodes (11): CRITTER, SHINY_BONUS, SHINY_CHANCE, shinyLevel(), TRAP_BOX, TRAP_BOXES, TRAP_TIMES, TrapBoxDef (+3 more)

### Community 92 - "server-rules.test.ts"
Cohesion: 0.39
Nodes (5): Rng, clone(), look, play(), setup()

### Community 93 - "api.test.ts"
Cohesion: 0.22
Nodes (7): pg, dir, pool, app, migrate(), look, setup()

### Community 94 - "haveMat"
Cohesion: 0.13
Nodes (22): bubbleLv(), toggleBig(), upBubble(), upVial(), buildCost(), buildSlots(), startBuild(), hash() (+14 more)

### Community 96 - "classLine"
Cohesion: 0.31
Nodes (10): classLine(), isHiddenLine(), talentTab(), anyTalentFree(), learnTalent(), switchTalentPreset(), tabEarned(), tabFree() (+2 more)

### Community 97 - "design-page.ts"
Cohesion: 0.20
Nodes (6): bar, colors, menu, ART, FILL, pixelIcon()

### Community 98 - "백엔드 (Looin Idle 서버)"
Cohesion: 0.22
Nodes (8): API, 구조, 배포 (사용자가 할 일), 백엔드 (Looin Idle 서버), 보안 점검표, 설계에서 바꾼 점 (architecture.md 대비), 아직 없는 것, 환경 변수

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `game/package.json` to `scene.ts`, `main.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Why does `Audio` connect `Audio` to `ui.ts`, `Game`, `.refresh`, `main.ts`, `Music`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `worship.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Why does `Game` connect `Game` to `World`, `scene.ts`, `newAccount`, `ui.ts`, `Live`, `main.ts`, `GameScene`, `Account`, `game.ts`, `Net`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `game/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._