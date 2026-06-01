## Root cause

The `stripe-payment-intent` edge function logs show:

> `The payment method type "paypal" is invalid. Please ensure the provided type is activated in your dashboard...`

The function hardcodes `payment_method_types: ["card", "paypal"]`, but PayPal is not activated on the connected Stripe account. Stripe rejects the entire PaymentIntent creation with a 400, which is why the client sees a non-2xx response on checkout.

CORS, the OPTIONS handler, env var reading, the Stripe import, and detailed error messages are all already correct in the current function — those are not the problem.

## Fix

### `supabase/functions/stripe-payment-intent/index.ts`
- Replace `payment_method_types: ["card", "paypal"]` with `automatic_payment_methods: { enabled: true }`. Stripe will then offer whichever methods are actually enabled in the dashboard (card always, PayPal only once the user activates it), and the PaymentIntent will succeed.
- Keep everything else as-is (npm:stripe@17, fetch http client, CORS, OPTIONS, detailed `error.message` in the response body).

### `src/pages/Checkout.tsx`
- The PayPal tab currently assumes PayPal is always available. Until the merchant enables it in Stripe, the PayPal tab would render an empty PaymentElement. Two reasonable options:
  - (A) Hide the PayPal tab and only show Card.
  - (B) Keep the tab but let Stripe's PaymentElement decide what to show; if PayPal is not enabled it simply won't render, which is confusing.
- Recommended: (A) — hide the PayPal tab for now, keep the toggle code so it's easy to re-enable later.

### Redeploy
- Deploy `stripe-payment-intent` after the edit.
- Verify by re-opening checkout → PaymentIntent succeeds → card fields render → Pay Now works.

## Files touched
- `supabase/functions/stripe-payment-intent/index.ts` — switch back to `automatic_payment_methods`
- `src/pages/Checkout.tsx` — hide PayPal tab until enabled in Stripe

## Question for you
Do you want me to (A) hide the PayPal tab for now, or (B) leave it visible and you'll enable PayPal in your Stripe dashboard yourself? If (B), nothing changes in Checkout.tsx — only the edge function gets fixed.