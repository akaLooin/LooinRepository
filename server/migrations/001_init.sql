-- Looin Idle 서버 저장 구조 v1
-- 계정 하나를 게임 규칙 코드(core)의 Account 문서 그대로 jsonb 한 칸에 둔다.
-- 서버는 한 계정을 통째로 읽어 규칙 코드로 바꾸고 통째로 쓰므로, 지금은 이것이 가장 단순하고 안전하다.
-- 검색·순위·운영 조회가 필요해지면 그때 캐릭터·창고를 별도 표로 나눈다(replica/architecture.md 참고).

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  -- 게스트 기기 키의 SHA-256. 원문 키는 저장하지 않는다
  device_hash text not null,
  state jsonb not null,
  -- 낙관적 잠금: 쓸 때마다 +1, 기대한 값이 아니면 쓰지 않는다
  version bigint not null default 0,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 처리한 요청 기록: 같은 요청을 두 번 보내도 한 번만 적용(재전송 대비), 수상한 기록 조사용
create table if not exists commands (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null,
  result jsonb not null default '{}',
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists commands_account_time_idx on commands (account_id, created_at desc);
create index if not exists commands_flagged_idx on commands (created_at desc) where flagged;
