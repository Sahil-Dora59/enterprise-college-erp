#!/usr/bin/env bash

set -euo pipefail

# This command intentionally owns the entire test database lifecycle. It never
# reads or reuses the application's DATABASE_URL or TEST_DATABASE_URL.
unset DATABASE_URL TEST_DATABASE_URL

work_dir="$(mktemp -d /tmp/college-erp-api-db-test.XXXXXX)"
data_dir="$work_dir/data"
socket_dir="$work_dir/socket"
log_file="$work_dir/postgres.log"
port="$(shuf -i 45000-49999 -n 1)"
database_user="erp_test"
database_name="erp_test"

cleanup() {
  pg_ctl -D "$data_dir" -m fast -w stop >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$socket_dir"
initdb \
  -D "$data_dir" \
  --username="$database_user" \
  --no-locale \
  --encoding=UTF8 \
  --auth=trust \
  >/dev/null

pg_ctl \
  -D "$data_dir" \
  -l "$log_file" \
  -o "-p $port -h 127.0.0.1 -k $socket_dir" \
  -w \
  start \
  >/dev/null

createdb \
  -h 127.0.0.1 \
  -p "$port" \
  -U "$database_user" \
  "$database_name"

test_database_url="postgresql://$database_user@127.0.0.1:$port/$database_name"

pg_isready -h 127.0.0.1 -p "$port" -U "$database_user" -d "$database_name" >/dev/null
DATABASE_URL="$test_database_url" \
  psql "$test_database_url" -v ON_ERROR_STOP=1 -Atc "select 1" \
  | grep -qx "1"

DATABASE_URL="$test_database_url" \
  pnpm --filter @workspace/db run push

TEST_DATABASE_URL="$test_database_url" \
  DATABASE_URL="$test_database_url" \
  pnpm exec tsx --test test/database.smoke.test.ts