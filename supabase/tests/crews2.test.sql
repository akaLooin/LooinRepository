-- 크루 2차 (20261109000300_crews2.sql): recruiting, edit, my crews, crew home, crew chat.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2'), ('00000000-0000-0000-0000-0000000000d3');
update profiles set nickname = 'Owner2' where id = '00000000-0000-0000-0000-0000000000d1';
update profiles set nickname = 'Mia' where id = '00000000-0000-0000-0000-0000000000d2';

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
insert into categories (id, user_id, title, visibility, sort_order) values ('1d000000-0000-0000-0000-000000000001', auth.uid(), 'water', 'private', 1);
insert into todos (id, user_id, category_id, title, date, is_done, done_at) values
  ('2d000000-0000-0000-0000-000000000001', auth.uid(), '1d000000-0000-0000-0000-000000000001', 'drink 2L', '2026-11-09', true, now());
do $$
declare id uuid;
begin
  id := create_crew('Water club', 'drink', null, '1d000000-0000-0000-0000-000000000001');
  perform update_crew(id, 'Water club 2', 'more water', null);
  assert crew_detail(id, '2026-11-09')->>'name' = 'Water club 2', 'edited';
  assert (crew_detail(id, '2026-11-09')->>'recruiting')::boolean, 'recruiting at first';
  perform set_crew_recruiting(id, false);
  assert my_crews()->0->>'name' = 'Water club 2', 'my crews for the home chips';
  assert crew_range(id, '2026-11-01', '2026-11-30')->'todos'->0->>'title' = 'drink 2L', 'crew home has the shared to-dos';
  assert pg_temp.fails(format('select send_crew_message(%L, gen_random_uuid(), %L, %L)', id, 'text', '')), 'no empty text';
  perform send_crew_message(id, '5d000000-0000-0000-0000-000000000001', 'text', '안녕하세요');
  assert jsonb_array_length(my_crew_rooms()) = 1 and my_crew_rooms()->0->>'unread' = '0', 'my own message is read';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
insert into categories (id, user_id, title, visibility, sort_order) values ('1d000000-0000-0000-0000-000000000002', auth.uid(), 'mine', 'private', 1);
do $$
declare id uuid := (crew_list('water')->0->>'id')::uuid;
begin
  assert (crew_list('water')->0->>'recruiting')::boolean = false, 'listed as not recruiting';
  assert pg_temp.fails(format('select apply_crew(%L, %L, %L)', id, 'hi', '1d000000-0000-0000-0000-000000000002')), 'no applying while recruiting is stopped';
  assert crew_range(id, '2026-11-01', '2026-11-30') is null and crew_chat(id) is null, 'not a member: no crew home, no chat';
  assert pg_temp.fails(format('select send_crew_message(%L, gen_random_uuid(), %L, %L)', id, 'text', 'x')), 'cannot post';
  assert pg_temp.fails(format('select update_crew(%L, %L, %L, null)', id, 'mine now', '')), 'only the leader edits';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ begin perform set_crew_recruiting((my_crews()->0->>'id')::uuid, true); end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
do $$ begin perform apply_crew((crew_list('water')->0->>'id')::uuid, 'hi', '1d000000-0000-0000-0000-000000000002'); end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ begin perform respond_crew((my_crews()->0->>'id')::uuid, '00000000-0000-0000-0000-0000000000d2', true); end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
do $$
declare id uuid := (my_crews()->0->>'id')::uuid; ch jsonb;
begin
  assert (select count(*) from jsonb_array_elements(crew_range(id, '2026-11-01', '2026-11-30')->'members')) = 2, 'both members on the crew home';
  assert crew_range(id, '2026-11-01', '2026-11-30')->'todos'->0->>'title' = 'drink 2L', 'the leader''s shared private category shows';
  ch := crew_chat(id);
  assert ch->'messages'->0->'sender'->>'nickname' = 'Owner2' and (ch->'messages'->0->>'mine')::boolean = false, 'chat with sender names';
  assert (my_crew_rooms()->0->>'unread')::int = 0, 'messages from before joining are not unread';
  perform send_crew_message(id, '5d000000-0000-0000-0000-000000000002', 'sticker', 'clover.best');
  perform mark_crew_read(id);
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ begin
  assert (my_crew_rooms()->0->>'unread')::int = 1 and my_crew_rooms()->0->'last'->>'nickname' = 'Mia', 'the leader has one unread, from Mia';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
do $$ begin
  assert jsonb_array_length(my_crews()) = 0 and jsonb_array_length(my_crew_rooms()) = 0, 'a stranger has no crews or rooms';
  assert pg_temp.fails($q$ select count(*) from crew_messages $q$), 'and cannot read the table';
end $$;
reset role;
\echo ok crews 2: edit, recruiting, my crews, crew home, crew chat and unread
