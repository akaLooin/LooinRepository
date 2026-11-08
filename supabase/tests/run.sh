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
db() { PGOPTIONS="-c client_min_messages=warning" psql -h "$work" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
db -f "$here/stubs.sql" >/dev/null
for m in "$here"/../migrations/*.sql; do
  # pg_cron is stubbed in stubs.sql
  sed 's/^create extension if not exists pg_cron;//' "$m" | db -f - >/dev/null || { echo "FAILED migration $(basename "$m")"; exit 1; }
done
# the friends migration must be safe to run twice (the SQL editor can fail halfway and be re-run)
for m in 20261108000000_friends 20261108000100_reaction_lists 20261108000200_chat 20261108000300_push 20261109000000_feed 20261109000100_diary_mood 20261109000200_crews 20261109000300_crews2; do
  db -f "$here/../migrations/$m.sql" >/dev/null || { echo "FAILED re-running $m"; exit 1; }
done
echo "ok migrations (friends twice)"
for t in "$here"/*.test.sql; do
  db -f "$t" || { echo "FAILED $(basename "$t")"; exit 1; }
done
