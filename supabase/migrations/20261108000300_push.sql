-- 푸시 알림 (앱이 꺼져 있어도 폰에 뜨는 알림): 폰마다 받는 주소(Expo push token)와 알림 설정.
-- Supabase SQL Editor에서 실행 (20261108000200 다음). 여러 번 실행해도 안전하다.
-- 보내는 쪽은 Edge Function 'push' (supabase/functions/push): 새 메시지와 새 알림(팔로우·반응)이 생길 때
-- Database Webhook이 그 함수를 부르고, 함수가 받는 사람의 폰들로 보낸다. 설정 순서는 replica/backend.md 13번.

-- 알림 설정 (설정 → 알림). 보내는 서버가 지켜야 해서 계정에 둔다.
alter table user_settings
  add column if not exists notify_chat boolean not null default true,       -- 대화 메시지
  add column if not exists notify_likes boolean not null default true,      -- 좋아요(반응) 소식
  add column if not exists notify_following boolean not null default true;  -- 팔로우 소식

create table if not exists push_tokens (
  token text primary key check (char_length(token) between 10 and 300),
  user_id uuid not null references profiles(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android','ios','web')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on push_tokens (user_id);
alter table push_tokens enable row level security;
drop policy if exists push_tokens_mine on push_tokens;
create policy push_tokens_mine on push_tokens for select using (user_id = auth.uid());
revoke all on push_tokens from anon;
revoke insert, update, delete on push_tokens from authenticated;

-- 이 폰의 주소를 내 계정에 등록. 같은 폰에서 다른 계정으로 로그인하면 주소가 새 계정으로 옮겨간다.
create or replace function save_push_token(token text, platform text default 'android') returns void
language sql security definer set search_path = public as $$
  insert into push_tokens (token, user_id, platform, updated_at)
  select save_push_token.token, auth.uid(), coalesce(save_push_token.platform, 'android'), now() where auth.uid() is not null
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
-- 로그아웃할 때: 이 폰으로 더는 보내지 않게
create or replace function remove_push_token(token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where push_tokens.token = remove_push_token.token and user_id = auth.uid();
$$;
revoke execute on function save_push_token(text, text), remove_push_token(text) from public, anon;
grant execute on function save_push_token(text, text), remove_push_token(text) to authenticated;
