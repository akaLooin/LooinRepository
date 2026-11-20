-- 관리자 앱 2: 설정이 폰에 바로 반영(실시간) + 바뀐 기록. Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전하다.
-- (20261121000000_admin 다음)

-- 1) 실시간: app_config가 바뀌면 열려 있는 디자인 앱이 곧바로 다시 읽는다 (Supabase Realtime).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_config') then
    alter publication supabase_realtime add table app_config;
  end if;
end $$;

-- 2) 바뀐 기록: 관리자 앱에서 저장할 때마다 한 줄(무엇이, 언제, 전·후 값). 관리자 앱의 '변경 기록'과
--    저장소로 복사하는 GitHub 작업(.github/workflows/remote-config.yml)이 읽는다. 누가 바꿨는지는 관리자만 본다.
create table if not exists app_config_history (
  id bigint generated always as identity primary key,
  key text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists app_config_history_new on app_config_history (changed_at desc);
alter table app_config_history enable row level security;
drop policy if exists app_config_history_read on app_config_history;
create policy app_config_history_read on app_config_history for select using (true);
revoke insert, update, delete on app_config_history from anon, authenticated;
grant select (id, key, old_value, new_value, changed_at) on app_config_history to anon, authenticated;
grant select (changed_by) on app_config_history to authenticated;

create or replace function app_config_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into app_config_history (key, old_value, new_value, changed_by) values (old.key, old.value, null, auth.uid());
    return old;
  end if;
  if tg_op = 'UPDATE' and old.value is not distinct from new.value then return new; end if;
  insert into app_config_history (key, old_value, new_value, changed_by)
  values (new.key, case when tg_op = 'UPDATE' then old.value end, new.value, auth.uid());
  return new;
end $$;
drop trigger if exists app_config_log on app_config;
create trigger app_config_log after insert or update or delete on app_config for each row execute function app_config_log();
