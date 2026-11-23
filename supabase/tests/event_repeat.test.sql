-- 일정 반복 · 일정 카테고리 (20261124000000): own categories only, events keep working, sync pulls them.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000ab01'), ('00000000-0000-0000-0000-00000000ab02');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ab01');
do $$
begin
  insert into event_categories (id, user_id, title, color, sort_order) values ('4e000000-0000-0000-0000-000000000001', auth.uid(), '수업', '#3DA5F4', 1);
  assert pg_temp.fails($q$insert into event_categories (id, user_id, title) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000ab02', 'x')$q$), 'no categories for someone else';
  assert pg_temp.fails($q$insert into event_categories (id, user_id, title, color) values (gen_random_uuid(), auth.uid(), 'x', 'blue')$q$), 'colours are #RRGGBB';
  insert into events (id, user_id, title, start_date, end_date, all_day, category_id, repeat, skip_dates) values
    ('4f000000-0000-0000-0000-000000000001', auth.uid(), '영어', '2026-11-24', '2026-11-24', true, '4e000000-0000-0000-0000-000000000001',
     '{"kind":"weekly","weekdays":[2,4]}', '["2026-12-01"]');
  insert into events (id, user_id, title, start_date, end_date, all_day) values ('4f000000-0000-0000-0000-000000000002', auth.uid(), '옛 일정', '2026-11-24', '2026-11-24', true);
  assert (select skip_dates from events where id = '4f000000-0000-0000-0000-000000000002') = '[]'::jsonb, 'an old-style event gets no skipped days';
  assert jsonb_array_length(pull_changes('1970-01-01')->'event_categories') = 1, 'sync pulls my event categories';
  assert jsonb_array_length(pull_changes('1970-01-01')->'events') = 2, 'and my events';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ab02');
do $$ begin
  assert (select count(*) from event_categories) = 0, 'someone else''s event categories are invisible';
  assert jsonb_array_length(pull_changes('1970-01-01')->'event_categories') = 0, 'and not pulled';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ab01');
do $$ begin
  delete from event_categories where id = '4e000000-0000-0000-0000-000000000001';
  assert (select category_id from events where id = '4f000000-0000-0000-0000-000000000001') is null, 'removing a category leaves its events without one';
end $$;
reset role;
\o
\echo ok event repeat + categories
