#!/usr/bin/env bash
# Ejecuta las migraciones + seed + pruebas en una base PostgreSQL desechable.
# Uso: DATABASE_URL=postgres://postgres@localhost:54322/postgres npm run test:db
set -euo pipefail
BASE_URL="${DATABASE_URL:-postgres://postgres@localhost:54322/postgres}"
DB="barber_test_$$"
psql "$BASE_URL" -qc "create database $DB" >/dev/null
trap 'psql "$BASE_URL" -qc "drop database if exists $DB" >/dev/null' EXIT
TEST_URL="${BASE_URL%/*}/$DB"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 \
  -f supabase/tests/auth_stub.sql \
  -f supabase/migrations/20261120000001_schema.sql \
  -f supabase/seed.sql \
  -f supabase/tests/booking_tests.sql 2>&1 | grep -vE "does not exist, skipping"
