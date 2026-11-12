-- 우리만의 기능 (2026-11-12, 이용자 요청): 디데이 당일 포함, 여러 날에 걸친 할 일.
-- Supabase SQL Editor에서 실행 (20261109000300 다음). 여러 번 실행해도 안전하다.

-- 디데이 당일 포함: 그날을 1일로 센다 (D+1)
alter table ddays add column if not exists include_today boolean not null default false;

-- 신고 (사진 크게 보기 → 길게 누르기 → 신고하기). 운영자가 대시보드의 표에서 확인한다. 같은 사람이 같은 대상을 한 번만.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('photo','todo','diary','message','person')),
  target text not null check (char_length(target) between 1 and 300),
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (reporter_id, kind, target)
);
alter table reports enable row level security;
revoke all on reports from anon, authenticated;

create or replace function report_content(kind text, target text, reason text) returns void
language sql security definer set search_path = public as $$
  insert into reports (reporter_id, kind, target, reason)
  select auth.uid(), report_content.kind, report_content.target, report_content.reason where auth.uid() is not null
  on conflict (reporter_id, kind, target) do update set reason = excluded.reason, created_at = now();
$$;
revoke execute on function report_content(text, text, text) from public, anon;
grant execute on function report_content(text, text, text) to authenticated;
