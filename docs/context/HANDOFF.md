# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-21 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

## ⚠️ 2026-12-01부터 첫 대화에서 가장 먼저
오늘 날짜가 2026-12-01 이후이고 `docs/context/PC-TODO.md` C-4(새 APK 빌드)가 아직 안 끝났으면, 이용자가 무엇을 말하든 **답의 맨 처음에** "expo 무료 빌드 횟수가 다시 채워졌으니 립마크·관리자 앱 새 APK를 먼저 빌드하자"고 알리고 그 안내부터 한다(이용자 요청, 11-23: 이번 달 무료 빌드를 다 써서 실패). 빌드가 끝나면 이 줄을 지운다.

## 한 줄 요약
**이름(11-21)**: 메인 앱 = 립마크(Lib Mark, 디자인 앱 빌드), 복사 앱 = 기존 앱, 관리자 앱 = 립마크 관리자, 원본 앱 = todo mate. 아이콘 `app/assets/libmark/`(노트 + 초록 리본 책갈피 + 별 표시, 관리자는 주황 리본); 이름·아이콘은 새 APK부터(메인·관리자). 메인 앱 공지사항은 관리자 앱에서 쓴 것만(복사 앱의 기본 공지 숨김), 관리 메뉴에서 할 일 캘린더 뺌.
**시작 속도(11-22)**: 업데이트 안 기다림(`fallbackToCacheTimeout` 0), 받은 업데이트는 나갈 때 적용(`lib/quietUpdates.ts`), 저장된 계정으로 바로 열기(`peekSavedUserId`).
**아래 내비게이션 바(11-23)**: `expo-navigation-bar`(있을 때만 `requireOptionalNativeModule`, 버전 1.0.0 유지, 바 색은 다음 APK부터), `enforceContrast: false`, `setStyle`("light"=어두운 바).
**메인 앱(11-23)**: 원본 닮은 화면들 다시 만듦(할 일 메뉴, `OuterGlow`, 카테고리 접기, `SelectionBar`·`AgendaDrop`).
**11-23 3차**: 메인 앱 시트 = 앱 안(`Portal`). 미래 날짜 완료 불가(`isFutureDay`). **스킨**(`theme/skins.ts`, `SkinsScreen`, 장식 `SkinDecor`).
**11-23 4차**: 아래 입력줄 키보드 기억(`QuickAdd` `want`, 다른 곳 누르면 안 열림). 달력 넘기기 = 가로 `FlatList`(`CalendarPager`). 할 일 고치기 = 제목+메모 한 시트.
**11-23 5차(일정)**: 반복(`EventRepeat`, `expandEvents` id `원본~날짜`, `selectEvents`, "이 일정만/모든 반복" `saveEventIn`·`deleteEventIn`), 일정 카테고리(표 `event_categories`, 설정 → 일정 카테고리). SQL 20261124000000 미실행. 강조 색: 기본 = 항목 색, 설정 → 화면 → 강조 색에서 카테고리별(`glowMode`·`glowColors`, `GlowTint`). 하루 목록 맨 위: 일정 추가 | 일기.
**11-23 6차**: 메인 앱 입력칸은 자기 글자를 가짐(`useOwnText`; Portal 시트에서 한글 조합 깨짐 방지). 달력 넘김 `snapToInterval`(폭 반올림 금지), `removeClippedSubviews` 끔.
**구글 캘린더 양방향(11-23, 코드만 · PC 설정 대기)**: 서버 함수 `supabase/functions/google-calendar`(`auth-url`→구글→`/callback`, `sync`, `disconnect`, 15분 `cron`), 변환 `functions/_shared/gcal.ts`(테스트 `test-gcal.ts`), SQL 20261125000000(`google_accounts` 서버 전용, `google_calendars`, `google_event_links`, `events.google_calendar_id`), 앱 `lib/googleCalendar.ts`(`onSynced` 뒤 자동, 고른 캘린더를 pref `googleCalendars`에 보관)·설정 → 구글 캘린더. **올릴 곳은 일정마다 편집 시트에서**: "올릴 곳" 줄 = 계정(립마크에만 / 구글 계정 `googleEmail`), 구글이면 "카테고리" 줄 = 그 계정의 하위 캘린더(pref `googleCalendars`의 `categoryId`로 일정 카테고리도 맞춤). 기본 립마크에만, 기존 일정은 안 올라감. 강조 = 구글 제목 맨 앞 ⭐ 또는 ★(올릴 때는 ⭐). 구글 반복 중 못 그리는 것 `lossy`. 색: 서버가 계정의 실제 색 목록을 받음(`livePalette`, 1~11은 구글 앱 색조 `GOOGLE_EVENT_COLORS`), 앱은 pref `googleEventColors`로 받아 편집 시트에 그 색+캘린더 색만(`googleColorChoices`). **라벨**(구글의 새 색): 캘린더마다 `labelProperties.eventLabels`(24개, 권한 `calendar.calendars.readonly`), 일정은 `eventLabelId`. 색 우선순위 라벨 → colorId → 캘린더 색, 올릴 때 라벨 색이면 `eventLabelId`. 앱 pref `googleLabels`, 편집 시트는 그 캘린더 라벨 24색(`labelChoices`, 이름 `GOOGLE_24`). 고칠 때 PATCH(구글의 다른 정보 보존), 라벨 색은 라벨만(옆에 colorId를 보내면 구글이 옛 색을 씀; 거절되면 `__fallbackColorId`). 알림: 없음 = 구글도 없음(`overrides: []`), 구글 기본 알림은 캘린더 `defaultReminders`로 읽음, 종일은 9시 기준↔자정 기준(`alarmFromGoogle`/`alarmToGoogle`). 장소 `events.location`(양쪽), 화상 회의 `meet_link`(구글→립마크, 보기·열기만), SQL 20261126000000. **PC 할 일: `docs/context/PC-TODO.md`**.
**11-23 7차**: 강조 불씨 켜고 끄기(pref `glowParticles`). 디데이 날짜 = 숫자 뒤 빨간 빛(`DDayNumber`, SVG 그라데이션; 글자 그림자는 안드로이드에서 잘림). 달력 줄은 막대 2줄 자리 고정. 업데이트 재시작만 보던 탭 유지(`lib/resume.ts`), 앱을 닫으면 홈부터.
**11-23 8차**: 디데이 안내 `DDayNotice`(달력·홈 맨 위). 메모 눌러도 제목+메모 시트(`MemoLockChip`). 스킨 설레는 마음·첫눈 오는 날(`Drift`, `FREE_SKINS`).
**11-23 9차**: 일기(메인 앱) = 종이 한 장(큰 날짜, 기분 도장, **낭만 농도** = `moodTemp`를 %로 `ROMANCE_STAGES`·`RomanceGauge`, 사진 2열). `ColorCodeInput` `presets`(색 견본 한 줄).
**11-23 10차**: 프로필 맨 아래 "지금 업데이트"(`lib/updateNow.ts`: 확인→받기→바로 적용, 보던 탭 유지) + 업데이트 중 립마크 화면(`UpdateCurtain`, 루트 `_layout`). 시작 화면(흰색) → 짙은 초록+마크 = `expo-splash-screen` 플러그인(`app.config.js`, 메인·관리자), **새 APK부터**(버전은 1.0.0 그대로: OTA 계속).
**11-23 11차**: 일정 막대 순서 = 강조 → 종일 → 시간(`SpanBar.allDay`, 메인 앱). 보기만 가능한 구글 캘린더 일정 = 정보만(`isReadOnlyEvent`, pref `googleReadOnlyCalendarIds`; 편집 시트 읽기 화면, 시간표에서 끌기·강조·삭제 막음). 서버 1회 `refresh-colors`(다시 읽어 색·⭐ 적용 + 색 필드 진단). 지금 업데이트: 새 버전이 없을 때 GitHub 작업이 도는 중이면 "아직 준비 중" 안내.
todo mate 개인용 재구현(Expo + Supabase).

## 진행 현황 (`replica/features.csv`의 clone 열)
- 필수(must) 32개: 완료 28 · 일부 4
- 권장(should) 17개: 완료 6 · 일부 3 · 미착수 8
- 화면별 상태와 어려웠던 점: `replica/build-log.md`

## 만들어진 것
- 홈(캘린더 + 클로버 + 카테고리별 할 일), 할 일 메뉴 시트, 인라인 추가/편집, 끌어서 순서 바꾸기
- 카테고리(색상 코드 입력), 루틴(반복 6종, 수동 추가는 회색 + 줄), 디데이(고정/반복), 타이머, 할 일 정보
- 일기(기분·글·공개 범위·배경색), 리마인더 + 할 일 시간 알림(폰 로컬 알림)
- 프로필, 설정 전체(원본 영상대로, Premium 제외), 화면 설정 15개(폰트 4종)
- 홈: 캘린더 카테고리 거르기(▼), 리스트 메뉴(원본 방식: 미완료 내일/다른 날, 할 일 선택, 모두 복사, 모두 삭제), 할 일 상단 입력, 카테고리 접기(누르면 접힘, 길게 누르면 편집)
- 보관함(날짜 없는 할 일): 왼쪽 위 버튼 또는 캘린더 아래에서 오른쪽으로 스와이프
- 사진: 할 일 인증·프로필·일기(4장), 1600px로 줄여 Storage 업로드
- 로그인(이메일 + 비밀번호), 오프라인 우선 동기화(AsyncStorage + Supabase), 계정 삭제 함수
- 화면 폭 맞춤 축소, 설정 동기화(화면 설정 10개 계정, 나머지 기기)

## 이용자 환경
- Windows PC(PowerShell, `npm.cmd`/`npx.cmd`), 저장소 `C:\Users\User\LooinRepository`, 삼성 안드로이드. Supabase 서울, `app/.env.local` 있음. 폰 확인은 APK(EAS Update)로

## APK · 업데이트
- **EAS Update(11-20)**: 푸시하면 GitHub Actions가 preview·design 채널로 보냄(`.github/workflows/eas-update.yml`, 비밀 `EXPO_TOKEN` 필요). 이용자 할 일: 토큰 만들어 GitHub 비밀에 넣기 + 업데이트 기능 든 APK 한 번 더 빌드(backend.md 22). 네이티브 바뀌면 app.json version 올리고 새 APK 안내
- EAS로 빌드(`cd app` → `npx.cmd eas-cli build --platform android --profile preview`), 순서 `replica/backend.md` 7번. projectId는 app.json. 푸시용 google-services.json은 EAS 파일 변수(저장소에 없음)
- 이용자 할 일 남음: Supabase Redirect URL `todomateclone://**`(backend.md 8)

## 2단계(친구·대화·크루) 완료 — 자세한 건 `replica/build-log.md`, `replica/backend.md` 9~18
- 친구·대화·스티커·할 일 캘린더·푸시✅·피드·일기(기분 온도·임시 저장)·크루 1·2차
- SQL 실행 완료 ✅: 20261107000000 ~ 20261109000200. 20261118000000_events도 실행 ✅. **미실행/미확인**: 20261120000000_important, 20261109000300_crews2, 20261112000000_my_features
- 이용자 PC 할 일: push 재배포 + Webhook crew_messages(backend.md 17), `npm.cmd install` 후 새 APK(새 네이티브 부품: clipboard·keyboard-controller·reanimated·media-library)

## 3단계 (11-12): 디데이 당일 포함, 루틴 종료 없음, 사진 크게 보기, 뽀모도로, 검색, 알림 탭, 날짜로 끌어 옮기기

## 4단계 (11-18~20): 일정 · 시간표 · 중요한 날 · 별 모양
- 일정 = `events` 표(`lib/events.ts`, `features/events/`), 시간표 `/events/[date]`(하루씩 넘기기, 늘이기·꾹 옮기기 `lib/eventDrag.ts`, 1분 휠 `TimeGrid`). 중요한 날 = 할 일 체크 꾹(`toggleImportant`)·일정 강조, 빛 효과 `components/Highlight.tsx`(`glowColor`, 기본 #00FF7F). SQL 미실행 표/열은 폰에서 대기(`missingTable`/`missingColumn`). 자세한 건 `replica/build-log.md`

## 5단계: 출시 리디자인 (2026-11-21~)
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

## 알려진 한계
- 실제 Supabase 대상 동기화는 폰 로그인까지만 확인, 두 기기 동시 사용은 가짜 서버 테스트로만 확인
- `npm audit`: Expo 빌드 도구 쪽 moderate 8개(앱 번들 아님)
- 비밀번호 재설정: 앱 쪽 완료(로그인 → 비밀번호를 잊으셨나요?, 설정 → 비밀번호 바꾸기). Supabase 대시보드에 Redirect URL `todomateclone://**` 추가 필요(backend.md 8번), APK에서만 링크 동작

## 작업 방법
- 단위 테스트 `cd app && npm test` (89개), DB 규칙 `supabase/tests/run.sh`, 원본 비교 결과 `replica/parity.md`, 타입 `npx tsc --noEmit`
- 화면 확인: 웹으로 내보낸 뒤 `app/e2e/*.js` 26개
- 컨텍스트: 기능 하나 끝날 때마다, 또는 컨텍스트가 70%쯤 차면 `/context-handoff`로 이 파일과 DECISIONS.md 갱신 후 푸시
- 훅: SessionStart(시작·재개·압축 후 이 파일 주입), PreCompact(압축 직전 `docs/context/compact-log.md`에 상태 기록). 둘 다 `.claude/hooks/`
