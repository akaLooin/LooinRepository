## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## 코드 지도 (graphify) — 한국어 요청

- 사용자가 "코드 지도 만들어줘", "코드 지도 그려줘", "프로젝트 구조 지도 만들어줘"처럼 말하면 `/graphify .`을 실행한 것과 똑같이 graphify 스킬로 이 저장소 전체의 지도를 만든다.
- "코드 지도 업데이트해줘", "지도 갱신해줘"라고 하면 `graphify update .`을 실행한다. 문서나 이미지까지 다시 반영해달라고 하면 `/graphify . --update`로 처리한다.
- 코드를 고친 뒤에는 따로 요청이 없어도 `graphify update .`로 지도를 갱신한다. (답변이 끝날 때 Stop 훅도 자동으로 갱신한다.)
- 지도에 대한 설명은 한국어로 한다.
