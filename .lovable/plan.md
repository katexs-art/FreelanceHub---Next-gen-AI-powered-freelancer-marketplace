## Overview
Most of this flow is already implemented in `OrderWorkspace.tsx` and Postgres functions. The remaining gaps are: a dedicated requirements route, smarter post-checkout redirect, realtime updates, and a couple of small notification fixes.

## What's already working (no changes)
- Requirements form, submission, deadline calc → updates `requirements_submitted` and sets status to `active`.
- Seller delivery upload to `delivery-files` bucket, `order_deliveries` insert, status → `delivered`, `auto_complete_at = now() + 3 days`.
- `approve_delivery(_order_id)` RPC sets `status=completed`, releases escrow, clears `seller_credit` transactions → triggers `recompute_seller_balance()` (pending → available). Notifies seller.
- `request_revision` UI: sets status `revision_requested` and increments `revision_count`.
- DB triggers `notify_on_order_status`, `notify_on_delivery` already insert into `notifications` for every status change/delivery.

## Changes

### 1. New page: `src/pages/orders/RequirementsPage.tsx`
- Route: `/orders/:id/requirements` (lazy-loaded, wrapped in `ProtectedRoute`).
- Loads order + gig requirements; only the buyer can submit.
- Guards: if `order.requirements_submitted` is already true OR `user !== buyer_id`, redirect to `/orders/:id`.
- Validates all required questions answered. Inserts into `order_requirements_answers`, then updates `orders` with `requirements_submitted=true`, `status='active'`, `delivery_deadline = now() + package.delivery_days * 1d`.
- On success: toast + redirect to `/orders/:id`.

### 2. `CheckoutSuccess.tsx`
- When the newly created order is found, redirect to `/orders/:id/requirements` instead of `/orders/:id`. Keep the "All projects" button as-is.

### 3. `OrderWorkspace.tsx`
- Add a Supabase Realtime subscription in a `useEffect` keyed on `id`:
  - Channel: `order:${id}`
  - Subscribes to `postgres_changes` on `public.orders` filter `id=eq.${id}` (all events) and on `public.order_deliveries` filter `order_id=eq.${id}` (INSERT).
  - On any payload → call `load()`. Cleanup on unmount.
- Remove the now-redundant inline Requirements section so the flow funnels through the new route (keep the "Waiting for partner to send requirements" empty state for the seller side).
- Tighten `requestRevision` to also send a notification (the order status trigger already covers this; verify and only add if missing — current trigger fires on any status change so we're covered).
- Keep existing `accept` calling `approve_delivery` RPC (per your choice).

### 4. Realtime publication (migration)
- Ensure `public.orders` and `public.order_deliveries` are in the `supabase_realtime` publication so postgres_changes events flow:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_deliveries;
  ALTER TABLE public.orders REPLICA IDENTITY FULL;
  ALTER TABLE public.order_deliveries REPLICA IDENTITY FULL;
  ```
  Wrapped in `DO` block to be idempotent (skip if already added).

### 5. App routing
- Add lazy import + `<Route path="/orders/:id/requirements" element={<ProtectedRoute><RequirementsPage /></ProtectedRoute>} />` in `src/App.tsx`.

## Out of scope
- No changes to existing RPCs, triggers, or storage policies — all already correct.
- No new `complete-order` edge function (per your answer; existing `approve_delivery` RPC handles funds release via triggers, and `stripe-auto-transfer` handles Stripe-side payout asynchronously).
- No enum changes (`active` stays as-is per your answer).
- No changes to `OrdersList`, dashboards, or email templates.

## Files touched
- `src/App.tsx` — add route
- `src/pages/orders/CheckoutSuccess.tsx` — redirect to requirements
- `src/pages/orders/RequirementsPage.tsx` — new file
- `src/pages/orders/OrderWorkspace.tsx` — add realtime subscription, drop inline requirements form
- One new SQL migration enabling realtime for `orders` + `order_deliveries`
