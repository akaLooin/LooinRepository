-- 관리자 패널 (admin/): 앱 전체 스위치, 공지사항, 전체 알림 기록. Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전하다.
-- 관리자 지정은 이 SQL 맨 아래의 insert 한 줄을 이메일만 바꿔 실행 (앱이나 패널에서는 아무도 관리자를 만들 수 없다).

-- 관리자 목록. 자기 줄만 볼 수 있고, 넣고 빼는 건 SQL Editor(서비스 권한)에서만.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;
drop policy if exists admins_self on admins;
create policy admins_self on admins for select using (user_id = auth.uid());
revoke insert, update, delete on admins from anon, authenticated;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
revoke execute on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated;

-- 앱 스위치 (key → JSON 값). 누구나 읽고(앱이 시작할 때), 관리자만 바꾼다.
--   crews_enabled  true/false  디자인 앱에서 크루 보이기
--   home_notice    "문장" 또는 null  디자인 앱 홈 맨 위 공지
create table if not exists app_config (
  key text primary key check (char_length(key) between 1 and 60),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
drop policy if exists app_config_read on app_config;
create policy app_config_read on app_config for select using (true);
drop policy if exists app_config_write on app_config;
create policy app_config_write on app_config for all using (is_admin()) with check (is_admin());
grant select on app_config to anon, authenticated;
grant insert, update, delete on app_config to authenticated;
insert into app_config (key, value) values ('crews_enabled', 'false'), ('home_notice', 'null') on conflict (key) do nothing;

-- 공지사항 (설정 → 공지사항, 알림 → 공지). 게시한 것만 모두에게 보인다.
create table if not exists app_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 4000),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table app_notices enable row level security;
drop policy if exists app_notices_read on app_notices;
create policy app_notices_read on app_notices for select using (published or is_admin());
drop policy if exists app_notices_write on app_notices;
create policy app_notices_write on app_notices for all using (is_admin()) with check (is_admin());
grant select on app_notices to anon, authenticated;
grant insert, update, delete on app_notices to authenticated;
create index if not exists app_notices_new on app_notices (created_at desc);

-- 전체 알림 기록 (보내기는 Edge Function 'admin-broadcast'가 서비스 권한으로). 관리자만 본다.
create table if not exists admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  sent integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table admin_broadcasts enable row level security;
drop policy if exists admin_broadcasts_read on admin_broadcasts;
create policy admin_broadcasts_read on admin_broadcasts for select using (is_admin());
revoke insert, update, delete on admin_broadcasts from anon, authenticated;

-- 관리자 지정: 아래 줄의 이메일을 내 로그인 이메일로 바꿔서 실행 (주석 표시 -- 를 지우고).
-- insert into admins (user_id) select id from auth.users where email = '내이메일@example.com' on conflict do nothing;
