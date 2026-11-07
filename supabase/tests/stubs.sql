-- Stand-ins for the parts of Supabase the migrations use, so they can run on a plain local Postgres 16.
-- Only for tests: never run this on the real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
-- Supabase reads the signed-in user from the request's JWT; here a test sets it with `set request.jwt.claim.sub = '…'`.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

-- pg_cron is not installed here; the purge job only needs cron.schedule to exist.
create schema cron;
create function cron.schedule(name text, sched text, cmd text) returns bigint language sql as $$ select 1::bigint $$;
