-- 대화 (보내기 탭): 두 사람 사이의 대화방과 메시지, 읽음 표시, 사진.
-- Supabase SQL Editor에서 실행 (20261108000100 다음). 여러 번 실행해도 안전하다.
--
-- 규칙
-- * 대화방은 두 사람에 하나. 메시지 쓰기는 함수로만 한다: 차단 관계면 못 보내고, 받는 사람의
--   "대화 수신 허용"(chat_from: all / followers / none)을 지킨다. followers = 보내는 사람이 받는 사람을 팔로우(수락됨) 중.
-- * 읽기는 두 참여자만 (표의 RLS). 앱은 함수로 목록과 메시지를 받는다.
-- * 사진은 'chat-photos' 버킷의 '<보낸 사람 id>/...'에 올리고, 그 사진이 들어간 대화의 두 사람만 읽는다.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,  -- 항상 user_a < user_b
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists conversations_b on conversations (user_b);

create table if not exists messages (
  id uuid primary key,                                   -- 앱이 만든 id: 다시 보내도 두 번 생기지 않음
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('text','emoji','photo')),
  body text not null default '' check (char_length(body) <= 2000),
  photo_path text,                                        -- 'chat-photos/<보낸 사람>/<파일>'
  created_at timestamptz not null default now(),
  check (kind <> 'photo' or photo_path is not null),
  check (kind = 'photo' or char_length(body) >= 1)
);
create index if not exists messages_conv on messages (conversation_id, created_at desc);

create table if not exists conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table conversations enable row level security;
alter table messages enable row level security;
alter table conversation_reads enable row level security;
drop policy if exists conversations_parties on conversations;
create policy conversations_parties on conversations for select using (auth.uid() in (user_a, user_b));
drop policy if exists messages_parties on messages;
create policy messages_parties on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
drop policy if exists reads_mine on conversation_reads;
create policy reads_mine on conversation_reads for select using (user_id = auth.uid());
revoke all on conversations, messages, conversation_reads from anon;
revoke insert, update, delete on conversations, messages, conversation_reads from authenticated;

-- me가 other에게 지금 메시지를 보낼 수 있나
create or replace function can_message(me uuid, other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select me is not null and other is not null and me <> other
    and exists (select 1 from profiles where id = other and deleted_at is null)
    and not is_blocked(me, other)
    and audience_allows(other, coalesce((select chat_from from user_settings where user_id = other), 'all'), me)
$$;
revoke execute on function can_message(uuid, uuid) from public, anon, authenticated;

-- 상대와의 대화방 id (없으면 만든다). 보낼 수 없는 상대면 거절.
create or replace function open_conversation(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid := least(me, other);
  b uuid := greatest(me, other);
  cid uuid;
begin
  select id into cid from conversations where user_a = a and user_b = b;
  if cid is not null and not is_blocked(me, other) then return cid; end if;
  if not can_message(me, other) then raise exception 'not allowed'; end if;
  insert into conversations (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from conversations where user_a = a and user_b = b;
  return cid;
end $$;

-- 메시지 보내기. 같은 id로 다시 보내면 아무것도 바뀌지 않는다(끊긴 연결에서 다시 보낼 때).
create or replace function send_message(conv uuid, msg_id uuid, kind text, body text, photo_path text default null) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
  at timestamptz;
begin
  select case when c.user_a = me then c.user_b else c.user_a end into other
    from conversations c where c.id = conv and me in (c.user_a, c.user_b);
  if other is null or not can_message(me, other) then raise exception 'not allowed'; end if;
  if kind = 'photo' and (photo_path is null or photo_path not like 'chat-photos/' || me::text || '/%') then
    raise exception 'not allowed';
  end if;
  select m.created_at into at from messages m where m.id = msg_id and m.sender_id = me;
  if at is not null then return at; end if;
  -- clock_timestamp: messages sent one after another keep their order even inside one transaction
  insert into messages (id, conversation_id, sender_id, kind, body, photo_path, created_at)
    values (msg_id, conv, me, kind, coalesce(body, ''), case when kind = 'photo' then photo_path end, clock_timestamp())
    returning created_at into at;
  update conversations set last_message_at = at where id = conv;
  insert into conversation_reads (conversation_id, user_id, read_at) values (conv, me, at)
    on conflict (conversation_id, user_id) do update set read_at = greatest(conversation_reads.read_at, excluded.read_at);
  return at;
end $$;

-- 대화 목록: 상대, 마지막 메시지, 안 읽은 수. 차단 관계인 대화는 빠진다.
create or replace function my_conversations() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.last_message_at desc nulls last), '[]') from (
    select c.id, c.last_message_at,
           person_json(p, auth.uid()) as other,
           (select jsonb_build_object('kind', m.kind, 'body', m.body, 'mine', m.sender_id = auth.uid(), 'created_at', m.created_at)
              from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last,
           (select count(*) from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
              and m.created_at > coalesce((select r.read_at from conversation_reads r where r.conversation_id = c.id and r.user_id = auth.uid()), '-infinity'))
             as unread,
           can_message(auth.uid(), p.id) as can_send
    from conversations c
    join profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
    where auth.uid() in (c.user_a, c.user_b) and c.last_message_at is not null and not is_blocked(c.user_a, c.user_b)
  ) x
$$;

-- 한 대화의 메시지: before보다 이전 것을 최신부터 max_rows개, 또는 after 이후의 새 것.
-- 상대가 마지막으로 읽은 시각도 같이 준다 (내 메시지의 "읽음" 표시).
create or replace function conversation_messages(conv uuid, before timestamptz default null, after timestamptz default null, max_rows int default 50)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when c.id is null then null else jsonb_build_object(
    'other', (select person_json(p, auth.uid()) from profiles p where p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end),
    'can_send', can_message(auth.uid(), case when c.user_a = auth.uid() then c.user_b else c.user_a end),
    'other_read_at', (select r.read_at from conversation_reads r where r.conversation_id = c.id and r.user_id <> auth.uid()),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'body', m.body, 'photo_path', m.photo_path,
                                                              'mine', m.sender_id = auth.uid(), 'created_at', m.created_at) order by m.created_at desc), '[]')
                 from (select * from messages m where m.conversation_id = c.id
                         and (before is null or m.created_at < before) and (after is null or m.created_at > after)
                       order by m.created_at desc limit least(greatest(max_rows, 1), 200)) m)) end
  from conversations c
  where c.id = conv and auth.uid() in (c.user_a, c.user_b) and not is_blocked(c.user_a, c.user_b)
$$;

create or replace function mark_conversation_read(conv uuid) returns void
language sql security definer set search_path = public as $$
  insert into conversation_reads (conversation_id, user_id, read_at)
  select c.id, auth.uid(), clock_timestamp() from conversations c where c.id = conv and auth.uid() in (c.user_a, c.user_b)
  on conflict (conversation_id, user_id) do update set read_at = clock_timestamp();
$$;

-- 안 읽은 대화 수 (보내기 탭의 점)
create or replace function unread_conversations() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from conversations c
  where auth.uid() in (c.user_a, c.user_b) and not is_blocked(c.user_a, c.user_b)
    and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
      and m.created_at > coalesce((select r.read_at from conversation_reads r where r.conversation_id = c.id and r.user_id = auth.uid()), '-infinity'))
$$;

revoke execute on function open_conversation(uuid), send_message(uuid, uuid, text, text, text), my_conversations(),
  conversation_messages(uuid, timestamptz, timestamptz, int), mark_conversation_read(uuid), unread_conversations() from public, anon;
grant execute on function open_conversation(uuid), send_message(uuid, uuid, text, text, text), my_conversations(),
  conversation_messages(uuid, timestamptz, timestamptz, int), mark_conversation_read(uuid), unread_conversations() to authenticated;

-- 사진
insert into storage.buckets (id, name, public) values ('chat-photos', 'chat-photos', false) on conflict (id) do nothing;
create or replace function can_read_chat_photo(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m join conversations c on c.id = m.conversation_id
    where m.photo_path = 'chat-photos/' || object_name and auth.uid() in (c.user_a, c.user_b))
$$;
revoke execute on function can_read_chat_photo(text) from public, anon;
grant execute on function can_read_chat_photo(text) to authenticated;
drop policy if exists chat_photos_write on storage.objects;
create policy chat_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists chat_photos_read on storage.objects;
create policy chat_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'chat-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_read_chat_photo(name)));
