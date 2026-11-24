-- 친구 = 서로 팔로우, 독려 (20261128000000_friends_mutual.sql)
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000c1a1'), ('00000000-0000-0000-0000-00000000c2a2');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000c1a1');
insert into categories (id, user_id, title, visibility, sort_order) values ('c1a00000-0000-0000-0000-000000000001', auth.uid(), 'open', 'public', 1);
insert into todos (id, user_id, category_id, title, date, sort_order, is_done, done_at) values
  ('c1b00000-0000-0000-0000-000000000001', auth.uid(), 'c1a00000-0000-0000-0000-000000000001', 'undone', (now() at time zone 'Asia/Seoul')::date, 1, false, null),
  ('c1b00000-0000-0000-0000-000000000002', auth.uid(), 'c1a00000-0000-0000-0000-000000000001', 'done', (now() at time zone 'Asia/Seoul')::date, 2, true, now()),
  ('c1b00000-0000-0000-0000-000000000003', auth.uid(), 'c1a00000-0000-0000-0000-000000000001', 'later', (now() at time zone 'Asia/Seoul')::date + 3, 3, false, null);
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000c2a2');
do $$ begin
  perform follow('00000000-0000-0000-0000-00000000c1a1');
  assert pg_temp.fails($q$ select cheer('c1b00000-0000-0000-0000-000000000001') $q$), 'a one-way follower cannot cheer';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', false);
  perform follow('00000000-0000-0000-0000-00000000c2a2');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c2a2', false);
  assert cheer('c1b00000-0000-0000-0000-000000000001') = 'sent', 'a friend cheers an unfinished to-do';
  assert cheer('c1b00000-0000-0000-0000-000000000001') = 'already', 'once a day';
  assert pg_temp.fails($q$ select cheer('c1b00000-0000-0000-0000-000000000002') $q$), 'not a finished one';
  assert pg_temp.fails($q$ select cheer('c1b00000-0000-0000-0000-000000000003') $q$), 'not a future one';
  assert (search_people('')::text is not null), 'still works';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000c1a1');
do $$ begin
  assert (select count(*) from notifications where user_id = '00000000-0000-0000-0000-00000000c1a1' and type = 'cheer') = 1, 'one cheer notice';
end $$;
\o
\echo ok friends: mutual follow = friends, reactions and cheers between friends only, one cheer a day
