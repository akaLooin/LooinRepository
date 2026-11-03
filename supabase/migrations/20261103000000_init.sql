-- 0001 init: todo mate clone, phase 1 (solo features).
-- Source of truth for the design is replica/schema.sql; this file is what runs.
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor once.

-- todo mate 클론: 첫 마이그레이션 (Supabase Postgres)
-- 1단계(혼자 쓰는 기능) 테이블 + 2단계(친구 기능) 테이블은 맨 아래에 따로 둔다.
--
-- 공통 규칙
-- * id는 앱(휴대폰)에서 만든 uuid를 그대로 저장한다. 오프라인에서 만든 항목도 서버와 같은 id를 쓰기 위해서다.
-- * 시각은 timestamptz(UTC). 캘린더의 "그날"은 date 타입(사용자가 보는 날짜 그대로).
-- * 지우기는 deleted_at을 채우는 방식(소프트 삭제). 다른 기기가 동기화할 때 "지워졌다"는 사실을 받아 가야 하기 때문.
--   실제 삭제는 30일 뒤 정리 작업이 한다.
-- * updated_at은 서버 트리거가 매번 now()로 바꾼다. 동기화는 이 값을 기준으로 "마지막 이후 바뀐 것"을 받아 간다.
-- * 접근 권한은 Postgres 행 수준 보안(RLS). 1단계는 본인 것만 읽고 쓸 수 있다.

create extension if not exists pgcrypto;

-- ───────────────────────── 공통 함수 ─────────────────────────

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 공개 범위 4단계 (S06c): 전체 공개, 팔로워 공개, 일부 공개, 나만 보기
-- 테이블마다 같은 check를 쓴다.

-- ───────────────────────── 사용자 ─────────────────────────

-- Supabase Auth의 auth.users 1명당 프로필 1개
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 20),
  bio text not null default '' check (char_length(bio) <= 150),
  avatar_path text,                       -- Storage 'avatars' 버킷 안의 경로
  status_emoji text,                      -- 프로필 옆 이모지 (S03)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- 설정 → 화면 (S12d). 기본값은 사용자 스크린샷의 값.
create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  week_starts_sunday boolean not null default true,
  input_at_top boolean not null default false,
  show_likes_in_feed boolean not null default true,
  use_24h boolean not null default true,
  collapsible_categories boolean not null default false,
  small_todo_text boolean not null default false,
  small_todo_photo boolean not null default false,
  small_todo_memo boolean not null default false,
  double_tap_to_edit boolean not null default true,
  theme text not null default 'dark' check (theme in ('system','light','dark')),
  language text not null default 'system',
  font text not null default 'default',
  feed_memo_line_limit smallint,          -- null = 무제한
  todo_sort text not null default 'done_last'
    check (todo_sort in ('done_last','manual','created')),
  month_calendar_max smallint default 10, -- null = 무제한
  week_calendar_max smallint,             -- null = 무제한
  calendar_category_count smallint not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated before update on user_settings
  for each row execute function set_updated_at();

-- ───────────────────────── 카테고리 (원본의 '목표') ─────────────────────────

create table categories (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 30),
  color text not null default '#00FF7F'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),  -- 사용자가 색상 코드를 직접 입력 (원본과 다른 점)
  visibility text not null default 'followers'
    check (visibility in ('public','followers','partial','private')),
  sort_order double precision not null default 0, -- 드래그 정렬. 사이에 끼울 때 두 값의 중간값을 쓴다
  ended_at timestamptz,                   -- 종료하기: 데이터는 남고 새 할 일 추가만 막힘
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index categories_user_sort on categories (user_id, sort_order) where deleted_at is null;
create index categories_sync on categories (user_id, updated_at);
create trigger categories_updated before update on categories
  for each row execute function set_updated_at();

-- ───────────────────────── 루틴 ─────────────────────────

create table routines (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  start_date date not null,
  end_date date,                          -- null = 없음
  repeat_type text not null default 'daily'
    check (repeat_type in ('daily','interval','weekly','biweekly','monthly','yearly')),
  interval_days smallint check (interval_days between 2 and 365),  -- 간격: n일마다
  weekdays smallint[],                    -- 매주/격주: 0=일 ... 6=토
  month_days smallint[],                  -- 매월: 1~31 (없는 날은 그 달 건너뜀)
  year_month smallint check (year_month between 1 and 12),  -- 매년
  year_day smallint check (year_day between 1 and 31),
  time_of_day time,                       -- null = 없음, 5분 단위
  memo text not null default '',
  manual_add boolean not null default false, -- 수동으로 할 일 추가 (동작은 확인 필요)
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date is null or end_date >= start_date),
  check (repeat_type <> 'interval' or interval_days is not null),
  check (repeat_type not in ('weekly','biweekly') or coalesce(cardinality(weekdays), 0) > 0),
  check (repeat_type <> 'monthly' or coalesce(cardinality(month_days), 0) > 0),
  check (repeat_type <> 'yearly' or (year_month is not null and year_day is not null))
);
create index routines_user_cat on routines (user_id, category_id, sort_order) where deleted_at is null;
create index routines_category on routines (category_id);
create index routines_sync on routines (user_id, updated_at);
create trigger routines_updated before update on routines
  for each row execute function set_updated_at();

-- ───────────────────────── 할 일 ─────────────────────────
-- 루틴의 회차는 앱이 규칙으로 계산해서 보여준다(행이 없음).
-- 사용자가 회차를 체크, 수정, 메모, 이동, 삭제하는 순간 그 회차의 행을 만든다(routine_id + routine_date).

create table todos (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  date date not null,                     -- 이 할 일이 보이는 날
  sort_order double precision not null default 0,
  is_done boolean not null default false,
  done_at timestamptz,
  memo text not null default '',
  memo_is_private boolean not null default false,
  remind_at timestamptz,                  -- 시간 알림
  photo_path text,                        -- 사진 인증, Storage 'todo-photos' 버킷 경로
  timer_seconds integer not null default 0 check (timer_seconds >= 0),
  timer_started_at timestamptz,           -- 타이머가 돌고 있으면 시작 시각. 앱이 꺼져도 시간 계산 가능
  routine_id uuid references routines(id) on delete set null, -- 루틴이 지워져도 지난 기록은 남김
  routine_date date,                      -- 원래 루틴 회차 날짜 (날짜를 옮겨도 그대로)
  is_skipped boolean not null default false, -- 루틴 회차 하나만 삭제
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((routine_id is null) = (routine_date is null)),
  check (not is_done or done_at is not null)
);
-- 같은 루틴 회차가 두 번 생기지 않게 (두 기기에서 동시에 체크해도)
create unique index todos_routine_once on todos (routine_id, routine_date) where routine_id is not null;
create index todos_user_date on todos (user_id, date) where deleted_at is null;
create index todos_category on todos (category_id);
create index todos_sync on todos (user_id, updated_at);
create trigger todos_updated before update on todos
  for each row execute function set_updated_at();

-- ───────────────────────── 디데이, 리마인더, 일기 ─────────────────────────

create table ddays (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 50),
  type text not null default 'fixed' check (type in ('fixed','repeat')),
  target_date date not null,
  repeat_unit text check (repeat_unit in ('yearly','monthly')), -- 반복 타입 세부는 확인 필요
  is_private boolean not null default false,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (type <> 'repeat' or repeat_unit is not null)
);
create index ddays_user_sort on ddays (user_id, sort_order) where deleted_at is null;
create index ddays_sync on ddays (user_id, updated_at);
create trigger ddays_updated before update on ddays
  for each row execute function set_updated_at();

create table reminders (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  time_of_day time not null,              -- 매일 이 시간에 "오늘 할 일" 알림
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index reminders_user_time on reminders (user_id, time_of_day) where deleted_at is null;
create index reminders_sync on reminders (user_id, updated_at);
create trigger reminders_updated before update on reminders
  for each row execute function set_updated_at();

create table diaries (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  emoji text,
  body text not null default '' check (char_length(body) <= 10000),
  visibility text not null default 'private'
    check (visibility in ('public','followers','partial','private')),
  background_color text check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  image_paths text[] not null default '{}', -- Storage 'diary-images' 버킷 경로
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index diaries_one_per_day on diaries (user_id, date) where deleted_at is null;
create index diaries_sync on diaries (user_id, updated_at);
create trigger diaries_updated before update on diaries
  for each row execute function set_updated_at();

-- ───────────────────────── 접근 권한 (1단계: 본인만) ─────────────────────────

alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table categories enable row level security;
alter table routines enable row level security;
alter table todos enable row level security;
alter table ddays enable row level security;
alter table reminders enable row level security;
alter table diaries enable row level security;

create policy own_profile on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy own_settings on user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_categories on categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_routines on routines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_todos on todos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_ddays on ddays for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_reminders on reminders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_diaries on diaries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 할 일이나 루틴이 내 카테고리에만 들어가도록 (남의 카테고리 id를 넣는 것 방지)
create or replace function check_category_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from categories c where c.id = new.category_id and c.user_id = new.user_id) then
    raise exception 'category does not belong to user';
  end if;
  return new;
end $$;
create trigger todos_category_owner before insert or update of category_id on todos
  for each row execute function check_category_owner();
create trigger routines_category_owner before insert or update of category_id on routines
  for each row execute function check_category_owner();

-- 종료된 카테고리에는 새 할 일 추가 금지 (S06b 설명 문구)
create or replace function block_ended_category() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from categories c where c.id = new.category_id and c.ended_at is not null) then
    raise exception 'category is ended';
  end if;
  return new;
end $$;
create trigger todos_block_ended before insert on todos
  for each row execute function block_ended_category();

-- 가입하면 프로필과 설정을 자동으로 만든다
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nickname)
    values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8));
  insert into user_settings (user_id) values (new.id);
  -- 첫 카테고리 하나를 만들어 둔다 (홈이 비어 보이지 않게)
  insert into public.categories (id, user_id, title, color, visibility, sort_order)
    values (gen_random_uuid(), new.id, 'To Do', '#00FF7F', 'followers', 1);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ───────────────────────── 동기화 ─────────────────────────
-- 앱은 로컬 SQLite에 먼저 저장하고, 온라인일 때 아래 두 함수로 서버와 맞춘다.

-- 마지막으로 받은 시각 이후 바뀐 내 행을 모두 돌려준다 (지워진 행 포함).
-- 동시에 커밋 중인 트랜잭션을 놓치지 않으려고 앱은 since에서 몇 초 앞당겨 요청하고, 받은 행은 id로 덮어쓴다.
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
    'diaries',       (select coalesce(jsonb_agg(y), '[]') from diaries y       where y.user_id = auth.uid() and y.updated_at > since)
  );
$$;
-- 보내기(push)는 테이블마다 upsert(insert ... on conflict (id) do update)로 한다.
-- RLS가 본인 행만 허용하므로 별도 함수 없이 Supabase 클라이언트의 upsert를 쓴다.
-- 같은 행을 두 기기가 고치면 나중에 서버에 도착한 쪽이 이긴다 (행 단위 last-write-wins).

-- ───────────────────────── 파일 저장소 ─────────────────────────
-- 버킷: avatars(공개 읽기), todo-photos(비공개), diary-images(비공개)
-- 경로 규칙: {user_id}/{파일 id}.jpg  → 정책은 첫 폴더가 auth.uid()인지 확인
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('todo-photos', 'todo-photos', false),
  ('diary-images', 'diary-images', false)
on conflict (id) do nothing;

create policy own_files_write on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','todo-photos','diary-images')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy own_files_update on storage.objects for update to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
create policy own_files_delete on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
create policy own_files_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' or (storage.foldername(name))[1] = auth.uid()::text);

