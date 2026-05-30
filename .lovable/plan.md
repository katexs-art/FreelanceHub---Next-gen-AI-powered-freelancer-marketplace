## Goal
Wire Stripe Connect Express end-to-end for approved sellers: yellow setup banner, automatic transfer on order release, and an instant Withdraw button. Reuses the existing `stripe-connect-onboard` function, `seller_accounts` table (`stripe_account_id`, `onboarding_complete`, `charges_enabled`, `payouts_enabled`), and `STRIPE_SECRET_KEY` secret. No visual tokens, fonts, images, or unrelated layout changes.

## 1. Seller dashboard banner + return handling (`src/pages/seller/SellerDashboard.tsx`)

- Load `seller_accounts.charges_enabled` and `onboarding_complete` alongside existing stats.
- When `seller_status === "approved"` and (`!charges_enabled` or `!onboarding_complete`): render a yellow banner at the top — same yellow style as the existing pending banner — text "Add your payout account to start receiving payments", with a black `Button` "Set Up Payouts" that calls `supabase.functions.invoke("stripe-connect-onboard", { body: { return_url: \`${origin}/seller/dashboard?payout=connected\` } })` and redirects to `data.url`.
- On mount, if `searchParams.get("payout") === "connected"`:
  1. Invoke a new `stripe-connect-status` edge function to re-pull the Stripe account and persist `charges_enabled` / `onboarding_complete` / `payouts_enabled`.
  2. If `charges_enabled` is now true and `localStorage[\`katexs:payouts-connected-toast:${user.id}\`]` is unset, fire `toast.success("Payout account connected — you will receive payments automatically after every completed order.")` and set the key.
  3. Strip the query param via `nav("/seller/dashboard", { replace: true })`.
- The literal `/dashboard?payout=connected` in the spec maps to the seller dashboard (no `/dashboard` route exists).

Note: the user-facing route uses `?payout=connected`; for the seller dashboard path I use the actual `/seller/dashboard` because no plain `/dashboard` route exists in the app.

## 2. New edge function `stripe-connect-status`

Reads the caller's `seller_accounts.stripe_account_id`, calls `stripe.accounts.retrieve`, and updates `charges_enabled`, `payouts_enabled`, `onboarding_complete = details_submitted`. Returns the flags. Used by the dashboard return handler and the existing `StripeConnectCard` initial load (refresh path).

## 3. Automatic transfer on escrow release

The product spec says "in the Supabase edge function that handles order completion and fund release after the 3 day window". Today this is the SQL function `auto_complete_orders` (cron-driven) plus the buyer-driven `approve_delivery` RPC. We do not call Stripe from SQL. Plan:

- Add a new edge function `stripe-auto-transfer` (cron-triggered, every 5 minutes) that:
  - Selects `transactions` rows where `type='seller_credit'`, `status='cleared'`, and a new column `stripe_transfer_id IS NULL`.
  - For each, loads `seller_accounts` for the seller; if `stripe_account_id` and `charges_enabled` are present, computes the seller payout = `amount` (the row is already net of the 10% platform fee since the fee is stored as a separate `platform_fee` transaction), and calls `stripe.transfers.create({ amount, currency: "usd", destination: stripe_account_id, transfer_group: order_id, metadata: { transaction_id, order_id, seller_id } })`.
  - Writes the returned `transfer.id` to `transactions.stripe_transfer_id`.
  - Skips (logs only) when the seller has not connected — funds stay available until they connect.
- Migration: `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_transfer_id text;`
- Schedule via `pg_cron` + `pg_net` inserting into the project's existing cron config (separate `supabase--insert` call with the deployed function URL and anon key — not in the migration).

The 3-day window remains enforced by the existing `dispute_deadline` / `auto_complete_at` logic on orders; no changes there.

## 4. Instant Withdraw on Earnings page (`src/pages/seller/Earnings.tsx` + new edge function)

- Replace the "Request" withdrawal flow with an immediate Stripe payout:
  - On click, invoke new edge function `stripe-instant-payout` with `{ amount_cents }`.
  - Function: auth user → loads `seller_accounts` → validates `stripe_account_id` and `payouts_enabled` → calls `stripe.payouts.create({ amount, currency: "usd", method: "instant" }, { stripeAccount: stripe_account_id })`. If "instant" fails (no debit card eligible), retries with `method: "standard"`.
  - On success: inserts a `withdrawals` row with `status='paid'`, `stripe_payout_id = payout.id`, `method = payout.method === 'instant' ? 'stripe_instant' : 'stripe_bank'`. This will trigger `recompute_seller_balance` via the existing trigger.
- Button stays disabled until `acct.charges_enabled && acct.payouts_enabled`. Helper text: "Instant for debit cards, 1–2 business days for bank accounts."
- Existing `PayoutMethodCard` (paypal/bank manual entry) stays unchanged — out of scope; the Stripe Connect card is now the canonical path.

## 5. Files touched

- New: `supabase/functions/stripe-connect-status/index.ts`, `supabase/functions/stripe-auto-transfer/index.ts`, `supabase/functions/stripe-instant-payout/index.ts`.
- New migration: add `transactions.stripe_transfer_id`.
- New scheduled job via `supabase--insert` (pg_cron) calling `stripe-auto-transfer` every 5 minutes.
- Edited: `src/pages/seller/SellerDashboard.tsx` (banner, return handler, status load), `src/pages/seller/Earnings.tsx` (Withdraw → instant payout, button gating).
- No changes to global styles, fonts, layout, or any other page.
