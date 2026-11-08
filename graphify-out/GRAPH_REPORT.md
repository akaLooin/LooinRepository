# Graph Report - LooinRepository  (2026-11-08)

## Corpus Check
- 77 files · ~53,399 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 28 file(s) not represented in the graph (top: .xml 10, (none) 6, .woff2 3)

## Summary
- 706 nodes · 1300 edges · 51 communities (35 shown, 16 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a84b41e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.js
- imgdiff.py
- json
- map.ts
- ui.js
- engine.ts
- replica-recon
- Recon map: {{app}} ({{platform}})
- replica-backend
- replica-build
- replica-brand
- Recon map: Realm Grinder (Android / Steam / Web)
- replica-deploy
- replica-entrepreneur
- replica-test
- replica-architect
- replica-design
- replica-diff
- replica-launch
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- Deploy checklist: {{your app}}
- factions.ts
- 테일즈토피아 타이쿤 (Talestopia Tycoon)
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- screens/README.md
- castSpell
- save-schema.ts
- package.json
- main.ts
- compilerOptions
- SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
- build-tokens.mjs
- components.md
- general.ts
- ExampleInstrumentedTest.java
- export-icons.cjs
- visibleBuildings
- Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)
- Talestopia Tycoon (app)
- MainActivity.java

## God Nodes (most connected - your core abstractions)
1. `Raster` - 23 edges
2. `renderMap()` - 21 edges
3. `shade()` - 17 edges
4. `hex()` - 16 edges
5. `noise()` - 16 edges
6. `S()` - 15 edges
7. `mix()` - 14 edges
8. `icon()` - 14 edges
9. `framedIcon()` - 13 edges
10. `Alignment` - 13 edges

## Surprising Connections (you probably didn't know these)
- `API (엔진 액션)` --references--> `buyAllBuildings()`  [INFERRED]
  replica/architecture.md → app/src/engine/engine.ts
- `API (엔진 액션)` --references--> `buyAllUpgrades()`  [INFERRED]
  replica/architecture.md → app/src/engine/engine.ts
- `API (엔진 액션)` --references--> `royalExchange()`  [INFERRED]
  replica/architecture.md → app/src/engine/engine.ts
- `API (엔진 액션)` --references--> `abdicate()`  [INFERRED]
  replica/architecture.md → app/src/engine/engine.ts
- `API (엔진 액션)` --references--> `checkTrophies()`  [INFERRED]
  replica/architecture.md → app/src/engine/engine.ts

## Import Cycles
- None detected.

## Communities (51 total, 16 thin omitted)

### Community 0 - "engine.js"
Cohesion: 0.10
Nodes (35): allUpgrades(), applyOffline(), availableUpgrades(), buildingCost(), buildingCps(), buildingMult(), buyBuilding(), buyUpgrade() (+27 more)

### Community 1 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 2 - "json"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 3 - "map.ts"
Cohesion: 0.06
Nodes (62): BUILDING_ART, buildingSprite(), buildingThumb(), cache, Maker, thumbs, DOOR, Extra (+54 more)

### Community 4 - "ui.js"
Cohesion: 0.26
Nodes (12): buildBuildingRows(), load(), loop(), render(), renderBuildings(), renderGenres(), renderHighlights(), renderRewrite() (+4 more)

### Community 5 - "engine.ts"
Cohesion: 0.09
Nodes (34): BU_BONUS_HIGH, BU_BONUS_LOW, BU_BONUS_T11, BU_COST, BU_COUNTS, BU_T11_PER_TROPHY, BUILDING_BY_ID, COST_GROWTH (+26 more)

### Community 6 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 7 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 8 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 9 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 10 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 11 - "Recon map: Realm Grinder (Android / Steam / Web)"
Cohesion: 0.07
Nodes (26): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: Realm Grinder (Android / Steam / Web), Screens (+18 more)

### Community 12 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 13 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 14 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 15 - "replica-architect"
Cohesion: 0.25
Nodes (7): Output, replica-architect, Step 1: the stack, Step 2: the schema, Step 3: the API, Step 4: the parts that bite, Step 5: build order

### Community 16 - "replica-design"
Cohesion: 0.25
Nodes (7): Output, replica-design, Step 1: measure, do not guess, Step 2: write the tokens, Step 3: component specs, Step 4: build the primitives, The rules

### Community 17 - "replica-diff"
Cohesion: 0.25
Nodes (7): Output, replica-diff, Step 1: feature parity, Step 2: layout diff, Step 3: behaviour diff, Step 4: the report, What parity means here

### Community 18 - "replica-launch"
Cohesion: 0.25
Nodes (7): Output, replica-launch, Step 1: landing page, Step 2: pricing, Step 3: store listing, Step 4: launch plan, The rules

### Community 19 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 20 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 21 - "factions.ts"
Cohesion: 0.12
Nodes (29): BuildingDef, BUILDINGS, AlignmentDef, ALIGNMENTS, COST, FACTION_UPGRADES, FactionDef, FactionUpgrade (+21 more)

### Community 22 - "테일즈토피아 타이쿤 (Talestopia Tycoon)"
Cohesion: 0.33
Nodes (5): 다음 단계 (출시까지), 실행, 테일즈토피아 타이쿤 (Talestopia Tycoon), 파일 구성, 핵심 시스템

### Community 29 - "castSpell"
Cohesion: 0.21
Nodes (19): applyOffline(), assistantsCps(), autocast(), availableSpells(), buildingMult(), buildingProd(), buildingsCps(), castSpell() (+11 more)

### Community 30 - "save-schema.ts"
Cohesion: 0.29
Nodes (6): Alignment, AutocastTier, Big, CoinType, FactionId, SaveV1

### Community 31 - "package.json"
Cohesion: 0.06
Nodes (33): config, dependencies, break_infinity.js@^2.2.0, @capacitor/android@^8.6.0, @capacitor/core@^8.6.0, galmuri@^2.40.3, devDependencies, @capacitor/cli@^8.6.0 (+25 more)

### Community 32 - "main.ts"
Cohesion: 0.07
Nodes (59): levelFor(), cache, PALETTE, SPRITES, spriteURL(), FACTION_BY_ID, SPELL_BY_ID, box (+51 more)

### Community 33 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 34 - "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007"
Cohesion: 0.29
Nodes (6): DEFINITIONS, DISCLAIMER, PERMISSION & CONDITIONS, PREAMBLE, SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007, TERMINATION

### Community 35 - "build-tokens.mjs"
Cohesion: 0.40
Nodes (3): lines, src, t

### Community 37 - "general.ts"
Cohesion: 0.22
Nodes (7): FACTIONS, GENERAL_UPGRADES, GeneralUpgrade, SUF, TROPHIES, TrophyDef, SaveState

### Community 39 - "export-icons.cjs"
Cohesion: 0.22
Nodes (4): { chromium }, fs, path, RES

### Community 40 - "visibleBuildings"
Cohesion: 0.36
Nodes (8): buildingsFor(), buildingCost(), buyAllBuildings(), buyBuilding(), canSeeBuilding(), costMult(), maxAffordable(), visibleBuildings()

### Community 41 - "Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)"
Cohesion: 0.29
Nodes (6): Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임), Build order, Schema (저장 데이터), Stack, The parts that bite, 화면 구조 (원작 녹화 영상 기준)

### Community 43 - "Talestopia Tycoon (app)"
Cohesion: 0.50
Nodes (3): Talestopia Tycoon (app), 개발, 안드로이드

## Knowledge Gaps
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `break_infinity.js` connect `factions.ts` to `main.ts`, `engine.ts`, `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `renderMap()` (e.g. with `.draw()` and `.set()`) actually correct?**
  _`renderMap()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `renderMap()` connect `map.ts` to `main.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Should `map.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0636193531141406 - nodes in this community are weakly interconnected._