-- 푸시 주소 (20261108000300_push.sql): 내 것만 보이고, 같은 폰은 마지막에 로그인한 계정으로 옮겨간다.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b7'), ('00000000-0000-0000-0000-0000000000c7');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b7');
do $$ begin
  perform save_push_token('ExponentPushToken[phone-1]', 'android');
  perform save_push_token('ExponentPushToken[phone-1]', 'android');
  assert (select count(*) from push_tokens) = 1, 'saved once';
  assert pg_temp.fails($q$ insert into push_tokens values ('ExponentPushToken[x-123]', auth.uid(), 'android', now()) $q$), 'only through the function';
  assert (select notify_chat from user_settings where user_id = auth.uid()), 'chat notifications on by default';
end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c7');
do $$ begin
  assert (select count(*) from push_tokens) = 0, 'cannot see another account''s phones';
  perform remove_push_token('ExponentPushToken[phone-1]');
  perform save_push_token('ExponentPushToken[phone-1]', 'android'); -- same phone, signed in as C now
  assert (select count(*) from push_tokens) = 1, 'the phone moved to C';
end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b7');
do $$ begin assert (select count(*) from push_tokens) = 0, 'and is no longer B''s'; end $$;
reset role;
\echo ok push tokens: own only, one per phone, moves with the sign-in
