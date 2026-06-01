#!/usr/bin/env bash
# End-to-end migration: Lovable Cloud Supabase -> your own Supabase project.
#
# What this does (in order):
#   1. pg_dump  the `public` schema from SOURCE_DB           -> katexs_backup.dump
#   2. pg_restore that dump into DEST_DB
#   3. supabase link to the destination project
#   4. supabase functions deploy <every function in supabase/functions/>
#
# What this does NOT do:
#   - Migrate auth.users (passwords are bcrypt-hashed and can't be pg_dumped).
#     Run scripts/migrate-auth-users.mjs after this script.
#   - Set edge function secrets (STRIPE_*, ANTHROPIC_API_KEY, etc.). Do that
#     manually with `supabase secrets set` — see MIGRATION.md step 5.
#   - Copy Storage bucket objects. See MIGRATION.md step 7.
#
# Required env vars:
#   SOURCE_DB              postgresql://postgres:<pw>@db.nswgubxabcjyfsgbiicz.supabase.co:5432/postgres
#   DEST_DB                postgresql://postgres:<pw>@db.lquoahkuzqwtiihshdaf.supabase.co:5432/postgres
#   DEST_PROJECT_REF       lquoahkuzqwtiihshdaf
#   SUPABASE_ACCESS_TOKEN  personal access token from https://supabase.com/dashboard/account/tokens
#
# Optional:
#   DUMP_FILE              path for the dump file (default: ./katexs_backup.dump)
#   SKIP_DUMP=1            reuse an existing dump file
#   SKIP_RESTORE=1         skip pg_restore (e.g., to re-deploy functions only)
#   SKIP_FUNCTIONS=1       skip edge function deploy
#
# Usage:
#   export SOURCE_DB="postgresql://postgres:...@db.nswgubxabcjyfsgbiicz.supabase.co:5432/postgres"
#   export DEST_DB="postgresql://postgres:...@db.lquoahkuzqwtiihshdaf.supabase.co:5432/postgres"
#   export DEST_PROJECT_REF="lquoahkuzqwtiihshdaf"
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   bash scripts/migrate.sh

set -euo pipefail

DUMP_FILE="${DUMP_FILE:-./katexs_backup.dump}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

require() {
  if [[ -z "${!1:-}" ]]; then red "Missing required env var: $1"; exit 1; fi
}
need() {
  command -v "$1" >/dev/null 2>&1 || { red "Missing CLI: $1"; exit 1; }
}

# ---------- preflight ----------
require SOURCE_DB
require DEST_DB
require DEST_PROJECT_REF
require SUPABASE_ACCESS_TOKEN
need pg_dump
need pg_restore
need supabase

PG_MAJOR="$(pg_dump --version | awk '{print $3}' | cut -d. -f1)"
if [[ "$PG_MAJOR" -lt 15 ]]; then
  red "pg_dump must be 15+ (Supabase runs PG 15.x). Found: $PG_MAJOR"; exit 1
fi

# ---------- 1. dump ----------
if [[ "${SKIP_DUMP:-0}" != "1" ]]; then
  blue "==> Dumping public schema from source"
  pg_dump \
    --clean --if-exists \
    --no-owner --no-privileges \
    --schema=public \
    --format=custom \
    --file="$DUMP_FILE" \
    "$SOURCE_DB"
  green "    wrote $DUMP_FILE ($(du -h "$DUMP_FILE" | awk '{print $1}'))"
else
  blue "==> SKIP_DUMP=1, reusing $DUMP_FILE"
  [[ -f "$DUMP_FILE" ]] || { red "Dump file not found: $DUMP_FILE"; exit 1; }
fi

# ---------- 2. restore ----------
if [[ "${SKIP_RESTORE:-0}" != "1" ]]; then
  blue "==> Restoring into destination"
  # Don't exit on pg_restore warnings (extension ownership etc. are expected).
  set +e
  pg_restore \
    --clean --if-exists \
    --no-owner --no-privileges \
    --dbname="$DEST_DB" \
    "$DUMP_FILE"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    red "pg_restore exited with $rc. Review the errors above."
    red "Common harmless warnings: 'must be owner of extension', 'role does not exist'."
    red "Hard failures usually mean a missing extension on destination — enable in Supabase Dashboard → Database → Extensions."
    exit $rc
  fi
  green "    restore complete"
else
  blue "==> SKIP_RESTORE=1"
fi

# ---------- 3. link ----------
blue "==> Linking Supabase CLI to $DEST_PROJECT_REF"
supabase link --project-ref "$DEST_PROJECT_REF"

# ---------- 4. deploy functions ----------
if [[ "${SKIP_FUNCTIONS:-0}" != "1" ]]; then
  blue "==> Deploying edge functions"
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  FN_DIR="$REPO_ROOT/supabase/functions"
  [[ -d "$FN_DIR" ]] || { red "Not found: $FN_DIR (run from repo root)"; exit 1; }

  shopt -s nullglob
  for d in "$FN_DIR"/*/; do
    name="$(basename "$d")"
    # skip shared helper dirs (anything starting with _)
    [[ "$name" == _* ]] && continue
    blue "    -> $name"
    supabase functions deploy "$name"
  done
  green "    all functions deployed"
else
  blue "==> SKIP_FUNCTIONS=1"
fi

green ""
green "Done. Next steps:"
green "  1. supabase secrets set STRIPE_SECRET_KEY=... ANTHROPIC_API_KEY=... etc."
green "     (full list in MIGRATION.md step 5)"
green "  2. node scripts/migrate-auth-users.mjs   # migrate auth users"
green "  3. Update Stripe webhook endpoint to https://${DEST_PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"
green "  4. Recreate Storage buckets + copy objects (MIGRATION.md step 7)"
green "  5. Verify with the checklist in MIGRATION.md step 9"
