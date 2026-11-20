-- 관리자 패널 (20261121000000_admin.sql): everyone reads the switches and published notices; only admins change them.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated, anon;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000ad01'), ('00000000-0000-0000-0000-00000000ad02');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000ad01');

-- an ordinary user
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ad02');
do $$
begin
  assert not is_admin(), 'not an admin';
  assert (select value from app_config where key = 'crews_enabled') = 'false'::jsonb, 'reads the switches; crews start off';
  assert pg_temp.fails($q$insert into admins (user_id) values (auth.uid())$q$), 'cannot make myself an admin';
  update app_config set value = 'true' where key = 'crews_enabled';
  assert (select value from app_config where key = 'crews_enabled') = 'false'::jsonb, 'cannot change a switch';
  assert pg_temp.fails($q$insert into app_config (key, value) values ('x', '1')$q$), 'cannot add a switch';
  assert pg_temp.fails($q$insert into app_notices (title, body) values ('t', 'b')$q$), 'cannot write a notice';
  assert (select count(*) from admin_broadcasts) = 0, 'cannot see broadcasts';
end $$;

-- the admin
select pg_temp.as_user('00000000-0000-0000-0000-00000000ad01');
do $$
begin
  assert is_admin(), 'is an admin';
  update app_config set value = 'true', updated_at = now() where key = 'crews_enabled';
  assert (select value from app_config where key = 'crews_enabled') = 'true'::jsonb, 'admin turns crews on';
  insert into app_notices (title, body) values ('업데이트', '새 기능이 생겼어요');
  insert into app_notices (title, body, published) values ('초안', '아직 안 보임', false);
  assert (select count(*) from app_notices) = 2, 'admin sees drafts too';
end $$;

-- the ordinary user sees the change and only published notices
select pg_temp.as_user('00000000-0000-0000-0000-00000000ad02');
do $$
begin
  assert (select value from app_config where key = 'crews_enabled') = 'true'::jsonb, 'everyone sees the new switch';
  assert (select count(*) from app_notices) = 1, 'drafts are hidden';
  delete from app_notices;
  assert (select count(*) from app_notices) = 1, 'cannot delete notices';
end $$;

-- signed out (the app reads switches before login)
set role anon;
do $$ begin assert (select count(*) from app_config) >= 2, 'signed-out phones read the switches'; end $$;
reset role;
\o
\echo ok admin: switches and notices readable by all, writable by admins only
