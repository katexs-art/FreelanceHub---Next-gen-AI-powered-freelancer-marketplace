## Goal
Add a `MIGRATION.md` at the project root with copy-paste `pg_dump` → `pg_restore` instructions for moving the Lovable Cloud database into the user's own Supabase project (`lquoahkuzqwtiihshdaf`). No code, no edge function, no third-party tool.

## What the doc will cover

1. **Where to get connection strings (both sides)**
   - Source: Lovable Cloud → Backend → Database → Connection string (session pooler, port 5432, direct connection for `pg_dump`).
   - Destination: supabase.com dashboard → your project → Project Settings → Database → Connection string.
   - Note: use the **direct connection** (not the pooler) for dump/restore.

2. **Prerequisites**
   - Install Postgres 15+ client tools locally (matching Supabase's PG version) so `pg_dump`/`pg_restore` versions line up. Commands for macOS (`brew install postgresql@15`), Ubuntu, Windows.

3. **Step 1 — Dump from Lovable Cloud (schema + data, public schema only)**
   ```bash
   pg_dump \
     --clean --if-exists --no-owner --no-privileges \
     --schema=public \
     --format=custom \
     --file=katexs_backup.dump \
     "postgresql://postgres:[PASSWORD]@db.nswgubxabcjyfsgbiicz.supabase.co:5432/postgres"
   ```
   - Explain each flag.
   - Note that `auth.users` is **not** included (it lives in the `auth` schema and is managed by Supabase). Users will need to be re-created or migrated separately via Supabase's Auth admin API — call this out clearly.

4. **Step 2 — Restore into the new Supabase project**
   ```bash
   pg_restore \
     --clean --if-exists --no-owner --no-privileges \
     --dbname="postgresql://postgres:[PASSWORD]@db.lquoahkuzqwtiihshdaf.supabase.co:5432/postgres" \
     katexs_backup.dump
   ```

5. **Step 3 — Re-deploy edge functions**
   - Install Supabase CLI (`npm i -g supabase`).
   - `supabase link --project-ref lquoahkuzqwtiihshdaf`
   - `supabase functions deploy` (list of function names from `supabase/functions/`).
   - Re-add all secrets via `supabase secrets set KEY=value` (list which ones based on what's currently configured — Stripe, Anthropic, SendGrid, etc.).

6. **Step 4 — Point the frontend at the new project**
   - Update `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
   - Regenerate types: `supabase gen types typescript --project-id lquoahkuzqwtiihshdaf > src/integrations/supabase/types.ts`.

7. **Auth users caveat (important)**
   - Explain that user passwords cannot be migrated as plaintext. Two options:
     - Have users reset passwords on the new project (recommended).
     - Use Supabase's admin Auth API to bulk-import users with hashed passwords (link to Supabase docs).

8. **Verification checklist**
   - Row counts match on both sides (sample SELECTs).
   - RLS policies present.
   - Storage buckets re-created manually if any exist.

## Out of scope
- I will not write any code that auto-runs the migration, and I will not deploy any "helper" edge function. Everything is run by you locally against connection strings you control.

## Deliverable
One new file: `MIGRATION.md` at project root. Nothing else changes.