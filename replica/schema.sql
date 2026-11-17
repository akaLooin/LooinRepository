-- Looin Idle: 서버 저장 구조 (Postgres / Supabase)
-- 원칙: 게임 규칙은 game/src/core 가 유일한 구현이고, 서버가 같은 코드를 돌려 상태를 바꾼다.
--       클라이언트는 테이블에 직접 쓰지 못한다(RLS는 읽기만 허용, 쓰기는 서버의 service role).
--       자주 통째로 읽고 쓰는 캐릭터 상태는 jsonb, 검색·정렬·제약이 필요한 값은 컬럼으로 둔다.

create extension if not exists pgcrypto;

-- 계정: Supabase auth.users 와 1:1
create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 16),
  coins bigint not null default 0 check (coins >= 0),
  gems integer not null default 0 check (gems >= 0),
  -- 모든 캐릭터 레벨 합. 캐릭터 슬롯 해금 기준이라 서버가 갱신한다.
  family_level integer not null default 0 check (family_level >= 0),
  storage_slots integer not null default 16 check (storage_slots between 0 and 2000),
  -- 계정 공용 진행: 해금한 레시피, 작업판, 우표 등 (core의 AccountProgress 형식)
  progress jsonb not null default '{}',
  -- 낙관적 잠금: 서버가 계정 상태를 바꿀 때마다 +1
  version bigint not null default 0,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_display_name_key on accounts (lower(display_name));

create table characters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  slot smallint not null check (slot between 0 and 15),
  name text not null check (char_length(name) between 1 and 10),
  class_id text not null default 'beginner',
  level integer not null default 1 check (level >= 1),
  map_id text not null default 'town',
  -- 방치 계산 기준 시각(서버 시계). 클라이언트 시각은 절대 쓰지 않는다.
  last_active_at timestamptz not null default now(),
  -- 나머지 전부: 스탯, 가방, 장비, 기술, 특성, 대상, 퀘스트, 모루 등 (core의 Character 형식)
  state jsonb not null,
  state_version integer not null default 1,   -- 저장 형식 버전(마이그레이션용)
  version bigint not null default 0,          -- 낙관적 잠금
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slot)
);
create index characters_account_idx on characters (account_id) where deleted_at is null;
create index characters_map_idx on characters (map_id) where deleted_at is null;

-- 계정 공용 창고: 칸 단위. 같은 아이템은 한 칸에 쌓는다.
create table storage_items (
  account_id uuid not null references accounts(id) on delete cascade,
  item_id text not null,
  qty bigint not null check (qty > 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, item_id)
);

-- 카드 수집(계정 공용)
create table cards (
  account_id uuid not null references accounts(id) on delete cascade,
  card_id text not null,
  copies integer not null check (copies > 0),
  first_at timestamptz not null default now(),
  primary key (account_id, card_id)
);

-- 서버가 처리한 명령 기록: 재전송 방지(idempotency)와 부정 조사용
create table commands (
  id uuid primary key,                       -- 클라이언트가 만든 명령 ID
  account_id uuid not null references accounts(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  kind text not null,                        -- 'afk_claim' | 'play_sync' | 'craft' | 'equip' | ...
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  flagged boolean not null default false,    -- 검증에서 수상하다고 표시된 것
  created_at timestamptz not null default now()
);
create index commands_account_time_idx on commands (account_id, created_at desc);
create index commands_flagged_idx on commands (created_at desc) where flagged;

-- 채팅(월드 채널). 오래된 것은 작업으로 지운다.
create table chat_messages (
  id bigint generated always as identity primary key,
  channel text not null,                     -- 'world:1', 'map:meadow' 등
  account_id uuid not null references accounts(id) on delete cascade,
  author text not null,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index chat_channel_time_idx on chat_messages (channel, created_at desc);

-- 결제 영수증(스토어 결제 검증 후 기록). 같은 영수증은 한 번만.
create table purchases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  store text not null check (store in ('google_play', 'app_store', 'web')),
  product_id text not null,
  store_txn_id text not null,
  amount_minor integer not null check (amount_minor >= 0),  -- 최소 화폐 단위(원, 센트)
  currency char(3) not null,
  status text not null default 'granted' check (status in ('granted', 'refunded')),
  created_at timestamptz not null default now(),
  unique (store, store_txn_id)
);
create index purchases_account_idx on purchases (account_id);

-- 접근 규칙: 본인 것만 읽기. 쓰기 정책은 만들지 않는다 → 클라이언트 쓰기 전부 거부.
alter table accounts enable row level security;
alter table characters enable row level security;
alter table storage_items enable row level security;
alter table cards enable row level security;
alter table commands enable row level security;
alter table chat_messages enable row level security;
alter table purchases enable row level security;

create policy accounts_read on accounts for select using (id = auth.uid());
create policy characters_read on characters for select using (account_id = auth.uid());
create policy storage_read on storage_items for select using (account_id = auth.uid());
create policy cards_read on cards for select using (account_id = auth.uid());
create policy purchases_read on purchases for select using (account_id = auth.uid());
create policy chat_read on chat_messages for select using (auth.role() = 'authenticated');
-- commands 는 읽기 정책도 없음(운영자 전용)

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger accounts_touch before update on accounts for each row execute function touch_updated_at();
create trigger characters_touch before update on characters for each row execute function touch_updated_at();
create trigger storage_touch before update on storage_items for each row execute function touch_updated_at();
