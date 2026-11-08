-- 크루 (20261109000200_crews.sql): L makes a crew, P applies and is accepted, S is a stranger.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'), ('00000000-0000-0000-0000-0000000000c3');
update profiles set nickname = 'Leader' where id = '00000000-0000-0000-0000-0000000000c1';
update profiles set nickname = 'Pat' where id = '00000000-0000-0000-0000-0000000000c2';

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into categories (id, user_id, title, visibility, sort_order) values ('1c000000-0000-0000-0000-000000000001', auth.uid(), 'run', 'private', 1);
insert into todos (id, user_id, category_id, title, date, is_done, done_at) values
  ('2c000000-0000-0000-0000-000000000001', auth.uid(), '1c000000-0000-0000-0000-000000000001', 'run 5k', '2026-11-09', true, now()),
  ('2c000000-0000-0000-0000-000000000002', auth.uid(), '1c000000-0000-0000-0000-000000000001', 'stretch', '2026-11-09', false, null);
do $$
declare id uuid;
begin
  assert pg_temp.fails($q$ select create_crew('x', '', null, '1c000000-0000-0000-0000-0000000000ff') $q$), 'only with my own category';
  assert pg_temp.fails($q$ select create_crew('x', '', 'crew-images/someone-else/a.jpg', '1c000000-0000-0000-0000-000000000001') $q$), 'picture from my own folder';
  id := create_crew('Morning runners', 'run every day', null, '1c000000-0000-0000-0000-000000000001');
  assert crew_list()->0->>'name' = 'Morning runners' and (crew_list()->0->>'members')::int = 1, 'listed with the leader as member';
  assert crew_detail(id, '2026-11-09')->'members'->0->>'done_count' = '1', 'done in the shared category this week';
  assert pg_temp.fails($q$ insert into crews (owner_id, name) values (auth.uid(), 'x') $q$), 'tables only through functions';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into categories (id, user_id, title, visibility, sort_order) values ('1c000000-0000-0000-0000-000000000002', auth.uid(), 'gym', 'private', 1);
do $$
declare id uuid := (crew_list('morning')->0->>'id')::uuid; d jsonb;
begin
  assert id is not null, 'found by name';
  d := crew_detail(id, '2026-11-09');
  assert d->>'my_status' is null and d->'requests' = 'null'::jsonb, 'not a member, no requests shown';
  assert d->'members'->0->'today' = 'null'::jsonb, 'non-members do not see the shared to-dos';
  assert (d->'members'->0->'category'->>'title') = 'run', 'the shared category name is shown on the ranking';
  assert pg_temp.fails(format('select apply_crew(%L, %L, %L)', id, 'hi', '1c000000-0000-0000-0000-000000000001')), 'apply only with my own category';
  assert apply_crew(id, '같이 뛰어요', '1c000000-0000-0000-0000-000000000002') = 'pending', 'applied';
  assert crew_detail(id, '2026-11-09')->>'my_status' = 'pending', 'shows 참가 신청 중';
  perform cancel_crew_application(id);
  assert crew_detail(id, '2026-11-09')->>'my_status' is null, 'cancelled';
  perform apply_crew(id, '다시 신청', '1c000000-0000-0000-0000-000000000002');
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$
declare id uuid := (crew_list()->0->>'id')::uuid; d jsonb;
begin
  d := crew_detail(id, '2026-11-09');
  assert jsonb_array_length(d->'requests') = 1 and d->'requests'->0->>'message' = '다시 신청', 'the leader sees the request';
  assert my_notifications()->0->>'type' = 'crew_request' and my_notifications()->0->>'crew_name' = 'Morning runners', 'and is notified';
  perform respond_crew(id, '00000000-0000-0000-0000-0000000000c2', true);
  assert (crew_list()->0->>'members')::int = 2, 'two members now';
  assert pg_temp.fails($q$ select respond_crew((crew_list()->0->>'id')::uuid, auth.uid(), true) $q$) = false, 'respond is harmless when nothing is pending';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$
declare id uuid := (crew_list()->0->>'id')::uuid; d jsonb;
begin
  d := crew_detail(id, '2026-11-09');
  assert d->>'my_status' = 'member', 'accepted';
  assert (select array_agg(t->>'title' order by t->>'title') from jsonb_array_elements(d->'members'->0->'today') t) = array['run 5k', 'stretch'],
    'members see each other''s shared to-dos of the day, even from a private category';
  assert my_notifications()->0->>'type' = 'crew_accepted', 'told';
  assert pg_temp.fails(format('select respond_crew(%L, %L, true)', id, '00000000-0000-0000-0000-0000000000c3')), 'only the leader responds';
  assert pg_temp.fails(format('select delete_crew(%L)', id)) = false and (crew_list()->0) is not null, 'only the leader can delete';
  perform leave_crew(id);
  assert crew_detail(id, '2026-11-09')->>'my_status' is null, 'left';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
do $$
declare id uuid := (crew_list()->0->>'id')::uuid;
begin
  assert jsonb_array_length(crew_detail(id, '2026-11-09')->'members') = 1, 'a stranger sees the ranking';
  assert crew_detail(id, '2026-11-09')->'members'->0->'today' = 'null'::jsonb, 'but not the to-dos';
  assert (select count(*) from todos) = 0, 'and no rows from the tables';
end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin perform delete_crew((crew_list()->0->>'id')::uuid); assert jsonb_array_length(crew_list()) = 0, 'deleted'; end $$;
reset role;
\echo ok crews: create, list, apply/cancel, leader sees and accepts, members see shared to-dos, leave, delete
