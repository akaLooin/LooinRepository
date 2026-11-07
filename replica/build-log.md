# Build log

Data layer: **real** since replica-backend. Saved on the device and synced with Supabase when signed in; demo mode (no keys) keeps sample data on the device only. See `replica/backend.md`.

Checks: each screen is driven in a browser (Expo web export + Playwright at 411×891, scripts in `app/e2e/`). The checks are add, check, open sheets, save, validation errors and no console errors. Unit tests: `npm test` (30 cases: repeat rules, clover, sync, D-days, URL, notifications). The typecheck passes (`npx tsc --noEmit`). Not run on a real Android device yet.

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| shell | 2026-11-03 | done | — | Expo SDK 58 + RN 0.88 types (`TextInputInstance`), web inputs needed their focus outline removed |
| S03 home | 2026-11-03 | done | category filter (▼), 리스트 메뉴, 보관함 chip, status emoji, friend chips: buttons show a "not yet" toast | Clover rule confirmed by the user: once anything is done the clover fills with the day's category colours, split in category order; the number is what's left in total, a tick means all done (tests in scripts/test-daystate.ts) |
| S04 inline add/edit | 2026-11-03 | done | — | A tap on a routine suggestion blurs the field first, so closing waits 180 ms |
| S05 to-do sheet | 2026-11-03 | partial | 시간 알림 and 사진 인증 only show a toast. Drag-to-close (gesture library) | — |
| S05a memo sheet | 2026-11-03 | done | — | — |
| S06m top menu | 2026-11-03 | done | D-day and reminder screens behind it are stubs | — |
| S06 categories | 2026-11-03 | done | — | Drag to reorder: own component on PanResponder (no new library), screen readers get move up/down actions |
| S06b category edit | 2026-11-03 | done | — | — |
| S06c visibility sheet | 2026-11-03 | done | the setting does nothing until phase 2 | — |
| S06d colour by hex | 2026-11-03 | done | — | Differs from the original on purpose (user request) |
| S06e move to category | 2026-11-03 | done | — | — |
| S07 routines | 2026-11-03 | done | — | — |
| S07b routine edit | 2026-11-03 | done | — | "수동으로 할 일 추가" confirmed by the user: the routine shows as a grey row with + in its category; one tap adds it for that day, then it can be edited (e.g. "💪 운동하기: 어깨") |
| S07c repeat | 2026-11-03 | done | the original's detail screens for each type are unseen, ours are our own layout | Biweekly counts from the week the routine starts |
| S07d time sheet | 2026-11-03 | done | — | — |
| S01 login | 2026-11-03 | done | Google sign-in, password reset | Switched from email codes to email + password: Supabase's built-in mailer no longer allows a template with the code |
| S12 settings | 2026-11-03 | partial | only account and sync rows work | — |
| S18 me | 2026-11-03 | partial | profile and a way to settings | — |
| S21 D-days | 2026-11-03 | done | — | Repeating D-days: next date, short months use their last day (scripts/test-dday.ts) |
| S21b D-day edit | 2026-11-03 | done | — | — |
| S08 timer | 2026-11-03 | done | — | Stores a start time plus a total, so a closed app keeps counting |
| S05b to-do info | 2026-11-03 | done | photo (no upload yet) | — |
| S02 profile | 2026-11-03 | partial | profile photo | — |
| S12d display | 2026-11-03 | partial | 10 of 18 options shown as "준비 중" | Rows without an action disabled the toggles inside them for screen readers; fixed in ListRow and FieldRow |
| S09 diary | 2026-11-03 | partial | photos, stickers | Entry point is our choice (a row under the day's to-dos); the original's is unseen. Header follows the diary background colour |
| S22 reminders + S05 alarm | 2026-11-03 | done | — | Local notifications; plan unit-tested (scripts/test-notifications.ts). Ringing only verifiable on a phone |
| S15–S17 | — | stub | routed, show a "아직 만드는 중이에요" page | — |

Routine occurrences are not stored until the user touches one. Then they become a row with `routine_id` + `routine_date`, matching `replica/schema.sql`. Deleting one occurrence keeps a skipped row so the routine does not bring it back.

## Size fix (after the first run on the user's phone)

The user saw text and icons bigger than the original. Sizes had been measured assuming 1080px = 411dp. Their phone is narrower in dp (Samsung phones are usually 360–393dp), so everything came out 5–14% too big. The app now lays out on a 411dp canvas and scales it to the phone's real width (`app/src/theme/scale.tsx`); bottom sheets and modals scale too. 설정 → 화면 → 화면 크기 shows the phone's width and lets the user pick the factor by hand.
| S03 home options | 2026-11-03 | done | — | Calendar filter (▼), 리스트 메뉴 (our contents: hide done, collapse, sort, links — the original's menu is unseen), input at top, collapse, calendar category count. e2e/home-options.js |
| S23 보관함 | 2026-11-04 | done | — | To-dos without a date (todos.date nullable: migration 0003). Box button and a left-to-right swipe under the calendar open it; swipe back closes. Its to-do menu: memo text, 오늘하기, 날짜 바꾸기, 정보 보기 (from the user's screenshot) |
| 리스트 메뉴 | 2026-11-04 | done | — | Rebuilt from the user's screenshot: pick one action, then 확인. "할 일 선택" opens our selection bar (내일 하기 / 보관함 / 삭제 / 취소); "모든 할 일 복사" copies to a picked day (guess). e2e/inbox-listmenu.js |
| photos | 2026-11-04 | done (upload unverified) | — | Proof photo (S05), profile photo (S02, home, info, diary), diary photos (up to 4). Picked photos are resized to 1600px JPEG 80% and kept on the device; each sync uploads pending ones to Supabase Storage first, then saves the stored path. On the web a picked photo is a blob: URL that dies on reload, so web keeps a data URL. Native photos sit in the cache folder until uploaded (demo mode could lose them if the OS clears the cache). e2e/photos.js |
| sheets | 2026-11-04 | done | — | Drag the top of any bottom sheet down to close; short drags spring back. 할 일 정보 보기 is now a sheet over the screen (transparent modal route). Harder than expected: claiming the gesture only on move reused the previous gesture's start point on the web, so the sheet now claims on touch (header buttons still win their taps). e2e/sheets.js |
| settings sync | 2026-11-04 | done (server unverified) | — | 10 display settings follow the account through user_settings (upsert on user_id, pulled with the other tables). Device-only: 화면 크기, folded categories, calendar filter. Local changes win until sent. Mapping tests: scripts/test-settings.ts |
| replica-test | 2026-11-04 | done | manual pass on the phone | 13 edge cases + axe; 6 bugs found and fixed (replica/bugs.md), 0 open S1/S2 |
| phone fixes | 2026-11-05 | done (phone check pending) | — | From the user's first phone run: sizes re-matched to a same-phone screenshot of the original (calendar days spread edge to edge, clover 24→28, today circle 34→28, avatar 67→69, header pills 34→36, filter pill narrower, spacing above the profile); hold-and-drag re-timed from the original's screen recording (hold 0.5 s, grey band instead of zoom, neighbours slide 0.15 s, drop glides in); notifications (B7) and photo upload (B8, B9) fixed |
| drag across categories | 2026-11-05 | done | — | From the user's recording: a held to-do can pass a category title (the title slides aside) and joins the category it is dropped under; its clover takes that colour. Home and 보관함 are now one list each (titles fixed, to-dos movable); scripts/test-arrange.ts, e2e/drag.js. Ended categories refuse new to-dos |
| phone round 3 | 2026-11-05 | done (phone check pending) | — | Calendar date digits 13.5→14.5, clover number 0.62→0.52 of the clover, clover 27, selected day as a grey disc (#363636, original), to-do list 3dp right/lower; folding moved to a ∨ at the end of each title row (user's screenshot), the title opens the category; to-dos with an alarm show a clock + time under the title (user's screenshot). Smoothness: drag, sheets and fold arrow run on the UI thread (native driver), the scroll lock no longer re-renders the screen (DragScrollView), the drag band fades in/out, and adding/removing/folding/date changes glide (LayoutAnimation). Notifications: see B10, B11 |
| phone round 4 | 2026-11-07 | done (phone check pending) | — | Calendar: picked day = white disc with a black number (red/blue kept), today = grey disc. To-do menu rows now follow the original's four menus (today/past × done/undone; e2e/menus.js). Clover: grey until done, white tick by default (설정 → 화면 → 체크 표시 색: 하얀색/검은색; switches automatically on a white category), no shrink on tap but a grey dot that fades (as in the original); no layout animation on check. Drag drop fixed (B12), swipe from a row (B13), private photos wait for the sign-in and retry |
| phone round 5 | 2026-11-07 | done (phone check pending) | — | 보관함 is now the page left of home in one pager (HomePager): a sideways swipe drags both pages with the finger and settles (0.26 s) or springs back; the box button and Android back slide too. 보관함 is built only while visible. No press effect on the clover. Notifications only re-schedule what changed and check the channel once per run (after every change the phone was busy; a moved to-do could not be opened right away). Grey photos now say why (not uploaded / link error with message / download failed) and the file name |
| phone round 6 | 2026-11-07 | done (phone check pending) | — | Drop saves at once (B14); pager: 보관함 built ahead on the phone and kept, page contents not redrawn while sliding; missing photo files get a plain message (B15) |
| calendar paging + edit | 2026-11-07 | done (phone check pending) | — | From the user's recording of the original: the calendar is a sideways strip (CalendarPager) that follows the finger; forward picks the 1st, back the last day; arrows slide too; week view pages by week. Tapping the month title returns to today. Editing: the keyboard opens at once, the page scrolls the row above the keyboard (DragScrollView reveal, measured on screen, scrolled in canvas units), and edit mode with the typed draft survives picking another day. e2e/calendar.js |
| calendar + edit round 2 | 2026-11-07 | done (phone check pending) | — | Swipe: the slide runs first and the screen updates after it (a timer), pages get their width up front (no rearranging while sliding), the strip spans the whole screen with a gap between months, off-screen pages take no touches (they overlapped the Saturday column), scroll locked while dragging. Arrows and title jump at once. Edit: back on its day the field shows without the keyboard; a tap on empty space ends editing (watched in the capture phase, never taking the touch); a double tap no longer flashes the menu (single tap waits 0.26 s); the row scrolls further up so the underline shows. app.json updates.fallbackToCacheTimeout 30 s so Expo Go waits for the new version |
