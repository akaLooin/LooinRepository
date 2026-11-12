-- 우리만의 기능 (20261112000000_my_features.sql): 디데이 당일 포함, 사진 신고, 여러 날 할 일.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a7'), ('00000000-0000-0000-0000-0000000000a8');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
insert into categories (id, user_id, title, visibility, sort_order) values ('1e000000-0000-0000-0000-000000000001', auth.uid(), 'trip', 'private', 1);
do $$
begin
  insert into todos (id, user_id, category_id, title, date, end_date) values
    ('2e000000-0000-0000-0000-000000000001', auth.uid(), '1e000000-0000-0000-0000-000000000001', 'Jeju', '2026-11-03', '2026-11-07');
  assert (select end_date from todos where id = '2e000000-0000-0000-0000-000000000001') = '2026-11-07', 'a multi-day to-do keeps its end';
  assert pg_temp.fails($q$insert into todos (id, user_id, category_id, title, date, end_date) values
    (gen_random_uuid(), auth.uid(), '1e000000-0000-0000-0000-000000000001', 'bad', '2026-11-03', '2026-11-03')$q$), 'the end is after the start';
  assert pg_temp.fails($q$insert into todos (id, user_id, category_id, title, date, end_date) values
    (gen_random_uuid(), auth.uid(), '1e000000-0000-0000-0000-000000000001', 'bad', null, '2026-11-03')$q$), '보관함 has no end';
  update todos set end_date = null where id = '2e000000-0000-0000-0000-000000000001';
  insert into ddays (id, user_id, title, type, target_date, include_today) values (gen_random_uuid(), auth.uid(), 'exam', 'fixed', '2026-12-01', true);
  perform report_content('photo', 'todo-photos/00000000-0000-0000-0000-0000000000a8/a.jpg', '스팸이나 광고');
  perform report_content('photo', 'todo-photos/00000000-0000-0000-0000-0000000000a8/a.jpg', '기타');
  assert pg_temp.fails('select count(*) from reports'), 'reports are not readable from the app';
end $$;
reset role;
do $$ begin
  assert (select count(*) from reports) = 1 and (select reason from reports) = '기타', 'one report per person and photo, the last reason kept';
end $$;
\o
\echo ok my features: multi-day to-dos, D-day 당일 포함, photo reports
