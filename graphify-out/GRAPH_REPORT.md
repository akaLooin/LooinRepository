# Graph Report - LooinRepository  (2026-11-25)

## Corpus Check
- 39 files · ~22,776 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 54 file(s) not represented in the graph (top: .gd 21, .uid 21, (none) 4)
- WARNING: 54 of 95 files seen (57%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 286 nodes · 364 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5a21d4e3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- reviews.py
- imgdiff.py
- 데모 기획안 v0.2 — 가제 「테일즈토피아 RPG」
- contrast.py
- json
- replica-recon
- listing.py
- Recon map: {{app}} ({{platform}})
- Recon map: 그랜드체이스 (PC 원작 / Classic) → 모바일 픽셀 리디자인 (Android 우선)
- replica-backend
- replica-build
- replica-brand
- replica-deploy
- replica-entrepreneur
- replica-test
- Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성)
- replica-architect
- replica-design
- replica-diff
- replica-launch
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
- Deploy checklist: {{your app}}
- 테일즈토피아 RPG (프로토타입 v0.1)
- CLAUDE.md
- graphify-stop.sh
- bug-report.md
- test-plan.md
- build-log.md

## God Nodes (most connected - your core abstractions)
1. `데모 기획안 v0.2 — 가제 「테일즈토피아 RPG」` - 13 edges
2. `replica-recon` - 12 edges
3. `compare()` - 10 edges
4. `Recon map: {{app}} ({{platform}})` - 10 edges
5. `Recon map: 그랜드체이스 (PC 원작 / Classic) → 모바일 픽셀 리디자인 (Android 우선)` - 10 edges
6. `read_png()` - 9 edges
7. `load_reviews()` - 9 edges
8. `replica-backend` - 9 edges
9. `replica-build` - 9 edges
10. `main()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `4. 시스템 인터페이스 ("API")` --references--> `load()`  [INFERRED]
  replica/architecture.md → .claude/skills/replica-diff/parity.py

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "reviews.py"
Cohesion: 0.13
Nodes (18): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep(), analyse(), FeedbackError (+10 more)

### Community 1 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 2 - "데모 기획안 v0.2 — 가제 「테일즈토피아 RPG」"
Cohesion: 0.12
Nodes (16): 10. 개발 단계 (한 단계씩, 매 단계 승인 후 진행), 11. 데모 완료 기준, 12. 결정 사항 (2026-11-25), 1. 한 줄 요약, 2. 원작에서 가져올 것 vs 새로 만들 것, 3. 아트 컨셉 — 픽셀, 4. 세계관 — 테일즈토피아 (사용자 원작 환상학), 5. 데모 캐릭터 — 협의 중 (+8 more)

### Community 3 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 4 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 5 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 6 - "listing.py"
Cohesion: 0.33
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 7 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 8 - "Recon map: 그랜드체이스 (PC 원작 / Classic) → 모바일 픽셀 리디자인 (Android 우선)"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: 그랜드체이스 (PC 원작 / Classic) → 모바일 픽셀 리디자인 (Android 우선), Screens (+2 more)

### Community 9 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 10 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 11 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 12 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 13 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 14 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 15 - "Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성)"
Cohesion: 0.22
Nodes (8): 1. Stack, 2. 폴더 구조, 3. 데이터 구조 ("스키마"), 4. 시스템 인터페이스 ("API"), 5. 까다로운 부분 (The parts that bite), 6. Build order, Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성), 요약

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

### Community 21 - "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007"
Cohesion: 0.29
Nodes (6): DEFINITIONS, DISCLAIMER, PERMISSION & CONDITIONS, PREAMBLE, SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007, TERMINATION

### Community 22 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 23 - "테일즈토피아 RPG (프로토타입 v0.1)"
Cohesion: 0.33
Nodes (5): 구조, 빌드, 실행, 자동 검증, 테일즈토피아 RPG (프로토타입 v0.1)

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `load()` connect `json` to `Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성)`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `reviews.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1310344827586207 - nodes in this community are weakly interconnected._
- **Why does `4. 시스템 인터페이스 ("API")` connect `Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성)` to `json`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `imgdiff.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `데모 기획안 v0.2 — 가제 「테일즈토피아 RPG」` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._