# PC가 생기면 할 일 (모아 둔 목록)

이용자 요청 (2026-11-23): "PC 사용 가능하다고 하면 지난 것들까지 합해서 PC로 무엇을 해야 하는지 쭉 알려 달라."
→ 이용자가 "PC 돼" 하면 이 파일을 기준으로, **아직 안 한 것만** 순서대로 한 단계씩 안내한다. 끝난 항목은 ✅로 바꾸고 날짜를 적는다.
자세한 원문은 `replica/backend.md`의 번호. 경로는 모두 `C:\Users\User\LooinRepository\...`.

## A. Supabase SQL 실행 (폰 브라우저로도 가능)
Supabase 웹 → 프로젝트 → SQL Editor → New query → 파일 내용 전부 붙여 넣고 Run. 여러 번 실행해도 안전함. **위에서부터 순서대로.**
- ✅ (11-23) `supabase\migrations\20261109000300_crews2.sql` (크루 2차)
- ✅ (11-23) `supabase\migrations\20261112000000_my_features.sql` (디데이 당일 포함·신고·여러 날 할 일)
- ✅ (11-23) `supabase\migrations\20261120000000_important.sql` (중요 표시)
- ✅ (11-23) `supabase\migrations\20261124000000_event_repeat_categories.sql` (일정 반복·일정 카테고리)
- ✅ (11-23) `supabase\migrations\20261125000000_google_calendar.sql` (구글 캘린더, 바로 위 것 다음에)
- ✅ 20261107~20261109000200, 20261118000000_events, 20261121000000_admin, 20261122000000_admin_live

## B. Supabase 대시보드 설정 (폰 브라우저로도 가능)
- ✅ (11-23, 이미 있었음) 비밀번호 찾기 링크: Authentication → URL Configuration → Redirect URLs → `todomateclone://**` 추가 (backend.md 8)
- ✅ (11-23, 이미 있었음) 크루 대화 푸시: Database → Webhooks → `push-crew-messages`, 표 `crew_messages`, 헤더 `x-push-secret` (backend.md 17, 아래 C의 push 다시 올리기 뒤에)

## C. PC에서 (PowerShell)
1. ✅ (11-23) 최신 코드 받기: `cd C:\Users\User\LooinRepository` → `git pull`
2. ✅ (11-23) 부품 설치: `cd app` → `npm.cmd install`
3. [ ] 서버 함수 올리기 (`C:\Users\User\LooinRepository`에서, `<ref>` = Supabase 주소의 프로젝트 id):
   - ✅ (11-23) `npx.cmd supabase functions deploy push --no-verify-jwt --project-ref <ref>` (크루 대화 푸시, backend.md 17)
   - ✅ (11-23) `npx.cmd supabase functions deploy admin-broadcast --project-ref <ref>` (관리자 앱 전체 알림, backend.md 23.2) — 했는지 미확인
   - ✅ (11-23) `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` (D를 먼저)
4. [ ] (11-23 시도: expo 무료 요금제의 이번 달 안드로이드 빌드 횟수를 다 써서 실패 → **12월 1일 이후** 다시. 유료 Starter로 바로 할 수도 있음) 새 APK 빌드 (`C:\Users\User\LooinRepository\app`에서). **빌드 전에 `git pull` → `npm.cmd install` 먼저**(11-23 expo-splash-screen 추가: 시작 화면이 흰색 → 립마크 짙은 초록). 앱 이름·아이콘(립마크), 내비게이션 바 색, 픽셀 글꼴, 새 네이티브 부품이 이때 들어감. 데이터는 그대로:
   - [ ] 메인 앱(립마크): `npx.cmd eas-cli@latest build -p android --profile design`
   - [ ] 관리자 앱: `npx.cmd eas-cli@latest build -p android --profile admin`
   - [ ] 복사 앱(원할 때만): `npx.cmd eas-cli@latest build -p android --profile preview`

## D. 구글 캘린더 연동 준비 (backend.md 28, PC 권장)
1. ✅ (11-23, 프로젝트 libmark) https://console.cloud.google.com → 새 프로젝트 → API 및 서비스 → 라이브러리 → **Google Calendar API** → 사용
2. ✅ (11-23, 프로덕션 단계) (홈페이지·개인정보처리방침 주소 필요: 브랜딩에 https://github.com/akaLooin/LooinRepository 와 https://github.com/akaLooin/LooinRepository/blob/claude/replica-skill-install-ll9jb4/docs/privacy.md) Google 인증 플랫폼(OAuth 동의 화면): 앱 이름 `립마크`, 대상 **외부**, 데이터 액세스 → 범위 `calendar.events`, `calendar.calendarlist.readonly`, `openid`, `email` 추가 → 대상 → **앱 게시**(테스트 상태면 7일마다 연결이 끊김)
3. ✅ (11-23) 클라이언트 만들기 → **웹 애플리케이션** → 승인된 리디렉션 URI `https://<ref>.supabase.co/functions/v1/google-calendar/callback` → 클라이언트 ID·보안 비밀 복사 (채팅·저장소에 붙이지 않기)
4. ✅ (11-23) Supabase → Edge Functions → Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_STATE_SECRET`(아무 긴 글자), `GOOGLE_CRON_SECRET`(다른 긴 글자)
5. ✅ (11-23) C-3의 google-calendar 올리기
6. ✅ (11-23) 15분마다 자동 맞추기: Database → Extensions → `pg_cron`, `pg_net` 켜기 → SQL Editor에 backend.md 28.7의 한 줄 (ref와 cron 비밀 넣어서)
7. ✅ (11-23, 연결됨) 폰: 프로필 → 구글 캘린더 → 구글 계정 연결하기 → 동의 ("확인되지 않은 앱"이 뜨면 고급 → 립마크(으)로 이동) → 연동할 캘린더 고르기
8. ✅ (11-23) 연결 뒤 앱으로 바로 돌아오게 고친 서버 기능 다시 올리기: `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` (Supabase 기본 주소는 웹페이지를 못 보여 줘서 안내 페이지 글자가 깨졌음)

9. ✅ (11-23) 캘린더 색 바뀜 따라가기 + 구글이 알려 주는 일정 색 목록 + 연결 전 립마크 일정은 절대 안 올림 반영(11-23; 올린 뒤 설정 → 구글 캘린더에 "일정 색 n가지"가 보이는지 확인): `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>`
10. ✅ (11-23, found 0 · removed 0: 서버가 올린 립마크 일정은 없었음) (1회만) 립마크에서 올라간 일정을 구글에서 빼기: 9번 올린 뒤 SQL Editor에서 `net.http_post(... body {"action":"remove-app-uploads"}, 헤더 x-cron-secret)` 한 번 → `select status_code, content from net._http_response order by id desc limit 1;`로 결과 확인
11. ✅ (11-23, items 957 · colorId 73 · eventLabelId 83 · 라벨 정의는 calendars 권한 필요) 서버 다시 올리기(보기만 캘린더 보호 등) → **1회만** 색 다시 맞추기: SQL Editor에서 `net.http_post(... body {"action":"refresh-colors"}, 헤더 x-cron-secret)` → 10~30초 뒤 `select status_code, content from net._http_response order by id desc limit 1;` 결과를 Claude에게(`colours`에 colorId·다른 색 필드 개수가 나옴)
12. ✅ (11-23, 권한 받음·라벨 24개 확인) 구글 라벨 색: Google 인증 플랫폼 → 데이터 액세스 → 범위 `calendar.calendars.readonly` 추가·저장 → 서버 올리기 → 립마크 구글 캘린더 → "구글 권한 다시 받기" → SQL로 `labels-probe` 다시 → 결과를 Claude에게
13. ✅ (11-23, updated 51) **SQL 먼저** `supabase\migrations\20261126000000_event_details.sql`(장소·화상 회의 칸) → 서버 올리기 → SQL로 `refresh-colors` 한 번 더(라벨 색 + 장소·회의 링크를 기존 일정에도, `updated`에 고친 개수)
14. ✅ (11-23) 색 바꾸기가 구글에 안 감 → 서버 올리기(구글이 거절하면 이유 기록, 라벨 거절 시 colorId로 다시) → 색 바꾸고 지금 맞추기 → 빨간 글씨 나오면 Claude에게
15. ✅ (11-23, items 959 · updated 0) 색이 다르게 감·알림 없음인데 알림 생김 → 서버 올리기 → `refresh-colors` 한 번(알림도 구글 그대로 맞춤) → 색이 틀어졌던 일정은 립마크에서 색 다시 고르기
16. ✅ (11-23, SQL·서버·refresh 완료, 폰 확인 중) (15와 한 번에) 구글 항목 전부 + 실시간 + "이 일정만" 고침: **SQL 먼저** `supabase\migrations\20261127000000_google_more.sql`(알림 여러 개·참석자·시간대·첨부·회차 표시·실시간) → `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` → 15의 `refresh-colors` 한 번 → 폰에서 립마크 업데이트 후 설정 → 구글 캘린더 → 지금 맞추기(이때 구글 "바로 알림" 연결이 생김) → 확인: 구글에서 일정 하나 고치고 몇 초 안에 립마크에 바뀌는지, 립마크에서 반복 일정 하나를 "이 일정만" 고쳤을 때 구글의 다른 회차가 그대로인지
17. [ ] (11-23, 원인: 라벨은 주소에 `eventLabelVersion=1`이 있어야 구글이 받음 → 고침) 벚꽃을 골랐는데 구글에서 초록: 서버가 구글이 라벨을 받았는지 확인하고, 안 받았으면 가장 가까운 기본 색으로 다시 올리고 립마크 색도 구글에 보이는 색으로 맞춤 → `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` → 색 다시 바꾸고 설정 → 구글 캘린더의 빨간 글씨 확인
18. [ ] (11-23) 립마크에서 바꾼 색이 구글에 늦게 감 → 빠른 올리기(립마크 변경만 바로, 캘린더 목록·당겨오기는 건너뜀): `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` → 폰 지금 업데이트 → 색 바꿔서 몇 초 걸리는지 확인
19. [ ] (11-23, 급하지 않음: 앱이 이미 모든 캘린더를 연동으로 바꿈) 계정의 캘린더 전부 연동(새로 생긴 캘린더도 처음부터): `git pull` → `npx.cmd supabase functions deploy google-calendar --no-verify-jwt --project-ref <ref>` (18과 한 번에)
20. [ ] (11-23, **가장 먼저**) 저장하면 구글 일정이 하나 더 생김(원인: 서버가 일정·연결을 1000개까지만 읽음 → 연결을 못 읽은 일정을 새로 올림) → `git pull` → 서버 올리기(18·19도 같이 됨) → SQL로 복사본 세기 `remove-copies` + `"dry":true` → 숫자를 Claude에게 → 괜찮으면 `"dry":false`로 한 번(같은 캘린더·제목·날짜·시간·반복인 일정 중 가장 오래된 것만 남기고 립마크·구글에서 지움)

## E. 나중에 (선택)
- [ ] 구글 앱 인증(검증) 신청: 지금은 연결할 때 "확인되지 않은 앱" 경고가 한 번 뜸(혼자·100명 이하는 그대로 써도 됨). 없애려면 내 도메인, 그 도메인의 홈페이지·개인정보처리방침, 사용 영상 등을 내고 구글 심사(몇 주)를 받아야 함. 다른 사람에게 앱을 공개할 때 진행