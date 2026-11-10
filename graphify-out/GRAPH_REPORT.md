# Graph Report - LooinRepository  (2026-11-10)

## Corpus Check
- 38 files · ~63,373 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .csv 1, .properties 1)

## Summary
- 395 nodes · 727 edges · 28 communities (23 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `887919df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scene_alley.js
- reviews.py
- imgdiff.py
- scene_travel.js
- render.mjs
- replica-recon
- package.json
- main.js
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

## God Nodes (most connected - your core abstractions)
1. `lerp()` - 20 edges
2. `tone()` - 18 edges
3. `alley()` - 18 edges
4. `rng()` - 16 edges
5. `clamp()` - 14 edges
6. `prog()` - 14 edges
7. `canvas()` - 14 edges
8. `closeup()` - 14 edges
9. `noise()` - 13 edges
10. `office()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `hills()` --calls--> `noise()`  [EXTRACTED]
  teaser/src/scene_travel.js → teaser/src/core.js
- `init3d()` --calls--> `rng()`  [EXTRACTED]
  teaser/src/scene_3d.js → teaser/src/core.js
- `sprayPath()` --calls--> `rng()`  [EXTRACTED]
  teaser/src/scene_alley.js → teaser/src/core.js
- `background()` --calls--> `tone()`  [EXTRACTED]
  teaser/src/scene_office.js → teaser/src/core.js
- `closeup()` --calls--> `tone()`  [EXTRACTED]
  teaser/src/scene_office.js → teaser/src/core.js

## Import Cycles
- None detected.

## Communities (28 total, 5 thin omitted)

### Community 0 - "scene_alley.js"
Cohesion: 0.08
Nodes (76): beginSketch(), canvas(), clamp(), drawLogo(), drawLogoSketch(), tip(), ease, flyingPaper() (+68 more)

### Community 1 - "reviews.py"
Cohesion: 0.06
Nodes (40): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), check(), colours() (+32 more)

### Community 2 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 3 - "scene_travel.js"
Cohesion: 0.15
Nodes (16): hexRgb(), mix(), opt(), rgb(), tone(), building(), camel(), ERA_COUNT (+8 more)

### Community 4 - "render.mjs"
Cohesion: 0.10
Nodes (10): f0, f1, frames, MIME, pages, require, ROOT, server (+2 more)

### Community 5 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 6 - "package.json"
Cohesion: 0.20
Nodes (11): roughjs, three, dependencies, roughjs@^4.6.6, three@^0.170.0, name, private, scripts (+3 more)

### Community 7 - "main.js"
Cohesion: 0.20
Nodes (10): loadLogo(), A, ctx, cv, DURATION, q, ready, SCENES (+2 more)

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
Cohesion: 0.40
Nodes (4): 다시 만들기, 로고 리뉴얼 티저 영상, 로고 원본, 장면 구성

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `roughjs` connect `package.json` to `scene_alley.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Should `scene_alley.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07901234567901234 - nodes in this community are weakly interconnected._
- **Why does `tone()` connect `scene_travel.js` to `scene_alley.js`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Why does `rng()` connect `scene_alley.js` to `scene_travel.js`, `main.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `scene_travel.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._