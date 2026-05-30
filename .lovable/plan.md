## Goal
Make the day-4 escrow auto-release respect open disputes, notify both parties when funds are held, and show a red "Funds Locked" indicator on disputed orders in the admin panel. Admin dispute resolution actions must trigger the actual Stripe transfer (seller win) or refund (buyer win). Nothing else changes — no styling, layout, or unrelated logic edits.

## 1. Migration: dispute-aware `auto_complete_orders`

Rewrite `public.auto_complete_orders()` (currently in `20260530032139_*.sql`) so it follows the exact decision tree on every cron tick:

1. Select candidate orders where `status = 'delivered'` AND `auto_complete_at <= now()` AND `escrow_status = 'held'`.
2. Split into two sets:
   - **Disputed** = orders whose `status = 'disputed'` OR have a row in `disputes` with `status = 'open'`. (Status will normally already be `'disputed'` because `open_dispute` sets it, but we double-check via the `disputes` table for safety.)
   - **Clean** = the rest.
3. For **Disputed**: do NOT touch `escrow_status`, `status`, or `transactions`. Insert notifications (only if not already inserted for this order — track via a new `dispute_hold_notified_at` timestamp column on `orders` so we don't spam every cron tick):
   - Seller: title "Payout paused", body "Your payout has been paused due to an open dispute on this order. Our team is reviewing and will resolve within 24 hours."
   - Buyer: title "Dispute under review", body "Your dispute is being reviewed. Funds are held securely until resolution."
   - Set `dispute_hold_notified_at = now()`.
4. For **Clean**: keep existing behavior — set `status='completed'`, `escrow_status='released'`, `escrow_released_at=now()`, and flip matching `transactions.seller_credit` rows from `pending` to `cleared` (so `stripe-auto-transfer` picks them up).

Schema additions in the same migration:
- `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_hold_notified_at timestamptz;`

No changes to grants, RLS, or other functions.

## 2. Admin dispute resolution must actually move money

In `src/pages/admin/Admin.tsx` Disputes tab, the two existing buttons currently only update DB rows. Wire them to the real money paths:

- **Refund buyer** — already calls `stripe-refund` ✓ (no change beyond also ensuring the dispute row is marked `resolved_refund` after success; today it's not updated on success). Add: on successful refund, update the dispute to `status='resolved_refund', resolution_outcome='refunded', resolved_at=now()` and the order's `escrow_status='refunded'`.
- **Release to seller** — currently just sets order `completed` + dispute `resolved_release`. Add: also flip the matching `seller_credit` transaction from `pending` → `cleared` and set `escrow_status='released', escrow_released_at=now()`. This causes the existing `stripe-auto-transfer` cron (runs every 5 min) to push the transfer to the seller's Connect account on its next tick. No new edge function required.

These are client-side calls that already run as admin under existing RLS (`tx_seller_read`/admin policies + `orders_party_update` allows admin via `is_admin`). Transactions table currently disallows UPDATE from clients — add an admin UPDATE policy in the same migration:

```sql
CREATE POLICY tx_admin_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

## 3. Admin UI: red "Funds Locked" lock badge on disputed orders

In `src/pages/admin/Admin.tsx`:

- **Disputes tab table**: add a "Funds" column. For any dispute whose order has `escrow_status = 'held'`, render a red lock badge: `<Lock />` icon + text "Funds Locked", using existing destructive token classes already in the file (e.g. `bg-destructive/10 text-destructive`). Load `orders.escrow_status` alongside the existing disputes query (extend the select to join order escrow_status, or fetch order ids in a follow-up query keyed by `order_id`).
- **Orders tab table**: in the Status column, when `status = 'disputed'`, append the same red lock badge next to the status text so Kevin sees locked funds at a glance from the Orders view too.

No icon library additions needed — `lucide-react` is already used (`Users`, `Wallet`, etc.); add `Lock` to the existing import.

## 4. Files touched

- New migration: rewrite `auto_complete_orders`, add `orders.dispute_hold_notified_at`, add `tx_admin_update` policy on `transactions`.
- Edited: `src/pages/admin/Admin.tsx` — load order escrow_status into disputes view, add red Lock badge in Disputes and Orders tables, extend "Refund buyer" and "Release to seller" handlers to update transaction + order escrow state.

No edge function changes (the existing `stripe-auto-transfer` cron handles the actual transfer for the seller-win case; `stripe-refund` handles the buyer-win case). No CSS, font, layout, or other page changes.

## Technical notes

- Notification deduping: `dispute_hold_notified_at IS NULL` gate ensures the seller/buyer pair is notified exactly once per disputed order, even though the cron runs every minute.
- Decision tree enforcement: the rewritten function NEVER releases funds when status is `disputed` or when an open `disputes` row exists — both checks are in the same SQL `WHERE` clause for atomicity.
- Day-4 timing is preserved via the existing `auto_complete_at` column (set on delivery); we only add gating, not new timing logic.
