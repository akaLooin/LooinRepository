-- 구글 캘린더 연동 (2026-11-23, 이용자 요청: 양방향, 여러 캘린더는 설정에서 고르기).
-- 서버 함수 google-calendar가 구글과 주고받는다. 앱은 연결 상태와 캘린더 고르기만 직접 읽고 쓴다.
-- Supabase SQL Editor에서 실행 (20261124000000 다음). 여러 번 실행해도 안전하다.

-- 구글 계정의 열쇠(refresh token): 서버 함수만 읽는다 (앱에서 읽는 정책이 없다)
create table if not exists google_accounts (
  user_id uuid primary key references profiles(id) on delete cascade,
  email text,
  refresh_token text not null,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table google_accounts enable row level security;
drop trigger if exists google_accounts_updated on google_accounts;
create trigger google_accounts_updated before update on google_accounts
  for each row execute function set_updated_at();

-- 앱이 볼 수 있는 연결 상태 (열쇠는 빼고)
create or replace function google_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('connected', true, 'email', a.email, 'last_sync_at', a.last_sync_at, 'last_error', a.last_error)
    from google_accounts a where a.user_id = auth.uid()), jsonb_build_object('connected', false));
$$;
revoke execute on function google_status() from public, anon;
grant execute on function google_status() to authenticated;

-- 구글 캘린더 목록: 고르기(selected)와 새 일정이 들어갈 곳(is_default)은 앱이 바꾼다
create table if not exists google_calendars (
  user_id uuid not null references profiles(id) on delete cascade,
  calendar_id text not null,
  summary text not null default '',
  color text not null default '#4A90E2',
  time_zone text not null default 'Asia/Seoul',
  can_write boolean not null default true,
  selected boolean not null default false,
  is_default boolean not null default false,
  sync_token text,
  category_id uuid references event_categories(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);
alter table google_calendars enable row level security;
drop policy if exists own_google_calendars_read on google_calendars;
create policy own_google_calendars_read on google_calendars for select using (user_id = auth.uid());
drop policy if exists own_google_calendars_pick on google_calendars;
create policy own_google_calendars_pick on google_calendars for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- the app may change only what to sync and where new events go
revoke update on google_calendars from authenticated;
grant update (selected, is_default) on google_calendars to authenticated;
drop trigger if exists google_calendars_updated on google_calendars;
create trigger google_calendars_updated before update on google_calendars
  for each row execute function set_updated_at();

-- 립마크 일정 ↔ 구글 일정 (서버 함수만 쓴다)
create table if not exists google_event_links (
  event_id uuid primary key references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  calendar_id text not null,
  google_id text not null,
  origin text not null default 'google' check (origin in ('google', 'app')),
  -- a Google repeat the app cannot draw exactly (every 2nd Monday …): shown, but not written back
  lossy boolean not null default false,
  google_updated timestamptz,
  synced_at timestamptz not null default now(),
  unique (user_id, calendar_id, google_id)
);
alter table google_event_links enable row level security;
create index if not exists google_event_links_user on google_event_links (user_id);
