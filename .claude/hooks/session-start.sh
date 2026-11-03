#!/usr/bin/env bash
# SessionStart: put the project state back into Claude's context after startup, resume, /clear and compaction.
# Output is JSON with hookSpecificOutput.additionalContext (Claude Code caps it at 10,000 characters).
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
INPUT="$(cat || true)"
python3 -I - "$ROOT" "$INPUT" <<'PY'
import json, subprocess, sys, os
root, raw = sys.argv[1], sys.argv[2]
try:
    source = json.loads(raw).get("source", "unknown") if raw.strip() else "unknown"
except Exception:
    source = "unknown"

def sh(*args):
    try:
        return subprocess.run(args, cwd=root, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""

def read(rel, limit):
    try:
        with open(os.path.join(root, rel), encoding="utf-8") as f:
            text = f.read()
        return text if len(text) <= limit else text[:limit] + "\n…(잘림: 전체는 " + rel + ")"
    except OSError:
        return ""

branch = sh("git", "branch", "--show-current")
status = sh("git", "status", "--porcelain")
log = sh("git", "log", "--oneline", "-5")
unpushed = sh("git", "log", "--oneline", "@{u}..HEAD") if branch else ""

parts = [
    f"[context-hook] 세션 시작 이유: {source}. 아래는 저장소에 보존된 프로젝트 상태다. 이어서 작업하기 전에 읽고, 필요하면 docs/context/ 의 원문을 열어 볼 것.",
    f"## git\n브랜치: {branch or '?'}\n커밋 안 된 변경: {len(status.splitlines()) if status else 0}개\n푸시 안 된 커밋: {len(unpushed.splitlines()) if unpushed else 0}개\n최근 커밋:\n{log}",
    read("docs/context/HANDOFF.md", 6500),
]
if source in ("compact", "clear", "resume"):
    parts.append(read("docs/context/DECISIONS.md", 2600))

ctx = "\n\n".join(p for p in parts if p)[:9800]
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}, ensure_ascii=False))
PY
