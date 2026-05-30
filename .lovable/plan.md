
# Order Placement & Escrow System

## 1. Database migration

Extend `orders` and wire bid/pitch acceptance to create draft orders.

- Add columns to `public.orders`:
  - `escrow_status text not null default 'none'` — values: `none | held | released | refunded`
  - `escrow_released_at timestamptz`
  - `project_title text`
  - `bid_id uuid`, `pitch_message_id uuid` (nullable, identify source)
  - `dispute_deadline timestamptz` — set when status flips to `delivered`
  - `reminder_halfway_sent_at`, `reminder_24h_sent_at`, `reminder_late_sent_at` timestamptz (idempotency for cron)
- Make `gig_id` and `package_id` nullable on `orders` (bid/pitch orders have no gig).
- Update fee constant: change `FEE_PCT` in `stripe-webhook` from `0.20` to `0.10`. Add a `platform_fee_rate` column? No — single constant is fine.
- New RPC `create_escrow_order(_source text, _source_id uuid)`:
  - `_source` = `'bid'` or `'pitch'`. Looks up bid/pitch, validates caller is the buyer.
  - Computes price (bid amount or pitch_price in cents → dollars), delivery_days.
  - Inserts an `orders` row with `status='pending_payment'`, `escrow_status='none'`, 10% `platform_fee`, `seller_earnings`, `project_title` derived from project/conversation, `bid_id`/`pitch_message_id` set, `delivery_deadline = now() + delivery_days`.
  - Marks bid `status='accepted'` (and others on same project `closed`) / pitch message `message_type='pitch_accepted'`.
  - Returns the new order id.
- New RPC `approve_delivery(_order_id uuid)`:
  - Validates caller = buyer and order.status = `delivered`.
  - Sets `status='completed'`, `completed_at=now()`, `escrow_status='released'`, `escrow_released_at=now()`.
  - Flips the matching `seller_credit` transaction row from `pending` to `cleared` (skip the 14-day wait for these orders).
  - Notifies seller.
- New RPC `raise_dispute(_order_id uuid, _reason text)`:
  - Validates caller is buyer or seller; status must be `delivered`.
  - Sets `status='disputed'` (uses existing `disputed` enum); inserts into `disputes`; notifies both parties + admin (via `create_notification` to every admin profile).
- Update `accept_bid` RPC: do NOT flip project to `in_progress` until payment succeeds — instead return the new order id from `create_escrow_order`. (Or keep `accept_bid` and call `create_escrow_order` from client. Simpler: client calls `create_escrow_order('bid', bid_id)`.)
- Trigger `orders_auto_dispute_deadline`: on UPDATE when status transitions to `delivered`, set `dispute_deadline = now() + interval '3 days'` and `auto_complete_at = dispute_deadline`.
- Existing `auto_complete_orders()` cron already flips delivered → completed at `auto_complete_at`; extend it to also set `escrow_status='released'` and clear the pending seller_credit.

## 2. Stripe — embedded Payment Element

New edge function `stripe-payment-intent`:
- POST `{ order_id }` from authenticated buyer.
- Loads order, verifies caller = buyer_id and status = `pending_payment`.
- Creates `PaymentIntent` with `amount = price*100`, currency usd, metadata `{ order_id, buyer_id, seller_id }`, `automatic_payment_methods.enabled = true`.
- Stores `stripe_payment_intent_id` on the order (idempotent: reuse if exists and not succeeded).
- Returns `{ client_secret, publishable_key }`.

Existing `stripe-webhook` additions:
- New handler for `payment_intent.succeeded`: if `metadata.order_id` exists, mark order `status='pending_requirements'`, `escrow_status='held'`, insert the same three transactions rows (charge, platform_fee 10%, seller_credit pending). Skip the existing checkout.session.completed path for these.
- Change `FEE_PCT` to `0.10` (affects gig flow too, per your choice).

Frontend dependency: add `@stripe/stripe-js` + `@stripe/react-stripe-js`. Publishable key returned by the edge function (we already store STRIPE_SECRET_KEY; we'll also need `STRIPE_PUBLISHABLE_KEY` — add via secrets tool if missing).

## 3. New page `src/pages/Checkout.tsx` at `/checkout/:order_id`

- Loads order + seller profile + (river score helper from `ProjectBids`).
- Top summary card: avatar + name + River score (left); project_title + price `$XX` 22px/700 + deadline (right).
- Section "Secure Payment" 16px/700; grey banner with the exact escrow copy 13px #666.
- Mounts `<Elements>` with `clientSecret` from `stripe-payment-intent`.
- Renders `<PaymentElement />`.
- Totals breakdown: Subtotal, "Katexs Service Fee" (10%), Total bold.
- Black full-width button `Pay & Start Project` (border-radius 999, h-52, 16px/700). On click → `stripe.confirmPayment({ confirmParams: { return_url: /orders/:id } })`. Webhook does the order activation; success page already polls.
- Best-effort emails on success (buyer "payment secured" / seller "order started — deliver by …") via existing `send-marketplace-email`.

Route added to `App.tsx`.

## 4. Bid/Pitch → checkout wiring

- `src/pages/ProjectBids.tsx`: change "Accept Bid" click to call RPC `create_escrow_order('bid', b.id)` then navigate to `/checkout/<order_id>` (replaces current navigate to checkout/success).
- `src/pages/Inbox.tsx`: pitch card "Accept & Place Order" button → call `create_escrow_order('pitch', message.id)` then navigate to `/checkout/<order_id>` (replaces current `/u/<username>?pitch=…` route).

## 5. Delivery + dispute UI on `OrderWorkspace`

`src/pages/orders/OrderWorkspace.tsx`:
- Seller: existing "Send a delivery" form already exists; keep it. Confirm the form already flips status to `delivered` and writes `auto_complete_at = now()+3 days`. Adjust to set `dispute_deadline` too (handled by trigger).
- Buyer-side, when status = `delivered`:
  - Replace existing "Accept & complete" button with `Approve Delivery` → calls `approve_delivery` RPC.
  - Add `Raise a Dispute` button (opens small modal with reason textarea) → `raise_dispute` RPC.
  - Show countdown banner: "X days remaining to review — approve or dispute by <date>".

## 6. Reminder cron

New edge function `order-reminders` (no auth, called by pg_cron with service role bearer):
- Selects orders with `status IN ('pending_requirements','active','revision_requested','delivered')` and a non-null deadline.
- For each:
  - If 50% of window elapsed and `reminder_halfway_sent_at IS NULL` → notify seller, set timestamp.
  - If <24h until deadline and `reminder_24h_sent_at IS NULL` → notify both parties.
  - If past deadline and no delivery and `reminder_late_sent_at IS NULL` → set order status `late` (new enum value — add via migration), notify both parties.

Schedule via `supabase--insert` (not migration, contains URL + anon key):
```sql
select cron.schedule('order-reminders-15m', '*/15 * * * *', $$
  select net.http_post(
    url:='https://<ref>.supabase.co/functions/v1/order-reminders',
    headers:='{"Authorization":"Bearer <anon>","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
$$);
```

Also add `late` to the `order_status` enum in the migration.

## 7. Notification & email copy

All notification rows inserted via `create_notification`. Email sends best-effort via existing `send-marketplace-email` (no new template files — just pass `template` strings the user can map later; current function accepts arbitrary templates). Exact strings per spec.

## 8. Files touched

- New: `supabase/migrations/<ts>_escrow_orders.sql`, `supabase/functions/stripe-payment-intent/index.ts`, `supabase/functions/order-reminders/index.ts`, `src/pages/Checkout.tsx`.
- Edited: `src/App.tsx` (route), `src/pages/ProjectBids.tsx`, `src/pages/Inbox.tsx`, `src/pages/orders/OrderWorkspace.tsx`, `supabase/functions/stripe-webhook/index.ts`.
- Deps: `@stripe/stripe-js`, `@stripe/react-stripe-js`.
- Secret: `STRIPE_PUBLISHABLE_KEY` (request via add_secret if not present).

## 9. Out of scope / preserved

No visual changes outside the new Checkout page and the new buyer-action buttons inside `OrderWorkspace`. Colors/fonts/layout/icons across the rest of the site untouched. Existing 14-day clears continue to apply to gig orders that don't go through the new approve/auto-release path.
