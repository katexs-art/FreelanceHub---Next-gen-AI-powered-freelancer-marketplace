#!/usr/bin/env node
/**
 * Bulk-import auth.users from the source Supabase project into the destination
 * via the Admin API.
 *
 * Run this AFTER scripts/migrate.sh so that public.profiles rows already exist
 * on the destination — this script preserves the original `id`, which is what
 * keeps every foreign key (profiles.id, orders.buyer_id, ...) intact.
 *
 * Two modes (set MODE):
 *   reset  (default) — create user with no password, mark email confirmed.
 *                       User must use "Forgot password" on first login.
 *   hash            — preserve bcrypt password hash from source so users keep
 *                       their existing passwords. Requires direct DB access to
 *                       source (SOURCE_DB) to read auth.users.encrypted_password.
 *
 * Required env vars:
 *   SOURCE_DB                  Postgres URL for the OLD project (read-only OK)
 *   DEST_SUPABASE_URL          https://lquoahkuzqwtiihshdaf.supabase.co
 *   DEST_SERVICE_ROLE_KEY      service_role key of DESTINATION project
 *                                (Settings → API → service_role, secret).
 *                                NEVER share or commit this key.
 *
 * Optional:
 *   MODE=reset|hash            (default: reset)
 *   DRY_RUN=1                  print what would happen, don't write
 *   BATCH_SIZE=25              concurrency (default 25)
 *
 * Usage:
 *   npm i pg @supabase/supabase-js
 *   export SOURCE_DB="postgresql://postgres:...@db.nswgubxabcjyfsgbiicz.supabase.co:5432/postgres"
 *   export DEST_SUPABASE_URL="https://lquoahkuzqwtiihshdaf.supabase.co"
 *   export DEST_SERVICE_ROLE_KEY="eyJ..."   # service_role from new project
 *   node scripts/migrate-auth-users.mjs
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const {
  SOURCE_DB,
  DEST_SUPABASE_URL,
  DEST_SERVICE_ROLE_KEY,
  MODE = "reset",
  DRY_RUN = "0",
  BATCH_SIZE = "25",
} = process.env;

function die(msg) { console.error(`\x1b[31m${msg}\x1b[0m`); process.exit(1); }

if (!SOURCE_DB) die("Missing SOURCE_DB");
if (!DEST_SUPABASE_URL) die("Missing DEST_SUPABASE_URL");
if (!DEST_SERVICE_ROLE_KEY) die("Missing DEST_SERVICE_ROLE_KEY");
if (!["reset", "hash"].includes(MODE)) die(`MODE must be 'reset' or 'hash' (got: ${MODE})`);

const dryRun = DRY_RUN === "1";
const concurrency = Math.max(1, parseInt(BATCH_SIZE, 10) || 25);

const admin = createClient(DEST_SUPABASE_URL, DEST_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const client = new pg.Client({ connectionString: SOURCE_DB });
await client.connect();

const selectCols =
  MODE === "hash"
    ? "id, email, phone, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, phone_confirmed_at, encrypted_password, created_at"
    : "id, email, phone, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, phone_confirmed_at, created_at";

console.log(`==> Reading users from source (mode=${MODE}${dryRun ? ", DRY_RUN" : ""})`);
const { rows: users } = await client.query(
  `SELECT ${selectCols} FROM auth.users WHERE deleted_at IS NULL ORDER BY created_at ASC`,
);
await client.end();
console.log(`    ${users.length} users to migrate`);

let ok = 0, skipped = 0, failed = 0;
const errors = [];

async function migrateOne(u) {
  // If user already exists on destination (by id), skip.
  const { data: existing } = await admin.auth.admin.getUserById(u.id);
  if (existing?.user) { skipped++; return; }

  const payload = {
    id: u.id, // CRITICAL: preserve id so FKs in public schema still resolve
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    email_confirm: !!u.email_confirmed_at,
    phone_confirm: !!u.phone_confirmed_at,
    user_metadata: u.raw_user_meta_data ?? {},
    app_metadata: u.raw_app_meta_data ?? {},
  };

  if (MODE === "hash" && u.encrypted_password) {
    payload.password_hash = u.encrypted_password;
  }

  if (dryRun) {
    console.log(`    [dry] ${u.email || u.phone || u.id}`);
    ok++; return;
  }

  const { error } = await admin.auth.admin.createUser(payload);
  if (error) {
    failed++;
    errors.push({ id: u.id, email: u.email, error: error.message });
    return;
  }
  ok++;
}

// Simple bounded-concurrency runner
let cursor = 0;
async function worker() {
  while (cursor < users.length) {
    const i = cursor++;
    const u = users[i];
    try { await migrateOne(u); }
    catch (e) {
      failed++;
      errors.push({ id: u.id, email: u.email, error: e.message });
    }
    if ((ok + skipped + failed) % 25 === 0) {
      process.stdout.write(`\r    progress: ok=${ok} skipped=${skipped} failed=${failed}`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
process.stdout.write("\n");

console.log(`\nDone. ok=${ok}  skipped(existing)=${skipped}  failed=${failed}`);
if (errors.length) {
  console.log("\nErrors:");
  for (const e of errors.slice(0, 50)) console.log(`  ${e.email || e.id}: ${e.error}`);
  if (errors.length > 50) console.log(`  ...and ${errors.length - 50} more`);
}

console.log("\nVerify with this query on the destination:");
console.log("  SELECT count(*) FROM public.profiles p");
console.log("  LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL;");
console.log("  -- should return 0");

if (MODE === "reset") {
  console.log("\nMODE=reset: users have NO password. Tell them to use 'Forgot password' on first login,");
  console.log("or call admin.auth.resetPasswordForEmail() in a follow-up script.");
}
