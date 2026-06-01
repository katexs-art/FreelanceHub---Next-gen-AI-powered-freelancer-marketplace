## Problem

Buyers see `orders_buyer_id_fkey` violation when clicking Continue. The `orders.buyer_id` has a foreign key to `public.profiles(id)`. Investigation shows:

- The `on_auth_user_created` trigger on `auth.users` already exists and runs `handle_new_user()` (which inserts into `profiles` with `ON CONFLICT DO NOTHING`).
- However, **2 existing auth users have no profile row** — including `kdh@katexs.com` (the buyer hitting the error) and `admin@katexs.com`. These accounts predate or skipped the trigger, so any order they try to create fails the FK.
- Order creation already uses `auth.uid()` correctly (via the `create_gig_order` RPC + Checkout page), so the buyer ID source is fine — the issue is purely the missing profile row.

## Fix

**One migration that:**

1. **Backfills missing profiles** for every `auth.users` row that lacks one, using their email + metadata, matching the logic in `handle_new_user()`.
2. **Re-asserts the trigger** (`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ... EXECUTE FUNCTION public.handle_new_user()`) so we're certain it's wired up.
3. **Hardens `handle_new_user()`** to never block signup: wrap the insert in an exception handler that logs but doesn't raise, so a future edge case (e.g. unique-username clash) can't leave an auth user orphaned again.

No code changes needed — order creation already pulls `buyer_id` from `auth.uid()` server-side in the `create_gig_order` SECURITY DEFINER function.

## Verification

1. Re-run the missing-profiles query → expect 0 rows.
2. Sign in as `kdh@katexs.com`, open a gig, click Continue → order should be created and route to `/checkout/:id` without FK error.
3. Complete a test payment end-to-end to confirm `stripe-payment-intent` → checkout → `orders` flow works.
