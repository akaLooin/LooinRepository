-- 구글 캘린더 연동 (20261125000000): the refresh token is never readable by the app; calendars: own, and only
-- selected / is_default can be changed; status shows connected without the token.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000ac01'), ('00000000-0000-0000-0000-00000000ac02');
-- what the server function writes (as the service role)
insert into google_accounts (user_id, email, refresh_token) values ('00000000-0000-0000-0000-00000000ac01', 'me@example.com', 'secret-token');
insert into google_calendars (user_id, calendar_id, summary) values ('00000000-0000-0000-0000-00000000ac01', 'primary', '내 캘린더'), ('00000000-0000-0000-0000-00000000ac02', 'primary', '남의 캘린더');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ac01');
do $$ begin
  assert (select count(*) from google_accounts) = 0, 'the token row is not readable';
  assert (google_status()->>'connected')::boolean, 'status says connected';
  assert google_status()->>'email' = 'me@example.com';
  assert not (google_status() ? 'refresh_token'), 'status has no token';
  assert (select count(*) from google_calendars) = 1, 'own calendars only';
  update google_calendars set selected = true, is_default = true where calendar_id = 'primary';
  assert (select selected from google_calendars where calendar_id = 'primary'), 'can pick a calendar';
  assert pg_temp.fails($q$update google_calendars set sync_token = 'x'$q$), 'cannot touch the sync state';
  assert pg_temp.fails($q$insert into google_accounts (user_id, refresh_token) values (auth.uid(), 'x')$q$), 'cannot write tokens';
  assert pg_temp.fails($q$select * from google_event_links$q$) or (select count(*) from google_event_links) = 0, 'links hidden';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000ac02');
do $$ begin
  assert not (google_status()->>'connected')::boolean, 'not connected';
  update google_calendars set selected = true where user_id = '00000000-0000-0000-0000-00000000ac01';
end $$;
reset role;
do $$ begin
  assert (select count(*) from google_calendars where selected and user_id = '00000000-0000-0000-0000-00000000ac01') = 1, 'someone else cannot pick my calendars';
end $$;
\o
\echo ok google calendar: tokens hidden, own calendars, only picks change
