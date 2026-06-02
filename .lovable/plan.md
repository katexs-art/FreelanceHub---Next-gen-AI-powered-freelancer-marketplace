
## Context

`pg_cron` is already enabled (v1.6.4). The database also already has two security-definer functions that do exactly what the two requested jobs need — and they correctly handle balance math via triggers, which your raw SQL would have bypassed:

- `public.clear_due_seller_credits()` — flips matured `seller_credit` transactions from `pending` → `cleared`. The `trg_recompute_from_transaction` trigger then calls `recompute_seller_balance()`, which moves funds from `pending_balance` → `available_balance` from a single source of truth.
- `public.auto_complete_orders()` — finds delivered orders past `auto_complete_at`, skips any with open disputes (notifying both parties), completes the rest, releases escrow, and clears the related `seller_credit` transactions (which again recomputes balances via trigger).

Schema notes that made your draft SQL incorrect:
- `seller_accounts` uses `seller_id`, not `user_id`.
- `transactions` uses a `status` enum (`pending`/`cleared`), not a `cleared` boolean.
- Balances are derived — never written directly. They're recomputed by triggers from transactions + withdrawals.

So the right move is to schedule the existing functions on an hourly cadence rather than write parallel inline SQL.

## Changes

Single migration that:

1. Ensures `pg_cron` is enabled (already is, but idempotent).
2. Unschedules any prior jobs with the same names (idempotent re-run safety).
3. Schedules two jobs at the top of every hour:
   - `clear-funds` → `SELECT public.clear_due_seller_credits();`
   - `auto-complete-orders` → `SELECT public.auto_complete_orders();`

### SQL

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

## Out of scope

- No application/frontend code changes.
- No edits to the existing SQL functions — they already implement the requested behavior correctly and safely (dispute handling, escrow release, balance recompute via triggers).
- No changes to staggering — both jobs run at minute 0; if you'd prefer to offset (e.g. clear-funds at `:00`, auto-complete at `:30`), say the word and I'll adjust.
