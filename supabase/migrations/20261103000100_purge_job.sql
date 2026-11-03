-- 0002 cleanup job: really delete rows that were soft-deleted more than 30 days ago.
-- Needs the pg_cron extension (Supabase dashboard → Database → Extensions → pg_cron).
-- Safe to skip: without it, deleted rows just stay hidden.

create extension if not exists pg_cron;

create or replace function purge_deleted() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from todos      where deleted_at < now() - interval '30 days';
  delete from routines   where deleted_at < now() - interval '30 days';
  delete from categories where deleted_at < now() - interval '30 days';
  delete from ddays      where deleted_at < now() - interval '30 days';
  delete from reminders  where deleted_at < now() - interval '30 days';
  delete from diaries    where deleted_at < now() - interval '30 days';
end $$;
revoke execute on function purge_deleted() from public, anon, authenticated;

select cron.schedule('purge-deleted', '0 4 * * *', 'select purge_deleted()');
