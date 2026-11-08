-- 친구 피드 (둘러보기): 내가 팔로우하는 사람들이 완료한 할 일과 일기를 최신순으로.
-- Supabase SQL Editor에서 실행 (20261108000300 다음). 여러 번 실행해도 안전하다.
-- 보이는 범위는 친구 홈과 같다: 카테고리·일기 공개 범위, 차단, 비공개 메모를 함수가 적용한다.

create index if not exists todos_done_feed on todos (user_id, done_at desc) where is_done and deleted_at is null;
create index if not exists diaries_feed on diaries (user_id, created_at desc) where deleted_at is null;

-- before: 이 시각보다 이전 것(더 보기), max_rows: 한 번에 몇 개
create or replace function friend_feed(before timestamptz default null, max_rows int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with friends as (
    select f.followee_id as id from follows f
    where f.follower_id = auth.uid() and f.status = 'accepted' and not is_blocked(f.followee_id, auth.uid())
  ), items as (
    select 'todo' as kind, t.id, t.user_id, t.done_at as at, jsonb_build_object(
      'title', t.title, 'memo', case when t.memo_is_private then '' else t.memo end, 'photo_path', t.photo_path, 'date', t.date,
      'category', jsonb_build_object('title', c.title, 'color', c.color)) as body
    from todos t join friends on friends.id = t.user_id join categories c on c.id = t.category_id
    where t.is_done and t.done_at is not null and t.deleted_at is null and t.date is not null
      and (before is null or t.done_at < before) and can_see_category(t.category_id, auth.uid())
    union all
    select 'diary', d.id, d.user_id, d.created_at, jsonb_build_object(
      'emoji', d.emoji, 'body', d.body, 'image_paths', d.image_paths, 'background_color', d.background_color, 'date', d.date)
    from diaries d join friends on friends.id = d.user_id
    where d.deleted_at is null and (before is null or d.created_at < before) and can_see_diary(d.id, auth.uid())
  ), page as (
    select * from items order by at desc limit least(greatest(max_rows, 1), 100)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', page.kind, 'id', page.id, 'at', page.at, 'person', person_json(p, auth.uid()),
    'reactions', (select coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'value', r.value, 'mine', r.user_id = auth.uid()) order by r.created_at), '[]')
                  from reactions r where (r.todo_id = page.id or r.diary_id = page.id) and not is_blocked(r.user_id, auth.uid()))
  ) || page.body order by page.at desc), '[]')
  from page join profiles p on p.id = page.user_id
  where auth.uid() is not null
$$;
revoke execute on function friend_feed(timestamptz, int) from public, anon;
grant execute on function friend_feed(timestamptz, int) to authenticated;
