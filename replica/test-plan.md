# Test plan

Clone only (never the original's servers). Automated runs use the web export in demo mode at 411×891 (and 360 wide) with Playwright; unit tests run with `npm test`. Scripts: `app/e2e/` (see its README).

Legend: ✅ automated and passing · 🖐 manual on the phone (Expo Go / APK) · — not applicable yet

## Flows from the recon map

| case | what | how |
| --- | --- | --- |
| F01-H1 | add a to-do with + and check it; clover count changes | ✅ slice.js |
| F01-E1 | empty / spaces-only title is not added | ✅ edge.js |
| F01-E2 | 120-character title wraps, no sideways scroll | ✅ edge.js |
| F01-E3 | emoji and accents kept as typed | ✅ edge.js |
| F01-E4 | Enter twice quickly adds one | ✅ edge.js |
| F01-E5 | refresh keeps what was added | ✅ edge.js, persist checks |
| F01-E6 | double tap on the clover ends where it started | ✅ edge.js |
| F01-E7 | offline add, sync later | ✅ test-sync.ts (two devices, fake server) · 🖐 airplane mode on the phone |
| F01-N1 | add to an ended category is refused | ✅ schema test (local Postgres) · store throws, toast shown |
| F02-H1 | create, edit (hex colour, visibility), end, delete category | ✅ cat.js |
| F02-E1 | back mid-edit discards changes | ✅ edge.js |
| F02-E2/E3 | 30-character category name: list and home pill stay on screen | ✅ edge.js (was B1) |
| F02-N1 | invalid hex code rejected with a message | ✅ cat.js |
| F03-H1 | 내일 또 하기, 다른 날 또 하기, 날짜 바꾸기 | ✅ slice.js, inbox-listmenu.js |
| F03b-H1 | edit inline (double tap), delete | ✅ slice.js, drag.js |
| F03c-H1 | memo, alarm, timer, photo, info | ✅ sheets.js, rm.js, tm.js, photos.js |
| F04-H1 | routines: occurrences on home, manual-add row, repeat, time, new | ✅ rt.js, pend.js, test-routines.ts |
| F04-E1 | 31st in short months, biweekly, leap day | ✅ test-routines.ts |
| F05-H1 | timer start/pause, survives reload | ✅ tm.js |
| F06-H1 | diary mood, text, background, photos, empty removes | ✅ dy.js, photos.js |
| F07-H1 | D-days: new fixed/repeating, delete, reorder | ✅ dd.js, drag.js, test-dday.ts |
| F07-E1 | past D-day shows D+n | ✅ edge.js |
| F07-E2 | edit screen opened directly closes after saving | ✅ edge.js (was B2) |
| F08 | widget | — not built |
| F09-H1 | two devices: add, check, delete, offline edit wins, no duplicates | ✅ test-sync.ts · 🖐 phone + web on one account |
| F09-N1 | second user sees nothing of the first | ✅ RLS test on local Postgres · 🖐 two accounts |
| F10 | friends | — phase 2 |

## Added after the recon map

| case | what | how |
| --- | --- | --- |
| IN-H1 | 보관함: button, swipe right under the calendar, add, 오늘하기, swipe back | ✅ inbox-listmenu.js |
| LM-H1 | 리스트 메뉴: undone to tomorrow / another day, select, copy all, delete all | ✅ inbox-listmenu.js |
| SH-H1 | sheets: drag down closes, short drag springs back, header buttons still tap | ✅ sheets.js |
| PH-H1 | photos resized to 1600px, kept after reload | ✅ photos.js · 🖐 upload to Storage |
| ST-H1 | display settings change home (theme, week start, collapse, input at top) | ✅ st.js, home-options.js |
| ST-E1 | settings sync: round trip, device-only stay local, odd values ignored | ✅ test-settings.ts · 🖐 two devices |
| RE-H1 | reminders and alarms planned for the right times | ✅ test-notifications.ts, rm.js · 🖐 do they ring |
| M-E1 | 360dp wide: no sideways scroll on 10 main screens | ✅ edge.js |
| A11Y | axe (serious/critical) on 6 screens | ✅ edge.js, see bugs.md "to check" |
| NO-ERR | no console errors or 5xx on any automated run | ✅ every script |

## Manual pass on the phone (needs the user)

1. Sizes look like the original (설정 → 화면 → 화면 크기 shows the phone's dp width)
2. Hold-and-drag feel (0.3 s), sheet drag, swipe to 보관함
3. Reminder and alarm ring at the set time, permission prompt appears once
4. Sync: add on the phone, see it in Supabase `todos`; photo in Storage `todo-photos`; same account on the web shows both
5. Airplane mode: add and check, turn the network back on, it syncs
