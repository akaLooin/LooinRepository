# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-21 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

## 한 줄 요약
**이름(11-21)**: 메인 앱 = 립마크(Lib Mark, 디자인 앱 빌드), 복사 앱 = 기존 앱, 관리자 앱 = 립마크 관리자, 원본 앱 = todo mate. 아이콘 `app/assets/libmark/`(노트 + 초록 리본 책갈피 + 별 표시, 관리자는 주황 리본); 이름·아이콘은 새 APK부터(메인·관리자). 메인 앱 공지사항은 관리자 앱에서 쓴 것만(복사 앱의 기본 공지 숨김), 관리 메뉴에서 할 일 캘린더 뺌.
**시작 속도(11-22)**: 업데이트 안 기다림(`fallbackToCacheTimeout` 0), 받은 업데이트는 나갈 때 적용(`lib/quietUpdates.ts`), 저장된 계정으로 바로 열기(`peekSavedUserId`).
**아래 내비게이션 바(11-23, 2차)**: 테마파크 커스텀 바에서 여전히 흰색 → `expo-navigation-bar` 추가(네이티브; 있을 때만 불러옴 `requireOptionalNativeModule` → 버전 1.0.0 그대로, 바 색은 다음 APK부터, 나머지는 OTA로). 대비용 흰 막 끔(`enforceContrast: false`), 바의 밝음 표시를 앱 테마대로(`NavigationBar.setStyle`; 이 모듈에서 "light"=밝은 버튼=어두운 바, 반대로 헷갈리기 쉬움).
**메인 앱 6가지(11-23)**: 할 일 메뉴 아이콘(`TodoSheets`), 일정 수정 시트 삭제, 중요 별 바깥만 빛남(`OuterGlow`), 카테고리 제목 접기(`collapsedCategoryIds`)·길게 = 편집, 할 일 선택(`SelectionBar`)·친구 반응·날짜로 끌기(`AgendaDrop`)·주/월 보기, 칸 상자 높이 고정(`boxH`), 위 화면에서 돌아오면 보던 탭(`useSegments`).
**원본 닮은 곳 2차(11-23, 메인 앱만)**: 리스트 메뉴 타일, `VisibilityTiles`, 카테고리·디데이·루틴 편집, 하루 알림, 보관함 입력줄, 메모 잠금 칩, 친구 화면, 네모 날짜 고르기, 달력 마지막 주 여백.
**11-23 3차**: 메인 앱 시트는 Modal 대신 앱 안에 그림(`Portal`·`PortalHost`, 키보드 `KeyboardSpacer`로 따라 올라감, 뒤로 가기 `BackHandler`) → 키보드가 닫혔다 열리지 않고 바로 뜸(메모 포커스 0.03초, 두 번 눌러 고치기 자동 포커스 `TitleInput onSubmit`). 할 일 제목 17/24px·별과 첫 줄 가운데 맞춤(`TodoRow`). 오늘 이후 날짜 할 일은 완료 못 함(`isFutureDay`, `toggleTodo`가 false). 수동 루틴 할 일 삭제 = 줄 삭제(다시 + 줄로). **스킨**(`theme/skins.ts`, pref `skin`·`ownedSkins`, 설정 → 스킨 `SkinsScreen`, 상점은 나중): 황혼의 재즈(남보라·금빛·별 `SkinDecor`), 8비트 모험(크림·검은 테두리 `useFrame`·네모 모서리 `tokens.radius` 줄임·갈무리 픽셀 글꼴, 일부만 담은 OFL 폰트).
**11-23 4차**: 아래 입력줄 키보드 기억(`QuickAdd` `want`): 직접 닫거나 다른 곳을 누르면(커서가 빠짐) 다시 안 열림, 다른 입력칸·화면·탭에서 돌아오면 다시 열림. 달력 넘기기는 폰 자체 가로 스크롤(`CalendarPager` = 가로 `FlatList` pagingEnabled, 시간표와 같은 방식; JS로 움직이던 때 빠른 스와이프가 걸림). 할 일 고치기 시트 = 제목+메모 함께(`AgendaList`).
**11-23 5차(일정)**: 일정 반복(`EventRepeat` 매일/매주 요일/매월/매년·끝나는 날, `expandEvents`로 펼침 id `원본~날짜`, `selectEvents`가 펼친 목록, 고칠 때 "이 일정만/모든 반복" `saveEventIn`·`deleteEventIn`), 일정 카테고리(표 `event_categories`, DB 키도 같은 이름, 설정 → 일정 카테고리, 편집 시트에서 바로 추가). **SQL 20261124000000_event_repeat_categories 미실행**(실행 전엔 카테고리·반복 쓴 일정만 폰에서 대기). 강조 색: 메인 앱 기본 = 각 항목 색(일정 색·할 일 카테고리 색), 설정 → 화면 → 강조 색에서 카테고리별 지정(pref `glowMode`·`glowColors`, `GlowTint`·`glowOf`, 복사 앱은 기존 한 색). 달력 하루 목록 맨 위 고정 버튼 줄: 일정 추가 | 일기.
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
- **관리자 앱**(웹 패널 대신, 이용자 요청): 세 번째 안드로이드 앱 `APP_VARIANT=admin`(`com.looin.todomateclone.admin`, eas 프로필·채널 `admin`, `lib/variant.ts` `ADMIN_APP`, 루트 `_layout`이 `features/admin/AdminApp.tsx`만 보여 줌). 탭 기능(점검 모드·크루·홈 공지·카드 보이기·숫자)·문구·색·공지·알림(`AdminEditors.tsx`). 디자인 앱이 바꿀 수 있는 항목 목록은 `lib/remoteCatalog.ts`(문구 33·보이기 11·숫자 6·색 12역할×다크/라이트), 읽는 규칙 `configRules.ts`(잘못된 값 버림, 기존 앱은 안 받음), 폰에 캐시 `appConfig.ts`(`useT`·`useFeature`·`useNumber`), 색은 `ThemeProvider`가 덮어씀(관리자 앱 제외), 점검 화면은 루트 `_layout`. 새 항목을 늘리려면 catalog에 넣고 화면에서 `useT`/`useFeature`로 읽기. 11-21 추가: 글자 크기(`textScale`·`titleScale`, `AppText`가 곱함), 홈 카드 순서(`home_order`, `HOME_CARDS`), 실시간(Realtime 구독 + 1분 확인, 바뀐 것만 다시 그림), 변경 기록 표 `app_config_history`(SQL 20261122000000_admin_live, 미실행), 저장소 복사 `docs/context/remote-config.md`(workflow `remote-config.yml` + `app/scripts/remote-config-snapshot.mjs`, GitHub 비밀 SUPABASE_URL·SUPABASE_KEY 넣음 ✅, 복사 동작 확인 ✅(11-21), backend.md 24), 세션 시작 훅이 그 요약을 보여 줌. 설정을 앱 기본값으로 굳히려면 remote-config.json 값을 catalog의 def로 옮기면 됨. SQL `20261121000000_admin` 실행 ✅ · 관리자 지정 ✅, 함수 `admin-broadcast` 배포 확인 필요, backend.md 23
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
