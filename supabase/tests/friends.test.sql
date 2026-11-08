-- Friends rules (20261108000000_friends.sql). Run by supabase/tests/run.sh on a throwaway database.
-- A owns things at every visibility; B follows A; C is a stranger picked for one "partial" category; D asks to follow.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

create function pg_temp.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false)
$$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
update profiles set nickname = 'Alice', handle = 'alice' where id = '00000000-0000-0000-0000-00000000000a';
update profiles set nickname = 'Bob', handle = 'bob_1' where id = '00000000-0000-0000-0000-00000000000b';
update profiles set nickname = 'Carol', handle = 'carol' where id = '00000000-0000-0000-0000-00000000000c';
update profiles set nickname = 'Dan', handle = 'dan' where id = '00000000-0000-0000-0000-00000000000d';

-- A's things, written the way the app writes them (as A, through the normal tables)
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into categories (id, user_id, title, visibility, sort_order) values
  ('10000000-0000-0000-0000-000000000001', auth.uid(), 'pub', 'public', 1),
  ('10000000-0000-0000-0000-000000000002', auth.uid(), 'fol', 'followers', 2),
  ('10000000-0000-0000-0000-000000000003', auth.uid(), 'part', 'partial', 3),
  ('10000000-0000-0000-0000-000000000004', auth.uid(), 'priv', 'private', 4);
insert into todos (id, user_id, category_id, title, date, memo, memo_is_private, photo_path) values
  ('20000000-0000-0000-0000-000000000001', auth.uid(), '10000000-0000-0000-0000-000000000001', 'pub todo', '2026-11-08', 'open memo', false, null),
  ('20000000-0000-0000-0000-000000000002', auth.uid(), '10000000-0000-0000-0000-000000000002', 'fol todo', '2026-11-08', 'secret memo', true,
   'todo-photos/00000000-0000-0000-0000-00000000000a/p1.jpg'),
  ('20000000-0000-0000-0000-000000000003', auth.uid(), '10000000-0000-0000-0000-000000000003', 'part todo', '2026-11-09', '', false, null),
  ('20000000-0000-0000-0000-000000000004', auth.uid(), '10000000-0000-0000-0000-000000000004', 'priv todo', '2026-11-08', '', false,
   'todo-photos/00000000-0000-0000-0000-00000000000a/p2.jpg'),
  ('20000000-0000-0000-0000-000000000005', auth.uid(), '10000000-0000-0000-0000-000000000001', 'other month', '2026-12-01', '', false, null);
insert into routines (id, user_id, category_id, title, start_date, repeat_type) values
  ('30000000-0000-0000-0000-000000000001', auth.uid(), '10000000-0000-0000-0000-000000000002', 'fol routine', '2026-11-01', 'daily'),
  ('30000000-0000-0000-0000-000000000002', auth.uid(), '10000000-0000-0000-0000-000000000004', 'priv routine', '2026-11-01', 'daily');
insert into diaries (id, user_id, date, body, visibility, emoji, mood_temp) values
  ('40000000-0000-0000-0000-000000000001', auth.uid(), '2026-11-08', 'followers diary', 'followers', 'clover.best', 33),
  ('40000000-0000-0000-0000-000000000002', auth.uid(), '2026-11-09', 'private diary', 'private', null, null);
insert into category_viewers (category_id, viewer_id, owner_id) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', auth.uid());
do $$ begin
  assert pg_temp.fails($q$ insert into category_viewers (category_id, viewer_id, owner_id) values
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b') $q$),
    'cannot add viewers in someone else''s name';
end $$;
reset role;
insert into storage.objects (bucket_id, name) values
  ('todo-photos', '00000000-0000-0000-0000-00000000000a/p1.jpg'),
  ('todo-photos', '00000000-0000-0000-0000-00000000000a/p2.jpg');
\echo ok owner data written

-- B follows A (approval off → accepted at once)
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare r jsonb;
begin
  assert follow('00000000-0000-0000-0000-00000000000a') = 'accepted', 'follow without approval is accepted';
  assert pg_temp.fails($q$ insert into follows values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'accepted') $q$),
    'follows are written only through follow()';
  assert (select count(*) from todos) = 0, 'B cannot read A''s todos from the table';
  assert (select count(*) from categories where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'nor categories';
  r := friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30');
  assert (select array_agg(e->>'title' order by e->>'title') from jsonb_array_elements(r->'categories') e) = array['To Do','fol','pub'],
    'B sees public and followers categories: ' || (r->'categories')::text;
  assert (select array_agg(e->>'title' order by e->>'title') from jsonb_array_elements(r->'todos') e) = array['fol todo','pub todo'],
    'B sees their todos in the month only';
  assert (select e->>'memo' from jsonb_array_elements(r->'todos') e where e->>'title' = 'fol todo') = '', 'private memo is blank';
  assert (select e->>'memo' from jsonb_array_elements(r->'todos') e where e->>'title' = 'pub todo') = 'open memo', 'open memo is sent';
  assert not (r->'todos'->0 ? 'remind_at'), 'alarm times are not sent';
  assert (select array_agg(e->>'title') from jsonb_array_elements(r->'routines') e) = array['fol routine'], 'routines follow their category';
  assert jsonb_array_length(r->'diaries') = 1 and r->'diaries'->0->>'body' = 'followers diary', 'followers diary only';
  assert r->'diaries'->0->>'emoji' = 'clover.best' and (r->'diaries'->0->>'mood_temp')::int = 33, 'mood sticker and 기분 온도 come along';
  assert (r->'person'->>'i_follow') = 'accepted' and (r->'person'->>'followers')::int = 1, 'person shows the follow';
  assert (select count(*) from storage.objects where name like '%p1.jpg') = 1, 'B can read the followers todo photo';
  assert (select count(*) from storage.objects where name like '%p2.jpg') = 0, 'but not the private one';
  perform react('todo', '20000000-0000-0000-0000-000000000002', 'emoji', '👍');
  perform react('todo', '20000000-0000-0000-0000-000000000002', 'emoji', '🔥');  -- changing it keeps one reaction
  assert (select count(*) from reactions) = 1 and (select value from reactions) = '🔥', 'one reaction per person per todo';
  assert pg_temp.fails($q$ select react('todo', '20000000-0000-0000-0000-000000000004', 'emoji', '👍') $q$), 'no reaction on a private todo';
  perform react('diary', '40000000-0000-0000-0000-000000000001', 'emoji', '❤️');
  r := friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30');
  assert (select e->'reactions' from jsonb_array_elements(r->'todos') e where e->>'title' = 'fol todo') = '[{"kind": "emoji", "mine": true, "value": "🔥"}]'::jsonb,
    'friend_range lists the reactions on each todo';
  assert r->'diaries'->0->'reactions'->0->>'value' = '❤️', 'and on the diary';
  assert pg_temp.fails($q$ select react('diary', '40000000-0000-0000-0000-000000000002', 'emoji', '👍') $q$), 'no reaction on a private diary';
  assert (select count(*) from notifications) = 0, 'B cannot read A''s notifications';
end $$;
reset role;
\echo ok follower B sees followers things, reacts, nothing private

-- C: a stranger, picked for the partial category
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare r jsonb;
begin
  r := friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30');
  assert (select array_agg(e->>'title' order by e->>'title') from jsonb_array_elements(r->'categories') e) = array['part','pub'],
    'C sees public and the partial category they were picked for: ' || (r->'categories')::text;
  assert jsonb_array_length(r->'routines') = 0 and jsonb_array_length(r->'diaries') = 0, 'no followers routine or diary';
  assert (select count(*) from storage.objects) = 0, 'C reads no photos';
  assert pg_temp.fails($q$ select react('todo', '20000000-0000-0000-0000-000000000002', 'emoji', '👍') $q$), 'C cannot react to a followers todo';
  assert (select count(*) from reactions) = 0, 'C cannot read B''s reaction to A';
  perform react('todo', '20000000-0000-0000-0000-000000000001', 'emoji', '🙂');
  assert (select count(*) from reactions) = 1, 'C can react to a public todo and sees only their own reaction';
  assert jsonb_array_length(search_people('ali')) = 1, 'search by name';
  assert search_people('bob_')->0->>'handle' = 'bob_1', 'search by ID prefix, _ is literal';
  assert jsonb_array_length(search_people('%')) = 0, 'a bare wildcard finds nobody';
  assert jsonb_array_length(follow_list('00000000-0000-0000-0000-00000000000a', 'followers')) = 1, 'anyone can see A''s followers list';
  assert jsonb_array_length(follow_list('00000000-0000-0000-0000-00000000000a', 'requests')) = 0, 'but not A''s requests';
end $$;
reset role;
\echo ok stranger C sees public and partial only

-- A turns on approval and limits to-do reactions to followers
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update user_settings set follow_approval = true, likes_todo = 'followers' where user_id = auth.uid();
do $$ begin
  assert (select count(*) from notifications where type = 'reaction') = 3, 'A got three reaction notifications (changing one did not add one)';
  assert my_notifications()->0->'actor'->>'nickname' = 'Carol', 'notifications carry the actor';
  assert (select count(*) from reactions) = 3, 'A sees reactions on their things';
  assert jsonb_array_length(reactions_on_mine('2026-11-01', '2026-11-30')) = 3, 'A gets the to-do and diary reactions';
  assert (select count(*) from jsonb_array_elements(reactions_on_mine('2026-11-08', '2026-11-08')) e where e->>'diary_id' is not null) = 1, 'the diary one is marked';
  assert reactions_on_mine('2026-11-01', '2026-11-30')->0->>'nickname' = 'Bob', 'with who sent them';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert pg_temp.fails($q$ select react('todo', '20000000-0000-0000-0000-000000000001', 'emoji', '👍') $q$),
    'likes_todo = followers: a stranger cannot react to a public todo';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  assert follow('00000000-0000-0000-0000-00000000000a') = 'pending', 'approval on → request';
  assert jsonb_array_length(friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30')->'todos') = 1,
    'a pending follower sees public only';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert follow_list(auth.uid(), 'requests')->0->>'nickname' = 'Dan', 'A sees the request';
  perform respond_follow('00000000-0000-0000-0000-00000000000d', true);
  assert (select count(*) from notifications where type = 'follow_request') = 0, 'the request notification goes away';
  assert pg_temp.fails($q$ update notifications set user_id = '00000000-0000-0000-0000-00000000000b' $q$), 'only read_at can change';
  update notifications set read_at = now();
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  assert jsonb_array_length(friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30')->'todos') = 2,
    'accepted → followers todos too';
  assert (select count(*) from notifications where type = 'follow_accepted') = 1, 'D is told';
  perform unfollow('00000000-0000-0000-0000-00000000000a');
  assert jsonb_array_length(friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30')->'todos') = 1, 'unfollowed';
end $$;
reset role;
\echo ok approval, requests, accept, unfollow

-- A hides from search, then blocks B
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update user_settings set searchable = false where user_id = auth.uid();
do $$ begin perform block('00000000-0000-0000-0000-00000000000b'); end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30') is null, 'blocked: nothing at all';
  assert person('00000000-0000-0000-0000-00000000000a') is null, 'not even the profile';
  assert (select count(*) from follows) = 0 and (select count(*) from reactions) = 0, 'follows and reactions are gone';
  assert pg_temp.fails($q$ select follow('00000000-0000-0000-0000-00000000000a') $q$), 'cannot follow again';
  assert (select count(*) from storage.objects) = 0, 'no photos';
  assert (select count(*) from blocks) = 0, 'B does not see the block row';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert jsonb_array_length(search_people('ali')) = 0, 'searchable off hides A from search';
  assert pg_temp.fails($q$ select is_follower('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a') $q$),
    'helpers that could reveal who follows or blocks whom are not callable';
  assert pg_temp.fails($q$ select react('todo', '20000000-0000-0000-0000-000000000001', 'emoji', '👍') $q$),
    'likes_todo = followers also stops changing an earlier reaction';
  assert person('00000000-0000-0000-0000-00000000000a')->>'nickname' = 'Alice', 'the profile still opens by link';
end $$;
reset role;

-- signed out: nothing
set role anon;
select pg_temp.as_user('');
do $$ begin
  assert pg_temp.fails($q$ select friend_range('00000000-0000-0000-0000-00000000000a', '2026-11-01', '2026-11-30') $q$), 'anon cannot call';
  assert pg_temp.fails($q$ select count(*) from follows $q$), 'anon cannot read follows';
end $$;
reset role;
\echo ok blocking, search opt-out, signed out
