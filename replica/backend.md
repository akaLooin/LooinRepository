# 백엔드 (Looin Idle 서버)

위치: `server/`. 실행: `cd server && npm install && npm run dev` (기본 주소 http://localhost:8787, DATABASE_URL 이 없으면 메모리 저장소).
게임을 서버에 붙이기: `game/.env` 에 `VITE_SERVER_URL=http://localhost:8787` 을 넣고 `npm run dev`.

## 구조

- 게임 규칙은 `game/src/core` 한 곳. 서버는 그 파일을 그대로 가져다 쓴다(같은 코드로 계산하니 기기와 서버가 어긋나지 않는다).
- **행동**(`core/actions.ts`): 장착·제작·창고·구매·전직·퀘스트·이동 등 24종. 기기가 먼저 적용해 바로 반응하고, 서버가 같은 함수로 다시 적용한다. 결과가 다르면 기기가 서버 상태를 받아 맞춘다.
- **방치 보상**: 캐릭터에 들어갈 때 서버가 서버 시계로 `computeAfk` 를 실행해 지급. 기기 시계를 바꿔도 소용없다.
- **접속 중 플레이 기록**(`core/sync.ts`): 기기가 15초마다 캐릭터 상태를 보낸다. 서버는 지난 기록 이후 흐른 시간(서버 시계) 동안 가능한 최대치(처치·경험치·코인·아이템·카드·모루 생산)를 계산해 넘으면 거절하고 서버 상태를 돌려준다. 장비·능력치·특성·전직·맵처럼 행동으로만 바뀌어야 하는 값이 바뀌어 있어도 거절한다. 거절은 `commands.flagged` 로 남는다(자동 제재는 하지 않음).
- **끊김**: 서버가 없으면 기기에서 계속 진행하고 30초마다 다시 붙어 본다. 다시 붙으면 서버 기록에 맞춘다.

## 설계에서 바꾼 점 (architecture.md 대비)

| 설계 | 실제 | 이유 |
| --- | --- | --- |
| 캐릭터·창고·카드를 표로 나눔 (표 7개) | 계정 문서 하나를 `accounts.state` jsonb 에 (표 2개: accounts, commands) | 서버가 늘 계정을 통째로 읽어 규칙 코드로 바꾸고 통째로 쓴다. 지금은 이것이 가장 단순하고 안전. 순위·운영 조회가 필요해지면 나눈다 |
| 행동마다 경로 (POST /equip, /craft …) | `POST /characters/:i/action` 하나 + 행동 종류 | 행동 목록이 규칙 코드와 함께 늘어나도 서버 경로를 고칠 필요가 없다 |
| Supabase Auth 게스트 → Google/Apple 연결 | 서버가 직접 발급하는 게스트 계정(기기 키 + 서명 토큰) | 외부 계정 없이 바로 실행·테스트 가능. Google/Apple 연결은 출시 전에 추가 |
| `packages/core` 로 분리 | 서버가 `game/src/core` 를 직접 가져다 씀 | 지금은 같은 저장소라 충분. 저장소를 나눌 때 분리 |

## API

| 경로 | 하는 일 |
| --- | --- |
| GET /health | 상태 확인 |
| POST /auth/guest | 게스트 계정 생성 → 기기 키, 토큰 |
| POST /auth/login | 기기 키로 토큰 재발급 |
| GET /account | 내 계정 전체 |
| DELETE /account | 계정 삭제(되돌릴 수 없음) |
| POST /characters | 캐릭터 생성 |
| POST /characters/:i/enter | 접속: 서버가 방치 보상 계산·지급 |
| POST /characters/:i/sync | 접속 중 플레이 기록(검증 후 반영 / 거절 시 서버 상태 반환) |
| POST /characters/:i/action | 행동 1개(+ 직전 플레이 기록을 함께 실을 수 있음) |
| WS /live?token= | 같은 맵 플레이어 위치·모습 중계(초당 12회 제한, 맵당 40명), 전체 채팅(1.5초에 1번, 120자, 제어 문자 제거, 최근 50줄) |

모든 쓰기 요청은 `commandId`(uuid)를 달고, 같은 ID는 한 번만 처리한다. 같은 계정의 요청은 차례대로 처리하고, 여러 서버 사이는 `version` 으로 충돌을 막는다.

## 환경 변수

`server/.env.example`, `game/.env.example` 참고. 값은 사용자가 직접 넣는다(이 저장소에는 비밀값이 없다).

## 배포 (사용자가 할 일)

1. Postgres 준비: Supabase 프로젝트를 만들고 접속 주소(DATABASE_URL)를 복사. 매일 백업이 켜져 있는지 확인.
2. Fly.io: `fly launch --no-deploy`(앱 이름·지역 선택) → `fly secrets set SERVER_SECRET=$(openssl rand -base64 48) DATABASE_URL=...` → 저장소 루트에서 `fly deploy --config server/fly.toml --dockerfile server/Dockerfile`.
3. 게임 빌드 시 `VITE_SERVER_URL=https://<앱>.fly.dev` 로 빌드하고 `npm run android`.

마이그레이션은 서버가 시작할 때 자동으로 적용한다(`npm run migrate` 로 따로 실행도 가능).

## 보안 점검표

- [x] 비밀값은 환경 변수로만, `.env*` 는 git 제외, 게임 번들에 비밀값 없음
- [x] 모든 경로에서 입력 검증(zod)
- [x] 모든 읽기·쓰기가 토큰의 계정으로만 범위 제한 — 두 번째 계정 테스트 포함(`server/tests/api.test.ts`)
- [x] 로그인·가입 요청 제한(IP당 분당 10회), 쓰기 요청 제한(계정당 10초 120회)
- [ ] 웹훅 서명 검증 — 해당 없음(결제 붙일 때)
- [ ] 업로드 — 해당 없음
- [x] URL·로그에 사용자 데이터 없음(토큰은 헤더로만)
- [x] 의존성 점검: `npm audit --omit=dev` 0건 (zod 3의 메모리 고갈 취약점 때문에 zod 4로 올림)
- [ ] 개인정보 처리방침: 출시 전 작성 — 처리자: 호스팅(Fly.io), DB(Supabase)
- [x] 계정 삭제 기능(스토어 규정)

## 아직 없는 것

- Google/Apple 계정 연결(기기를 바꾸면 게스트 계정을 옮길 수 없음)
- 채팅 신고·차단·금칙어, 채팅 기록 DB 저장(지금은 서버 메모리의 최근 50줄)
- 결제(스토어 결제 검증), 운영자 화면
- 실제 배포(계정·키가 필요)
