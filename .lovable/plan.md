## Root causes

1. **Edge function crashing** — `stripe-payment-intent` logs show repeated `Deno.core.runMicrotasks() is not supported` event-loop errors. This comes from the `stripe@14.21.0?target=deno` ESM build. The PaymentIntent likely is created, but the response promise rejects/aborts → client sees a hang ("Pay Now stuck on processing", and earlier "no client_secret"). This is the single biggest bug.
2. **Card fields look empty** — `PaymentElement` is mounted inside a container with `background:#F7F7F7`, but Stripe Appearance API is set to `colorBackground:#F7F7F7` + `colorText:#0A0A0A`. Inputs render but with no visible border/contrast, and there is no loading skeleton while Elements boots, so it looks blank. Also `paymentMethodOrder` toggling between `["card"]` and `["paypal"]` after Elements is mounted does not re-filter — PaymentElement is created once with the initial order.
3. **PayPal** — Stripe PaymentElement supports PayPal automatically when enabled on the Stripe account *and* PaymentIntent is created with `payment_method_types:["card","paypal"]` (or via `automatic_payment_methods` with PayPal enabled in Dashboard) and `currency:"usd"` PayPal needs `capture_method:"automatic"` (default ok). Currently we use `automatic_payment_methods:{enabled:true}` which is fine, but PayPal returns a redirect — `confirmPayment` must allow redirect (currently `redirect:"if_required"` is OK, PayPal will redirect anyway as long as `return_url` is set, which it is).
4. **Pay Now disabled-until-valid** — no `PaymentElement` `onChange` wiring; button is enabled as soon as Stripe loads.
5. **No timeout** on the `stripe-payment-intent` invoke or on `confirmPayment`.

## Plan

### A. Fix the edge function (`supabase/functions/stripe-payment-intent/index.ts`)
- Replace `https://esm.sh/stripe@14.21.0?target=deno` with `npm:stripe@17` (Deno-native, no microtask shim issue). Use `Stripe(key, { httpClient: Stripe.createFetchHttpClient() })` so it uses `fetch` instead of node http.
- Keep API surface identical: returns `{ client_secret, publishable_key }`.
- Explicitly request `payment_method_types: ["card", "paypal"]` instead of `automatic_payment_methods` so both methods are guaranteed available regardless of Stripe Dashboard auto-config.
- Ensure all responses (including errors) include CORS headers (already do).
- Redeploy.

### B. Fix `src/pages/Checkout.tsx`

1. **Mounting & loading state**
   - Render a skeleton (animated gray block at 220px) inside the payment container until `PaymentElement` fires `onReady`.
   - Track `elementReady` state; show skeleton while false.

2. **Valid-before-pay**
   - Track `elementComplete` via `PaymentElement onChange={(e)=>setComplete(e.complete)}`.
   - Disable Pay Now unless `complete && stripe && elements && !busy`.

3. **Method toggle**
   - Pass `paymentMethodOrder` so PayPal or Card appears first based on `payMethod`. Re-mount PaymentElement when `payMethod` changes by keying the element: `<PaymentElement key={payMethod} ... />`. That forces fresh layout and reorders the methods correctly.
   - Both methods are always listed in the PaymentIntent (`card`, `paypal`), so the tabs control display order, not eligibility.

4. **Visible card fields**
   - Change appearance: `colorBackground:"#FFFFFF"`, container background to `#FFFFFF`, add `border:1px solid #EBEBEB` already present — keep, but inner Stripe inputs need a white background and visible separator. Set Appearance `rules: { '.Input': { backgroundColor:'#FFFFFF', border:'1px solid #EBEBEB' } }`.

5. **Pay Now timeout & errors**
   - Wrap `stripe.confirmPayment` in `Promise.race` with a 10s timeout that rejects with `"Payment failed - please try again"`.
   - Wrap the initial `supabase.functions.invoke("stripe-payment-intent", ...)` in the same 10s race so loading does not hang.
   - On success without redirect (card), navigate to `/orders/:id/confirmed`. PayPal will redirect to `return_url` automatically; on return, `OrderConfirmed` page already handles it.

6. **Error display**
   - Surface friendly errors via existing red `role=alert` block and also `toast.error`.

### C. No backend schema or RLS changes. No new env vars (uses existing `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).

### D. Verification
- Deploy `stripe-payment-intent`.
- Check `edge_function_logs` — confirm no more `Deno.core.runMicrotasks` errors after a real invoke.
- Manually walk: open checkout → card fields render with three inputs → switch to PayPal tab → PayPal button appears → click Pay → success/redirect → confirmation page.

## Files touched
- `supabase/functions/stripe-payment-intent/index.ts` — switch to `npm:stripe`, explicit payment_method_types
- `src/pages/Checkout.tsx` — skeleton, onReady, onChange/complete gating, key remount on tab change, appearance rules, 10s timeouts on invoke and confirmPayment

No other files affected.