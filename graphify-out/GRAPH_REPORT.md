# Graph Report - LooinRepository  (2026-11-17)

## Corpus Check
- 54 files · ~37,541 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .xml 10, (none) 6, .properties 2)
- WARNING: 23 of 105 files seen (22%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 559 nodes · 1159 edges · 42 communities (28 shown, 14 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63b838cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- state.ts
- reviews.py
- Game
- package.json
- sprites.ts
- imgdiff.py
- World
- UI
- replica-recon
- ExampleInstrumentedTest.java
- Recon map: {{app}} ({{platform}})
- Looin Idle (가제)
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
- com.getcapacitor.BridgeActivity
- graphify-stop.sh
- bug-report.md
- test-plan.md
- ui.ts
- world.ts
- afk.ts
- game.ts

## God Nodes (most connected - your core abstractions)
1. `World` - 36 edges
2. `Game` - 27 edges
3. `derive()` - 16 edges
4. `UI` - 15 edges
5. `Character` - 14 edges
6. `GameScene` - 14 edges
7. `Paint` - 13 edges
8. `computeAfk()` - 12 edges
9. `boot()` - 12 edges
10. `replica-recon` - 12 edges

## Surprising Connections (you probably didn't know these)
- `멀티 전환을 위한 설계` --references--> `SaveBackend`  [INFERRED]
  game/README.md → game/src/game.ts
- `구조` --references--> `SaveBackend`  [INFERRED]
  game/README.md → game/src/game.ts
- `Game` --references--> `AfkReport`  [EXTRACTED]
  game/src/game.ts → game/src/core/afk.ts
- `UI` --references--> `AfkReport`  [EXTRACTED]
  game/src/ui/ui.ts → game/src/core/afk.ts
- `computeAfk()` --calls--> `addItem()`  [EXTRACTED]
  game/src/core/afk.ts → game/src/core/state.ts

## Import Cycles
- None detected.

## Communities (42 total, 14 thin omitted)

### Community 0 - "state.ts"
Cohesion: 0.14
Nodes (30): cardTier(), INVENTORY_SIZE, ItemStats, MAX_CHARACTERS, QUESTS, RECIPES, addItem(), advanceClass() (+22 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "Game"
Cohesion: 0.20
Nodes (4): PortalDef, WorldEvent, Game, boot()

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (32): author, dependencies, @capacitor/android@^7.6.10, @capacitor/core@^7.6.10, galmuri@^2.40.3, phaser@^3.90.0, description, devDependencies (+24 more)

### Community 4 - "sprites.ts"
Cohesion: 0.09
Nodes (36): NodeDef, SMASH_RANGE, Look, NodeInst, SWING_TIME, Img, label(), NodeView (+28 more)

### Community 5 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 6 - "World"
Cohesion: 0.11
Nodes (8): Derived, clamp(), World, CharRig, ensureTextures(), GameScene, MobView, smooth()

### Community 7 - "UI"
Cohesion: 0.22
Nodes (11): acceptQuest(), currentQuest(), questProgress(), iconUrl(), portraitUrl(), dur(), esc(), icon() (+3 more)

### Community 8 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 10 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 11 - "Looin Idle (가제)"
Cohesion: 0.25
Nodes (7): Looin Idle (가제), 구조, 다음 단계(제안), 멀티 전환을 위한 설계, 실행, 현재 들어간 것, SaveBackend

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

### Community 38 - "ui.ts"
Cohesion: 0.12
Nodes (27): AfkReport, CardDef, cardNext(), CLASS_LEVEL, ClassDef, CLASSES, ClassId, DropDef (+19 more)

### Community 39 - "world.ts"
Cohesion: 0.12
Nodes (17): CLEAVE_RANGE, healPct(), MapDef, MonsterDef, NOVA_RADIUS, Platform, smashMult(), TALENT (+9 more)

### Community 40 - "afk.ts"
Cohesion: 0.16
Nodes (15): computeAfk(), settle(), AFK_EFFICIENCY, AFK_MAX_SECONDS, AFK_MIN_SECONDS, CARD_CHANCE, CARDS, ITEMS (+7 more)

### Community 41 - "game.ts"
Cohesion: 0.15
Nodes (8): MAPS, Rng, Account, deserialize(), newAccount(), serialize(), Input, localBackend

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `World` connect `World` to `state.ts`, `Game`, `sprites.ts`, `world.ts`, `game.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `state.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13911290322580644 - nodes in this community are weakly interconnected._
- **Why does `phaser` connect `package.json` to `Game`, `sprites.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `Game` connect `Game` to `sprites.ts`, `ui.ts`, `UI`, `World`, `game.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
- **Should `sprites.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08653061224489796 - nodes in this community are weakly interconnected._