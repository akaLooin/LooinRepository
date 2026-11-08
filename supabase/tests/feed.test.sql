-- 친구 피드 (20261109000000_feed.sql): 팔로우한 사람의 완료한 할 일·일기만, 공개 범위대로, 최신순, 더 보기.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
grant execute on function pg_temp.as_user(text) to authenticated;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f8'), ('00000000-0000-0000-0000-0000000000e8'), ('00000000-0000-0000-0000-0000000000d8');
update profiles set nickname = 'Feeder' where id = '00000000-0000-0000-0000-0000000000f8';

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f8');
insert into categories (id, user_id, title, visibility, sort_order) values
  ('18000000-0000-0000-0000-000000000001', auth.uid(), 'open', 'followers', 1),
  ('18000000-0000-0000-0000-000000000002', auth.uid(), 'mine', 'private', 2);
insert into todos (id, user_id, category_id, title, date, is_done, done_at, memo, memo_is_private) values
  ('28000000-0000-0000-0000-000000000001', auth.uid(), '18000000-0000-0000-0000-000000000001', 'older', '2026-11-07', true, '2026-11-07 10:00+00', 'm1', false),
  ('28000000-0000-0000-0000-000000000002', auth.uid(), '18000000-0000-0000-0000-000000000001', 'newer', '2026-11-08', true, '2026-11-08 10:00+00', 'secret', true),
  ('28000000-0000-0000-0000-000000000003', auth.uid(), '18000000-0000-0000-0000-000000000001', 'not done', '2026-11-08', false, null, '', false),
  ('28000000-0000-0000-0000-000000000004', auth.uid(), '18000000-0000-0000-0000-000000000002', 'private done', '2026-11-08', true, '2026-11-08 11:00+00', '', false);
insert into diaries (id, user_id, date, body, visibility, created_at) values
  ('38000000-0000-0000-0000-000000000001', auth.uid(), '2026-11-08', 'shared day', 'followers', '2026-11-08 09:00+00'),
  ('38000000-0000-0000-0000-000000000002', auth.uid(), '2026-11-06', 'hidden day', 'private', '2026-11-08 12:00+00');
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e8');
do $$
declare f jsonb;
begin
  assert jsonb_array_length(friend_feed()) = 0, 'nothing before following';
  perform follow('00000000-0000-0000-0000-0000000000f8');
  f := friend_feed();
  assert (select array_agg(e->>'kind' || ':' || coalesce(e->>'title', e->>'body')) from jsonb_array_elements(f) e)
    = array['todo:newer', 'diary:shared day', 'todo:older'], 'done to-dos and shared diaries, newest first: ' || f::text;
  assert f->0->>'memo' = '', 'private memo blank';
  assert f->0->'person'->>'nickname' = 'Feeder' and f->0->'category'->>'title' = 'open', 'who and which category';
  assert jsonb_array_length(friend_feed(null, 1)) = 1, 'page size';
  assert (select array_agg(e->>'title') from jsonb_array_elements(friend_feed('2026-11-08 09:30+00')) e where e->>'kind' = 'todo') = array['older'], 'more: older ones only';
  perform react('todo', '28000000-0000-0000-0000-000000000002', 'sticker', 'clover.best');
  assert friend_feed()->0->'reactions'->0->>'value' = 'clover.best', 'reactions come along';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d8');
do $$ begin assert jsonb_array_length(friend_feed()) = 0, 'a stranger sees nothing'; end $$;
reset role;
\echo ok feed: followed people only, visibility, private memo, newest first, paging, reactions
