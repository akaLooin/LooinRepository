-- 일정 (20261118000000_events.sql): own rows only, time rules, pulled by sync, old multi-day to-dos moved over.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1'), ('00000000-0000-0000-0000-0000000000b2');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  insert into events (id, user_id, title, start_date, end_date, all_day, start_time, end_time, color, alarm_minutes) values
    ('3e000000-0000-0000-0000-000000000001', auth.uid(), '회의', '2026-11-18', '2026-11-18', false, '08:30', '09:30', '#00C896', 30),
    ('3e000000-0000-0000-0000-000000000002', auth.uid(), '여행', '2026-11-24', '2026-11-27', true, null, null, '#3DA5F4', null),
    ('3e000000-0000-0000-0000-000000000003', auth.uid(), '밤샘', '2026-11-18', '2026-11-19', false, '22:00', '02:00', '#3DA5F4', null);
  assert pg_temp.fails($q$insert into events (id, user_id, title, start_date, end_date, all_day, start_time, end_time) values
    (gen_random_uuid(), auth.uid(), 'x', '2026-11-18', '2026-11-18', false, '10:00', '09:00')$q$), 'a one-day event ends after it starts';
  assert pg_temp.fails($q$insert into events (id, user_id, title, start_date, end_date, all_day) values
    (gen_random_uuid(), auth.uid(), 'x', '2026-11-18', '2026-11-17', true)$q$), 'the last day is not before the first';
  assert pg_temp.fails($q$insert into events (id, user_id, title, start_date, end_date, all_day) values
    (gen_random_uuid(), auth.uid(), 'x', '2026-11-18', '2026-11-18', false)$q$), 'a timed event has times';
  assert pg_temp.fails($q$insert into events (id, user_id, title, start_date, end_date, all_day, color) values
    (gen_random_uuid(), auth.uid(), 'x', '2026-11-18', '2026-11-18', true, 'red')$q$), 'colours are #RRGGBB';
  assert pg_temp.fails($q$insert into events (id, user_id, title, start_date, end_date, all_day) values
    (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2', 'x', '2026-11-18', '2026-11-18', true)$q$), 'no events for someone else';
  assert jsonb_array_length(pull_changes('1970-01-01')->'events') = 3, 'sync pulls my events';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
do $$ begin
  assert (select count(*) from events) = 0, 'someone else''s events are invisible';
  assert jsonb_array_length(pull_changes('1970-01-01')->'events') = 0, 'and not pulled';
  update events set title = 'hacked';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into categories (id, user_id, title, color, visibility, sort_order) values ('1f000000-0000-0000-0000-000000000001', auth.uid(), 'trip', '#FF6B81', 'private', 1);
insert into todos (id, user_id, category_id, title, date, end_date) values
  ('2f000000-0000-0000-0000-000000000001', auth.uid(), '1f000000-0000-0000-0000-000000000001', '부산', '2026-12-03', '2026-12-05');
do $$ begin
  assert (select title from events where id = '3e000000-0000-0000-0000-000000000001') = '회의', 'others cannot change my events';
end $$;
reset role;
-- running the migration again moves the multi-day to-do into an event with the same id
\ir ../migrations/20261118000000_events.sql
do $$ begin
  assert (select color from events where id = '2f000000-0000-0000-0000-000000000001') = '#FF6B81', 'an old multi-day to-do became an event in its category colour';
  assert (select all_day and end_date = '2026-12-05' from events where id = '2f000000-0000-0000-0000-000000000001'), 'all day, same days';
  assert (select deleted_at is not null from todos where id = '2f000000-0000-0000-0000-000000000001'), 'and the to-do is gone';
end $$;
\o
\echo ok events: own rows, time rules, pulled by sync, multi-day to-dos moved over
