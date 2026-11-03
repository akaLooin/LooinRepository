#!/usr/bin/env bash
# PreCompact: before the conversation is compacted, append a snapshot of where the work stands to
# docs/context/compact-log.md (kept to the last 20 entries). It never commits or pushes; the next commit carries it.
# Claude Code discards a PreCompact hook's message, so restoring context is SessionStart's job (matcher "compact").
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
INPUT="$(cat || true)"
python3 -I - "$ROOT" "$INPUT" <<'PY'
import json, subprocess, sys, os, datetime, re
root, raw = sys.argv[1], sys.argv[2]
try:
    data = json.loads(raw) if raw.strip() else {}
except Exception:
    data = {}

def sh(*args):
    try:
        return subprocess.run(args, cwd=root, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""

now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
changed = sh("git", "status", "--porcelain")
entry = "\n".join([
    f"## {now} · {data.get('trigger', '?')}",
    f"- 브랜치: {sh('git', 'branch', '--show-current')} · HEAD {sh('git', 'rev-parse', '--short', 'HEAD')}",
    f"- 커밋 안 된 파일: {len(changed.splitlines()) if changed else 0}개" + ("".join(f"\n  - `{l[3:]}`" for l in changed.splitlines()[:10]) if changed else ""),
    "- 최근 커밋:",
    *[f"  - {l}" for l in sh("git", "log", "--oneline", "-3").splitlines()],
    "",
])

path = os.path.join(root, "docs", "context", "compact-log.md")
os.makedirs(os.path.dirname(path), exist_ok=True)
head = "# compact-log\n\n대화 압축 직전 자동 기록 (PreCompact 훅). 최근 20개만 유지.\n\n"
try:
    old = open(path, encoding="utf-8").read()
except OSError:
    old = head
entries = re.split(r"(?m)^(?=## )", old[len(head):] if old.startswith(head) else old)
entries = [e for e in entries if e.strip().startswith("## ")]
entries = (entries + [entry])[-20:]
with open(path, "w", encoding="utf-8") as f:
    f.write(head + "\n".join(e.rstrip() + "\n" for e in entries))
PY
exit 0
