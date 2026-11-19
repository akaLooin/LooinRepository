# HANDOFF — 지금 어디까지 왔나

마지막 갱신: 2026-11-20 · 브랜치 `claude/replica-skill-install-ll9jb4` (main보다 앞섬, PR 없음)

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
- 프로필, 설정 전체(원본 영상대로, Premium 제외), 화면 설정 15개(폰트 4종)
- 홈: 캘린더 카테고리 거르기(▼), 리스트 메뉴(원본 방식: 미완료 내일/다른 날, 할 일 선택, 모두 복사, 모두 삭제), 할 일 상단 입력, 카테고리 접기(누르면 접힘, 길게 누르면 편집)
- 보관함(날짜 없는 할 일): 왼쪽 위 버튼 또는 캘린더 아래에서 오른쪽으로 스와이프
- 사진: 할 일 인증·프로필·일기(4장), 1600px로 줄여 Storage 업로드
- 로그인(이메일 + 비밀번호), 오프라인 우선 동기화(AsyncStorage + Supabase), 계정 삭제 함수
- 화면 폭 맞춤 축소 + 수동 크기 조절
- 설정 동기화: 화면 설정 10개는 계정(user_settings), 나머지는 기기에만

## 이용자 환경 (확인된 것)
- Windows PC, PowerShell → `npm.cmd`, `npx.cmd` 사용. 저장소 위치 `C:\Users\User\LooinRepository`
- Supabase: 서울 리전 새 프로젝트, 마이그레이션 0001·0003 실행 완료(표 8개 확인, 보관함용 date nullable), `app/.env.local` 작성, 앱에서 가입·로그인 성공
- 폰: 삼성 안드로이드, Expo Go로 실행 (PC의 `npx.cmd expo start` 필요)

## 폰 확인 결과와 조치 (2026-11-07, 여섯 번째 피드백까지)
- 확인됨 ✅: 동기화, 알림, 크기, 접기 ∨, 끌기(제자리), 캘린더 표시, 할 일 메뉴 4종, 체크 색 설정, 보관함 옆 화면 스와이프(동작)
- **폰 확인 방식(이용자 결정)**: 항상 실제 속도 모드 = `npm.cmd run phone` (`expo start --no-dev --minify`). **`--clear` 쓰지 않기**: 캐시를 지우면 첫 빌드가 60초 넘게 걸려 Expo Go가 기다리다 포기하고(파란 화면) 예전 버전을 띄움. 업데이트 안 보이던 원인이 이것
- PC: 실행은 `C:\Users\User\LooinRepository\app`에서. 예전 복사본은 `C:\Users\User\LooinRepository-old`

## APK · 업데이트
- **EAS Update(11-20)**: 푸시하면 GitHub Actions가 preview·design 채널로 보냄(`.github/workflows/eas-update.yml`, 비밀 `EXPO_TOKEN` 필요). 이용자 할 일: 토큰 만들어 GitHub 비밀에 넣기 + 업데이트 기능 든 APK 한 번 더 빌드(backend.md 22). 네이티브 바뀌면 app.json version 올리고 새 APK 안내
- EAS로 빌드(`cd app` → `npx.cmd eas-cli build --platform android --profile preview`), 순서 `replica/backend.md` 7번. projectId는 app.json. 푸시용 google-services.json은 EAS 파일 변수(저장소에 없음)
- 이용자 할 일 남음: Supabase Redirect URL `todomateclone://**`(backend.md 8)

## 2단계(친구·대화·크루) 완료 — 자세한 건 `replica/build-log.md`, `replica/backend.md` 9~18
- 친구(검색·프로필·친구 홈·주간·일기·반응·알림), 대화(DM), 스티커 18개, 할 일 캘린더, 푸시(폰 확인 ✅), 친구 피드, 일기(스티커 기분+기분 온도·임시 저장), 크루 1·2차(대화방·⋯ 메뉴·크루 홈), 대화 키보드 가림 수정(B16, 폰 확인 필요)
- SQL 실행 완료 ✅: 20261107000000 ~ 20261109000200. 20261118000000_events도 실행 ✅. **미실행/미확인**: 20261120000000_important, 20261109000300_crews2, 20261112000000_my_features
- 이용자 PC 할 일: push 재배포 + Webhook crew_messages(backend.md 17), `npm.cmd install` 후 새 APK(새 네이티브 부품: clipboard·keyboard-controller·reanimated·media-library)

## 3단계: 우리만의 기능 (2026-11-12, 9가지 완료, 폰 확인 필요)
- 디데이 당일 포함·붉은 동그라미, 루틴 종료 없음, 사진 크게 보기(`PhotoViewer`), 뽀모도로(`lib/pomodoro.ts`), 검색(`/search`), 알림 탭 4개, 날짜로 끌어 옮기기, ~~여러 날 할 일~~ → 일정

## 4단계 (2026-11-18 요청): 일정 · 캘린더 즉시 전환 · 디자인(별 모양)
- 일정 = 할 일과 따로 `events` 표(`lib/events.ts`, `features/events/`): 시간/종일, 색, 알림(n분 전), 설명. 할 일 캘린더엔 얇은 줄, 일정 캘린더(▼)엔 이름 막대. 일정 캘린더에서 날짜 → `/events/[date]` 시간표(30분 칸 누르기 → 1시간 일정 → 제목 → 저장, 일정 누르면 보기·수정·삭제, 종일은 위 띠, 지금 선). 옛 여러 날 할 일은 같은 id 종일 일정으로(`liftSpans`, SQL도 같은 일)
- 서버 표 없으면(SQL 미실행) 일정은 outbox에서 기다림(`missingTable`)
- ▼ 캘린더 종류: 누르면 바로 바뀌고 닫힘
- 11-19 피드백 반영: 시간표 3일 이어 그리기(스크롤로 전날·다음 날), 일정 선택·늘이기·꾹 눌러 옮기기(`lib/eventDrag.ts`), 1분 휠(`TimeGrid`), 할 일 메뉴 2열, 알약 탭=추가/길게=편집, 일정 캘린더 4개·아래 비움, 뒤로가기 한 단계(`BottomSheet onBack`), 별 ✕. 11-20: 동그라미 가운데, 옮기기 15분, 두 손가락 확대(`timelineHourHeight`), 휠 숫자 직접 입력, 할 일 메뉴 루틴 등록하기(`/routines/new?from=`)
- 중요한 날(11-20): 할 일 체크 꾹 = 중요 켜기/끄기(`toggleImportant`), 일정 강조(선택 시 수정 오른쪽 버튼·편집 스위치·종일 시트). 할 일 캘린더 날짜 별/클로버에 네온 테두리 맥박(`Clover glow`, 공유 `usePulse`), 일정 캘린더는 막대 테두리. 11-20 후속: 강조 색 설정(`glowColor`, 기본 #00FF7F), `components/Highlight.tsx`(기존 앱 = 은은한 빛, 시험판 = 불꽃 `Fire`/`Embers`, 둘 다 어두운 틈 — 이용자 비교 후 통일 예정), 강조 일정은 할 일 캘린더에서 줄이 빛남, 일정 줄 있는 주는 칸이 늘어남, 스위치 OFF 가림 고침. SQL 20261120000000(미실행이면 폰에서 대기, `missingColumn`)
- 디자인 시험판: `APP_VARIANT=design` → 별도 앱(`app.config.js`, eas 프로필 `design`, `lib/variant.ts` `DESIGN_TRIAL`). 클로버 → 사각별(`Clover.tsx` `starPath`), 여러 색은 그라데이션. 빌드 방법 backend.md 20. 화면 `replica/design/trial-star-*.png`. 이용자 폰 확인 대기

## 알려진 한계
- 실제 Supabase 대상 동기화는 폰 로그인까지만 확인, 두 기기 동시 사용은 가짜 서버 테스트로만 확인
- `npm audit`: Expo 빌드 도구 쪽 moderate 8개(앱 번들 아님)
- 비밀번호 재설정: 앱 쪽 완료(로그인 → 비밀번호를 잊으셨나요?, 설정 → 비밀번호 바꾸기). Supabase 대시보드에 Redirect URL `todomateclone://**` 추가 필요(backend.md 8번), APK에서만 링크 동작

## 작업 방법
- 단위 테스트 `cd app && npm test` (81개), DB 규칙 `supabase/tests/run.sh`, 원본 비교 결과 `replica/parity.md`, 타입 `npx tsc --noEmit`
- 화면 확인: 웹으로 내보낸 뒤 `app/e2e/*.js` 26개
- 컨텍스트: 기능 하나 끝날 때마다, 또는 컨텍스트가 70%쯤 차면 `/context-handoff`로 이 파일과 DECISIONS.md 갱신 후 푸시
- 훅: SessionStart(시작·재개·압축 후 이 파일 주입), PreCompact(압축 직전 `docs/context/compact-log.md`에 상태 기록). 둘 다 `.claude/hooks/`
