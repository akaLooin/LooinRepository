# Graph Report - LooinRepository  (2026-11-08)

## Corpus Check
- 37 files · ~28,103 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .csv 2, .css 1)

## Summary
- 341 nodes · 480 edges · 31 communities (24 shown, 7 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8166e14`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.js
- imgdiff.py
- json
- listing.py
- ui.js
- contrast.py
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
- engine.test.js
- 테일즈토피아 타이쿤 (Talestopia Tycoon)
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- screens/README.md
- Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)
- save-schema.ts

## God Nodes (most connected - your core abstractions)
1. `Recon map: Realm Grinder (Android / Steam / Web)` - 13 edges
2. `replica-recon` - 12 edges
3. `compare()` - 10 edges
4. `Recon map: {{app}} ({{platform}})` - 10 edges
5. `API (엔진 액션)` - 9 edges
6. `read_png()` - 9 edges
7. `load_reviews()` - 9 edges
8. `render()` - 9 edges
9. `replica-backend` - 9 edges
10. `replica-build` - 9 edges

## Surprising Connections (you probably didn't know these)
- `API (엔진 액션)` --references--> `serialize()`  [INFERRED]
  replica/architecture.md → game/js/engine.js
- `API (엔진 액션)` --references--> `applyOffline()`  [INFERRED]
  replica/architecture.md → game/js/engine.js
- `API (엔진 액션)` --references--> `buyBuilding()`  [INFERRED]
  replica/architecture.md → game/js/engine.js
- `API (엔진 액션)` --references--> `buyUpgrade()`  [INFERRED]
  replica/architecture.md → game/js/engine.js
- `API (엔진 액션)` --references--> `castSpell()`  [INFERRED]
  replica/architecture.md → game/js/engine.js

## Import Cycles
- None detected.

## Communities (31 total, 7 thin omitted)

### Community 0 - "engine.js"
Cohesion: 0.13
Nodes (35): allUpgrades(), applyOffline(), availableUpgrades(), buildingCost(), buildingCps(), buildingMult(), buyBuilding(), buyUpgrade() (+27 more)

### Community 1 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 2 - "json"
Cohesion: 0.10
Nodes (25): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), combine(), load() (+17 more)

### Community 3 - "listing.py"
Cohesion: 0.33
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 4 - "ui.js"
Cohesion: 0.26
Nodes (12): buildBuildingRows(), load(), loop(), render(), renderBuildings(), renderGenres(), renderHighlights(), renderRewrite() (+4 more)

### Community 5 - "contrast.py"
Cohesion: 0.23
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

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

### Community 22 - "테일즈토피아 타이쿤 (Talestopia Tycoon)"
Cohesion: 0.33
Nodes (5): 다음 단계 (출시까지), 실행, 테일즈토피아 타이쿤 (Talestopia Tycoon), 파일 구성, 핵심 시스템

### Community 29 - "Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)"
Cohesion: 0.29
Nodes (6): Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임), Build order, Schema (저장 데이터), Stack, The parts that bite, 화면 구조 (원작 녹화 영상 기준)

### Community 30 - "save-schema.ts"
Cohesion: 0.29
Nodes (6): Alignment, AutocastTier, Big, CoinType, FactionId, SaveV1

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `API (엔진 액션)` connect `engine.js` to `Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12612612612612611 - nodes in this community are weakly interconnected._
- **Why does `Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)` connect `Architecture: Talestopia Tycoon (Realm Grinder의 시스템 구조를 다시 만든 게임)` to `engine.js`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._
- **Should `Recon map: Realm Grinder (Android / Steam / Web)` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._