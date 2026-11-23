-- 구글 일정의 나머지 항목 · 실시간 (2026-11-23, 이용자 요청: 구글 캘린더의 작성 항목이 립마크에서도 그대로 양방향).
-- Supabase SQL Editor에서 실행 (20261126000000 다음). 여러 번 실행해도 안전하다.

-- 알림 여러 개 (분, 시작 전), 참석자, 시간대, 첨부파일(보기만), 반복 일정의 한 회차를 따로 고친 일정 표시
alter table events add column if not exists alarms jsonb;
alter table events add column if not exists attendees jsonb;
alter table events add column if not exists time_zone text check (char_length(time_zone) <= 64);
alter table events add column if not exists attachments jsonb;
-- "반복 일정 id|날짜": 그 반복의 그날 회차를 고친 것 (구글에서는 반복은 그대로 두고 그 회차만 고친다)
alter table events add column if not exists instance_of text check (char_length(instance_of) <= 80);

-- 구글이 바뀌면 바로 알려 주는 연결(캘린더마다, 일주일쯤 가고 서버가 새로 건다)
alter table google_calendars add column if not exists watch_id text;
alter table google_calendars add column if not exists watch_resource text;
alter table google_calendars add column if not exists watch_expires timestamptz;

-- 서버가 일정을 바꾸면 열려 있는 앱이 바로 받도록 (Supabase Realtime)
do $$ begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- 한 사람의 맞추기가 동시에 두 번 돌지 않도록 (구글 알림·앱·타이머가 겹칠 때 같은 일정이 두 번 생기지 않게)
alter table google_accounts add column if not exists sync_lock timestamptz;
alter table google_accounts add column if not exists sync_again boolean not null default false;
