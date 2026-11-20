# 관리자 앱 설정 (자동 복사)

관리자 앱에서 바꾼 디자인 앱 설정. `.github/workflows/remote-config.yml`이 서버(app_config)에서 복사한다. 직접 고치지 말 것.
항목 목록과 기본값: `app/src/lib/remoteCatalog.ts`. 원래 값(raw): `remote-config.json`.

## 지금 기본값과 다른 것
- 문구 · 달력 목록: 시간 없는 할 일: "To Do" → "할 일"
- 문구 · 일기 카드 (안 쓴 날): "이날의 일기 쓰기" → "일기 쓰기"

## 최근 변경 기록 (새 것부터)
- 2026-11-20 13:47 UTC · `texts`: 없음 → {"agenda.todo":"할 일","agenda.diary":"일기 쓰기"}
- 2026-11-20 13:45 UTC · `maintenance`: {"on":true,"message":""} → {"on":false,"message":""}
- 2026-11-20 13:45 UTC · `maintenance`: 없음 → {"on":true,"message":""}
