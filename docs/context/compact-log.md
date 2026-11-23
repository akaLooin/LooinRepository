# compact-log

대화 압축 직전 자동 기록 (PreCompact 훅). 최근 20개만 유지.

## 2026-11-04 02:44 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD c6c6fb4
- 커밋 안 된 파일: 0개
- 최근 커밋:
  - c6c6fb4 test: test plan, edge cases and axe scan; fix long category names, direct-opened edit screens, checkbox state, image role
  - 33c47c8 build: sync display settings with the account (user_settings)
  - cc438a3 build: drag bottom sheets down to close; 할 일 정보 보기 as a sheet

## 2026-11-07 14:01 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD d81d439
- 커밋 안 된 파일: 0개
- 최근 커밋:
  - d81d439 docs: phase 2 (friends) plan and the recordings it needs
  - 7f1e531 build: font choice and feed memo line limit in display settings
  - c03bb2b build: 오늘 할 일 home-screen widget (Android)

## 2026-11-12 08:32 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD 3b3703a
- 커밋 안 된 파일: 20개
  - `pp/app.json`
  - `app/package-lock.json`
  - `app/package.json`
  - `app/src/app/_layout.tsx`
  - `app/src/components/StoredImage.tsx`
  - `app/src/components/TodoRow.tsx`
  - `app/src/components/index.ts`
  - `app/src/features/chat/ChatScreen.tsx`
  - `app/src/features/diary/DiaryScreen.tsx`
  - `app/src/features/home/HomeScreen.tsx`
- 최근 커밋:
  - 3b3703a feat: D-day 당일 포함 and a red circle on D-day dates; routine 종료 날짜 없음 switch
  - e57716c fix: chat field stays above the keyboard (B16) — keyboard height from window insets via react-native-keyboard-controller
  - ad9c91c build: crews as in the second recording — crew chat, ⋯ menu (members, my category, copy link, stop/resume recruiting, edit/delete), crew chips and crew home

## 2026-11-12 09:55 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD bfc9dfb
- 커밋 안 된 파일: 0개
- 최근 커밋:
  - bfc9dfb feat: 여러 날 할 일 — to-dos over several days: thin lines on the calendar, a 긴 할 일 calendar with labelled bars, grey once done
  - 0f800b0 feat: drag a to-do onto a calendar date to move it there
  - 8d530a6 feat: 알림 in four tabs — 친구의 할 일, 친구의 일기, 받은 관심, 공지

## 2026-11-20 07:18 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD a366521
- 커밋 안 된 파일: 7개
  - `pp/src/components/Calendar.tsx`
  - `app/src/features/home/CalendarPager.tsx`
  - `app/src/features/today/AgendaList.tsx`
  - `app/src/features/today/CalendarTab.tsx`
  - `app/src/theme/tokens.ts`
  - `replica/design/tokens.json`
  - `replica/design/tokens.light.json`
- 최근 커밋:
  - a366521 docs: handoff trim
  - bc7c0cf feat: design app — 홈 becomes a summary with shortcuts; 달력 is the day agenda under a month; picked day as a white cell, today grey
  - f338e6a docs: handoff trim

## 2026-11-23 02:31 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD e2ebdd1
- 커밋 안 된 파일: 1개
  - `pp/src/features/today/parts.tsx`
- 최근 커밋:
  - e2ebdd1 fix: picked calendar day gets a fresh rounded box like today's; navigation-bar module loaded only when the APK has it, so the version stays 1.0.0 and phones keep getting updates (the last-week grid fix now reaches them)
  - c7a238b docs: handoff trim
  - 3e28ea4 feat: main app — sheets drawn in-app so the keyboard opens at once and stays between fields, auto focus on double-tap edit, bigger to-do title centred on its star, no checking off future days, deleting a manual routine's to-do brings back its + line, and skins (황혼의 재즈, 8비트 모험 with the Galmuri pixel font) in 설정 → 스킨

## 2026-11-23 15:02 UTC · auto
- 브랜치: claude/replica-skill-install-ll9jb4 · HEAD 91aacfc
- 커밋 안 된 파일: 5개
  - `pp/scripts/test-gcal.ts`
  - `supabase/functions/_shared/gcal.ts`
  - `supabase/functions/google-calendar/index.ts`
  - `supabase/tests/run.sh`
  - `supabase/migrations/20261127000000_google_more.sql`
- 최근 커밋:
  - 91aacfc fix: Google Calendar — a label colour goes as the label only (sending the old colorId too made Google show another colour); alarms match both ways: 알림 없음 is no alarm in Google too, Google's default alarm shows in 립마크 as it rings, all-day alarms convert between 9:00 and midnight; the one-time refresh also fills alarms
  - 51f5e24 fix: Google Calendar — a write Google refuses is reported (설정 → 구글 캘린더, 지금 맞추기) and a refused label is retried as an old colorId; a change made while a Google sync runs goes right after it
  - 7f08e7b docs: PC to-do — label colours, place and meetings filled in (51 events)
