## Goal

Capture the exact failing function, HTTP status, and response body when checkout breaks, so we can pinpoint whether the failure is in `stripe-payment-intent` (init), `stripe.confirmPayment` (Pay Now click), or somewhere else.

## Where to add logging

`src/pages/Checkout.tsx` has two network-touching call sites:

1. **`loadOrderAndInit()` → `supabase.functions.invoke("stripe-payment-intent", ...)`** (around line 335). Runs on page load; failure here means the page shows "Could not initialize payment".
2. **`PayBlock.onPay()` → `stripe.confirmPayment(...)`** (around line 75). Runs when user clicks **Pay Now**.

Plus the order/profile/gig Supabase queries (lines 294–326) — log any error there too.

## What to log

For every step, log with a clear `[checkout]` prefix so they're greppable in the browser console:

- **Order load**: `order_id`, returned status, any Supabase error (`code`, `message`, `details`, `hint`).
- **`stripe-payment-intent` invoke**:
  - Before call: order id + timestamp.
  - After call: full `data`, full `error` object, and — critically — do a manual `fetch()` fallback on error to capture the raw HTTP status + response body text (the SDK swallows the body into the generic "non-2xx" message).
  - Log `pi.publishable_key` presence (not the value) and `client_secret` presence.
- **`loadStripe`**: log success/failure of Stripe.js initialization.
- **PaymentElement**: log `onReady` and `onChange.complete` transitions.
- **Pay Now click (`onPay`)**:
  - Log start with `orderId`, `total`, `payMethod`.
  - Log `stripe.confirmPayment` result: full `error` (type, code, decline_code, message, payment_intent.status) and `paymentIntent` status.
  - Log the 10s timeout race if it fires.

## Implementation details

- Add a small helper `logCheckout(step: string, payload: unknown)` at the top of the file that does `console.log("[checkout]", step, payload)` so all entries share the prefix and can be filtered.
- On `stripe-payment-intent` failure path, additionally do:
  ```ts
  const raw = await fetch(`${SUPABASE_URL}/functions/v1/stripe-payment-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ order_id: o.id }),
  });
  logCheckout("raw-pi-status", raw.status);
  logCheckout("raw-pi-body", await raw.text());
  ```
  This bypasses the SDK so the actual error body (e.g. `{"error":"STRIPE_SECRET_KEY not configured"}`) is visible.
- Surface the raw body into the on-screen `err` string when present, so the user can copy it without opening DevTools.
- All logs stay client-side; no changes to edge functions, no behavior changes beyond logging + a richer error message.

## Files touched

- `src/pages/Checkout.tsx` — only file modified.

## How to use after deploy

1. Open DevTools → Console, filter on `[checkout]`.
2. Reproduce the failure.
3. Copy the `raw-pi-status` + `raw-pi-body` (or the `confirmPayment` error block) and share it back. That tells us exactly which function and which error.
