#!/usr/bin/env bash
# 답변이 끝날 때마다: 코드 지도를 갱신하고, 바뀐 지도만 따로 커밋해서 푸시한다.
# 실패해도 세션을 방해하지 않도록 항상 0으로 끝난다.
G=/root/.local/bin/graphify
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -x "$G" ] && [ -f graphify-out/graph.json ] || exit 0

"$G" update . >/dev/null 2>&1

# 리베이스·머지 중이거나 브랜치가 없으면(detached HEAD) 커밋하지 않는다.
gd=$(git rev-parse --git-dir 2>/dev/null) || exit 0
[ -d "$gd/rebase-merge" ] || [ -d "$gd/rebase-apply" ] || [ -f "$gd/MERGE_HEAD" ] && exit 0
branch=$(git symbolic-ref --short -q HEAD) || exit 0

git add -A graphify-out >/dev/null 2>&1
git diff --cached --quiet -- graphify-out && exit 0
# graphify-out 경로만 커밋한다. 사용자가 스테이징해둔 다른 파일은 건드리지 않는다.
git commit -q -m "Update code map (graphify)" -- graphify-out >/dev/null 2>&1 || exit 0
timeout 40 git push -q -u origin "$branch" >/dev/null 2>&1 || true
exit 0
