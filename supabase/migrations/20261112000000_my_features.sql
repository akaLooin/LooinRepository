-- 우리만의 기능 (2026-11-12, 이용자 요청): 디데이 당일 포함, 여러 날에 걸친 할 일.
-- Supabase SQL Editor에서 실행 (20261109000300 다음). 여러 번 실행해도 안전하다.

-- 디데이 당일 포함: 그날을 1일로 센다 (D+1)
alter table ddays add column if not exists include_today boolean not null default false;
