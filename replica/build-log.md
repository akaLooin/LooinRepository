# Build log

Data layer: **fake** (in memory, seeded, `app/src/data/store.ts`). Same function names the real one will have, so `/replica-backend` swaps the inside only. Everything resets when the app reloads.

Checks: each screen is driven in a browser (Expo web export + Playwright at 411×891). The checks are add, check, open sheets, save, validation errors and no console errors. Repeat rules have unit tests (`npm test`, 7 cases). The typecheck passes (`npx tsc --noEmit`). Not run on a real Android device yet.

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| shell | 2026-11-03 | done | — | Expo SDK 58 + RN 0.88 types (`TextInputInstance`), web inputs needed their focus outline removed |
| S03 home | 2026-11-03 | done | category filter (▼), 리스트 메뉴, 보관함 chip, status emoji, friend chips: buttons show a "not yet" toast | Mixed-day clover rule is a guess. The original shows a number on some partly-done days and a tick on others |
| S04 inline add/edit | 2026-11-03 | done | — | A tap on a routine suggestion blurs the field first, so closing waits 180 ms |
| S05 to-do sheet | 2026-11-03 | partial | 시간 알림 and 사진 인증 only show a toast. Drag-to-close (gesture library) | — |
| S05a memo sheet | 2026-11-03 | done | — | — |
| S06m top menu | 2026-11-03 | done | D-day and reminder screens behind it are stubs | — |
| S06 categories | 2026-11-03 | partial | drag to reorder | — |
| S06b category edit | 2026-11-03 | done | — | — |
| S06c visibility sheet | 2026-11-03 | done | the setting does nothing until phase 2 | — |
| S06d colour by hex | 2026-11-03 | done | — | Differs from the original on purpose (user request) |
| S06e move to category | 2026-11-03 | done | — | — |
| S07 routines | 2026-11-03 | partial | drag to reorder | — |
| S07b routine edit | 2026-11-03 | done | — | What "수동으로 할 일 추가" does is a guess: on = not shown on home automatically, offered as a suggestion when adding |
| S07c repeat | 2026-11-03 | done | the original's detail screens for each type are unseen, ours are our own layout | Biweekly counts from the week the routine starts |
| S07d time sheet | 2026-11-03 | done | — | — |
| S01, S02, S05b, S08, S09, S12, S12d, S15–S18, S21, S21b, S22 | — | stub | routed, show a "아직 만드는 중이에요" page | — |

Routine occurrences are not stored until the user touches one. Then they become a row with `routine_id` + `routine_date`, matching `replica/schema.sql`. Deleting one occurrence keeps a skipped row so the routine does not bring it back.
