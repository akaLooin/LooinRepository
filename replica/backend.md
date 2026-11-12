# Backend

Supabase (Postgres, Auth, Storage, Edge Functions). No other services. No payments: the app is for personal use, and premium is a "could" in the feature matrix.

## How data moves

- The app always reads and writes **this device's copy**, saved in AsyncStorage. It works offline.
- When signed in, changes are **pushed** about 2 seconds after an edit. The app also **pulls** changes from other devices: on launch, when it comes back to the foreground, and every minute (`app/src/data/sync.ts`).
- If the same row is edited on two devices, the **last edit to reach the server wins**. An edit still waiting to be sent is never overwritten by a pull.
- Deletions are sent as `deleted_at` markers, so other devices learn about them. A daily job really deletes them after 30 days (optional migration 0002).
- Rows the server refuses (for example a to-do added offline to a category that another device ended) are reported under 설정 → 계정과 동기화. They do not block the rest.
- **Demo mode**: if no Supabase keys are set, the app runs on sample data saved only on this device. No sign-in.

Change from `architecture.md`: the device copy is a JSON snapshot in AsyncStorage, not SQLite + Drizzle. It is simpler and fine for one person's to-dos. Move to SQLite if the data grows past a few MB. Android's AsyncStorage has a size limit. The screens would not change.

## Setup (you do these, with your own account)

1. **Create a project** at supabase.com (free plan is fine). Region: Seoul (Tokyo is fine too: sync runs in the background).
2. **Create the tables**: Dashboard → SQL Editor → paste all of `supabase/migrations/20261103000000_init.sql` → Run.
   - Optional cleanup job: Database → Extensions → enable `pg_cron`, then run `20261103000100_purge_job.sql` the same way.
3. **Email + password sign-in**: Authentication → Sign In / Providers → Email: on (the default).
   - "Confirm email" on (default): after signing up, open the confirmation email and tap the link once, then sign in in the app. The page the link opens may not load, but the email is confirmed anyway.
   - Or turn "Confirm email" off for a personal project: you can sign in right after signing up.
   - Why not email codes: Supabase's built-in mailer no longer allows editing the template, and the default Magic Link email has a link, not a code. Codes would need your own SMTP (Gmail app password, Resend…). Password reset by email is not built yet for the same reason.
4. **Keys into the app**: Project Settings → API Keys. Copy the Project URL and the **publishable** key into `app/.env.local` (see `app/.env.example`). Never put the secret/service-role key in the app.
5. **Account deletion** (optional until you need it): install the Supabase CLI, then:
   ```
   supabase login
   supabase link --project-ref <your project ref>
   supabase functions deploy delete-account
   ```
6. **Run it on your phone (development)**: `cd app && npm install && npx expo start`, then open the QR code with the Expo Go app on Android.

7. **Install it as a real app (APK), so the PC is not needed day to day** (Windows PowerShell, in `C:\Users\User\LooinRepository\app`):
   1. Make a free account at expo.dev.
   2. `npx.cmd eas-cli@latest login` (the expo.dev e-mail and password).
   3. `npx.cmd eas-cli@latest init` → answer Y. It writes the project id into `app.json` (not a secret; commit it, then `git checkout -- app.json` before the next pull).
   4. The Supabase values from `.env.local` go to Expo, because `.env.local` is never uploaded:
      `npx.cmd eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value <URL from .env.local> --visibility plaintext`
      `npx.cmd eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <key from .env.local> --visibility sensitive`
   5. `npx.cmd eas-cli@latest build -p android --profile preview` → Y to "Generate a new Android Keystore". Builds in Expo's cloud (10–30 minutes on the free plan), then shows a link and QR code.
   6. On the phone open the link, download the APK, allow installing from that browser, install, sign in.
   - Rebuild (step 5) when the code changes; the phone installs the new APK over the old one and keeps its data.
   - Checked before the first build: `expo install --check` clean (2026-11-07), `expo prebuild -p android` passes, permissions POST_NOTIFICATIONS / SCHEDULE_EXACT_ALARM / RECEIVE_BOOT_COMPLETED in the manifest.

8. **Password reset (비밀번호 찾기)**, once in the Supabase dashboard: Authentication → URL Configuration → Redirect URLs → Add URL → `todomateclone://**` → Save. Without it the mail's link opens the Supabase site instead of the app. Works in the APK (Expo Go uses a different address). Supabase's built-in mailer sends only a few mails an hour.

9. **Profile fields (2026-11-07)**, once in the Supabase SQL Editor: run `supabase/migrations/20261107000000_profile_fields.sql` (ID, 관심사, 성별, 생년월; 이름 30자, 자기소개 200자). Until then a profile with those fields set is not accepted by the server (shown under 설정 → 실험실).

10. **Friends (2026-11-08)**, once in the Supabase SQL Editor: run `supabase/migrations/20261108000000_friends.sql` (팔로우, 차단, 일부 공개 대상, 반응, 알림, 개인정보 설정 5개). Safe to run again (if the editor fails halfway, just run it once more). Check: `select count(*) from information_schema.tables where table_name in ('follows','blocks','reactions','notifications','category_viewers','diary_viewers');` → 6. If the dashboard page itself breaks (e.g. "removeChild" error), turn off the browser's page translation and reload. Nothing changes on screen yet; the app keeps working without it (privacy settings then stay on the phone).

11. **Reaction lists (2026-11-08)**, once in the SQL Editor: run `supabase/migrations/20261108000100_reaction_lists.sql` (친구 홈의 할 일·일기마다 반응 목록, 내 할 일·일기에 받은 반응). Safe to run again. Without it the friend home still opens but reactions do not show under to-dos.
12. **대화 (2026-11-08)**, once in the SQL Editor: run `supabase/migrations/20261108000200_chat.sql` (대화방, 메시지, 읽음, 사진 버킷 `chat-photos`). Safe to run again. Until then 보내기 shows "서버에 대화 SQL을 먼저 실행해 주세요".
13. **Push notifications (2026-11-08)**: messages and friend news reach the phone when the app is closed. Needs a PC, about 30 minutes, in this order. Nothing secret goes into the repository or the chat.
    1. SQL Editor: run `supabase/migrations/20261108000300_push.sql` (phone addresses, 알림 settings on the account).
    2. Firebase (Google's push service for Android): https://console.firebase.google.com → 프로젝트 추가 (any name, Analytics off) → Android 앱 추가, package name `com.looin.todomateclone` → download `google-services.json` → put it in `C:\Users\User\LooinRepository\app\` (git ignores it).
    3. Give that file to EAS builds: in `app`, `npm.cmd install` first (new native parts), then `npx.cmd eas-cli env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview` (`env:create` is deprecated; it failed while node_modules were out of date).
    4. Let Expo send through Firebase: Firebase → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 (a .json file; keep it outside the repository) → `npx.cmd eas-cli credentials` → Android → preview → Google Service Account → "Push Notifications (FCM V1)" → upload that file.
    5. The sender: in the repository folder, `npx.cmd supabase login`, then `npx.cmd supabase functions deploy push --no-verify-jwt --project-ref <your project id>` (dashboard URL, after /project/). Secret word: `$secret = [guid]::NewGuid().ToString("N")`, `npx.cmd supabase secrets set PUSH_WEBHOOK_SECRET=$secret --project-ref <id>`, and `$secret` shows it for the webhooks.
    6. Dashboard → Database → Webhooks → Create: name `push-messages`, table `messages`, event Insert, type Supabase Edge Functions → `push`, method POST, add header `x-push-secret` = the same word. Make a second one, `push-notifications`, for table `notifications`.
    7. Build a new APK (step 7). After signing in, 설정 → 알림 → "이 폰의 푸시 알림" says 켜져 있어요, or why not.
    Expo Go and the web never get pushes (Expo Go has no push on Android since SDK 53).
14. **친구 피드 (2026-11-09)**, once in the SQL Editor: run `supabase/migrations/20261109000000_feed.sql`. Safe to run again. Until then 둘러보기 shows "서버에 친구 기능 SQL을 먼저 실행해 주세요" where 친구 소식 would be.
15. **일기 기분 온도 (2026-11-09)**, once in the SQL Editor: run `supabase/migrations/20261109000100_diary_mood.sql`. Safe to run again. Until then a diary keeps its 기분 온도 on the phone only.
16. **크루 (2026-11-09)**, once in the SQL Editor: run `supabase/migrations/20261109000200_crews.sql` (crews, members and requests, crew notices, the public `crew-images` bucket). Safe to run again. For crew pushes, deploy the push function again (`npx.cmd supabase functions deploy push --no-verify-jwt --remote=<id>`).
17. **크루 2차 (2026-11-09)**, once in the SQL Editor: run `supabase/migrations/20261109000300_crews2.sql` (모집 중단, 크루 수정, 크루 홈, 크루 대화방). Safe to run again. For crew chat pushes: deploy the push function again (`npx.cmd supabase functions deploy push --no-verify-jwt --project-ref <id>`) and add a third Database Webhook like step 13.6: name `push-crew-messages`, table `crew_messages`, same `x-push-secret` header.
18. **내 기능 (2026-11-12)**, once in the SQL Editor: run `supabase/migrations/20261112000000_my_features.sql` (디데이 `당일 포함`, photo reports `reports` + `report_content`). Safe to run again. Until then 당일 포함 stays on the phone only and 신고하기 shows an error.
## Checklist

Auth
- [x] Email + password (Supabase Auth). Sign-up, sign-in, clear error messages
- [x] Password reset by email: login → 비밀번호를 잊으셨나요? → mail link `todomateclone://reset-password` → new password (AuthGate). Settings → 비밀번호 바꾸기 when signed in. Needs the redirect URL (step 8). Not yet tried on the phone
- [x] Session stored on the device and refreshed automatically. Sign out clears this device's copy
- [ ] Google sign-in. Needs your own Google Cloud OAuth client; can be added later
- [x] Account deletion that really deletes (Edge Function `delete-account`: files, then the auth user, rows cascade). **Not tested against a live project**
- [x] One role only (each person owns their data). No teams in the recon map

Database
- [x] Migrations checked in (`supabase/migrations`), applied in order
- [x] Row level security on every table. Tested on local Postgres 16 with Supabase's `auth` schema stubbed: a second user gets nothing back
- [x] 대화 rules: `supabase/tests/chat.test.sql` (one room per pair, re-sent message counted once, photos only from your own folder and only for the two people, unread/read, 대화 수신 허용, stranger sees nothing, block hides the room)
- [x] Crews 2: `supabase/tests/crews2.test.sql` (edit by the leader only, no applying while recruiting is stopped, my crews, crew home and chat for members only, unread counts from joining)
- [x] Crews: `supabase/tests/crews.test.sql` (own category only, picture from own folder, apply/cancel, only the leader sees and answers requests, members see each other's shared to-dos even from a private category, strangers see the ranking only, leave, delete)
- [x] Feed: `supabase/tests/feed.test.sql` (followed people only, visibility, private memo, newest first, paging, reactions)
- [x] Push: `supabase/tests/push.test.sql` (phone addresses only through functions, own only, a phone moves with the sign-in); the push wording and batching are unit-tested (`app/scripts/test-push.ts`); the function itself runs only on Supabase
- [x] Friends rules: `supabase/tests/run.sh` runs every migration on a throwaway Postgres 16 and `friends.test.sql` (owner, follower, stranger, requester: visibility levels, private memos, photos, reactions and the 좋아요 setting, approval, block, search opt-out, signed out)
- [x] To-dos and routines can only point at the user's own categories (trigger). Ended categories refuse new to-dos (trigger)
- [x] New accounts get a profile, settings and a "To Do" category (trigger)
- [x] Seed data is made up (`app/src/data/seed.ts`, demo mode only)
- [ ] Backups: the free plan has no downloadable daily backups (Pro does). For now, export from the dashboard now and then

Sync
- [x] Two-device tests against a fake server (`npm test`, `scripts/test-sync.ts`): new items, checks, deletes, offline edit wins, no duplicates on repeat, one refused row does not block others
- [ ] End-to-end run against a real Supabase project (needs your project)

Payments, email, jobs
- [x] No payments (personal use)
- [x] Only email is the sign-in code (Supabase Auth)
- [x] Reminders and to-do alarms are local notifications on the phone (no server job). The plan is unit-tested; ringing needs a phone (Expo Go or the APK)
- [x] Cleanup job (pg_cron, optional)

Security
- [x] Only the publishable key is in the app; `.env*.local` is git-ignored; `.env.example` has names only
- [x] Server checks: RLS on every read and write, check constraints (colour code, repeat rules, lengths), ownership triggers
- [x] Rate limits on sign-in: Supabase Auth's built-in limits. The app shows a "try again later" message on 429
- [x] Uploads: buckets with per-user folders and policies. Size and type limits get set when photo upload is built
- [x] No user data in URLs or logs
- [x] `npm audit --omit=dev`: 8 moderate, all in Expo's build tooling (glob/minimatch), none shipped in the app. The suggested fix forces a breaking Expo change, so it waits for the next Expo SDK
- [ ] Privacy policy (needed before any store release). Processor: Supabase
