-- 2단계 친구 기능 (서버 쪽): 팔로우, 차단, 일부 공개 대상, 반응, 알림, 그리고 "누가 무엇을 볼 수 있나".
-- Supabase SQL Editor에서 한 번 실행 (앞의 마이그레이션들 다음에).
--
-- 원칙
-- * 다른 사람의 행은 표에서 직접 읽을 수 없다. 1단계의 "본인만" 규칙은 그대로이고, 친구의 것은 아래 함수(RPC)로만 받는다.
--   함수가 공개 범위, 차단, 비공개 메모를 한곳에서 적용하므로 앱이 실수해도 보이면 안 되는 것은 오지 않는다.
-- * 쓰기(팔로우, 수락, 차단, 반응)도 함수로만 한다. 알림 행은 그 함수들이 만든다(앱이 남의 알림을 만들 수 없음).
-- * 공개 범위: public = 로그인한 누구나, followers = 수락된 팔로워, partial = 고른 사람(아래 *_viewers), private = 나만.
--   차단은 양쪽 방향 모두 아무것도 보이지 않게 한다.

-- ───────────────────────── 개인정보 설정 (기기 → 계정) ─────────────────────────
-- 다른 사람의 앱이 지켜야 하는 설정이라 서버에 둔다.
alter table user_settings
  add column if not exists follow_approval boolean not null default false,  -- 팔로우 요청 승인 후 팔로우 허용
  add column if not exists likes_todo text not null default 'all' check (likes_todo in ('all','followers','none')),
  add column if not exists likes_diary text not null default 'all' check (likes_diary in ('all','followers','none')),
  add column if not exists chat_from text not null default 'all' check (chat_from in ('all','followers','none')),
  add column if not exists searchable boolean not null default true;        -- 검색에 나를 노출

-- ───────────────────────── 표 ─────────────────────────

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on follows (followee_id, status);
create trigger follows_updated before update on follows for each row execute function set_updated_at();

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on blocks (blocked_id);

-- 일부 공개: 카테고리·일기마다 볼 수 있는 사람. 주인이 앱에서 직접 고친다(아래 own_* 규칙).
create table category_viewers (
  category_id uuid not null references categories(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  primary key (category_id, viewer_id)
);
create table diary_viewers (
  diary_id uuid not null references diaries(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  primary key (diary_id, viewer_id)
);

-- 반응: 할 일 또는 일기 하나에 한 사람이 하나(다시 고르면 바뀜). kind = emoji | sticker (스티커는 우리 그림 id).
create table reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,  -- 할 일·일기의 주인 (읽기 규칙용)
  todo_id uuid references todos(id) on delete cascade,
  diary_id uuid references diaries(id) on delete cascade,
  kind text not null check (kind in ('emoji','sticker')),
  value text not null check (char_length(value) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((todo_id is null) <> (diary_id is null))
);
create unique index reactions_one_todo on reactions (user_id, todo_id) where todo_id is not null;
create unique index reactions_one_diary on reactions (user_id, diary_id) where diary_id is not null;
create index reactions_todo on reactions (todo_id) where todo_id is not null;
create index reactions_diary on reactions (diary_id) where diary_id is not null;
create trigger reactions_updated before update on reactions for each row execute function set_updated_at();

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,   -- 받는 사람
  actor_id uuid not null references profiles(id) on delete cascade,  -- 한 사람
  type text not null check (type in ('follow_request','follow','follow_accepted','reaction')),
  todo_id uuid references todos(id) on delete cascade,
  diary_id uuid references diaries(id) on delete cascade,
  value text,                                                         -- 반응이면 그 이모지/스티커
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on notifications (user_id, created_at desc);

-- ───────────────────────── 접근 권한 ─────────────────────────
alter table follows enable row level security;
alter table blocks enable row level security;
alter table category_viewers enable row level security;
alter table diary_viewers enable row level security;
alter table reactions enable row level security;
alter table notifications enable row level security;

-- 읽기만: 바꾸는 건 아래 함수로
create policy follows_parties on follows for select using (auth.uid() in (follower_id, followee_id));
create policy blocks_mine on blocks for select using (blocker_id = auth.uid());
create policy reactions_parties on reactions for select using (auth.uid() in (user_id, owner_id));
create policy notifications_mine on notifications for select using (user_id = auth.uid());
create policy notifications_read on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on notifications for delete using (user_id = auth.uid());
-- 일부 공개 대상은 주인이 직접 관리 (자기 카테고리·일기에만)
create policy own_category_viewers on category_viewers for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from categories c where c.id = category_id and c.user_id = auth.uid()));
create policy own_diary_viewers on diary_viewers for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from diaries d where d.id = diary_id and d.user_id = auth.uid()));
-- 앱은 알림의 read_at만 바꾼다
revoke insert, update on notifications from anon, authenticated;
grant update (read_at) on notifications to authenticated;
revoke all on follows, blocks, reactions, notifications from anon;
revoke insert, update, delete on follows, blocks, reactions from authenticated;

-- ───────────────────────── 규칙 함수 ─────────────────────────
-- security definer: 표의 RLS를 넘어서 읽되, 무엇을 돌려줄지는 이 함수들이 정한다.

create or replace function is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function is_follower(viewer uuid, owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = viewer and followee_id = owner and status = 'accepted')
$$;

-- 주인(owner)의 visibility 항목을 viewer가 볼 수 있나. partial이면 picked(고른 사람에 들었는지)로 판단.
create or replace function can_see(owner uuid, visibility text, viewer uuid, picked boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select viewer is not null and (
    owner = viewer or (
      not is_blocked(owner, viewer) and case visibility
        when 'public' then true
        when 'followers' then is_follower(viewer, owner)
        when 'partial' then coalesce(picked, false)
        else false
      end))
$$;

create or replace function can_see_category(cat uuid, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from categories c
    where c.id = cat and c.deleted_at is null
      and can_see(c.user_id, c.visibility, viewer,
                  exists (select 1 from category_viewers v where v.category_id = c.id and v.viewer_id = viewer)))
$$;

create or replace function can_see_diary(d_id uuid, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from diaries d
    where d.id = d_id and d.deleted_at is null
      and can_see(d.user_id, d.visibility, viewer,
                  exists (select 1 from diary_viewers v where v.diary_id = d.id and v.viewer_id = viewer)))
$$;

-- 반응을 받는 설정 (설정 → 개인정보 보호 → 좋아요): all / followers / none
create or replace function audience_allows(owner uuid, audience text, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case audience when 'all' then true when 'followers' then is_follower(viewer, owner) else false end
$$;

revoke execute on function is_blocked(uuid, uuid), is_follower(uuid, uuid), can_see(uuid, text, uuid, boolean),
  can_see_category(uuid, uuid), can_see_diary(uuid, uuid), audience_allows(uuid, text, uuid) from public, anon, authenticated;

-- 사람 한 명을 앱에 보여줄 모양 (나와의 관계 포함)
create or replace function person_json(p profiles, me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'nickname', p.nickname, 'handle', p.handle, 'bio', p.bio,
    'avatar_path', p.avatar_path, 'status_emoji', p.status_emoji,
    'i_follow', (select status from follows where follower_id = me and followee_id = p.id),
    'follows_me', (select status from follows where follower_id = p.id and followee_id = me),
    'blocked_by_me', exists (select 1 from blocks where blocker_id = me and blocked_id = p.id))
$$;
revoke execute on function person_json(profiles, uuid) from public, anon, authenticated;

-- ───────────────────────── 읽기 (화면마다 하나) ─────────────────────────

-- 사람 찾기: ID는 앞부분, 이름은 어디든. 검색 노출을 끈 사람, 차단 관계, 나는 빠짐.
create or replace function search_people(q text) returns jsonb
language sql stable security definer set search_path = public as $$
  with k as (select lower(replace(replace(replace(trim(q), '\', ''), '%', ''), '_', '\_')) as q),
  hits as (
    select person_json(p, auth.uid()) as j, (lower(p.handle) = (select q from k)) as exact, p.nickname
    from profiles p join user_settings s on s.user_id = p.id
    where auth.uid() is not null and (select q from k) <> ''
      and p.deleted_at is null and p.id <> auth.uid() and s.searchable
      and not is_blocked(p.id, auth.uid())
      and (lower(p.handle) like (select q from k) || '%' or lower(p.nickname) like '%' || (select q from k) || '%')
    order by exact desc, p.nickname limit 30
  )
  select coalesce(jsonb_agg(j order by exact desc, nickname), '[]') from hits
$$;

-- 한 사람의 프로필: 이름·사진·소개, 팔로워/팔로잉 수, 나와의 관계. 차단 관계면 null.
create or replace function person(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select person_json(p, auth.uid()) || jsonb_build_object(
    'followers', (select count(*) from follows where followee_id = p.id and status = 'accepted'),
    'following', (select count(*) from follows where follower_id = p.id and status = 'accepted'))
  from profiles p
  where p.id = uid and p.deleted_at is null and auth.uid() is not null and not is_blocked(p.id, auth.uid())
$$;

-- 친구 홈: 날짜 범위(보통 한 달)의 보이는 카테고리, 할 일, 루틴, 일기와 반응 수.
-- 루틴 회차는 앱이 1단계와 같은 방식으로 계산한다 (회차를 옮기거나 건너뛴 행도 todos에 들어 있음).
-- 비공개 메모는 빈 칸으로, 시간 알림은 보내지 않는다.
create or replace function friend_range(uid uuid, from_day date, to_day date) returns jsonb
language sql stable security definer set search_path = public as $$
  with cats as (
    select c.id, c.title, c.color, c.sort_order, c.ended_at from categories c
    where c.user_id = uid and can_see_category(c.id, auth.uid())
  ), ts as (
    select t.id, t.category_id, t.title, t.date, t.sort_order, t.is_done, t.done_at,
           case when t.memo_is_private then '' else t.memo end as memo,
           t.photo_path, t.timer_seconds, t.routine_id, t.routine_date, t.is_skipped, t.created_at,
           (select count(*) from reactions r where r.todo_id = t.id) as reaction_count,
           (select r.value from reactions r where r.todo_id = t.id and r.user_id = auth.uid()) as my_reaction
    from todos t join cats on cats.id = t.category_id
    where t.user_id = uid and t.deleted_at is null and t.date between from_day and to_day
  ), rs as (
    select r.id, r.category_id, r.title, r.start_date, r.end_date, r.repeat_type, r.interval_days, r.weekdays,
           r.month_days, r.year_month, r.year_day, r.time_of_day, r.manual_add, r.sort_order
    from routines r join cats on cats.id = r.category_id
    where r.user_id = uid and r.deleted_at is null and r.start_date <= to_day and (r.end_date is null or r.end_date >= from_day)
  ), ds as (
    select d.id, d.date, d.emoji, d.body, d.background_color, d.image_paths,
           (select count(*) from reactions r where r.diary_id = d.id) as reaction_count,
           (select r.value from reactions r where r.diary_id = d.id and r.user_id = auth.uid()) as my_reaction
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

-- 팔로잉 / 팔로워 목록. 남의 목록도 볼 수 있다(차단 관계 제외). 요청 목록(requests)은 내 것만.
create or replace function follow_list(uid uuid, which text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(person_json(p, auth.uid()) order by f.created_at desc), '[]')
  from follows f
  join profiles p on p.id = case when which = 'following' then f.followee_id else f.follower_id end
  where auth.uid() is not null and not is_blocked(uid, auth.uid()) and p.deleted_at is null
    and not is_blocked(p.id, auth.uid())
    and case which
      when 'following' then f.follower_id = uid and f.status = 'accepted'
      when 'followers' then f.followee_id = uid and f.status = 'accepted'
      when 'requests' then f.followee_id = uid and f.status = 'pending' and uid = auth.uid()
      else false end
$$;

-- 내 차단 목록 (설정 → 개인정보 보호 → 차단 관리)
create or replace function my_blocks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(person_json(p, auth.uid()) order by b.created_at desc), '[]')
  from blocks b join profiles p on p.id = b.blocked_id where b.blocker_id = auth.uid()
$$;

-- 알림 탭: 최근 것부터, 한 사람의 이름·사진과 함께. 차단한 사람 것은 빠짐.
create or replace function my_notifications(before timestamptz default null, max_rows int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select n.id, n.type, n.todo_id, n.diary_id, n.value, n.read_at, n.created_at,
           person_json(p, auth.uid()) as actor,
           (select t.title from todos t where t.id = n.todo_id) as todo_title
    from notifications n join profiles p on p.id = n.actor_id
    where n.user_id = auth.uid() and (before is null or n.created_at < before) and not is_blocked(n.actor_id, auth.uid())
    order by n.created_at desc limit least(greatest(max_rows, 1), 100)
  ) x
$$;

-- ───────────────────────── 쓰기 ─────────────────────────

-- 팔로우: 상대가 "승인 후 팔로우"를 켰으면 요청(pending), 아니면 바로 팔로우. 결과 상태를 돌려준다.
create or replace function follow(target uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  st text;
begin
  if me is null or target = me then raise exception 'not allowed'; end if;
  if not exists (select 1 from profiles where id = target and deleted_at is null) or is_blocked(me, target) then
    raise exception 'not allowed';
  end if;
  select status into st from follows where follower_id = me and followee_id = target;
  if st is not null then return st; end if;
  st := case when coalesce((select follow_approval from user_settings where user_id = target), false) then 'pending' else 'accepted' end;
  insert into follows (follower_id, followee_id, status) values (me, target, st);
  insert into notifications (user_id, actor_id, type)
    values (target, me, case st when 'pending' then 'follow_request' else 'follow' end);
  return st;
end $$;

-- 팔로우 취소 (요청 취소 포함)
create or replace function unfollow(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from notifications where user_id = target and actor_id = auth.uid() and type = 'follow_request';
  delete from follows where follower_id = auth.uid() and followee_id = target;
$$;

-- 받은 요청 수락 / 거절
create or replace function respond_follow(requester uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (select 1 from follows where follower_id = requester and followee_id = me and status = 'pending') then
    return;
  end if;
  delete from notifications where user_id = me and actor_id = requester and type = 'follow_request';
  if accept then
    update follows set status = 'accepted' where follower_id = requester and followee_id = me;
    insert into notifications (user_id, actor_id, type) values (me, requester, 'follow');
    insert into notifications (user_id, actor_id, type) values (requester, me, 'follow_accepted');
  else
    delete from follows where follower_id = requester and followee_id = me;
  end if;
end $$;

-- 팔로워 삭제 (나를 팔로우하는 사람을 내보냄)
create or replace function remove_follower(follower uuid) returns void
language sql security definer set search_path = public as $$
  delete from follows where follower_id = follower and followee_id = auth.uid();
$$;

-- 차단: 양쪽 팔로우와 서로 남긴 반응·알림을 지운다. 해제해도 팔로우는 돌아오지 않는다.
create or replace function block(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or target = me then raise exception 'not allowed'; end if;
  insert into blocks (blocker_id, blocked_id) values (me, target) on conflict do nothing;
  delete from follows where (follower_id = me and followee_id = target) or (follower_id = target and followee_id = me);
  delete from reactions where (user_id = me and owner_id = target) or (user_id = target and owner_id = me);
  delete from notifications where (user_id = me and actor_id = target) or (user_id = target and actor_id = me);
  delete from category_viewers where (owner_id = me and viewer_id = target) or (owner_id = target and viewer_id = me);
  delete from diary_viewers where (owner_id = me and viewer_id = target) or (owner_id = target and viewer_id = me);
end $$;

create or replace function unblock(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = target;
$$;

-- 반응 남기기 / 바꾸기. target_type = 'todo' | 'diary'. 볼 수 있고, 주인의 좋아요 설정이 허락할 때만.
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
  if owner is null or (owner <> me and not audience_allows(owner, coalesce(audience, 'all'), me)) then
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

create or replace function unreact(target_type text, target uuid) returns void
language sql security definer set search_path = public as $$
  delete from notifications where actor_id = auth.uid() and type = 'reaction'
    and ((target_type = 'todo' and todo_id = target) or (target_type = 'diary' and diary_id = target));
  delete from reactions where user_id = auth.uid()
    and ((target_type = 'todo' and todo_id = target) or (target_type = 'diary' and diary_id = target));
$$;

-- 한 할 일·일기에 누가 무엇으로 반응했나 (볼 수 있는 사람만)
create or replace function reactions_of(target_type text, target uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'value', r.value, 'created_at', r.created_at,
                                               'person', person_json(p, auth.uid())) order by r.created_at), '[]')
  from reactions r join profiles p on p.id = r.user_id
  where not is_blocked(r.user_id, auth.uid())
    and case target_type
      when 'todo' then r.todo_id = target and exists (select 1 from todos t where t.id = target and can_see_category(t.category_id, auth.uid()))
      when 'diary' then r.diary_id = target and can_see_diary(target, auth.uid())
      else false end
$$;

revoke execute on function search_people(text), person(uuid), friend_range(uuid, date, date), follow_list(uuid, text),
  my_blocks(), my_notifications(timestamptz, int), follow(uuid), unfollow(uuid), respond_follow(uuid, boolean),
  remove_follower(uuid), block(uuid), unblock(uuid), react(text, uuid, text, text), unreact(text, uuid),
  reactions_of(text, uuid) from public, anon;
grant execute on function search_people(text), person(uuid), friend_range(uuid, date, date), follow_list(uuid, text),
  my_blocks(), my_notifications(timestamptz, int), follow(uuid), unfollow(uuid), respond_follow(uuid, boolean),
  remove_follower(uuid), block(uuid), unblock(uuid), react(text, uuid, text, text), unreact(text, uuid),
  reactions_of(text, uuid) to authenticated;

-- ───────────────────────── 사진 ─────────────────────────
-- 친구의 할 일 사진·일기 사진은 그 할 일/일기를 볼 수 있을 때만 읽힌다. 앱의 경로 = '<버킷>/<주인 id>/<파일>'.
create or replace function can_read_photo(bucket text, object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case bucket
    when 'todo-photos' then exists (
      select 1 from todos t where t.photo_path = bucket || '/' || object_name and t.deleted_at is null
        and can_see_category(t.category_id, auth.uid()))
    when 'diary-images' then exists (
      select 1 from diaries d where (bucket || '/' || object_name) = any (d.image_paths)
        and can_see_diary(d.id, auth.uid()))
    else false end
$$;
revoke execute on function can_read_photo(text, text) from public, anon;
grant execute on function can_read_photo(text, text) to authenticated;
create policy friend_files_read on storage.objects for select to authenticated
  using (bucket_id in ('todo-photos','diary-images') and public.can_read_photo(bucket_id, name));
