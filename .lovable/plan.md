# Gate custom-offer acceptance behind Stripe payment

Today `accept_custom_offer` immediately creates an order in `pending_requirements` and flips the offer to `accepted` — no payment required. We'll reroute acceptance through the existing `/checkout/:order_id` + `stripe-payment-intent` + `stripe-webhook` pipeline so the order only becomes active after Stripe confirms payment.

## Changes

### 1. Database migration
- Add `pending_payment` to the `offer_status` enum.
- Rewrite `public.accept_custom_offer(_offer_id uuid)`:
  - Same auth/ownership checks.
  - Insert order with `status = 'pending_payment'`, `escrow_status = 'none'`, fees computed, `delivery_deadline` left null (set when payment clears, matching gig checkout behavior).
  - Update offer to `status = 'pending_payment'` and store the new `order_id` (reuse existing `custom_offers` columns; add an `order_id uuid` column if not present — verify and include in migration).
  - Return the new `order_id`.

### 2. Edge function: `stripe-webhook`
In the existing `payment_intent.succeeded` branch, after the order transitions to `pending_requirements`, also:
```ts
// If this order originated from a custom offer, mark the offer accepted
await admin.from("custom_offers")
  .update({ status: "accepted" })
  .eq("order_id", order.id);
```
(Matched via the new `custom_offers.order_id` link, or via buyer/seller/price fallback if we decide not to add the column.)

### 3. Frontend: `src/components/marketplace/CustomOfferCard.tsx`
- `accept()` calls the RPC, then navigates to `/checkout/${order_id}` instead of `/orders/${order_id}`.
- Render `offer.status === "pending_payment"` as the badge label "Pending payment" and hide Accept/Decline buttons in that state (buyer sees a "Complete payment" button that links back to `/checkout/:order_id`; seller sees "Awaiting buyer payment").

### 4. Existing Checkout page
No code change needed — `/checkout/:order_id` already loads orders with `status = 'pending_payment'`, calls `stripe-payment-intent`, and the webhook already handles `payment_intent.succeeded` → `pending_requirements`.

## Result
- Clicking Accept creates a `pending_payment` order and routes the buyer to checkout.
- Order stays `pending_payment` and offer stays `pending_payment` until Stripe webhook fires.
- On `payment_intent.succeeded`: order → `pending_requirements` (active), offer → `accepted`, transactions + notifications created (already implemented).
