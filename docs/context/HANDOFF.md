# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-23 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

## ⚠️ 2026-12-01부터 첫 대화에서 가장 먼저
오늘 날짜가 2026-12-01 이후이고 `docs/context/PC-TODO.md` C-4(새 APK 빌드)가 아직 안 끝났으면, 이용자가 무엇을 말하든 **답의 맨 처음에** "expo 무료 빌드 횟수가 다시 채워졌으니 립마크·관리자 앱 새 APK를 먼저 빌드하자"고 알리고 그 안내부터 한다(이용자 요청, 11-23: 이번 달 무료 빌드를 다 써서 실패). 빌드가 끝나면 이 줄을 지운다.

## 한 줄 요약
**이름(11-21)**: 메인 앱 = 립마크(Lib Mark, 디자인 앱 빌드), 복사 앱 = 기존 앱, 관리자 앱 = 립마크 관리자, 원본 앱 = todo mate. 아이콘 `app/assets/libmark/`(노트 + 초록 리본 책갈피 + 별 표시, 관리자는 주황 리본); 이름·아이콘은 새 APK부터(메인·관리자). 메인 앱 공지사항은 관리자 앱에서 쓴 것만(복사 앱의 기본 공지 숨김), 관리 메뉴에서 할 일 캘린더 뺌.
**시작 속도(11-22)**: 업데이트 안 기다림(`fallbackToCacheTimeout` 0), 받은 업데이트는 나갈 때 적용(`lib/quietUpdates.ts`), 저장된 계정으로 바로 열기(`peekSavedUserId`).
**11-23 1~11차(요약)**: 아래 내비게이션 바(`expo-navigation-bar`, 다음 APK), 메인 앱 시트 = 앱 안(`Portal`), 스킨(`theme/skins.ts`), 달력 넘김 `CalendarPager`, 일정 반복·일정 카테고리(`saveEventIn`/`deleteEventIn`), 강조 색, 입력칸 `useOwnText`, 디데이 빛·안내, 일기 낭만 농도, 지금 업데이트(`lib/updateNow.ts`, `UpdateCurtain`), 시작 화면 초록(새 APK부터), 막대 순서 강조→종일→시간, 보기만 구글 일정(`isReadOnlyEvent`). 차수별 자세한 건 `replica/build-log.md`.
**구글 캘린더 양방향(11-23)**: 서버 함수 `supabase/functions/google-calendar`(`auth-url`/`/callback`/`sync`/`disconnect`/15분 `cron`/`/notify`), 변환 `functions/_shared/gcal.ts`(테스트 `test-gcal.ts`), 앱 `lib/googleCalendar.ts`, 설정 → 구글 캘린더. 올릴 곳은 일정마다 편집 시트에서(기본 립마크에만). 색 = 캘린더 라벨 24색(`eventLabelId`) → colorId → 캘린더 색. 고칠 때 PATCH. 강조 = 제목 앞 ⭐/★. **11-23 12차(SQL 20261127000000)**: 구글 항목 전부 양쪽 — 알림 여러 개(`alarms`, 최대 5, `alarmsOf`/`alarmTimes`), 참석자(`attendees`, 초대 메일은 안 보냄), 시간대(`time_zone`), 화상 회의 만들기/빼기(`meet_link` "new"/""; `conferenceDataVersion=1`), 첨부파일(보기·열기), 장소·설명·색·반복. "이 일정만" 수정 = `instanceOf`("반복id|날짜") → 서버가 구글의 그 회차(`instanceId`)만 PATCH(반복 전체를 다시 그리던 문제). 실시간: 구글 → watch 채널(`keepWatches`, 캘린더마다 약 7일, 서버가 갱신) → `/notify` → 동기화, 앱은 Realtime(`events`)으로 바로 받음. 동시 동기화 잠금(`google_accounts.sync_lock`). 라벨은 `eventLabelVersion=1`로 씀, 립마크 변경은 빠른 올리기(`quick`). 계정 캘린더 전부 연동, 달력 탭 보기 설정(pref `hiddenGoogleCalendarIds`, `useCalendarEvents`). 달력 목록 일정 꾹 = 강조 온오프(`glowEvent`). 서버는 표를 1000개씩 끝까지 읽음(`every`), 복사본 정리 `remove-copies`(dry 먼저). 자세한 옛 내용은 `replica/build-log.md`. **PC 할 일: `docs/context/PC-TODO.md`**.
**친구(11-24, SQL 20261128000000)**: 친구 = 서로 팔로우(`are_friends`, `Person.isFriend`), 반응·응원은 친구만, 응원 = `cheer()` RPC(하루 한 번, 알림 type `cheer`, 푸시 문구 `payload.ts`), 친구 화면 확성기 버튼, 커뮤니티·사람 목록에 친구 탭. **일정 공개 범위(11-26, SQL 20261129000000)**: `event_categories.visibility`(기본 private, friends 추가), `friend_events()` RPC(제목·시간만), 보기 설정에 카테고리별 나만/친구/팔로워/전체, 친구 화면에 그날 일정.
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
- 디자인 앱(`DESIGN_TRIAL`) 구조·관리자 앱·속도·끌기 등 자세한 내용은 `replica/build-log.md`의 "HANDOFF에서 옮김 (11-23)"

## 알려진 한계
- 실제 Supabase 대상 동기화는 폰 로그인까지만 확인, 두 기기 동시 사용은 가짜 서버 테스트로만 확인
- `npm audit`: Expo 빌드 도구 쪽 moderate 8개(앱 번들 아님)
- 비밀번호 재설정: 앱 쪽 완료(로그인 → 비밀번호를 잊으셨나요?, 설정 → 비밀번호 바꾸기). Supabase 대시보드에 Redirect URL `todomateclone://**` 추가 필요(backend.md 8번), APK에서만 링크 동작

## 작업 방법
- 단위 테스트 `cd app && npm test` (89개), DB 규칙 `supabase/tests/run.sh`, 원본 비교 결과 `replica/parity.md`, 타입 `npx tsc --noEmit`
- 화면 확인: 웹으로 내보낸 뒤 `app/e2e/*.js` 26개
- 컨텍스트: 기능 하나 끝날 때마다, 또는 컨텍스트가 70%쯤 차면 `/context-handoff`로 이 파일과 DECISIONS.md 갱신 후 푸시
- 훅: SessionStart(시작·재개·압축 후 이 파일 주입), PreCompact(압축 직전 `docs/context/compact-log.md`에 상태 기록). 둘 다 `.claude/hooks/`
