-- 설정 → 프로필 / 계정 (원본 화면, 2026-11-07): ID, 관심사, 성별, 생년월.
-- 이름(nickname)은 원본처럼 30자까지, 다른 사람과 같아도 됨. 찾기용 고유 이름은 ID(handle)가 맡음.
-- 자기소개는 원본처럼 200자까지. Supabase SQL Editor에서 한 번 실행.

alter table profiles drop constraint if exists profiles_nickname_key;
alter table profiles drop constraint if exists profiles_nickname_check;
alter table profiles add constraint profiles_nickname_check check (char_length(nickname) between 1 and 30);
alter table profiles drop constraint if exists profiles_bio_check;
alter table profiles add constraint profiles_bio_check check (char_length(bio) <= 200);

alter table profiles add column if not exists handle text
  check (handle is null or handle ~ '^[A-Za-z0-9_.]{2,20}$');
create unique index if not exists profiles_handle_unique on profiles (lower(handle)) where handle is not null;
alter table profiles add column if not exists interests text[] not null default '{}'
  check (coalesce(array_length(interests, 1), 0) <= 10);
alter table profiles add column if not exists gender text check (gender is null or gender in ('male','female','nonbinary'));
alter table profiles add column if not exists birth_month text check (birth_month is null or birth_month ~ '^\d{4}-(0[1-9]|1[0-2])$');
