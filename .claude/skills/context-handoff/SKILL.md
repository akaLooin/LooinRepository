---
name: context-handoff
description: >-
  Saves where the project stands so a new session, or this one after compaction, can continue without the old
  conversation. Updates docs/context/HANDOFF.md and DECISIONS.md from the repository and the conversation, then
  commits and pushes them. Use after finishing a feature, before the user steps away, when context use is high
  (around 70% or more), or when the user says "핸드오프", "컨텍스트 저장", "정리해 둬", "save context".
---

# context-handoff

The conversation is lost when the container is reclaimed; only pushed files survive. A SessionStart hook
(`.claude/hooks/session-start.sh`) injects HANDOFF.md (and DECISIONS.md after compaction) into new contexts, so these
two files are the memory of the project.

## Steps

1. **Look, do not guess.** Run `git status`, `git log --oneline -10`, and read `replica/build-log.md` and the
   `clone` column of `replica/features.csv` (count must/should done and partial).
2. **Rewrite `docs/context/HANDOFF.md`** in Korean, keeping its sections:
   한 줄 요약 · 진행 현황 · 만들어진 것 · 이용자 환경 · 이용자가 확인해 줘야 할 것 · 다음 할 일 후보 · 알려진 한계 · 작업 방법.
   - Facts only: what was built and verified, what is unverified, what the user still has to check on the phone.
   - Keep it under **6,000 characters** (the hook injects at most ~6,500 of it). Move detail to `replica/build-log.md`.
   - Update the date line and branch.
3. **Append to `docs/context/DECISIONS.md`** one row per decision the user made or confirmed since the last entry
   (date, decision, reason or source). Never rewrite past rows; if a decision changed, add a new row saying so.
4. **Public repository:** no keys, project URLs, passwords, or personal data in either file.
5. **Commit and push** together with any pending work:
   `git add docs/context CLAUDE.md && git commit -m "docs: update handoff" && git push -u origin <current branch>`.
6. Tell the user in one or two Korean sentences what was saved.

## Keep CLAUDE.md short

CLAUDE.md is loaded in every session. Only stable rules and the layout belong there; state goes in HANDOFF.md.
