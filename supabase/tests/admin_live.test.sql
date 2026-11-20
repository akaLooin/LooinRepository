-- 관리자 앱 2 (20261122000000_admin_live.sql): every saved change is logged; nobody writes the log by hand.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated, anon;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000ae01'), ('00000000-0000-0000-0000-00000000ae02');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000ae01');
delete from app_config_history;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ae01');
do $$
begin
  insert into app_config (key, value) values ('texts', '{"tab.home":"메인"}') on conflict (key) do update set value = excluded.value;
  update app_config set value = '{"tab.home":"메인"}' where key = 'texts'; -- same value: no new line
  update app_config set value = '{"tab.home":"시작"}' where key = 'texts';
  assert (select count(*) from app_config_history where key = 'texts') = 2, 'two real changes logged';
  assert (select new_value->>'tab.home' from app_config_history where key = 'texts' order by id desc limit 1) = '시작';
  assert (select old_value->>'tab.home' from app_config_history where key = 'texts' order by id desc limit 1) = '메인';
  assert (select changed_by from app_config_history order by id desc limit 1) = auth.uid(), 'who changed it';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000ae02');
do $$
begin
  assert pg_temp.fails($q$insert into app_config_history (key, new_value) values ('x', '1')$q$), 'nobody writes the log by hand';
  assert pg_temp.fails($q$delete from app_config_history$q$), 'nor deletes it';
  assert (select count(*) from app_config_history) = 2, 'the log is intact';
end $$;

set role anon;
do $$ begin assert (select count(*) from app_config_history) = 2, 'the GitHub copy (no sign-in) reads the log'; end $$;
reset role;
\o
\echo ok admin live: changes logged with before/after, readable for the repository copy, not writable
