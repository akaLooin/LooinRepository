-- 크루 (둘러보기): 비슷한 목표를 가진 사람들의 모임. 크루마다 멤버가 카테고리 하나를 공유하고, 크루 화면에서
-- 그 카테고리로 최근 7일 동안 끝낸 할 일 수로 순위를 보여 준다 (원본 영상: "○○에서 20개의 할 일을 완료 1일 전").
-- 참가는 신청 → 크루장이 수락. 공유한 카테고리는 공개 설정과 관계없이 크루 멤버에게 보인다 (원본 안내 문구).
-- Supabase SQL Editor에서 실행 (20261109000100 다음). 여러 번 실행해도 안전하다.

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  description text not null default '' check (char_length(description) <= 500),
  image_path text,                                   -- 'crew-images/<owner>/<file>' (공개 버킷)
  created_at timestamptz not null default now()
);

create table if not exists crew_members (
  crew_id uuid not null references crews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('pending','member')),
  message text not null default '' check (char_length(message) <= 200),
  category_id uuid references categories(id) on delete set null,   -- 크루에 공유한 카테고리
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (crew_id, user_id)
);
create index if not exists crew_members_user on crew_members (user_id);

alter table crews enable row level security;
alter table crew_members enable row level security;
revoke all on crews, crew_members from anon, authenticated;   -- 읽기·쓰기 모두 아래 함수로

-- 알림에 크루 소식
alter table notifications add column if not exists crew_id uuid references crews(id) on delete cascade;
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('follow_request','follow','follow_accepted','reaction','crew_request','crew_accepted'));

create or replace function crew_status(c uuid, u uuid) returns text
language sql stable security definer set search_path = public as $$
  select status from crew_members where crew_id = c and user_id = u
$$;
revoke execute on function crew_status(uuid, uuid) from public, anon, authenticated;

-- 크루 목록 (검색어가 있으면 이름으로)
create or replace function crew_list(q text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.members desc, x.created_at desc), '[]') from (
    select c.id, c.name, c.description, c.image_path, c.created_at,
           (select count(*) from crew_members m where m.crew_id = c.id and m.status = 'member') as members,
           crew_status(c.id, auth.uid()) as my_status
    from crews c
    where auth.uid() is not null and not is_blocked(c.owner_id, auth.uid())
      and (q is null or trim(q) = '' or c.name ilike '%' || replace(replace(trim(q), '%', ''), '_', '\_') || '%')
    order by members desc, c.created_at desc limit 50
  ) x
$$;

-- 크루 화면: 정보, 나와의 관계, 멤버 순위(최근 7일 완료 수), 멤버에게만 오늘의 공유 할 일, 크루장에게만 받은 신청
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
    'is_owner', c.owner_id = auth.uid(), 'my_status', (select st from me),
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

-- 만들기: 크루장이 첫 멤버, 공유할 카테고리는 내 것만
create or replace function create_crew(name text, description text, image_path text, category uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); new_id uuid;
begin
  if me is null or not exists (select 1 from categories where categories.id = category and user_id = me and deleted_at is null) then
    raise exception 'not allowed';
  end if;
  if image_path is not null and image_path not like 'crew-images/' || me::text || '/%' then raise exception 'not allowed'; end if;
  insert into crews (owner_id, name, description, image_path) values (me, trim(name), coalesce(description, ''), image_path) returning crews.id into new_id;
  insert into crew_members (crew_id, user_id, status, category_id, joined_at) values (new_id, me, 'member', category, now());
  return new_id;
end $$;

-- 참가 신청 (크루장에게 알림). 이미 멤버면 그대로.
create or replace function apply_crew(crew uuid, message text, category uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); owner uuid; st text;
begin
  select owner_id into owner from crews where id = crew;
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

create or replace function cancel_crew_application(crew uuid) returns void
language sql security definer set search_path = public as $$
  delete from notifications where actor_id = auth.uid() and type = 'crew_request' and crew_id = crew;
  delete from crew_members where crew_id = crew and user_id = auth.uid() and status = 'pending';
$$;

-- 크루장: 신청 수락 / 거절
create or replace function respond_crew(crew uuid, applicant uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from crews where id = crew and owner_id = auth.uid()) then raise exception 'not allowed'; end if;
  delete from notifications where user_id = auth.uid() and actor_id = applicant and type = 'crew_request' and crew_id = crew;
  if accept then
    update crew_members set status = 'member', joined_at = now() where crew_id = crew and user_id = applicant and status = 'pending';
    if found then insert into notifications (user_id, actor_id, type, crew_id) values (applicant, auth.uid(), 'crew_accepted', crew); end if;
  else
    delete from crew_members where crew_id = crew and user_id = applicant and status = 'pending';
  end if;
end $$;

-- 멤버: 공유 카테고리 바꾸기 / 나가기. 크루장은 나갈 수 없고 크루를 지운다.
create or replace function set_crew_category(crew uuid, category uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from categories where id = category and user_id = auth.uid() and deleted_at is null) then raise exception 'not allowed'; end if;
  update crew_members set category_id = category where crew_id = crew and user_id = auth.uid();
end $$;
create or replace function leave_crew(crew uuid) returns void
language sql security definer set search_path = public as $$
  delete from crew_members m using crews c where m.crew_id = crew and c.id = crew and m.user_id = auth.uid() and c.owner_id <> auth.uid();
$$;
create or replace function delete_crew(crew uuid) returns void
language sql security definer set search_path = public as $$
  delete from crews where id = crew and owner_id = auth.uid();
$$;

-- 알림 탭: 크루 이름도 함께 (나머지는 20261108000000과 같다)
create or replace function my_notifications(before timestamptz default null, max_rows int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select n.id, n.type, n.todo_id, n.diary_id, n.crew_id, n.value, n.read_at, n.created_at,
           person_json(p, auth.uid()) as actor,
           (select t.title from todos t where t.id = n.todo_id) as todo_title,
           (select c.name from crews c where c.id = n.crew_id) as crew_name
    from notifications n join profiles p on p.id = n.actor_id
    where n.user_id = auth.uid() and (before is null or n.created_at < before) and not is_blocked(n.actor_id, auth.uid())
    order by n.created_at desc limit least(greatest(max_rows, 1), 100)
  ) x
$$;

revoke execute on function crew_list(text), crew_detail(uuid, date), create_crew(text, text, text, uuid), apply_crew(uuid, text, uuid),
  cancel_crew_application(uuid), respond_crew(uuid, uuid, boolean), set_crew_category(uuid, uuid), leave_crew(uuid), delete_crew(uuid) from public, anon;
grant execute on function crew_list(text), crew_detail(uuid, date), create_crew(text, text, text, uuid), apply_crew(uuid, text, uuid),
  cancel_crew_application(uuid), respond_crew(uuid, uuid, boolean), set_crew_category(uuid, uuid), leave_crew(uuid), delete_crew(uuid) to authenticated;

-- 크루 사진: 누구나 보는 공개 버킷, 올리기는 내 폴더에만
insert into storage.buckets (id, name, public) values ('crew-images', 'crew-images', true) on conflict (id) do nothing;
drop policy if exists crew_images_write on storage.objects;
create policy crew_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'crew-images' and (storage.foldername(name))[1] = auth.uid()::text);
