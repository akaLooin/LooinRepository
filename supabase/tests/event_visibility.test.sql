-- 일정 공개 범위 (20261129000000_event_visibility.sql)
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
grant execute on function pg_temp.as_user(text) to authenticated;

insert into auth.users (id) values ('00000000-0000-0000-0000-0000e0e0e001'), ('00000000-0000-0000-0000-0000e0e0e002'), ('00000000-0000-0000-0000-0000e0e0e003');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000e0e0e001');
insert into event_categories (id, user_id, title, visibility) values
  ('e0c00000-0000-0000-0000-000000000001', auth.uid(), 'google work', 'private'),
  ('e0c00000-0000-0000-0000-000000000002', auth.uid(), 'open', 'public'),
  ('e0c00000-0000-0000-0000-000000000003', auth.uid(), 'fol', 'followers'),
  ('e0c00000-0000-0000-0000-000000000004', auth.uid(), 'fri', 'friends');
insert into event_categories (id, user_id, title) values ('e0c00000-0000-0000-0000-000000000005', auth.uid(), 'default');
insert into events (id, user_id, title, start_date, end_date, all_day, color, memo, location, category_id) values
  ('e0e00000-0000-0000-0000-000000000001', auth.uid(), 'secret', '2026-12-02', '2026-12-02', true, '#111111', 'm', 'home', 'e0c00000-0000-0000-0000-000000000001'),
  ('e0e00000-0000-0000-0000-000000000002', auth.uid(), 'concert', '2026-12-03', '2026-12-03', true, '#111111', 'private memo', 'hall', 'e0c00000-0000-0000-0000-000000000002'),
  ('e0e00000-0000-0000-0000-000000000003', auth.uid(), 'for followers', '2026-12-04', '2026-12-04', true, '#111111', '', '', 'e0c00000-0000-0000-0000-000000000003'),
  ('e0e00000-0000-0000-0000-000000000004', auth.uid(), 'for friends', '2026-12-05', '2026-12-05', true, '#111111', '', '', 'e0c00000-0000-0000-0000-000000000004'),
  ('e0e00000-0000-0000-0000-000000000005', auth.uid(), 'default cat', '2026-12-06', '2026-12-06', true, '#111111', '', '', 'e0c00000-0000-0000-0000-000000000005'),
  ('e0e00000-0000-0000-0000-000000000006', auth.uid(), 'no cat', '2026-12-06', '2026-12-06', true, '#111111', '', '', null);
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000e0e0e003');  -- a stranger
do $$ declare r jsonb; begin
  r := friend_events('00000000-0000-0000-0000-0000e0e0e001', '2026-12-01', '2026-12-31');
  assert (select array_agg(e->>'title') from jsonb_array_elements(r) e) = array['concert'], 'a stranger sees public only: ' || r::text;
  assert not (r->0 ? 'memo') and not (r->0 ? 'location'), 'no memo or place';
  assert (select count(*) from events) = 0, 'not from the table';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000e0e0e002');
do $$ declare r jsonb; begin
  perform follow('00000000-0000-0000-0000-0000e0e0e001');
  r := friend_events('00000000-0000-0000-0000-0000e0e0e001', '2026-12-01', '2026-12-31');
  assert (select array_agg(e->>'title' order by e->>'title') from jsonb_array_elements(r) e) = array['concert','for followers'], 'a follower: ' || r::text;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000e0e0e001', false);
  perform follow('00000000-0000-0000-0000-0000e0e0e002');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000e0e0e002', false);
  r := friend_events('00000000-0000-0000-0000-0000e0e0e001', '2026-12-01', '2026-12-31');
  assert (select array_agg(e->>'title' order by e->>'title') from jsonb_array_elements(r) e) = array['concert','for followers','for friends'],
    'a friend; never private, the default (private) or no category: ' || r::text;
end $$;
reset role;
\o
\echo ok event visibility: private by default, public / followers / friends, no memo or place
