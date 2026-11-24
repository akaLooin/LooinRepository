-- 친구 = 서로 팔로우 (2026-11-24, 이용자 요청).
-- Supabase SQL Editor에서 실행 (20261127000000 다음). 여러 번 실행해도 안전하다.
--
-- * 한쪽만 팔로우 = 팔로워: 공개 범위 안에서 캘린더(할 일·일기)를 보기만 한다.
-- * 서로 팔로우(둘 다 수락됨) = 친구: 반응을 남길 수 있고, 아직 안 끝난 할 일을 "독려"할 수 있다.
-- * 독려는 할 일 하나에 한 사람이 하루 한 번. 받는 사람에게 알림(+푸시)으로 간다.

create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and followee_id = b and status = 'accepted')
     and exists (select 1 from follows where follower_id = b and followee_id = a and status = 'accepted')
$$;
revoke execute on function are_friends(uuid, uuid) from public, anon, authenticated;

-- 사람 정보에 "친구인지"를 더한다
create or replace function person_json(p profiles, me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'nickname', p.nickname, 'handle', p.handle, 'bio', p.bio,
    'avatar_path', p.avatar_path, 'status_emoji', p.status_emoji,
    'i_follow', (select status from follows where follower_id = me and followee_id = p.id),
    'follows_me', (select status from follows where follower_id = p.id and followee_id = me),
    'is_friend', are_friends(me, p.id),
    'blocked_by_me', exists (select 1 from blocks where blocker_id = me and blocked_id = p.id))
$$;
revoke execute on function person_json(profiles, uuid) from public, anon, authenticated;

-- 반응은 친구만 (자기 것은 그대로 가능)
create or replace function react(target_type text, target uuid, kind text, value text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  owner uuid;
  audience text;
  is_new boolean;
begin
  if me is null then raise exception 'not allowed'; end if;
  if target_type = 'todo' then
    select t.user_id into owner from todos t where t.id = target and t.deleted_at is null and t.date is not null and can_see_category(t.category_id, me);
    select s.likes_todo into audience from user_settings s where s.user_id = owner;
  elsif target_type = 'diary' then
    select d.user_id into owner from diaries d where d.id = target and can_see_diary(d.id, me);
    select s.likes_diary into audience from user_settings s where s.user_id = owner;
  end if;
  if owner is null or (owner <> me and (not are_friends(owner, me) or not audience_allows(owner, coalesce(audience, 'all'), me))) then
    raise exception 'not allowed';
  end if;
  if target_type = 'todo' then
    is_new := not exists (select 1 from reactions where user_id = me and todo_id = target);
    insert into reactions (user_id, owner_id, todo_id, kind, value) values (me, owner, target, kind, value)
      on conflict (user_id, todo_id) where todo_id is not null do update set kind = excluded.kind, value = excluded.value;
  else
    is_new := not exists (select 1 from reactions where user_id = me and diary_id = target);
    insert into reactions (user_id, owner_id, diary_id, kind, value) values (me, owner, target, kind, value)
      on conflict (user_id, diary_id) where diary_id is not null do update set kind = excluded.kind, value = excluded.value;
  end if;
  if owner <> me and is_new then
    insert into notifications (user_id, actor_id, type, todo_id, diary_id, value)
      values (owner, me, 'reaction', case when target_type = 'todo' then target end,
              case when target_type = 'diary' then target end, value);
  end if;
end $$;

-- 독려 알림
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('follow_request','follow','follow_accepted','reaction','crew_request','crew_accepted','cheer'));

-- 친구의 아직 안 끝난 할 일을 독려: 'sent' 또는 'already'(오늘 이미 보냄)
create or replace function cheer(target uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  owner uuid;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if me is null then raise exception 'not allowed'; end if;
  select t.user_id into owner from todos t
    where t.id = target and t.deleted_at is null and t.date is not null and not t.is_done and t.date <= today
      and can_see_category(t.category_id, me);
  if owner is null or owner = me or not are_friends(owner, me) then raise exception 'not allowed'; end if;
  if exists (select 1 from notifications where actor_id = me and type = 'cheer' and todo_id = target
             and (created_at at time zone 'Asia/Seoul')::date = today) then
    return 'already';
  end if;
  insert into notifications (user_id, actor_id, type, todo_id) values (owner, me, 'cheer', target);
  return 'sent';
end $$;
revoke execute on function cheer(uuid) from public, anon;
grant execute on function cheer(uuid) to authenticated;
