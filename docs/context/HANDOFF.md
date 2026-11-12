# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-12 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

## 한 줄 요약
todo mate를 개인용으로 다시 만드는 Expo 앱. 1단계(혼자 쓰는 기능) 대부분 완료, Supabase 연결과 실제 폰(Expo Go) 로그인까지 확인됨.

## 진행 현황 (`replica/features.csv`의 clone 열)
- 필수(must) 32개: 완료 28 · 일부 4
- 권장(should) 17개: 완료 6 · 일부 3 · 미착수 8
- 화면별 상태와 어려웠던 점: `replica/build-log.md`

## 만들어진 것
- 홈(캘린더 + 클로버 + 카테고리별 할 일), 할 일 메뉴 시트, 인라인 추가/편집, 끌어서 순서 바꾸기
- 카테고리(색상 코드 입력), 루틴(반복 6종, 수동 추가는 회색 + 줄), 디데이(고정/반복), 타이머, 할 일 정보
- 일기(기분·글·공개 범위·배경색), 리마인더 + 할 일 시간 알림(폰 로컬 알림)
- 프로필(사진·이름·자기소개·관심사·ID), 설정 전체(원본 영상대로, Premium 제외), 화면 설정 15개 동작(폰트 4종 포함, 캘린더 최대 개수 2줄만 준비 중)
- 홈: 캘린더 카테고리 거르기(▼), 리스트 메뉴(원본 방식: 미완료 내일/다른 날, 할 일 선택, 모두 복사, 모두 삭제), 할 일 상단 입력, 카테고리 접기(누르면 접힘, 길게 누르면 편집)
- 보관함(날짜 없는 할 일): 왼쪽 위 버튼 또는 캘린더 아래에서 오른쪽으로 스와이프
- 사진: 할 일 사진 인증, 프로필 사진, 일기 사진(4장). 1600px로 줄여 폰에 저장 → 동기화 때 Supabase Storage로 업로드
- 로그인(이메일 + 비밀번호), 오프라인 우선 동기화(AsyncStorage + Supabase), 계정 삭제 함수
- 화면 전체를 폰 폭에 맞춰 축소(411dp 기준 → 실제 폭), 설정 → 화면 → 화면 크기로 수동 조절
- 바텀 시트: 위쪽을 아래로 끌어 닫기(짧게 끌면 되돌아옴). 할 일 정보 보기도 시트
- 설정 동기화: 화면 설정 10개가 계정(user_settings)을 따라감. 기기에만: 화면 크기, 접은 카테고리, 캘린더 거르기
- 테스트: `replica/test-plan.md`, `replica/bugs.md`(6개 찾아 고침, 열린 S1/S2 없음), `app/e2e/edge.js`(엣지 13개 + axe)

## 이용자 환경 (확인된 것)
- Windows PC, PowerShell → `npm.cmd`, `npx.cmd` 사용. 저장소 위치 `C:\Users\User\LooinRepository`
- Supabase: 서울 리전 새 프로젝트, 마이그레이션 0001·0003 실행 완료(표 8개 확인, 보관함용 date nullable), `app/.env.local` 작성, 앱에서 가입·로그인 성공
- 폰: 삼성 안드로이드, Expo Go로 실행 (PC의 `npx.cmd expo start` 필요)

## 폰 확인 결과와 조치 (2026-11-07, 여섯 번째 피드백까지)
- 확인됨 ✅: 동기화, 알림, 크기, 접기 ∨, 끌기(제자리), 캘린더 표시, 할 일 메뉴 4종, 체크 색 설정, 보관함 옆 화면 스와이프(동작)
- 폰 확인 대기(2026-11-07 고침/추가): 옮긴 직후 탭(B14), 보관함 스와이프, 캘린더 밀어 달 넘기기, 수정 상태 유지, 메모 칸 키보드 위, 메모·알림 바로 편집
- **폰 확인 방식(이용자 결정)**: 항상 실제 속도 모드 = `npm.cmd run phone` (`expo start --no-dev --minify`). **`--clear` 쓰지 않기**: 캐시를 지우면 첫 빌드가 60초 넘게 걸려 Expo Go가 기다리다 포기하고(파란 화면) 예전 버전을 띄움. 업데이트 안 보이던 원인이 이것
- PC: 실행은 `C:\Users\User\LooinRepository\app`에서. 예전 복사본은 `C:\Users\User\LooinRepository-old`

## APK
- EAS로 빌드(`cd app` → `npx.cmd eas-cli build --platform android --profile preview`), 순서 `replica/backend.md` 7번. projectId는 app.json. 푸시용 google-services.json은 EAS 파일 변수(저장소에 없음)
- 이용자 할 일 남음: Supabase Redirect URL `todomateclone://**`(backend.md 8)

## 2단계(친구·대화·크루) 완료 — 자세한 건 `replica/build-log.md`, `replica/backend.md` 9~18
- 친구(검색·프로필·친구 홈·주간·일기·반응·알림), 대화(DM), 스티커 18개, 할 일 캘린더, 푸시(폰 확인 ✅), 친구 피드, 일기(스티커 기분+기분 온도·임시 저장), 크루 1·2차(대화방·⋯ 메뉴·크루 홈), 대화 키보드 가림 수정(B16, 폰 확인 필요)
- SQL 실행 완료 ✅: 20261107000000 ~ 20261109000200. **미확인/미실행**: 20261109000300_crews2, 20261112000000_my_features
- 이용자 PC 할 일: 위 SQL 2개(20261112000000 = 당일 포함·신고·여러 날 할 일), push 재배포 + Webhook crew_messages(backend.md 17), `npm.cmd install` 후 새 APK(새 네이티브 부품: clipboard·keyboard-controller·reanimated·media-library)

## 3단계: 우리만의 기능 (2026-11-12 이용자 요청 9가지 — 모두 1차 완료, 폰 확인 필요)
- 디데이 당일 포함·디데이 날 붉은 동그라미·루틴 종료 날짜 없음
- 사진 크게 보기 `components/PhotoViewer.tsx`(핀치 1~5배, 길게 → 저장 `lib/savePhoto.ts` / 남의 사진 신고 `data/report.ts`)
- 뽀모도로: 타이머 ⋯ → 스톱워치/뽀모도로, 5분 단위, 할 일 타이머 위 카운트다운, 끝나면 로컬 알림 `lib/pomodoro.ts`
- 검색: 홈 맨 위 돋보기 → `/search`(할 일·메모·일기, 누르면 그 날짜) `lib/search.ts`
- 알림 탭 4개(친구의 할 일/친구의 일기/받은 관심/공지 `data/notices.ts`) `components/TabPills.tsx`
- 날짜로 끌어 옮기기: 할 일을 길게 눌러 캘린더 날짜에 놓기(`ReorderableList` `drop`, `Calendar` `cellRef`)
- 여러 날 할 일: 메뉴 → 여러 날 하기(끝나는 날, 없음 = 하루로). 기간의 모든 날 목록에, 클로버에선 빠짐, 기본 캘린더엔 얇은 줄, ▼ = 캘린더 종류(기본/긴 할 일: 이름 막대) + 카테고리, 체크하면 회색, 옮기면 길이 유지 `lib/spans.ts`, `todos.end_date`
- 테스트: 단위 73개, DB `my_features.test.sql`, e2e photo-view·pomodoro·search·alerts·drag-date·span
- 남은 것: 친구 화면의 여러 날 할 일(서버 함수가 end_date 안 보냄), 폰 확인, 그다음 디자인 교체(이용자 계획)

## 알려진 한계
- 실제 Supabase 대상 동기화는 폰 로그인까지만 확인, 두 기기 동시 사용은 가짜 서버 테스트로만 확인
- `npm audit`: Expo 빌드 도구 쪽 moderate 8개(앱 번들 아님)
- 비밀번호 재설정: 앱 쪽 완료(로그인 → 비밀번호를 잊으셨나요?, 설정 → 비밀번호 바꾸기). Supabase 대시보드에 Redirect URL `todomateclone://**` 추가 필요(backend.md 8번), APK에서만 링크 동작

## 작업 방법
- 단위 테스트 `cd app && npm test` (73개), DB 규칙 `supabase/tests/run.sh`, 원본 비교 결과 `replica/parity.md`, 타입 `npx tsc --noEmit`
- 화면 확인: 웹으로 내보낸 뒤 `app/e2e/*.js` 26개 (Playwright, 411×891, 체험 모드 데이터)
- 컨텍스트: 기능 하나 끝날 때마다, 또는 컨텍스트가 70%쯤 차면 `/context-handoff`로 이 파일과 DECISIONS.md 갱신 후 푸시
- 훅: SessionStart(시작·재개·압축 후 이 파일 주입), PreCompact(압축 직전 `docs/context/compact-log.md`에 상태 기록). 둘 다 `.claude/hooks/`
