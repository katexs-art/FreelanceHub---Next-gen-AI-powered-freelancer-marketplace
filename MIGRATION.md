# Migrating from Lovable Cloud to your own Supabase project

This guide walks you through moving the Postgres database, Edge Functions, and frontend config from the Lovable Cloud-managed Supabase project (`nswgubxabcjyfsgbiicz`) into your own Supabase project (`lquoahkuzqwtiihshdaf`).

Everything runs **locally on your machine** against connection strings you control. No third-party "migration helper" tool, no service-role key handed out to anyone, no edge function deployed for the purpose of exporting data.

> Order matters: dump → restore → deploy functions → set secrets → switch frontend → migrate auth users.

---

## 0. Prerequisites

You need the Postgres 15 client tools (Supabase runs PG 15.x — version mismatches cause `pg_dump` to refuse to run) and the Supabase CLI.

**macOS**
```bash
brew install postgresql@15
brew install supabase/tap/supabase
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
```

**Ubuntu/Debian**
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update && sudo apt-get install -y postgresql-client-15
npm i -g supabase
```

**Windows**: install the PostgreSQL 15 installer from postgresql.org and `npm i -g supabase`.

Verify:
```bash
pg_dump --version    # must say 15.x
supabase --version
```

---

## 1. Get both connection strings

You'll need the **direct connection** (port 5432) for both projects — *not* the pooler (port 6543). The pooler is incompatible with `pg_dump`/`pg_restore`.

**Source — Lovable Cloud (`nswgubxabcjyfsgbiicz`)**
- In Lovable: open the project → **Cloud** → **Backend** → **Database**.
- Copy the direct connection string and the database password.

**Destination — your Supabase (`lquoahkuzqwtiihshdaf`)**
- supabase.com → your project → **Project Settings** → **Database** → **Connection string** → choose **URI** under "Direct connection".
- If you don't know the DB password, reset it on that same page.

Both URLs look like:
```
postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres
```

Export them once so the commands below stay clean:
```bash
export SOURCE_DB="postgresql://postgres:[SRC_PASSWORD]@db.nswgubxabcjyfsgbiicz.supabase.co:5432/postgres"
export DEST_DB="postgresql://postgres:[DEST_PASSWORD]@db.lquoahkuzqwtiihshdaf.supabase.co:5432/postgres"
```

---

## 2. Dump the `public` schema from Lovable Cloud

```bash
pg_dump \
  --clean --if-exists \
  --no-owner --no-privileges \
  --schema=public \
  --format=custom \
  --file=katexs_backup.dump \
  "$SOURCE_DB"
```

Flag-by-flag:
- `--clean --if-exists` — emit `DROP ... IF EXISTS` before each `CREATE`, so a re-run on the destination is idempotent.
- `--no-owner --no-privileges` — strips the source's role/grant statements; Supabase manages those itself on the destination.
- `--schema=public` — only your app's tables, functions, triggers, RLS policies. Skips Supabase-managed schemas (`auth`, `storage`, `realtime`, `vault`, etc.) which you must not touch.
- `--format=custom` — binary format required by `pg_restore`; supports parallel restore and selective restores.

You'll get a single `katexs_backup.dump` file. Keep it private — it contains all your application data.

> **Important — `auth.users` is NOT in this dump.** Supabase manages the `auth` schema and won't let you `pg_dump` it directly. Migrating users is covered in step 6.

---

## 3. Restore into your new Supabase project

```bash
pg_restore \
  --clean --if-exists \
  --no-owner --no-privileges \
  --dbname="$DEST_DB" \
  katexs_backup.dump
```

Expected warnings (safe to ignore):
- `must be owner of extension ...` for extensions Supabase has already installed.
- `role "postgres" does not exist` style messages — `--no-owner` already neutralized ownership.

Hard failures (must fix): anything referencing a missing extension. If you see `extension "pg_net"` or similar, enable it in the destination via supabase.com → **Database** → **Extensions**, then re-run `pg_restore`.

Verify a few row counts match:
```bash
psql "$SOURCE_DB" -c "SELECT 'profiles' AS t, count(*) FROM profiles UNION ALL SELECT 'orders', count(*) FROM orders UNION ALL SELECT 'gigs', count(*) FROM gigs;"
psql "$DEST_DB"   -c "SELECT 'profiles' AS t, count(*) FROM profiles UNION ALL SELECT 'orders', count(*) FROM orders UNION ALL SELECT 'gigs', count(*) FROM gigs;"
```

---

## 4. Re-deploy Edge Functions

```bash
supabase login
supabase link --project-ref lquoahkuzqwtiihshdaf
```

From the project root, deploy every function in `supabase/functions/`:

```bash
supabase functions deploy ai-search
supabase functions deploy announcement-send
supabase functions deploy auth-email-hook
supabase functions deploy order-reminders
supabase functions deploy payout-method-save
supabase functions deploy process-email-queue
supabase functions deploy river-chat
supabase functions deploy river-ops-chat
supabase functions deploy river-public-match
supabase functions deploy send-marketplace-email
supabase functions deploy stripe-auto-transfer
supabase functions deploy stripe-checkout
supabase functions deploy stripe-connect-onboard
supabase functions deploy stripe-connect-status
supabase functions deploy stripe-instant-payout
supabase functions deploy stripe-payment-intent
supabase functions deploy stripe-payout
supabase functions deploy stripe-refund
supabase functions deploy stripe-webhook
supabase functions deploy system-health
```

`supabase/config.toml` already contains the per-function `verify_jwt` settings — the CLI picks those up automatically.

---

## 5. Set Edge Function secrets

The functions in this project read these env vars at runtime. Set them on the new project (values come from your own accounts — never copy them between projects without a reason):

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_PUBLISHABLE_KEY=pk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  ANTHROPIC_API_KEY=sk-ant-... \
  SENDGRID_API_KEY=SG.... \
  RESEND_API_KEY=re_...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — do **not** set them manually.

After deploying, update your Stripe webhook endpoint in the Stripe Dashboard to:
```
https://lquoahkuzqwtiihshdaf.supabase.co/functions/v1/stripe-webhook
```
and copy the new `whsec_...` back into `STRIPE_WEBHOOK_SECRET`.

---

## 6. Migrate auth users

Passwords are stored as bcrypt hashes in `auth.users` and **cannot be exported in plaintext**. Pick one:

**Option A — Password reset (recommended, simplest).**
Re-create users via the Supabase Admin API with no password, then have each user run "forgot password" on first login.

```bash
# Export users from source
psql "$SOURCE_DB" -c "COPY (SELECT id, email, raw_user_meta_data FROM auth.users) TO STDOUT WITH CSV HEADER" > users.csv
```

Then loop over the CSV and call the destination's Admin API (`POST /auth/v1/admin/users`) with `email_confirm: true` and no password. Users get a "set your password" email.

**Option B — Preserve hashes (advanced).**
Supabase supports importing bcrypt hashes via the Admin API's `password_hash` field. See: https://supabase.com/docs/reference/javascript/auth-admin-createuser
Your existing `public.profiles.id` values must match the new `auth.users.id`s, or you'll break every foreign key. Easiest way: pass the original `id` when creating each user via the admin API.

Either way, after migrating users, re-check that `profiles.id` rows all have a matching `auth.users.id` on the destination:
```sql
SELECT count(*) FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;
-- should return 0
```

---

## 7. Storage buckets

`pg_dump --schema=public` does **not** include storage buckets or their objects. If you have any buckets in use:

1. List source buckets: supabase.com → source project → **Storage**.
2. Recreate each bucket on the destination with the same name and public/private setting.
3. If you need to copy objects, use the Supabase CLI:
   ```bash
   supabase storage cp -r ss:///source-bucket ss:///dest-bucket \
     --experimental --linked  # see `supabase storage --help`
   ```
   Or write a one-off Node script using both projects' service-role keys.

---

## 8. Switch the frontend to the new project

The `.env` file in this repo is managed by Lovable Cloud and will keep pointing at `nswgubxabcjyfsgbiicz` as long as the project remains connected. To run this codebase against your own Supabase outside of Lovable, set these in a local `.env.local` (or your hosting provider's env settings):

```env
VITE_SUPABASE_URL="https://lquoahkuzqwtiihshdaf.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key from supabase.com → Settings → API>"
VITE_SUPABASE_PROJECT_ID="lquoahkuzqwtiihshdaf"
```

Regenerate the typed client:
```bash
supabase gen types typescript --project-id lquoahkuzqwtiihshdaf > src/integrations/supabase/types.ts
```

---

## 9. Verification checklist

- [ ] Row counts match for `profiles`, `orders`, `gigs`, `messages`, `reviews`, `transactions`.
- [ ] `SELECT count(*) FROM pg_policies WHERE schemaname='public'` returns the same number on both sides.
- [ ] All Edge Functions return 200 from a smoke test: `curl https://lquoahkuzqwtiihshdaf.supabase.co/functions/v1/system-health -H "Authorization: Bearer <anon>"`.
- [ ] Stripe webhook fires successfully (trigger a test event from the Stripe Dashboard).
- [ ] You can sign in as a migrated user.
- [ ] No orphan `profiles.id` rows (see step 6).

---

## Security notes

- The dump file contains every row of your database — treat it like a password. Delete it once the restore is verified.
- Never paste your DB password or service-role key into a chat with any AI tool (including this one). If you ever do, rotate immediately via the Supabase dashboard.
- If anyone — including a "migration helper" service — asks you to deploy an edge function that uses `SUPABASE_SERVICE_ROLE_KEY` to send data to a URL they control, that is a data-exfiltration backdoor. The procedure in this document is the safe alternative: you run everything yourself, against endpoints you control.
