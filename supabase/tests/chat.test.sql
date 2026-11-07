-- 대화 rules (20261108000200_chat.sql). E and F talk; G is a stranger; F limits who may message them.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.fails(text) to authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000a1');
update profiles set nickname = 'Eve' where id = '00000000-0000-0000-0000-0000000000e1';
update profiles set nickname = 'Fay' where id = '00000000-0000-0000-0000-0000000000f1';
update profiles set nickname = 'Gus' where id = '00000000-0000-0000-0000-0000000000a1';
insert into storage.objects (bucket_id, name) values ('chat-photos', '00000000-0000-0000-0000-0000000000e1/p.jpg');

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$
declare cid uuid; again uuid; at1 timestamptz; at2 timestamptz;
begin
  cid := open_conversation('00000000-0000-0000-0000-0000000000f1');
  again := open_conversation('00000000-0000-0000-0000-0000000000f1');
  assert cid = again, 'one conversation per pair';
  assert jsonb_array_length(my_conversations()) = 0, 'an empty conversation is not listed';
  at1 := send_message(cid, '50000000-0000-0000-0000-000000000001', 'text', '안녕');
  at2 := send_message(cid, '50000000-0000-0000-0000-000000000001', 'text', '안녕');
  assert at1 = at2 and (select count(*) from messages) = 1, 'sending the same id twice adds one message';
  perform send_message(cid, '50000000-0000-0000-0000-000000000002', 'photo', '', 'chat-photos/00000000-0000-0000-0000-0000000000e1/p.jpg');
  assert pg_temp.fails($q$ select send_message((select id from conversations limit 1), '50000000-0000-0000-0000-000000000003', 'photo', '',
    'chat-photos/00000000-0000-0000-0000-0000000000f1/x.jpg') $q$), 'photos only from my own folder';
  assert pg_temp.fails($q$ select send_message((select id from conversations limit 1), '50000000-0000-0000-0000-000000000004', 'text', '') $q$), 'no empty text';
  assert pg_temp.fails($q$ insert into messages (id, conversation_id, sender_id, kind, body)
    values (gen_random_uuid(), (select id from conversations limit 1), auth.uid(), 'text', 'x') $q$), 'messages are written only through send_message';
  assert my_conversations()->0->>'unread' = '0', 'my own messages are not unread';
  assert my_conversations()->0->'last'->>'kind' = 'photo', 'last message';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
do $$
declare cid uuid := (select id from conversations limit 1); r jsonb;
begin
  assert unread_conversations() = 1, 'F has one unread conversation';
  assert my_conversations()->0->>'unread' = '2', 'two unread messages';
  r := conversation_messages(cid);
  assert jsonb_array_length(r->'messages') = 2 and r->'messages'->0->>'kind' = 'photo', 'newest first';
  assert (r->'messages'->1->>'mine')::boolean = false, 'not mine';
  assert (select count(*) from storage.objects where bucket_id = 'chat-photos') = 1, 'F can see the photo sent to them';
  perform send_message(cid, '50000000-0000-0000-0000-000000000005', 'emoji', '🔥');
  perform mark_conversation_read(cid);
  assert unread_conversations() = 0, 'read';
  assert jsonb_array_length(conversation_messages(cid, null, (r->'messages'->0->>'created_at')::timestamptz)->'messages') = 1, 'only the new one after a time';
  -- F only takes messages from people they follow, and does not follow anyone
  update user_settings set chat_from = 'followers' where user_id = auth.uid();
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$
declare cid uuid := (select id from conversations limit 1);
begin
  assert conversation_messages(cid)->>'other_read_at' is not null, 'E sees that F read';
  assert pg_temp.fails($q$ select send_message((select id from conversations limit 1), '50000000-0000-0000-0000-000000000006', 'text', '또') $q$),
    'chat_from = followers: E does not follow F, so cannot send';
  assert (my_conversations()->0->>'can_send')::boolean = false, 'and the list says so';
  perform follow('00000000-0000-0000-0000-0000000000f1');
  perform send_message(cid, '50000000-0000-0000-0000-000000000006', 'text', '또');
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$
declare cid uuid := (select id from conversations c where c.user_a = '00000000-0000-0000-0000-0000000000e1' or c.user_b = '00000000-0000-0000-0000-0000000000e1' limit 1);
begin
  assert cid is null, 'G cannot see the conversation';
  assert conversation_messages((select id from public.conversations limit 1)) is null, 'nor read it through the function';
  assert (select count(*) from messages) = 0, 'nor its messages';
  assert (select count(*) from storage.objects where bucket_id = 'chat-photos') = 0, 'nor its photos';
  assert pg_temp.fails($q$ select open_conversation('00000000-0000-0000-0000-0000000000f1') $q$), 'F takes messages only from people they allow';
end $$;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
do $$ begin perform block('00000000-0000-0000-0000-0000000000e1'); end $$;
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  assert jsonb_array_length(my_conversations()) = 0, 'blocked: the conversation disappears';
  assert pg_temp.fails($q$ select open_conversation('00000000-0000-0000-0000-0000000000f1') $q$), 'and cannot be opened again';
end $$;
reset role;
\echo ok chat: one room per pair, idempotent send, photos, unread/read, chat_from, stranger, block
