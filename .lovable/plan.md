**Plan**

1. Update `supabase/functions/stripe-payment-intent/index.ts` so the PaymentIntent no longer hardcodes `payment_method_types: ["card", "paypal"]`.
2. Use Stripe `automatic_payment_methods: { enabled: true }` instead, so Stripe only offers payment methods actually enabled for the account.
3. Keep the existing order checks, auth validation, and JSON error responses intact.
4. Deploy/test the `stripe-payment-intent` function and re-check logs to confirm the `payment_intent_invalid_parameter` PayPal error is gone.

**Technical detail**

The live function logs confirm the current failure is:

`The payment method type "paypal" is invalid ... param: "payment_method_types"`

So the fix is a one-line PaymentIntent configuration change, not a database or checkout UI change.