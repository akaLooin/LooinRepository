-- 중요한 날 (2026-11-20, 이용자 요청): 할 일(체크를 꾹)과 일정(강조)에 "중요" 표시. 그날이 캘린더에서 빛난다.
-- Supabase SQL Editor에서 실행 (20261118000000 다음). 여러 번 실행해도 안전하다.
-- 실행 전에는 중요 표시한 할 일·일정이 폰에서 기다렸다가, 실행한 뒤에 올라간다.
alter table todos add column if not exists is_important boolean not null default false;
alter table events add column if not exists important boolean not null default false;
