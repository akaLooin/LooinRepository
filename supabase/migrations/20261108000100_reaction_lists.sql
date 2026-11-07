-- 반응 목록: 친구 홈의 할 일·일기마다 누가 무엇으로 반응했는지(수 대신 목록), 그리고 내 할 일에 받은 반응.
-- Supabase SQL Editor에서 실행 (20261108000000_friends 다음). 여러 번 실행해도 안전하다.

-- friend_range는 같은 모양에 reaction_count / my_reaction 대신 reactions: [{kind, value, mine}]를 돌려준다.
drop function if exists friend_range(uuid, date, date);
create or replace function friend_range(uid uuid, from_day date, to_day date) returns jsonb
language sql stable security definer set search_path = public as $$
  with cats as (
    select c.id, c.title, c.color, c.sort_order, c.ended_at from categories c
    where c.user_id = uid and can_see_category(c.id, auth.uid())
  ), ts as (
    select t.id, t.category_id, t.title, t.date, t.sort_order, t.is_done, t.done_at,
           case when t.memo_is_private then '' else t.memo end as memo,
           t.photo_path, t.timer_seconds, t.routine_id, t.routine_date, t.is_skipped, t.created_at,
           (select coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'value', r.value, 'mine', r.user_id = auth.uid())
                                      order by r.created_at), '[]')
            from reactions r where r.todo_id = t.id and not is_blocked(r.user_id, auth.uid())) as reactions
    from todos t join cats on cats.id = t.category_id
    where t.user_id = uid and t.deleted_at is null and t.date between from_day and to_day
  ), rs as (
    select r.id, r.category_id, r.title, r.start_date, r.end_date, r.repeat_type, r.interval_days, r.weekdays,
           r.month_days, r.year_month, r.year_day, r.time_of_day, r.manual_add, r.sort_order
    from routines r join cats on cats.id = r.category_id
    where r.user_id = uid and r.deleted_at is null and r.start_date <= to_day and (r.end_date is null or r.end_date >= from_day)
  ), ds as (
    select d.id, d.date, d.emoji, d.body, d.background_color, d.image_paths,
           (select coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'value', r.value, 'mine', r.user_id = auth.uid())
                                      order by r.created_at), '[]')
            from reactions r where r.diary_id = d.id and not is_blocked(r.user_id, auth.uid())) as reactions
    from diaries d
    where d.user_id = uid and d.date between from_day and to_day and can_see_diary(d.id, auth.uid())
  )
  select case when person(uid) is null then null else jsonb_build_object(
    'person', person(uid),
    'categories', (select coalesce(jsonb_agg(cats order by sort_order), '[]') from cats),
    'todos', (select coalesce(jsonb_agg(ts), '[]') from ts),
    'routines', (select coalesce(jsonb_agg(rs), '[]') from rs),
    'diaries', (select coalesce(jsonb_agg(ds), '[]') from ds)) end
$$;

revoke execute on function friend_range(uuid, date, date) from public, anon;
grant execute on function friend_range(uuid, date, date) to authenticated;

-- 내 홈: 날짜 범위 안 내 할 일에 받은 반응 (차단한 사람 것은 빠짐). [{todo_id, kind, value, nickname}]
create or replace function reactions_on_mine(from_day date, to_day date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('todo_id', r.todo_id, 'kind', r.kind, 'value', r.value, 'nickname', p.nickname)
                            order by r.created_at), '[]')
  from reactions r
  join todos t on t.id = r.todo_id
  join profiles p on p.id = r.user_id
  where r.owner_id = auth.uid() and t.user_id = auth.uid() and t.date between from_day and to_day
    and not is_blocked(r.user_id, auth.uid())
$$;
revoke execute on function reactions_on_mine(date, date) from public, anon;
grant execute on function reactions_on_mine(date, date) to authenticated;
