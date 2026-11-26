-- 일정 공개 범위 (2026-11-26, 이용자 요청).
-- Supabase SQL Editor에서 실행 (20261128000000 다음). 여러 번 실행해도 안전하다.
--
-- * 일정은 일정 카테고리마다 공개 범위를 정한다. 구글 캘린더의 하위 캘린더도 각각 일정 카테고리이므로 캘린더별로 정해진다.
-- * 기본은 나만(private): 지금까지 보이지 않던 일정(특히 구글에서 온 일정)이 저절로 보이지 않게.
-- * public = 로그인한 누구나, followers = 나를 팔로우하는 사람(수락됨), friends = 서로 팔로우한 친구, private = 나만.
--   카테고리가 없는 일정은 늘 나만. 차단 관계에서는 아무것도 보이지 않는다.
-- * 보이는 것은 제목·날짜·시간·종일·색·반복·강조뿐. 메모·장소·참석자·회의 링크·알림은 보내지 않는다.

alter table event_categories add column if not exists visibility text not null default 'private'
  check (visibility in ('public','followers','friends','private'));

create or replace function can_see_events(owner uuid, visibility text, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select viewer is not null and (
    owner = viewer or (
      not is_blocked(owner, viewer) and case visibility
        when 'public' then true
        when 'followers' then is_follower(viewer, owner)
        when 'friends' then are_friends(owner, viewer)
        else false
      end))
$$;
revoke execute on function can_see_events(uuid, text, uuid) from public, anon, authenticated;

-- 다른 사람의 일정 중 내가 볼 수 있는 것 (기간에 걸치는 것, 반복은 기간 앞에서 시작한 것도)
create or replace function friend_events(owner uuid, from_day date, to_day date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'all_day', e.all_day,
      'start_time', e.start_time, 'end_time', e.end_time, 'color', e.color, 'repeat', e.repeat,
      'skip_dates', e.skip_dates, 'important', e.important, 'category_id', e.category_id)
      order by e.start_date, e.start_time), '[]'::jsonb)
  from events e join event_categories k on k.id = e.category_id and k.deleted_at is null
  where e.user_id = owner and e.deleted_at is null
    and can_see_events(owner, k.visibility, auth.uid())
    and e.start_date <= to_day
    and (e.end_date >= from_day or e.repeat is not null)
$$;
revoke execute on function friend_events(uuid, date, date) from public, anon;
grant execute on function friend_events(uuid, date, date) to authenticated;
