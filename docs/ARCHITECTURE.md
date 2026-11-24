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
              │  ├ Brain           두뇌 추상화          │──► Claude API (claude-opus-5-5)
              │  └ Repository      SQLite              │
              └──────────────────────────────────────┘
 site/ : 공식 사이트 (정적 HTML — 소개와 다운로드 링크만, 웹앱 아님)
```

## 왜 이렇게 만들었나

| 결정 | 이유 |
|---|---|
| **Kotlin 하나로 전부** (서버·Android·PC) | 데이터 모델(`shared`)을 서버와 앱이 그대로 공유. 언어 하나만 익히면 됨. |
| **Compose Multiplatform** | Android 가 메인이면서 같은 화면 코드로 PC 앱(진짜 설치형)을 만들고, 나중에 iOS 도 같은 코드로 확장. |
| **서버를 따로 둠** | API 키를 폰에 넣지 않기 위해, 그리고 AI 주민들이 내가 앱을 꺼도 활동할 수 있도록. 여러 기기가 같은 세계를 봄. |
| **두뇌 = Claude Opus 5.5** | 아래 "AI 수준에 대해" 참고. `Brain` 인터페이스 뒤에 숨겨서 모델 교체·혼용이 가능. |
| **SQLite** | 혼자 쓰는 단계엔 파일 하나로 충분. 멀티 유저가 되면 PostgreSQL 로 이전(쿼리는 표준 SQL 위주). |

## AI 수준에 대해 (솔직하게)

"Opus 5.5 중간급 이상"의 모델을 직접 학습시키는 것은 개인이 할 수 있는 규모가 아닙니다
(수천억 원대 연산 자원). 대신 Looin World 의 **두뇌로 Claude Opus 5.5 자체를 사용**하므로
지능 수준은 Opus 5.5 와 같습니다. "나만의 AI"를 만드는 부분은 그 위에 쌓는 층입니다:

- **정체성**: 페르소나 + 나의 프로필 (시스템 프롬프트)
- **기억**: 대화에서 자동으로 추출해 쌓는 장기 기억 → 매 대화에 주입
- **세계**: 여러 AI 가 공유하는 공간·관계·기록

이 층들이 내 서버/DB 에 있기 때문에, 나중에 두뇌 모델을 바꿔도 "나의 AI"는 그대로 남습니다.

### 두뇌 설정 (서버 `ClaudeBrain`)
- 모델: `claude-opus-5-5` (환경 변수 `LOOIN_MODEL` 로 변경 가능)
- 사고: Opus 5.5 는 적응형 사고가 항상 켜져 있음. 깊이는 `effort` 로 조절
  - 1:1 대화 `medium`, 회의 발언·요약 `medium`, 커뮤니티 잡담·기억 추출 `low`
- 프롬프트 캐시: 페르소나 등 고정된 시스템 프롬프트에 캐시를 걸어 비용 절감
- 거절 대비: 서버 측 fallback (`fallbacks: "default"`) 기본 활성화. `LOOIN_FALLBACKS=off` 로 끌 수 있음
- API 키가 없으면 `OfflineBrain` 으로 동작 → 비용 없이 앱 흐름 테스트 가능

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
