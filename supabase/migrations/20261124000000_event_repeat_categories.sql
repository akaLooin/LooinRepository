-- 일정 반복 · 일정 카테고리 (2026-11-23, 이용자 요청). 할 일 카테고리와 따로 있는 일정만의 카테고리, 반복 일정.
-- Supabase SQL Editor에서 실행 (20261120000000 다음). 여러 번 실행해도 안전하다.
-- 실행 전에는 카테고리나 반복을 쓴 일정·일정 카테고리가 폰에서 기다렸다가, 실행한 뒤에 올라간다.

create table if not exists event_categories (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  color text not null default '#4A90E2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists event_categories_sync on event_categories (user_id, updated_at);

drop trigger if exists event_categories_updated on event_categories;
create trigger event_categories_updated before update on event_categories
  for each row execute function set_updated_at();

alter table event_categories enable row level security;
drop policy if exists own_event_categories on event_categories;
create policy own_event_categories on event_categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 일정: 카테고리(지우면 카테고리 없음으로), 반복 규칙, 반복에서 뺀 날
alter table events add column if not exists category_id uuid references event_categories(id) on delete set null;
alter table events add column if not exists repeat jsonb;
alter table events add column if not exists skip_dates jsonb not null default '[]';

-- 동기화: 일정 카테고리도 받아 오기 (나머지는 20261118000000과 같다)
create or replace function pull_changes(since timestamptz)
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'server_time', now(),
    'profiles',         (select coalesce(jsonb_agg(p), '[]') from profiles p         where p.id = auth.uid() and p.updated_at > since),
    'user_settings',    (select coalesce(jsonb_agg(s), '[]') from user_settings s    where s.user_id = auth.uid() and s.updated_at > since),
    'categories',       (select coalesce(jsonb_agg(c), '[]') from categories c       where c.user_id = auth.uid() and c.updated_at > since),
    'routines',         (select coalesce(jsonb_agg(r), '[]') from routines r         where r.user_id = auth.uid() and r.updated_at > since),
    'todos',            (select coalesce(jsonb_agg(t), '[]') from todos t            where t.user_id = auth.uid() and t.updated_at > since),
    'ddays',            (select coalesce(jsonb_agg(d), '[]') from ddays d            where d.user_id = auth.uid() and d.updated_at > since),
    'reminders',        (select coalesce(jsonb_agg(m), '[]') from reminders m        where m.user_id = auth.uid() and m.updated_at > since),
    'diaries',          (select coalesce(jsonb_agg(y), '[]') from diaries y          where y.user_id = auth.uid() and y.updated_at > since),
    'event_categories', (select coalesce(jsonb_agg(k), '[]') from event_categories k where k.user_id = auth.uid() and k.updated_at > since),
    'events',           (select coalesce(jsonb_agg(e), '[]') from events e           where e.user_id = auth.uid() and e.updated_at > since)
  );
$$;

create or replace function purge_deleted() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from todos            where deleted_at < now() - interval '30 days';
  delete from routines         where deleted_at < now() - interval '30 days';
  delete from categories       where deleted_at < now() - interval '30 days';
  delete from ddays            where deleted_at < now() - interval '30 days';
  delete from reminders        where deleted_at < now() - interval '30 days';
  delete from diaries          where deleted_at < now() - interval '30 days';
  delete from events           where deleted_at < now() - interval '30 days';
  delete from event_categories where deleted_at < now() - interval '30 days';
end $$;
revoke execute on function purge_deleted() from public, anon, authenticated;
