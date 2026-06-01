## Root cause

`custom_offers.price` is stored in **cents** (a $5 offer = `500`). The DB function `accept_custom_offer` is now correct — it divides by 100 before inserting into `orders.price` (dollars) — but **two legacy orders** were created before that fix and ended up with `orders.price = 500` for a $5 offer.

The checkout reads `orders.price` directly and treats it as dollars, so those legacy orders display "$500" and the PaymentIntent would charge `$500 + 5% = $525`.

Confirmed in DB:
```
offer_price (cents) | orders.price (dollars)
       600          |        6    ✓ (new, post-fix)
       500          |      500    ✗ (legacy bug — $5 offer showing as $500)
       500          |      500    ✗
```

Secondary bug: `accept_custom_offer` uses a **10%** platform fee, but the UI and `stripe-payment-intent` edge function both use **5%**. The user's fix explicitly mandates 5%.

## Changes

### 1. Data repair migration
For every order linked to a `custom_offers` row where `orders.price == custom_offers.price` (i.e. the cents value was copied verbatim), divide by 100:

```sql
UPDATE public.orders o
SET price            = ROUND(c.price / 100.0),
    platform_fee     = ROUND(ROUND(c.price / 100.0) * 0.05),
    seller_earnings  = ROUND(c.price / 100.0) - ROUND(ROUND(c.price / 100.0) * 0.05)
FROM public.custom_offers c
WHERE c.order_id = o.id
  AND o.price = c.price          -- only the inflated rows
  AND o.status = 'pending_payment';
```

Only pending_payment orders are touched — no completed/charged orders are altered.

### 2. Align fee to 5% in `accept_custom_offer`
Change `_fee := round(_price * 0.10)` → `_fee := round(_price * 0.05)` so all three layers (DB function, edge function, UI) agree.

### 3. Tighten `stripe-payment-intent` edge function
Stop "verifying then trusting" `order.price`. Recompute charge strictly from `custom_offers.price` when an offer exists:

```ts
const priceDollars = offer
  ? Math.round(offer.price / 100)   // authoritative source for offer-based orders
  : order.price;
const partnerFee = Math.round(priceDollars * 0.05);
const expectedChargeCents = (priceDollars + partnerFee) * 100;

// If order.price drifted from offer, self-heal once before charging
if (offer && order.price !== priceDollars) {
  await admin.from("orders").update({
    price: priceDollars,
    platform_fee: partnerFee,
    seller_earnings: priceDollars - partnerFee,
  }).eq("id", order.id);
}
```

This makes the PaymentIntent amount mathematically impossible to exceed the offer the buyer accepted, even if a stale/bad row exists.

### 4. Checkout (`src/pages/Checkout.tsx`)
No display logic change needed — it already reads `order.price` from the DB and computes 5%. After the migration + edge-function fix, `$5` orders will correctly show `$5.00 + $0.25 = $5.25`. The existing amount-mismatch guard stays as a defense-in-depth safety net.

### 5. Verification (post-deploy)
- Re-run the diagnostic query and confirm no row has `orders.price == custom_offers.price` for pending_payment orders.
- Open checkout for an order with `custom_offers.price = 500` → expect display "$5.00", fee "$0.25", total "$5.25", PaymentIntent `amount: 525`.
- Open checkout for a `$500` offer (`custom_offers.price = 50000`) → expect "$500.00 + $25.00 = $525.00", PaymentIntent `amount: 52500`.

## Files / artifacts

- New migration: data repair + `accept_custom_offer` fee fix (one file).
- `supabase/functions/stripe-payment-intent/index.ts`: authoritative-source recompute + self-heal.
- `src/pages/Checkout.tsx`: no functional change (guard already present); optionally remove the now-redundant mismatch-block path once the edge function self-heals — keep it for safety.

## Out of scope (flagged for follow-up)

- Migrating `orders.price` to be stored in cents everywhere would be the ideal long-term fix but is a larger refactor touching analytics, admin, and webhook code. Not done here.
