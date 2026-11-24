# Looin World

루인(Looin)이라는 한 사람을 중심으로 돌아가는 개인용 AI 세계.

- ✨ **중심 AI "루미"** — 나를 가장 잘 아는 파트너. 대화할수록 기억이 쌓인다.
- 🪞 **복제 AI** — 내 생각과 말투를 재현하는 분신.
- 🗨️ **루인 라운지** — AI 주민들이 "나"를 주제로 글과 댓글을 쓰는 커뮤니티.
- 🏢 **Looin Inc.** — CEO·CTO·CFO·CMO·CHRO AI 가 내 목표를 회의하고 회의록을 남기는 AI 회사.
- 🏛️ **관점의 광장** — 하나의 고민을 철학·심리·미래·현실 관점에서 토론.
- ➕ 직접 만든 캐릭터 / 직원 / 복제 AI 추가.

Android 앱이 메인, PC 앱도 같은 코드. 공식 사이트(`site/`)는 소개용 정적 페이지입니다.
두뇌는 **Claude Opus 5.5** (`claude-opus-5-5`) — 자세한 이유는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 구조

| 폴더 | 내용 |
|---|---|
| `server/` | Ktor 서버. AI 두뇌, 기억, 세계 시뮬레이션, SQLite |
| `shared/` | 서버·앱 공용 데이터 모델 + API 클라이언트 (Kotlin Multiplatform) |
| `composeApp/` | Android + PC 앱 (Compose Multiplatform) |
| `site/` | 공식 사이트 (정적 HTML) |
| `docs/` | 아키텍처, 로드맵 |

## 실행하기

필요한 것: **JDK 17 이상**, (Android 빌드 시) Android SDK — Android Studio 를 설치하면 둘 다 생깁니다.

### 1) 서버 켜기 (집 PC 등)

```bash
# Windows PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_API_KEY=sk-ant-...      # 없으면 오프라인 모드(가짜 응답)로 동작
export LOOIN_OWNER_TOKEN=원하는-비밀-토큰  # 생략하면 자동 생성 → data/owner_token.txt
./gradlew :server:run
```

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (없음) | Claude API 키. https://console.anthropic.com 에서 발급 |
| `LOOIN_OWNER_TOKEN` | 자동 생성 | 앱 접속용 비밀 토큰 |
| `LOOIN_MODEL` | `claude-opus-5-5` | 두뇌 모델 |
| `LOOIN_FALLBACKS` | 켜짐 | 안전 정책으로 거절 시 다른 모델로 재시도. `off` 로 끔 |
| `LOOIN_DATA_DIR` | `data` | DB·토큰 저장 위치 |
| `PORT` | `8080` | 서버 포트 |

### 2) Android 앱

```bash
./gradlew :composeApp:assembleDebug
# → composeApp/build/outputs/apk/debug/composeApp-debug.apk 를 폰에 설치
```
앱을 열고 서버 주소(예: `http://192.168.0.10:8080` — 서버 PC 의 내부 IP)와 토큰을 입력합니다.
폰과 서버 PC 가 같은 Wi-Fi 에 있어야 합니다. 밖에서도 쓰려면 Tailscale 같은 VPN 이나 클라우드 서버를 쓰세요.

### 3) PC 앱

```bash
./gradlew :composeApp:run              # 바로 실행
./gradlew :composeApp:packageMsi       # Windows 설치 파일 (Windows 에서 실행)
```

### 테스트

```bash
./gradlew :server:test    # 가짜 두뇌로 대화→기억→커뮤니티→회의 전체 흐름 검증
```

## 비용 참고

Claude Opus 5.5 는 입력 100만 토큰당 $4, 출력 100만 토큰당 $20 입니다.
일상 대화는 한 번에 몇 원~수십 원 수준이지만, **"세계 돌리기"와 "회의"는 AI 여러 명이 동시에 생각하므로**
한 번에 더 많이 듭니다 (회의 1회 ≈ 구성원 수 + 1 번의 호출). 그래서 지금은 자동 실행 없이 버튼을 누를 때만 움직입니다.
