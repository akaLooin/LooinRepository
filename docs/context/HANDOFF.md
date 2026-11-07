# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-07 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

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
- 프로필(닉네임·자기소개), 설정 → 화면(10개 동작, 나머지 "준비 중")
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
- 이번에 고침(폰 확인 필요): 옮긴 직후 할 일이 2초쯤 안 눌림(B14: 놓는 순간 저장), 보관함 넘어갈 때 끊김(미리 만들어 두고 다시 그리지 않음)
- 사진 회색(B15): Storage에 그 파일이 없음(첫 테스트의 14바이트 파일, 지워짐) → 그 할 일에 사진 다시 넣기
- **업데이트가 안 보이던 이유**: `--no-dev`로 열면 Expo Go가 지난번 버전을 먼저 띄우고 새 버전은 뒤에서 받아 **다음에 열 때** 보여 줌 → 기능 확인은 `npx.cmd expo start --clear`(개발 모드, 창에서 `r`로 새로고침), 부드러움 확인만 `--no-dev --minify`(두 번 열기)
- PC: 실행은 `C:\Users\User\LooinRepository\app`에서. 예전 복사본은 `C:\Users\User\LooinRepository-old`

## 다음 할 일 후보 (`replica/parity.md`의 상위 5개)
- APK 빌드(EAS, `app/eas.json` 준비됨, 순서는 `replica/backend.md` 7번) → PC 없이 사용
- 홈 화면 위젯, 비밀번호 재설정, 설정의 "준비 중" 항목
- 2단계: 친구(팔로우·피드·반응), 그다음 iOS
- `/replica-diff`로 원본과 다시 비교

## 알려진 한계
- 실제 Supabase 대상 동기화는 폰 로그인까지만 확인, 두 기기 동시 사용은 가짜 서버 테스트로만 확인
- `npm audit`: Expo 빌드 도구 쪽 moderate 8개(앱 번들 아님)
- 비밀번호 재설정 메일 없음(기본 메일 서버는 템플릿 수정 불가)

## 작업 방법
- 단위 테스트 `cd app && npm test` (36개), 원본 비교 결과 `replica/parity.md`, 타입 `npx tsc --noEmit`
- 화면 확인: 웹으로 내보낸 뒤 `app/e2e/*.js` 16개 (Playwright, 411×891, 체험 모드 데이터)
- 컨텍스트: 기능 하나 끝날 때마다, 또는 컨텍스트가 70%쯤 차면 `/context-handoff`로 이 파일과 DECISIONS.md 갱신 후 푸시
- 훅: SessionStart(시작·재개·압축 후 이 파일 주입), PreCompact(압축 직전 `docs/context/compact-log.md`에 상태 기록). 둘 다 `.claude/hooks/`
