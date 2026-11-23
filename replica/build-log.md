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
| memo/alarm taps | 2026-11-07 | done (phone check pending) | — | Bottom sheets rise above the keyboard (lift measured from the screen bottom, native driver); the memo field focuses as the editor opens; tapping a row's memo opens the memo editor, tapping its alarm time opens the time sheet (home and 보관함). e2e/menus.js |
| calendar tap speed | 2026-11-07 | done (phone check pending) | — | User's video: the original moves the picked circle ~0.1 s after a tap, ours took 0.15–0.27 s. Each date is now a memoised cell (only the old and new picked cells redraw, not 126 clovers across the three pages). Browser with CPU slowed 6×: 0.19–0.26 s → 0.08–0.11 s |
| password reset | 2026-11-07 | done (needs dashboard step + phone check) | — | Login → 비밀번호를 잊으셨나요? sends Supabase's reset mail with redirect todomateclone://reset-password; AuthGate reads the link (expo-linking), signs in with its tokens and shows the new-password screen; expired links show a message on the login screen. Settings → 비밀번호 바꾸기. scripts/test-authlink.ts, e2e/auth.js |
| settings (original) | 2026-11-07 | done (phone check pending) | Premium (not wanted), stickers (no artwork yet) | From the user's recording: 설정 list in the original's order with icons, 버전 and 로그아웃 at the bottom; 프로필 (photo sheet 수정/삭제, 이름 30 / 자기소개 200 / ID 20 on their own screens, 관심사 chips up to 10 from the user's categories and routines + 직접 등록); 계정 (비밀번호 재설정, 성별 sheet, 생년월 wheels, 계정 삭제하기); 개인정보 보호 (sections as the original; 모든 일기의 공개설정 변경 works now, the rest waits for friends); 앱 권한 (notification permission with 허용/완료); 화면 in the original's order + 할 일 사진 작게 보기 and 피드에서 좋아요 보이기 (synced); 알림 (three switches); 공지사항 (our own update notes); 정보 (our terms, privacy, open-source list); 문의하기 (our FAQ); 실험실 (강제 동기화 + sync state). 마이: gear, e-mail, following counts, 나의 기록. Migration 20261107000000 for the profile fields. Calendar arrows: dates answer taps again (moved with a zero-length native animation). e2e/settings.js |
| status emoji | 2026-11-07 | done | — | Home's dashed 😊+ opens a sheet of 36 everyday system emoji; the pick replaces the button and syncs (profiles.status_emoji, already in the schema). What the original does with it is a guess |
| home widget | 2026-11-07 | done (needs the next APK + phone check) | — | "오늘 할 일" Android widget (react-native-android-widget): today's to-dos in category order with our clover; tap a clover to check (queued, shown at once, applied and synced when the app opens), tap a title or the header to open the app; redraws after app changes and every 30 min. Entry is index.js (expo-router + widget handler on Android only). Model unit-tested (scripts/test-widget.ts); prebuild shows the receiver and provider; Android bundle exports. Its look on a real home screen is not seen yet |
| display settings rest | 2026-11-07 | done | 할 일 캘린더 max counts (that screen is unseen) | 폰트: 기본 (Pretendard), 시스템, 나눔고딕, 나눔손글씨 펜 (OFL, built into the APK, loaded on demand in Expo Go/web); the font is part of the theme so every text redraws. 피드에서 메모 줄 제한 (무제한/1/2/3/5, for the phase-2 feed). 언어: Korean only (user). Both synced through user_settings (font 'default' = Pretendard, null = 무제한) |


## HANDOFF에서 옮김 (11-23)

### 구글 캘린더 세부 (11-23)
**구글 캘린더 양방향(11-23, 코드만 · PC 설정 대기)**: 서버 함수 `supabase/functions/google-calendar`(`auth-url`→구글→`/callback`, `sync`, `disconnect`, 15분 `cron`), 변환 `functions/_shared/gcal.ts`(테스트 `test-gcal.ts`), SQL 20261125000000(`google_accounts` 서버 전용, `google_calendars`, `google_event_links`, `events.google_calendar_id`), 앱 `lib/googleCalendar.ts`(`onSynced` 뒤 자동, 고른 캘린더를 pref `googleCalendars`에 보관)·설정 → 구글 캘린더. **올릴 곳은 일정마다 편집 시트에서**: "올릴 곳" 줄 = 계정(립마크에만 / 구글 계정 `googleEmail`), 구글이면 "카테고리" 줄 = 그 계정의 하위 캘린더(pref `googleCalendars`의 `categoryId`로 일정 카테고리도 맞춤). 기본 립마크에만, 기존 일정은 안 올라감. 강조 = 구글 제목 맨 앞 ⭐ 또는 ★(올릴 때는 ⭐). 구글 반복 중 못 그리는 것 `lossy`. 색: 서버가 계정의 실제 색 목록을 받음(`livePalette`, 1~11은 구글 앱 색조 `GOOGLE_EVENT_COLORS`), 앱은 pref `googleEventColors`로 받아 편집 시트에 그 색+캘린더 색만(`googleColorChoices`). **라벨**(구글의 새 색): 캘린더마다 `labelProperties.eventLabels`(24개, 권한 `calendar.calendars.readonly`), 일정은 `eventLabelId`. 색 우선순위 라벨 → colorId → 캘린더 색, 올릴 때 라벨 색이면 `eventLabelId`. 앱 pref `googleLabels`, 편집 시트는 그 캘린더 라벨 24색(`labelChoices`, 이름 `GOOGLE_24`). 고칠 때 PATCH(구글의 다른 정보 보존), 라벨 색은 라벨만(옆에 colorId를 보내면 구글이 옛 색을 씀; 거절되면 `__fallbackColorId`). 알림: 없음 = 구글도 없음(`overrides: []`), 구글 기본 알림은 캘린더 `defaultReminders`로 읽음, 종일은 9시 기준↔자정 기준(`alarmFromGoogle`/`alarmToGoogle`). 장소 `events.location`(양쪽), 화상 회의 `meet_link`(구글→립마크, 보기·열기만), SQL 20261126000000. **PC 할 일: `docs/context/PC-TODO.md`**.

### 5단계: 출시 리디자인 (2026-11-21~)
- 기존 앱 = 별 모양으로 확정(`Clover.tsx` `STAR = true`) 후 그대로 유지. 디자인 앱만 새 구조(`DESIGN_TRIAL`)
- 탭 홈·달력·커뮤니티·프로필(`BottomNav` `DESIGN_TABS`), 화면은 `features/today/`:
  - `HomeDash` 홈: 관리자 공지 줄, 오늘 카드, 이번 주(큰 별 30, 날짜 탭 = 카드 안에 그날 할 일·일정, 두 번 탭 = 달력), 디데이, 중요한 날(색 막대·D-n), 바로가기(`Shortcuts.tsx`, 편집 시트에서 보이기·순서, pref `homeShortcuts`)
  - `CalendarTab` 달력: 위 검색·메뉴, 한 달(`Calendar boxed` 오늘 회색 칸 `todayCell`·고른 날 흰 칸) + `AgendaList`(구간 구분선 `sectionLine`, 종일/오전/오후/저녁, **To Do**(그날 디데이가 맨 위, 그 아래 카테고리 묶음: 색 막대 + 이름 + 완료/전체(원본 알약과 다르게), 카테고리 왼쪽에 공개 범위 아이콘, 묶음 안 강조 먼저·오른쪽 '중요' 표시, 꾹 끌어 다른 묶음 안에 놓으면 그 카테고리 `arrangeByHeaders`; 카테고리 태그는 없앰), 일정 탭 = `EventEditor` 바로)
  - `TogetherScreen` 커뮤니티: 친구 목록 먼저, 친구 소식/친구 찾기 전환, 크루는 `app_config` 켜질 때만(`lib/appConfig.ts`, 규칙 `configRules.ts`)
  - `ProfileTab` 프로필: 가운데 카드 + 기록 3칸(연속 기록 `streakOf`) + 설정 묶음 카드(`SettingsGroups`, 디자인 앱 설정 화면도 같음)
- **관리자 앱**: `APP_VARIANT=admin`(`features/admin`, `AdminEditors.tsx`), 원격 설정 목록 `lib/remoteCatalog.ts`·규칙 `configRules.ts`·캐시 `appConfig.ts`(`useT`·`useFeature`·`useNumber`), 실시간 구독, 변경 기록 `app_config_history`, 저장소 복사 `docs/context/remote-config.md`(backend.md 23~24).
- 속도(11-21): 디자인 앱 탭 4개는 `(tabs)/_layout.tsx` `DesignTabs`가 React `Activity`로 계속 살려 둠, 탭 바꾸기는 라우터 대신 `lib/tabSwitch.ts` `goTab`(라우트를 바꾸면 탭 레이아웃 전체가 다시 만들어지던 게 느림의 원인). 달력 별 계산 캐시. 꾹 누르기 0.3초 + 회색 띠가 화면 양끝까지(`ReorderableList` `WIDE_BAND`, 디자인 앱만; 퍼지는 빛은 해 보고 되돌림)
- 끌기 버그 고침: `ReorderableList`가 처음 그려질 때의 콜백을 계속 써서 나중에 추가된 할 일의 카테고리가 안 바뀌던 문제(두 앱 공통). `onTargetChange`(끄는 중 미리 보기용 콜백)는 남아 있음
- 이번 주 카드: 일·공휴일 빨강, 토 파랑, 오늘은 골라도 #00ff7f. 공휴일 표 `lib/holidays.ts`(2025~2029)
- e2e `design-structure.js`(APP_VARIANT=design 빌드, 숨은 탭도 DOM에 있어 `filter({visible:true})` 필요; 변형 바꿀 땐 export `--clear`), DB 테스트 `admin.test.sql`
- 원본 닮은 곳 차별화 1차(11-21, `DESIGN_TRIAL` 분기): 제목줄·시트·관리 메뉴·목록 줄·카테고리 제목·+버튼·입력칸·선택·설정 줄·할 일 메뉴·정보·타이머·일기·카테고리 편집
- 다음 후보: 이용자 폰 확인, 테마(스킨) 기능, 앱 이름·아이콘(나중)

### 11-23 차수별 (HANDOFF에서 옮김)
**아래 내비게이션 바(11-23)**: `expo-navigation-bar`(있을 때만 `requireOptionalNativeModule`, 버전 1.0.0 유지, 바 색은 다음 APK부터), `enforceContrast: false`, `setStyle`("light"=어두운 바).
**메인 앱(11-23)**: 원본 닮은 화면들 다시 만듦(할 일 메뉴, `OuterGlow`, 카테고리 접기, `SelectionBar`·`AgendaDrop`).
**11-23 3차**: 메인 앱 시트 = 앱 안(`Portal`). 미래 날짜 완료 불가(`isFutureDay`). **스킨**(`theme/skins.ts`, `SkinsScreen`, 장식 `SkinDecor`).
**11-23 4차**: 아래 입력줄 키보드 기억(`QuickAdd` `want`, 다른 곳 누르면 안 열림). 달력 넘기기 = 가로 `FlatList`(`CalendarPager`). 할 일 고치기 = 제목+메모 한 시트.
**11-23 5차(일정)**: 반복(`EventRepeat`, `expandEvents` id `원본~날짜`, `selectEvents`, "이 일정만/모든 반복" `saveEventIn`·`deleteEventIn`), 일정 카테고리(표 `event_categories`, 설정 → 일정 카테고리). SQL 20261124000000 미실행. 강조 색: 기본 = 항목 색, 설정 → 화면 → 강조 색에서 카테고리별(`glowMode`·`glowColors`, `GlowTint`). 하루 목록 맨 위: 일정 추가 | 일기.
**11-23 6차**: 메인 앱 입력칸은 자기 글자를 가짐(`useOwnText`; Portal 시트에서 한글 조합 깨짐 방지). 달력 넘김 `snapToInterval`(폭 반올림 금지), `removeClippedSubviews` 끔.
**11-23 7차**: 강조 불씨 켜고 끄기(pref `glowParticles`). 디데이 날짜 = 숫자 뒤 빨간 빛(`DDayNumber`, SVG 그라데이션; 글자 그림자는 안드로이드에서 잘림). 달력 줄은 막대 2줄 자리 고정. 업데이트 재시작만 보던 탭 유지(`lib/resume.ts`), 앱을 닫으면 홈부터.
**11-23 8차**: 디데이 안내 `DDayNotice`(달력·홈 맨 위). 메모 눌러도 제목+메모 시트(`MemoLockChip`). 스킨 설레는 마음·첫눈 오는 날(`Drift`, `FREE_SKINS`).
**11-23 9차**: 일기(메인 앱) = 종이 한 장(큰 날짜, 기분 도장, **낭만 농도** = `moodTemp`를 %로 `ROMANCE_STAGES`·`RomanceGauge`, 사진 2열). `ColorCodeInput` `presets`(색 견본 한 줄).
**11-23 10차**: 프로필 맨 아래 "지금 업데이트"(`lib/updateNow.ts`: 확인→받기→바로 적용, 보던 탭 유지) + 업데이트 중 립마크 화면(`UpdateCurtain`, 루트 `_layout`). 시작 화면(흰색) → 짙은 초록+마크 = `expo-splash-screen` 플러그인(`app.config.js`, 메인·관리자), **새 APK부터**(버전은 1.0.0 그대로: OTA 계속).
**11-23 11차**: 일정 막대 순서 = 강조 → 종일 → 시간(`SpanBar.allDay`, 메인 앱). 보기만 가능한 구글 캘린더 일정 = 정보만(`isReadOnlyEvent`, pref `googleReadOnlyCalendarIds`; 편집 시트 읽기 화면, 시간표에서 끌기·강조·삭제 막음). 서버 1회 `refresh-colors`(다시 읽어 색·⭐ 적용 + 색 필드 진단). 지금 업데이트: 새 버전이 없을 때 GitHub 작업이 도는 중이면 "아직 준비 중" 안내.
