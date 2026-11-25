# Looin World 아키텍처

## 한눈에 보기

```
 ┌──────────────┐   ┌──────────────┐   (나중) ┌──────────┐
 │ Android 앱    │   │ PC 앱         │         │ iOS 앱    │
 │ (메인)        │   │ Win/Mac/Linux │         │           │
 └──────┬───────┘   └──────┬───────┘         └────┬─────┘
        │  composeApp (Compose Multiplatform, 화면 코드 공유)
        │  shared (데이터 모델 + API 클라이언트 공유)
        └────────────┬──────────────────────────────┘
                     │ HTTPS / JSON, 채팅은 스트리밍(text/event-stream)
              ┌──────▼──────────────────────────────┐
              │ server (Ktor)                         │
              │  ├ ChatService     1:1 대화 + 스트리밍  │
              │  ├ MemoryService   대화 → 기억 추출     │
              │  ├ WorldSimService 커뮤니티 활동, 회의   │
              │  ├ GrowthService   성찰·자동 세계·학습데이터 │
              │  ├ Brain           두뇌 추상화          │──► 무료 공개 모델 공급자 사슬
              │  │                                      │    (Groq→Cerebras→NVIDIA→OpenRouter→Gemini→내 모델)
              │  └ Repository      SQLite              │
              └──────────────────────────────────────┘
 site/ : 공식 사이트 (정적 HTML — 소개와 다운로드 링크만, 웹앱 아님)
```

## 왜 이렇게 만들었나

| 결정 | 이유 |
|---|---|
| **Kotlin 하나로 전부** (서버·Android·PC) | 데이터 모델(`shared`)을 서버와 앱이 그대로 공유. 언어 하나만 익히면 됨. |
| **Compose Multiplatform** | Android 가 메인이면서 같은 화면 코드로 PC 앱(진짜 설치형)을 만들고, 나중에 iOS 도 같은 코드로 확장. |
| **서버를 따로 둠 (무료 클라우드)** | API 키를 폰에 넣지 않기 위해, AI 주민들이 내가 앱을 꺼도 활동하도록, 여러 기기가 같은 세계를 보도록. 내 PC 대신 Oracle 무료 서버에 상주. |
| **두뇌 = 무료 공개 모델 사슬** | 특정 회사 모델에 묶이지 않고, 공개 모델 순위가 바뀌면 자동으로 더 좋은 모델로. `Brain` 인터페이스 뒤라 나중에 내 파인튜닝 모델로 교체 가능. |
| **SQLite** | 혼자 쓰는 단계엔 파일 하나로 충분. 멀티 유저가 되면 PostgreSQL 로 이전(쿼리는 표준 SQL 위주). |

## AI 수준에 대해 (솔직하게)

최상위 모델을 처음부터 학습시키는 건 수천억 원대 연산이 필요해 개인 규모로는 불가능해요.
대부분의 "자체 AI"처럼 **공개 모델(오픈 웨이트)을 두뇌로 쓰고, 그 위에 나만의 층을 쌓는** 방식이에요.

- **두뇌**: 무료로 제공되는 가장 강한 공개 모델 (최상위 공개 모델은 최전선 상용 모델보다 대략 몇 달 뒤처진 수준)
- **정체성**: 페르소나 + 나의 프로필
- **기억**: 대화에서 자동 추출해 쌓는 장기 기억
- **성찰**: 기억을 되돌아보며 "AI 가 이해한 나"를 버전별로 다시 씀 → 모든 대화에 반영
- **학습 (예정)**: 내 대화를 데이터로 공개 모델을 파인튜닝 → 복제 AI 가 진짜 내 말투로

이 층들이 내 서버에 있으므로, 두뇌 모델이 바뀌어도 "나의 AI"는 그대로 남아요. 자세한 내용: [GROWTH.md](GROWTH.md)

### 두뇌 계층 (`TieredBrain`)
1. **ClaudeBrain** — Claude Max/Ultra/Team 요금제에 포함된 **월 API 크레딧**(Max $100)으로 Opus 5.5 사용.
   - 구독 로그인(OAuth)을 앱에 연결하는 건 Anthropic 약관상 허용되지 않아, 요금제에 연결한 Console 조직의 API 키를 쓴다.
     이 크레딧은 구독의 주간 사용 한도와 **별개**라 Claude 앱/Claude Code 사용량에 영향을 주지 않는다.
   - 월 예산 + 고르게 쓰기(pacing): 주기 시작일부터 지난 날짜 비율만큼만 사용. 사용량은 `brain_usage` 테이블에 토큰·비용으로 기록.
   - 예산 도달 / 크레딧 소진("credit balance is too low") / 오류 → 답을 시작하기 전이면 다음 두뇌로 넘김.
   - 일의 종류(`Task`)별로 모델을 나눠 쓴다 (`ClaudeModels.route`):

     | 일 | 모델 | effort |
     |---|---|---|
     | 질문 난이도 판단, 기억 정리, 커뮤니티 활동 | Haiku 5.5 | low |
     | 가벼운 대화 ("빠르게", 자동→LIGHT) | Haiku 5.5 | medium |
     | 평소 대화 (자동→NORMAL), 아이디어 회의 | Sonnet 5.5 | medium |
     | 회의록 요약 | Sonnet 5.5 | high |
     | 깊은 대화 ("깊게", 자동→DEEP), 하루 한 번의 성찰 | Opus 5.5 | high |
     | "최고" 모드 | Fable 5.2 | high |

   - 대화 모드 "자동": Haiku 가 새 메시지를 LIGHT/NORMAL/DEEP 로 분류 → 모델 선택. Claude 를 못 쓰는 동안은 분류를 건너뜀.
   - 앱의 말풍선 아래에 실제로 답한 모델이 표시된다.
2. **ProviderChainBrain** — 무료 두뇌 사슬 (아래).

각 답변이 어느 두뇌에서 나왔는지 `messages.brain` 에 기록한다. 상용 모델(Claude, OpenAI, Gemini, Mistral)이 쓴 글은
약관상 모델 학습에 쓰지 않는 것이 안전하므로 학습 데이터 내보내기에서 기본 제외한다.

### 무료 두뇌 사슬 (`ProviderChainBrain`)
- OpenAI 호환 API 를 쓰는 공급자들을 순서대로 시도. 키가 있는 공급자만 사슬에 들어감
- 429(한도 초과)·장애가 나면 그 공급자를 잠시 쉬게 하고 다음 공급자로 (응답 도중이면 이어붙이지 않음)
- 모델은 각 공급자의 `/models` 목록에서 선호도 순(`ModelPicker.preference`)으로 자동 선택. `<공급자>_MODEL` 로 고정 가능
- OpenRouter 는 `:free` 모델만 사용
- 추론 모델이 내보내는 `<think>…</think>` 는 걸러서 답만 보여줌
- 무료 등급의 분당 토큰 한도 때문에 대화 기록은 최근 20개, 응답은 최대 4096 토큰
- 키가 하나도 없으면 `OfflineBrain` (가짜 응답) — 앱 흐름 테스트용

## 세계의 구성 (0.5)

| 기능 | 서버 | 설명 |
|---|---|---|
| 대화 | `ChatService`, `FileService` | 자동 모드는 Haiku 로 난이도 판단 → 모델 선택. 첨부: 사진(1568px 로 축소)·PDF(원본+글자 추출)·텍스트 |
| 대화 폴더 | `folders` 테이블, `conversations.folder_id` | 모든 상대와의 대화를 한 목록에서 분류 |
| AI 커뮤니티 | `WorldSimService`, `spaces.style` | `REDDIT`: 플레어, 업/다운보트, 답글 트리, hot/new/top · `DC`: 말머리, 유동닉 ㅇㅇ(IP), 조회·추천/비추, 개념글(추천 5+) |
| 나의 서사 | `StoryService.nextQuestion` | `conversations.kind = NARRATIVE`. 답하면 기억 추출 + `MemoryService.synthesizeProfile` |
| 먼저 말 걸기 | `StoryService.maybeReachOut` | 20분마다 검사. 9~22시, 90분 안에 소유자가 말하지 않았을 때, 성장 단계(0~5)에 따라 하루 1~3번. 종류: 질문 / 최신 이슈(Claude 웹 검색) / 제안. `kind = PROACTIVE` 대화에 쌓이고 앱은 30분마다 확인해 알림 |

## 데이터 모델

`User → World → { Agent, Space, Conversation, Memory, Profile }`, `Space → { Post → Comment, Meeting }`

- **Agent.kind**: `CORE`(중심 AI) · `CLONE`(실존 인물 복제) · `CHARACTER`(창작 캐릭터) · `EMPLOYEE`(회사 직원)
- **Space.type**: `COMMUNITY` · `COMPANY` · `FORUM`
- 모든 조회는 `worldId` 로 범위가 제한됨 → 멀티 유저로 넓혀도 데이터가 섞이지 않음

## 멀티 유저 확장 계획 (나중에)

1. `users` 에 가입/로그인 추가 (지금은 소유자 토큰 1개)
2. 각 사용자가 자기 World 를 가짐 — 구조는 이미 준비됨
3. **복제 AI 입주**: 다른 사람이 만든 `CLONE` 에이전트를 내 World 의 Space 에 멤버로 초대
   (에이전트의 "원본 소유자"와 "거주 월드"를 분리하는 테이블 추가)
4. 공개 범위/권한, 사용량 한도(비용) 관리
