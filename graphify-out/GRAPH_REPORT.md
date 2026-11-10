# Graph Report - LooinRepository  (2026-11-10)

## Corpus Check
- 40 files · ~70,334 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .csv 1)

## Summary
- 430 nodes · 844 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad60f5ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scene_alley.js
- reviews.py
- imgdiff.py
- scene_office.js
- render.mjs
- replica-recon
- package.json
- core.js
- Recon map: {{app}} ({{platform}})
- replica-backend
- replica-build
- audio.py
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
- 로고 리뉴얼 티저 영상
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- contrast.py
- f

## God Nodes (most connected - your core abstractions)
1. `lerp()` - 22 edges
2. `rng()` - 20 edges
3. `V()` - 20 edges
4. `clamp()` - 19 edges
5. `canvas()` - 19 edges
6. `noise()` - 17 edges
7. `initOffice()` - 17 edges
8. `initAlley()` - 16 edges
9. `alley()` - 16 edges
10. `phone()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `sprayPath()` --calls--> `rng()`  [EXTRACTED]
  teaser/src/scene_alley.js → teaser/src/core.js
- `alongPath()` --calls--> `clamp()`  [EXTRACTED]
  teaser/src/kit.js → teaser/src/core.js
- `makeFigure()` --calls--> `clamp()`  [EXTRACTED]
  teaser/src/kit.js → teaser/src/core.js
- `makeFigure()` --calls--> `lerp()`  [EXTRACTED]
  teaser/src/kit.js → teaser/src/core.js
- `office()` --calls--> `lerp()`  [EXTRACTED]
  teaser/src/scene_office.js → teaser/src/core.js

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "scene_alley.js"
Cohesion: 0.09
Nodes (52): clamp(), drawLogo(), drawLogoSketch(), tip(), glitch(), lerp(), logoBitmap(), noise() (+44 more)

### Community 1 - "reviews.py"
Cohesion: 0.08
Nodes (31): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), combine(), load() (+23 more)

### Community 2 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 3 - "scene_office.js"
Cohesion: 0.13
Nodes (41): three, canvas(), ease, PAPER_H, PAPER_W, paperSprite(), rng(), alongPath() (+33 more)

### Community 4 - "render.mjs"
Cohesion: 0.10
Nodes (10): f0, f1, frames, MIME, pages, require, ROOT, server (+2 more)

### Community 5 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 6 - "package.json"
Cohesion: 0.20
Nodes (10): roughjs, dependencies, roughjs@^4.6.6, three@^0.170.0, name, private, scripts, preview (+2 more)

### Community 7 - "core.js"
Cohesion: 0.07
Nodes (33): beginSketch(), flyingPaper(), H, hexRgb(), ik(), layer(), LAYERS, loadLogo() (+25 more)

### Community 8 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 9 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 10 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 11 - "audio.py"
Cohesion: 0.44
Nodes (6): add(), band(), click(), env(), glitchfx(), hit()

### Community 12 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 13 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 14 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 15 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 16 - "replica-architect"
Cohesion: 0.25
Nodes (7): Output, replica-architect, Step 1: the stack, Step 2: the schema, Step 3: the API, Step 4: the parts that bite, Step 5: build order

### Community 17 - "replica-design"
Cohesion: 0.25
Nodes (7): Output, replica-design, Step 1: measure, do not guess, Step 2: write the tokens, Step 3: component specs, Step 4: build the primitives, The rules

### Community 18 - "replica-diff"
Cohesion: 0.25
Nodes (7): Output, replica-diff, Step 1: feature parity, Step 2: layout diff, Step 3: behaviour diff, Step 4: the report, What parity means here

### Community 19 - "replica-launch"
Cohesion: 0.25
Nodes (7): Output, replica-launch, Step 1: landing page, Step 2: pricing, Step 3: store listing, Step 4: launch plan, The rules

### Community 20 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 21 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 22 - "로고 리뉴얼 티저 영상"
Cohesion: 0.33
Nodes (5): 다시 만들기, 로고 리뉴얼 티저 영상, 로고 원본, 장면 구성, 화풍

### Community 28 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `renderer`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `scene_office.js` to `scene_alley.js`, `package.json`, `core.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `renderer` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scene_alley.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09224318658280922 - nodes in this community are weakly interconnected._
- **Why does `makeFigure()` connect `scene_office.js` to `scene_alley.js`, `f`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0803633822501747 - nodes in this community are weakly interconnected._
- **Why does `f` connect `f` to `scene_office.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._