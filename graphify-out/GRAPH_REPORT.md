# Graph Report - LooinRepository  (2026-11-08)

## Corpus Check
- 33 files · ~22,758 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .csv 1, .css 1)

## Summary
- 297 nodes · 432 edges · 28 communities (22 shown, 6 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `457a4e28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.js
- imgdiff.py
- json
- reviews.py
- ui.js
- contrast.py
- replica-recon
- Recon map: {{app}} ({{platform}})
- replica-backend
- replica-build
- replica-brand
- sweep.py
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

## God Nodes (most connected - your core abstractions)
1. `replica-recon` - 12 edges
2. `compare()` - 10 edges
3. `Recon map: {{app}} ({{platform}})` - 10 edges
4. `read_png()` - 9 edges
5. `load_reviews()` - 9 edges
6. `render()` - 9 edges
7. `replica-backend` - 9 edges
8. `replica-build` - 9 edges
9. `main()` - 8 edges
10. `main()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `build_patterns()` --calls--> `re`  [EXTRACTED]
  .claude/skills/replica-brand/sweep.py →   _Bridges community 11 → community 3_
- `main()` --calls--> `argparse`  [EXTRACTED]
  .claude/skills/replica-brand/sweep.py →   _Bridges community 11 → community 2_
- `default_pairs()` --calls--> `re`  [EXTRACTED]
  .claude/skills/replica-design/contrast.py →   _Bridges community 5 → community 3_
- `main()` --calls--> `argparse`  [EXTRACTED]
  .claude/skills/replica-design/contrast.py →   _Bridges community 5 → community 2_
- `main()` --calls--> `argparse`  [EXTRACTED]
  .claude/skills/replica-diff/imgdiff.py →   _Bridges community 1 → community 2_

## Import Cycles
- None detected.

## Communities (28 total, 6 thin omitted)

### Community 0 - "engine.js"
Cohesion: 0.12
Nodes (33): allUpgrades(), applyOffline(), availableUpgrades(), buildingCost(), buildingCps(), buildingMult(), buyBuilding(), buyUpgrade() (+25 more)

### Community 1 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 2 - "json"
Cohesion: 0.15
Nodes (13): combine(), load(), main(), MatrixError, render(), score(), visual_scores(), has_emoji() (+5 more)

### Community 3 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 4 - "ui.js"
Cohesion: 0.26
Nodes (12): buildBuildingRows(), load(), loop(), render(), renderBuildings(), renderGenres(), renderHighlights(), renderRewrite() (+4 more)

### Community 5 - "contrast.py"
Cohesion: 0.26
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

### Community 11 - "sweep.py"
Cohesion: 0.39
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

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

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `imgdiff.py` to `json`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12063492063492064 - nodes in this community are weakly interconnected._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.1476923076923077 - nodes in this community are weakly interconnected._