#!/usr/bin/env bash
# Runs every migration on a throwaway local Postgres 16, then the RLS tests (*.test.sql).
# Usage: supabase/tests/run.sh   (needs the postgresql-16 binaries; runs as the postgres user when started as root)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin=/usr/lib/postgresql/16/bin
work="$(mktemp -d)"
chmod 755 "$work"
as() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$work"
as "$bin/initdb -D $work/db -A trust -U postgres >/dev/null"
as "$bin/pg_ctl -D $work/db -o '-k $work -p 54329 -c listen_addresses=' -l $work/log start -w >/dev/null"
trap 'as "$bin/pg_ctl -D $work/db stop -m immediate >/dev/null" || true; rm -rf "$work"' EXIT
db() { psql -h "$work" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
db -f "$here/stubs.sql" >/dev/null
for m in "$here"/../migrations/*.sql; do
  # pg_cron is stubbed in stubs.sql
  sed 's/^create extension if not exists pg_cron;//' "$m" | db -f - >/dev/null || { echo "FAILED migration $(basename "$m")"; exit 1; }
done
echo "ok migrations"
for t in "$here"/*.test.sql; do
  db -f "$t" || { echo "FAILED $(basename "$t")"; exit 1; }
done
