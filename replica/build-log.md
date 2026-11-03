# Build log

Data layer: **real** since replica-backend. Saved on the device and synced with Supabase when signed in; demo mode (no keys) keeps sample data on the device only. See `replica/backend.md`.

Checks: each screen is driven in a browser (Expo web export + Playwright at 411×891). The checks are add, check, open sheets, save, validation errors and no console errors. Repeat rules have unit tests (`npm test`, 7 cases). The typecheck passes (`npx tsc --noEmit`). Not run on a real Android device yet.

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| shell | 2026-11-03 | done | — | Expo SDK 58 + RN 0.88 types (`TextInputInstance`), web inputs needed their focus outline removed |
| S03 home | 2026-11-03 | done | category filter (▼), 리스트 메뉴, 보관함 chip, status emoji, friend chips: buttons show a "not yet" toast | Clover rule confirmed by the user: once anything is done the clover fills with the day's category colours, split in category order; the number is what's left in total, a tick means all done (tests in scripts/test-daystate.ts) |
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
| S07b routine edit | 2026-11-03 | done | — | "수동으로 할 일 추가" confirmed by the user: the routine shows as a grey row with + in its category; one tap adds it for that day, then it can be edited (e.g. "💪 운동하기: 어깨") |
| S07c repeat | 2026-11-03 | done | the original's detail screens for each type are unseen, ours are our own layout | Biweekly counts from the week the routine starts |
| S07d time sheet | 2026-11-03 | done | — | — |
| S01 login | 2026-11-03 | done | Google sign-in | Email code needs the Supabase email template changed to show the code (backend.md) |
| S12 settings | 2026-11-03 | partial | only account and sync rows work | — |
| S18 me | 2026-11-03 | partial | profile and a way to settings | — |
| S02, S05b, S08, S09, S12d, S15–S17, S21, S21b, S22 | — | stub | routed, show a "아직 만드는 중이에요" page | — |

Routine occurrences are not stored until the user touches one. Then they become a row with `routine_id` + `routine_date`, matching `replica/schema.sql`. Deleting one occurrence keeps a skipped row so the routine does not bring it back.
