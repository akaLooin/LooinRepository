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

1. **Create a project** at supabase.com (free plan is fine). Region: Northeast Asia (Seoul).
2. **Create the tables**: Dashboard → SQL Editor → paste all of `supabase/migrations/20261103000000_init.sql` → Run.
   - Optional cleanup job: Database → Extensions → enable `pg_cron`, then run `20261103000100_purge_job.sql` the same way.
3. **Email code sign-in**: Authentication → Sign In / Providers → Email: on.
   Then Authentication → Emails → Templates → **Magic Link**. Make the email show the code, because the app asks for the code, not the link. Example (our own wording):
   - Subject: `로그인 코드: {{ .Token }}`
   - Body: `<p>앱에 아래 코드를 입력해 주세요.</p><h2>{{ .Token }}</h2><p>10분 안에 사용해 주세요. 요청한 적이 없다면 이 메일은 무시하셔도 돼요.</p>`
   - The built-in mailer sends only a few emails per hour. That is enough for one person. For more, add your own SMTP (Resend etc.) under Authentication → Emails → SMTP.
4. **Keys into the app**: Project Settings → API Keys. Copy the Project URL and the **publishable** key into `app/.env.local` (see `app/.env.example`). Never put the secret/service-role key in the app.
5. **Account deletion** (optional until you need it): install the Supabase CLI, then:
   ```
   supabase login
   supabase link --project-ref <your project ref>
   supabase functions deploy delete-account
   ```
6. **Run it on your phone**: `cd app && npm install && npx expo start`, then open the QR code with the Expo Go app on Android.

## Checklist

Auth
- [x] Email one-time code (no passwords). Creates the account on first sign-in
- [x] Session stored on the device and refreshed automatically. Sign out clears this device's copy
- [ ] Google sign-in. Needs your own Google Cloud OAuth client; can be added later
- [x] Account deletion that really deletes (Edge Function `delete-account`: files, then the auth user, rows cascade). **Not tested against a live project**
- [x] One role only (each person owns their data). No teams in the recon map

Database
- [x] Migrations checked in (`supabase/migrations`), applied in order
- [x] Row level security on every table. Tested on local Postgres 16 with Supabase's `auth` schema stubbed: a second user gets nothing back
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
- [x] Reminders and to-do alarms will be local notifications on the phone (no server job). Not built yet
- [x] Cleanup job (pg_cron, optional)

Security
- [x] Only the publishable key is in the app; `.env*.local` is git-ignored; `.env.example` has names only
- [x] Server checks: RLS on every read and write, check constraints (colour code, repeat rules, lengths), ownership triggers
- [x] Rate limits on sign-in: Supabase Auth's built-in limits. The app shows a "try again later" message on 429
- [x] Uploads: buckets with per-user folders and policies. Size and type limits get set when photo upload is built
- [x] No user data in URLs or logs
- [x] `npm audit --omit=dev`: 8 moderate, all in Expo's build tooling (glob/minimatch), none shipped in the app. The suggested fix forces a breaking Expo change, so it waits for the next Expo SDK
- [ ] Privacy policy (needed before any store release). Processor: Supabase
