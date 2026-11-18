-- 일정 (2026-11-18, 이용자 요청): 할 일과 따로 있는 캘린더 일정. 체크 없음, 카테고리 없음, 시간(또는 종일)과 색.
-- 여러 날 할 일(todos.end_date)은 같은 id의 일정으로 옮긴다.
-- Supabase SQL Editor에서 실행 (20261112000000 다음). 여러 번 실행해도 안전하다.

create table if not exists events (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  start_date date not null,
  end_date date not null,
  all_day boolean not null default false,
  start_time time,
  end_time time,
  color text not null default '#4A90E2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  memo text not null default '' check (char_length(memo) <= 2000),
  alarm_minutes integer check (alarm_minutes between 0 and 40320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date >= start_date),
  check (all_day or (start_time is not null and end_time is not null)),
  check (all_day or end_date > start_date or end_time > start_time)
);
create index if not exists events_user_start on events (user_id, start_date) where deleted_at is null;
create index if not exists events_sync on events (user_id, updated_at);

drop trigger if exists events_updated on events;
create trigger events_updated before update on events
  for each row execute function set_updated_at();

alter table events enable row level security;
drop policy if exists own_events on events;
create policy own_events on events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 동기화: 내 일정도 받아 오기 (나머지는 0001과 같다)
create or replace function pull_changes(since timestamptz)
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'server_time', now(),
    'profiles',      (select coalesce(jsonb_agg(p), '[]') from profiles p      where p.id = auth.uid() and p.updated_at > since),
    'user_settings', (select coalesce(jsonb_agg(s), '[]') from user_settings s where s.user_id = auth.uid() and s.updated_at > since),
    'categories',    (select coalesce(jsonb_agg(c), '[]') from categories c    where c.user_id = auth.uid() and c.updated_at > since),
    'routines',      (select coalesce(jsonb_agg(r), '[]') from routines r      where r.user_id = auth.uid() and r.updated_at > since),
    'todos',         (select coalesce(jsonb_agg(t), '[]') from todos t         where t.user_id = auth.uid() and t.updated_at > since),
    'ddays',         (select coalesce(jsonb_agg(d), '[]') from ddays d         where d.user_id = auth.uid() and d.updated_at > since),
    'reminders',     (select coalesce(jsonb_agg(m), '[]') from reminders m     where m.user_id = auth.uid() and m.updated_at > since),
    'diaries',       (select coalesce(jsonb_agg(y), '[]') from diaries y       where y.user_id = auth.uid() and y.updated_at > since),
    'events',        (select coalesce(jsonb_agg(e), '[]') from events e        where e.user_id = auth.uid() and e.updated_at > since)
  );
$$;

-- 지운 일정도 30일 뒤 정리 (0002의 정리 작업에 추가)
create or replace function purge_deleted() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from todos      where deleted_at < now() - interval '30 days';
  delete from routines   where deleted_at < now() - interval '30 days';
  delete from categories where deleted_at < now() - interval '30 days';
  delete from ddays      where deleted_at < now() - interval '30 days';
  delete from reminders  where deleted_at < now() - interval '30 days';
  delete from diaries    where deleted_at < now() - interval '30 days';
  delete from events     where deleted_at < now() - interval '30 days';
end $$;
revoke execute on function purge_deleted() from public, anon, authenticated;

-- 여러 날 할 일 → 일정 (종일, 카테고리 색). 앱도 같은 id로 옮기므로 두 번 생기지 않는다.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'todos' and column_name = 'end_date') then
    insert into events (id, user_id, title, start_date, end_date, all_day, color, memo)
    select t.id, t.user_id, left(t.title, 100), t.date, t.end_date, true, coalesce(c.color, '#4A90E2'), left(t.memo, 2000)
    from todos t left join categories c on c.id = t.category_id
    where t.end_date is not null and t.date is not null and t.end_date > t.date and t.deleted_at is null and not t.is_skipped
    on conflict (id) do nothing;
    update todos set deleted_at = now() where end_date is not null and deleted_at is null;
  end if;
end $$;
