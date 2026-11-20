# 관리자 패널

앱 밖에서 여는 관리용 웹 페이지. Claude 없이 앱 설정을 바꾸고, 공지를 쓰고, 모든 폰에 알림을 보낸다.

- **앱 설정**: 크루 기능 켜기/끄기(디자인 앱), 디자인 앱 홈 맨 위 공지 한 줄
- **공지사항**: 쓰기 · 고치기 · 지우기 · 초안(나만 보임). 앱의 설정 → 공지사항, 알림 → 공지에 맨 위로 나온다
- **알림 보내기**: 푸시를 허용한 모든 폰에. 보내기 전에 몇 대인지 먼저 보여 준다. 보낸 기록이 남는다

## 처음 한 번 (replica/backend.md 23번)

1. Supabase SQL Editor에서 `supabase/migrations/20261121000000_admin.sql` 실행, 맨 아래 줄을 내 이메일로 바꿔 실행(관리자 지정)
2. 알림 보내기를 쓰려면: `C:\Users\User\LooinRepository`에서 `npx.cmd supabase functions deploy admin-broadcast --project-ref <프로젝트 id>`
3. 열기:
   ```powershell
   cd C:\Users\User\LooinRepository\admin
   npm.cmd install      # 처음 한 번
   npm.cmd run dev      # 브라우저가 열림 → 앱 계정으로 로그인
   ```

Supabase 값은 `app\.env.local`을 그대로 쓴다(새로 적을 것 없음). 이 페이지에는 비밀 키가 없고, 바꾸는 권한은 서버(RLS, 함수)가 관리자인지 다시 확인한다.
