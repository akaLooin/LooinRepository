# CLAUDE.md

Personal Android app that rebuilds the to-do app "todo mate" (Expo + Supabase), made with the replica skills in `.claude/skills/`.

**Read first:** `docs/context/HANDOFF.md` (current state and next steps), then `docs/context/DECISIONS.md` (what the user decided and why). A SessionStart hook (`.claude/hooks/session-start.sh`) injects HANDOFF at every start, plus DECISIONS after resume, `/clear` and compaction; its message starts with `[context-hook]`. If no such message is in context, the hook did not run: read both files yourself.

## Working with the user

- **Reply in Korean**, in plain language. The user is not a developer by trade: say what to click or type, one step at a time.
- The user runs the app from a **Windows PC** (PowerShell: use `npm.cmd` / `npx.cmd`) with **Expo Go** on a Samsung Android phone. Sometimes no PC is available: then do work that needs no device.
- Ask before changing anything the user decided (see DECISIONS.md).

## Rules

- **Clean room.** Build only from the user's screenshots (`replica/screens/`) and public information. **Never use** the APK resources or decompiled source the user offered, even for personal use. Icons are Lucide; the clover is our own SVG.
- **Public repository.** No keys, no Supabase project URL or keys, no personal data in commits. `.env.local` stays local (git-ignored).
- **Branch:** work on `claude/replica-skill-install-ll9jb4`, commit per feature, push with `git push -u origin claude/replica-skill-install-ll9jb4`. No PR unless asked.
- **Tokens only** in components (`replica/design/tokens*.json` → `npm run tokens` → `app/src/theme/tokens.ts`).
- **Keep context durable:** after each feature, update `docs/context/HANDOFF.md` (keep it under ~8,000 characters) and add any new user decision to `DECISIONS.md`, in the same commit. `/context-handoff` does this.

## Layout

| path | what |
| --- | --- |
| `app/` | Expo SDK 58 app (expo-router, `src/app` routes, `src/features/*` screens, `src/components`, `src/data` store + sync, `src/theme`) |
| `app/scripts/test-*.ts` | unit tests (`npm test`) |
| `app/e2e/*.js` | browser checks (Playwright against the web export; see `app/e2e/README.md`) |
| `supabase/migrations/` | database (run once in the Supabase SQL editor) |
| `supabase/functions/delete-account/` | account deletion Edge Function |
| `replica/` | recon map, architecture, design system, backend notes, build log, feature matrix (`features.csv`, `clone` column) |
| `docs/context/` | HANDOFF, DECISIONS, compact-log (written by the PreCompact hook) |

## Checks before a commit

```bash
cd app
npx tsc --noEmit
npm test
CI=1 npx expo export --platform web --output-dir <scratch>/web   # then e2e: see app/e2e/README.md
```
