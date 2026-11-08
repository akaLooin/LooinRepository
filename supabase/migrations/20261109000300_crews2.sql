-- 크루 2차 (원본 영상 2): 모집 중단/재개, 크루 수정, 홈 칩의 내 크루, 크루 홈(멤버들의 공유 카테고리 달력), 크루 대화방.
-- Supabase SQL Editor에서 실행 (20261109000200 다음). 여러 번 실행해도 안전하다.

alter table crews add column if not exists recruiting boolean not null default true;

-- 크루 목록 (검색어가 있으면 이름으로)
create or replace function crew_list(q text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.members desc, x.created_at desc), '[]') from (
    select c.id, c.name, c.description, c.image_path, c.created_at, c.recruiting,
           (select count(*) from crew_members m where m.crew_id = c.id and m.status = 'member') as members,
           crew_status(c.id, auth.uid()) as my_status
    from crews c
    where auth.uid() is not null and not is_blocked(c.owner_id, auth.uid())
      and (q is null or trim(q) = '' or c.name ilike '%' || replace(replace(trim(q), '%', ''), '_', '\_') || '%')
    order by members desc, c.created_at desc limit 50
  ) x
$$;

create or replace function crew_detail(crew uuid, day date) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (select * from crews where id = crew and not is_blocked(owner_id, auth.uid())),
  me as (select crew_status(crew, auth.uid()) as st),
  mem as (
    select m.user_id, m.category_id, m.joined_at, p as prof, cat.title as cat_title, cat.color as cat_color,
      (select count(*) from todos t where t.user_id = m.user_id and t.category_id = m.category_id and t.is_done
         and t.deleted_at is null and t.date between day - 6 and day) as done_count,
      (select max(t.done_at) from todos t where t.user_id = m.user_id and t.category_id = m.category_id and t.is_done and t.deleted_at is null) as last_done
    from crew_members m join profiles p on p.id = m.user_id left join categories cat on cat.id = m.category_id and cat.deleted_at is null
    where m.crew_id = crew and m.status = 'member' and not is_blocked(m.user_id, auth.uid())
  )
  select case when c.id is null or auth.uid() is null then null else jsonb_build_object(
    'id', c.id, 'name', c.name, 'description', c.description, 'image_path', c.image_path, 'created_at', c.created_at,
    'is_owner', c.owner_id = auth.uid(), 'my_status', (select st from me), 'recruiting', c.recruiting,
    'my_category_id', (select category_id from crew_members where crew_id = crew and user_id = auth.uid()),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'person', person_json(mem.prof, auth.uid()), 'is_owner', mem.user_id = c.owner_id,
        'category', case when mem.cat_title is null then null else jsonb_build_object('title', mem.cat_title, 'color', mem.cat_color) end,
        'done_count', mem.done_count, 'last_done_at', mem.last_done,
        'today', case when (select st from me) = 'member' then (
          select coalesce(jsonb_agg(jsonb_build_object('title', t.title, 'is_done', t.is_done) order by t.sort_order), '[]')
          from todos t where t.user_id = mem.user_id and t.category_id = mem.category_id and t.date = day and t.deleted_at is null and not t.is_skipped
        ) end
      ) order by mem.done_count desc, mem.joined_at), '[]') from mem),
    'requests', case when c.owner_id = auth.uid() then (
      select coalesce(jsonb_agg(jsonb_build_object('person', person_json(p, auth.uid()), 'message', m.message, 'created_at', m.created_at,
          'category', (select jsonb_build_object('title', cat.title, 'color', cat.color) from categories cat where cat.id = m.category_id))
        order by m.created_at), '[]')
      from crew_members m join profiles p on p.id = m.user_id
      where m.crew_id = crew and m.status = 'pending' and not is_blocked(m.user_id, auth.uid())
    ) end) end
  from (select 1) one left join c on true
$$;

-- 참가 신청 (크루장에게 알림). 이미 멤버면 그대로.
create or replace function apply_crew(crew uuid, message text, category uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); owner uuid; st text;
begin
  select owner_id into owner from crews where id = crew and recruiting;
  if me is null or owner is null or is_blocked(owner, me)
     or not exists (select 1 from categories where id = category and user_id = me and deleted_at is null) then
    raise exception 'not allowed';
  end if;
  st := crew_status(crew, me);
  if st = 'member' then return st; end if;
  insert into crew_members (crew_id, user_id, status, message, category_id) values (crew, me, 'pending', coalesce(message, ''), category)
    on conflict (crew_id, user_id) do update set message = excluded.message, category_id = excluded.category_id;
  if st is null then
    insert into notifications (user_id, actor_id, type, crew_id) values (owner, me, 'crew_request', crew);
  end if;
  return 'pending';
end $$;


-- 크루장: 정보 고치기 (사진을 지우려면 clear_image = true)
create or replace function update_crew(crew uuid, name text, description text, image_path text, clear_image boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if image_path is not null and image_path not like 'crew-images/' || auth.uid()::text || '/%' then raise exception 'not allowed'; end if;
  update crews set name = trim(update_crew.name), description = coalesce(update_crew.description, ''),
    image_path = case when clear_image then null else coalesce(update_crew.image_path, crews.image_path) end
  where id = crew and owner_id = auth.uid();
  if not found then raise exception 'not allowed'; end if;
end $$;

-- 크루장: 모집 중단 / 재개 (중단 중에는 참가 신청을 받지 않는다)
create or replace function set_crew_recruiting(crew uuid, on_ boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update crews set recruiting = on_ where id = crew and owner_id = auth.uid();
  if not found then raise exception 'not allowed'; end if;
end $$;

-- 홈 칩 줄: 내가 멤버인 크루
create or replace function my_crews() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description, 'image_path', c.image_path,
      'is_owner', c.owner_id = auth.uid()) order by m.joined_at), '[]')
  from crew_members m join crews c on c.id = m.crew_id
  where m.user_id = auth.uid() and m.status = 'member'
$$;

-- 크루 홈 (멤버만): 멤버마다 공유한 카테고리와 그 카테고리의 할 일·루틴 (날짜 범위)
create or replace function crew_range(crew uuid, from_day date, to_day date) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (select * from crews where id = crew),
  mem as (
    select m.user_id, m.category_id, m.joined_at, p as prof, cat.title, cat.color
    from crew_members m join profiles p on p.id = m.user_id join categories cat on cat.id = m.category_id and cat.deleted_at is null
    where m.crew_id = crew and m.status = 'member' and not is_blocked(m.user_id, auth.uid())
  )
  select case when crew_status(crew, auth.uid()) is distinct from 'member' or (select id from c) is null then null else jsonb_build_object(
    'crew', (select jsonb_build_object('id', id, 'name', name, 'description', description, 'image_path', image_path, 'is_owner', owner_id = auth.uid()) from c),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('person', person_json(mem.prof, auth.uid()), 'is_owner', mem.user_id = (select owner_id from c),
        'category', jsonb_build_object('id', mem.category_id, 'title', mem.title, 'color', mem.color)) order by mem.joined_at), '[]') from mem),
    'todos', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'user_id', t.user_id, 'category_id', t.category_id, 'title', t.title, 'date', t.date,
        'sort_order', t.sort_order, 'is_done', t.is_done, 'done_at', t.done_at, 'routine_id', t.routine_id, 'routine_date', t.routine_date,
        'is_skipped', t.is_skipped, 'created_at', t.created_at)), '[]')
      from todos t join mem on mem.user_id = t.user_id and mem.category_id = t.category_id
      where t.deleted_at is null and t.date between from_day and to_day),
    'routines', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'category_id', r.category_id, 'title', r.title, 'start_date', r.start_date,
        'end_date', r.end_date, 'repeat_type', r.repeat_type, 'interval_days', r.interval_days, 'weekdays', r.weekdays, 'month_days', r.month_days,
        'year_month', r.year_month, 'year_day', r.year_day, 'manual_add', r.manual_add, 'sort_order', r.sort_order)), '[]')
      from routines r join mem on mem.user_id = r.user_id and mem.category_id = r.category_id
      where r.deleted_at is null and r.start_date <= to_day and (r.end_date is null or r.end_date >= from_day))
  ) end
$$;

-- ───────── 크루 대화방 (멤버끼리) ─────────
create table if not exists crew_messages (
  id uuid primary key,
  crew_id uuid not null references crews(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('text','emoji','photo','sticker')),
  body text not null default '' check (char_length(body) <= 2000),
  photo_path text,
  created_at timestamptz not null default now(),
  check (kind <> 'photo' or photo_path is not null),
  check (kind = 'photo' or char_length(body) >= 1),
  check (kind <> 'sticker' or body ~ '^clover\.[a-z0-9_]{1,30}$')
);
create index if not exists crew_messages_crew on crew_messages (crew_id, created_at desc);
create table if not exists crew_reads (
  crew_id uuid not null references crews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
alter table crew_messages enable row level security;
alter table crew_reads enable row level security;
revoke all on crew_messages, crew_reads from anon, authenticated;

create or replace function send_crew_message(crew uuid, msg_id uuid, kind text, body text, photo_path text default null) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); at timestamptz;
begin
  if crew_status(crew, me) is distinct from 'member' then raise exception 'not allowed'; end if;
  if kind = 'photo' and (photo_path is null or photo_path not like 'chat-photos/' || me::text || '/%') then raise exception 'not allowed'; end if;
  select m.created_at into at from crew_messages m where m.id = msg_id and m.sender_id = me;
  if at is not null then return at; end if;
  insert into crew_messages (id, crew_id, sender_id, kind, body, photo_path, created_at)
    values (msg_id, crew, me, kind, coalesce(body, ''), case when kind = 'photo' then photo_path end, clock_timestamp())
    returning created_at into at;
  insert into crew_reads (crew_id, user_id, read_at) values (crew, me, at)
    on conflict (crew_id, user_id) do update set read_at = greatest(crew_reads.read_at, excluded.read_at);
  return at;
end $$;

create or replace function crew_chat(crew uuid, before timestamptz default null, after timestamptz default null, max_rows int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when crew_status(crew, auth.uid()) is distinct from 'member' then null else jsonb_build_object(
    'crew', (select jsonb_build_object('id', c.id, 'name', c.name, 'image_path', c.image_path,
               'members', (select count(*) from crew_members m where m.crew_id = c.id and m.status = 'member')) from crews c where c.id = crew),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'body', m.body, 'photo_path', m.photo_path,
        'mine', m.sender_id = auth.uid(), 'created_at', m.created_at,
        'sender', jsonb_build_object('id', p.id, 'nickname', p.nickname, 'avatar_path', p.avatar_path)) order by m.created_at desc), '[]')
      from (select * from crew_messages m where m.crew_id = crew and (before is null or m.created_at < before) and (after is null or m.created_at > after)
              and not is_blocked(m.sender_id, auth.uid())
            order by m.created_at desc limit least(greatest(max_rows, 1), 200)) m join profiles p on p.id = m.sender_id)
  ) end
$$;

create or replace function mark_crew_read(crew uuid) returns void
language sql security definer set search_path = public as $$
  insert into crew_reads (crew_id, user_id, read_at)
  select crew, auth.uid(), clock_timestamp() where crew_status(crew, auth.uid()) = 'member'
  on conflict (crew_id, user_id) do update set read_at = clock_timestamp();
$$;

-- 대화 탭 목록: 내 크루 대화방 (마지막 메시지와 안 읽은 수)
create or replace function my_crew_rooms() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by coalesce(x.last_message_at, x.joined_at) desc), '[]') from (
    select c.id, c.name, c.image_path, m.joined_at,
      (select max(cm.created_at) from crew_messages cm where cm.crew_id = c.id) as last_message_at,
      (select jsonb_build_object('kind', cm.kind, 'body', cm.body, 'mine', cm.sender_id = auth.uid(), 'created_at', cm.created_at, 'nickname', p.nickname)
         from crew_messages cm join profiles p on p.id = cm.sender_id where cm.crew_id = c.id order by cm.created_at desc limit 1) as last,
      (select count(*) from crew_messages cm where cm.crew_id = c.id and cm.sender_id <> auth.uid()
         and cm.created_at > coalesce((select r.read_at from crew_reads r where r.crew_id = c.id and r.user_id = auth.uid()), m.joined_at, '-infinity')) as unread
    from crew_members m join crews c on c.id = m.crew_id
    where m.user_id = auth.uid() and m.status = 'member'
  ) x
$$;

-- 대화 사진: 크루 대화방 사진도 그 크루 멤버가 읽을 수 있게 (나머지는 20261108000200과 같다)
create or replace function can_read_chat_photo(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m join conversations c on c.id = m.conversation_id
    where m.photo_path = 'chat-photos/' || object_name and auth.uid() in (c.user_a, c.user_b))
  or exists (
    select 1 from crew_messages m where m.photo_path = 'chat-photos/' || object_name and crew_status(m.crew_id, auth.uid()) = 'member')
$$;

revoke execute on function update_crew(uuid, text, text, text, boolean), set_crew_recruiting(uuid, boolean), my_crews(), crew_range(uuid, date, date),
  send_crew_message(uuid, uuid, text, text, text), crew_chat(uuid, timestamptz, timestamptz, int), mark_crew_read(uuid), my_crew_rooms() from public, anon;
grant execute on function update_crew(uuid, text, text, text, boolean), set_crew_recruiting(uuid, boolean), my_crews(), crew_range(uuid, date, date),
  send_crew_message(uuid, uuid, text, text, text), crew_chat(uuid, timestamptz, timestamptz, int), mark_crew_read(uuid), my_crew_rooms() to authenticated;
