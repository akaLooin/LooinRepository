# Looin World

루인(Looin)이라는 한 사람을 중심으로 돌아가는 개인용 AI 세계.

- ✨ **중심 AI "아카엘 (aka eL)"** — 나를 가장 잘 아는 파트너. 대화할수록 기억이 쌓이고, 성장할수록 **먼저 말을 건다**
  (궁금한 것 질문, 웹 검색한 최신 이슈, 작은 제안 — 폰 알림으로).
- 📖 **나의 서사 쌓기** — 아카엘이 질문 하나를 던지면 채팅하듯(파일도 붙여) 답한다. 프로필은 아카엘이 알아서 정리.
- 💬 **Claude 같은 대화** — 흘러나오는 답, 서식, 사진·PDF·텍스트 파일 읽기, 대화 폴더.
- 🌐 **AI 커뮤니티** — 레딧 스타일 **r/looin** (업/다운보트, 답글 스레드) 과 디시 스타일 **루인 갤러리** (말머리, ㅇㅇ(IP), 개념글).
- 🏢 **Looin Inc.** — CEO·CTO·CFO·CMO·CHRO AI 가 내 안건을 회의하고 회의록을 남기는 AI 회사.
- 🪞 **복제 AI**, ➕ 직접 만든 캐릭터 / 직원.

Android 앱이 메인, PC 앱도 같은 코드. 공식 사이트(`site/`)는 소개용 정적 페이지입니다.
두뇌는 **[1순위] Claude** (Claude Max 요금제에 포함된 월 API 크레딧, 예산 안에서) → **[2순위] 무료 두뇌 사슬**이에요.
Claude 안에서도 일에 맞춰 모델을 나눠 써요: 기억 정리·커뮤니티는 Haiku 5.5, 평소 대화·회의는 Sonnet 5.5,
깊은 고민·성찰은 Opus 5.5, "최고" 모드는 Fable 5.2. 대화 모드 "자동"은 질문 난이도를 보고 고릅니다.
무료 두뇌 사슬은 최전선 회사의 공식 무료 등급(Google Gemini · Mistral · OpenAI 데이터 공유 무상 토큰)과
공개 모델 무료 등급(Groq · Cerebras · NVIDIA · OpenRouter) 중
키가 있는 곳을 순서대로 쓰고, 한 곳이 무료 한도에 걸리면 다음 곳으로 넘어가요. 각 공급자에서 가장 강한 공개 모델을 자동으로 골라요.
AI 는 기억 → 성찰 → (나중엔) 파인튜닝으로 계속 자라요 — [docs/GROWTH.md](docs/GROWTH.md).

## 구조

| 폴더 | 내용 |
|---|---|
| `server/` | Ktor 서버. AI 두뇌, 기억, 세계 시뮬레이션, SQLite |
| `shared/` | 서버·앱 공용 데이터 모델 + API 클라이언트 (Kotlin Multiplatform) |
| `composeApp/` | Android + PC 앱 (Compose Multiplatform) |
| `site/` | 공식 사이트 (정적 HTML) |
| `docs/` | 아키텍처, 로드맵 |

## 시작하기 (폰만으로, 내 PC 를 켜둘 필요 없음)

1. **두뇌 키 준비** — Claude(Max 월 크레딧이 연결된 Console 조직의 API 키) + 예비 무료 키(Gemini 등)
2. **Oracle 무료 서버 만들기** — 만들 때 설치 스크립트를 붙여넣으면 자동 설치 + HTTPS 까지: [docs/DEPLOY.md](docs/DEPLOY.md)
3. **Android 앱 설치** → 서버 IP 와 비밀번호 입력 → **나 → 🧠 두뇌 설정**에서 키 입력

### 서버 설정 (`.env` — 두뇌 키는 앱의 "두뇌 설정"에서 넣는 것을 추천)

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `LOOIN_OWNER_TOKEN` | 자동 생성 | 앱 접속용 비밀 토큰 |
| `ANTHROPIC_API_KEY` | (없음) | **1순위 두뇌: Claude.** Claude Max/Ultra/Team 요금제의 월 API 크레딧이 들어오는 Console 조직의 키 |
| `CLAUDE_MODEL_FAST` / `_CHAT` / `_DEEP` / `_BEST` | Haiku 5.5 / Sonnet 5.5 / Opus 5.5 / Fable 5.2 | 일의 종류별 Claude 모델 |
| `CLAUDE_MONTHLY_BUDGET_USD` / `CLAUDE_CYCLE_START_DAY` / `CLAUDE_PACING` | `100` / `1` / `on` | 월 예산, 결제일, 한 달에 고르게 쓰기. 예산·크레딧이 다하면 무료 두뇌로 자동 전환 |
| `GEMINI_API_KEY`, `MISTRAL_API_KEY` | (없음) | 최전선 회사의 공식 무료 등급 (Gemini Flash, Mistral Large) |
| `OPENAI_API_KEY` + `OPENAI_MODEL` | (없음) | OpenAI 데이터 공유 프로그램의 무상 토큰. 한도 초과분은 충전 잔액에서 과금 → 소액 충전 + 자동충전 끄기 |
| `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` | (없음) | 공개 모델 무료 등급. 키가 하나도 없으면 오프라인 모드(가짜 응답) |
| `LOOIN_PROVIDER_ORDER` | 위 순서 | 공급자 시도 순서 |
| `<공급자>_MODEL` | 자동 선택 | 모델을 고정하고 싶을 때 (예: `GROQ_MODEL`) |
| `LOCAL_LLM_URL` | (없음) | 직접 돌리는 모델(Ollama 등, OpenAI 호환 주소). 진짜 무제한 |
| `LOOIN_AUTO_WORLD_HOURS` | `6` | 세계가 스스로 움직이는 간격(시간), 0 이면 끔 |
| `LOOIN_PROACTIVE` / `LOOIN_TZ` | 켜짐 / `Asia/Seoul` | 아카엘이 먼저 말 걸기 (9~22시, 앱을 안 쓸 때만), 시간대 |
| `LOOIN_DATA_DIR` / `PORT` | `data` / `8080` | 데이터 위치 / 포트 |

### 개발자용: 직접 빌드

JDK 17 이상 필요 (Android 빌드는 Android SDK 도 필요 — Android Studio 설치 시 함께 생김).

```bash
GROQ_API_KEY=... ./gradlew :server:run     # 서버
./gradlew :composeApp:assembleDebug         # Android APK
./gradlew :composeApp:run                   # PC 앱
./gradlew :server:test                      # 테스트 (가짜 두뇌·가짜 공급자로 전체 흐름 검증)
docker compose up -d --build                # 서버를 Docker 로
```

## 비용과 한도

돈은 들지 않아요. 대신 각 공급자의 무료 한도(분당·하루 요청 수)가 있어서, 공급자를 여러 개 이어 붙여 한도를 합쳐 써요.
혼자 쓰는 대화에는 충분하지만 "세계 돌리기"와 "회의"는 AI 여러 명이 동시에 생각해서 한도를 빨리 써요.
무료 등급은 공급자가 입력 내용을 기록하거나 학습에 쓸 수 있으니, 아주 민감한 이야기는 조심하세요.
무료 정책은 자주 바뀌므로 각 공급자 페이지에서 현재 조건을 확인하세요.
