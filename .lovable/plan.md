## Overview
Create a repeatable SQL migration file that registers both hourly cron jobs using `pg_cron`.

## Problem
The `clear-funds` and `auto-complete-orders` cron jobs were set up ad-hoc in the database. They are not tracked in version control, so new environments or restores will lose them.

## Solution
Add a new migration file to `supabase/migrations/` with the cron schedule definitions. The migration must be idempotent so it can be re-run safely.

## SQL Migration

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: remove existing jobs of the same names if present
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('clear-funds','auto-complete-orders');
END $$;

SELECT cron.schedule(
  'clear-funds',
  '0 * * * *',
  $$ SELECT public.clear_due_seller_credits(); $$
);

SELECT cron.schedule(
  'auto-complete-orders',
  '0 * * * *',
  $$ SELECT public.auto_complete_orders(); $$
);
```

## Details
- `clear-funds` runs every hour at minute 0. It calls `public.clear_due_seller_credits()`, which flips matured `seller_credit` transactions from pending to cleared; triggers then recompute seller balances from the transaction ledger.
- `auto-complete-orders` runs every hour at minute 0. It calls `public.auto_complete_orders()`, which auto-completes delivered orders past their auto-complete deadline (skipping any with open disputes), releases escrow, and recomputes balances.
- The `DO $$` block ensures re-running the migration won't fail on duplicate job names.

## Out of scope
- No changes to the existing database functions (`clear_due_seller_credits`, `auto_complete_orders`).
- No application or frontend changes.
- No schedule staggering; both jobs run at `:00` each hour.
