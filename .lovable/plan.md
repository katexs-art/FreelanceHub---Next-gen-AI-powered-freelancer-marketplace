# Fix checkout Payment method box

## Root cause

The Payment method card on `src/pages/Checkout.tsx` mounts Stripe's `<PaymentElement />` inside an Elements provider that's initialized with the publishable key returned by the `stripe-payment-intent` edge function. The box appears empty for one (or both) of these reasons:

1. The PaymentIntent is created with `automatic_payment_methods: { enabled: true }`, so the rendered method list is whatever is enabled in the connected Stripe account's Dashboard. If only manual methods like ACH/Link are toggled on (or the account has no PMs enabled in test mode), the element renders an empty container.
2. There's no explicit fallback to `card`, so a misconfigured account shows nothing instead of at least a card form.

We'll force the two methods the user wants (card + PayPal), add a visible Card / PayPal tab toggle defaulted to Card, and make Pay Now confirm against the selected method.

## Changes

### 1. `supabase/functions/stripe-payment-intent/index.ts`
Replace `automatic_payment_methods` with an explicit list so Card is always present and PayPal is offered:

```ts
payment_method_types: ["card", "paypal"],
```

Keep currency `usd` (PayPal supports USD). No other backend changes.

### 2. `src/pages/Checkout.tsx` — Payment method card
Add a two-tab toggle inside the white "Payment method" card, above the Stripe element:

```
[ Credit / Debit card ]  [ PayPal ]
```

- Default selected: `card`.
- Tabs styled to match existing pill/border tokens (#EBEBEB border, #0A0A0A active fill, white text active — same pattern as the `TabBtn` in `PayoutMethodCard.tsx`).
- When `card` is active, render `<PaymentElement options={{ paymentMethodOrder: ['card'], wallets: { applePay: 'never', googlePay: 'never' } }} />`.
- When `paypal` is active, render `<PaymentElement options={{ paymentMethodOrder: ['paypal'] }} />`.
- Both elements live inside the same `<Elements>` provider (already in place) so the client secret is reused.

### 3. Pay Now wiring (`PayBlock`)
The existing `stripe.confirmPayment({ elements, redirect: 'if_required' })` already routes to whichever payment method the user filled in. We add:

- `return_url: \`${window.location.origin}/orders/${orderId}/confirmed\`` so PayPal's redirect flow has somewhere to land.
- Button label stays "Pay Now — $X" for both; no behaviour change for card.
- On PayPal, Stripe will redirect to PayPal and back; the existing `CheckoutSuccess` / `OrderConfirmed` pages handle the return.

### 4. Verification
- Reload `/checkout/:order_id`: Card tab is selected, Stripe card input is visible inside the box.
- Click PayPal tab: PayPal payment element renders in the same box.
- Pay Now with test card `4242 4242 4242 4242` succeeds and redirects to `/orders/:id/confirmed`.
- Pay Now on PayPal tab redirects to PayPal sandbox.

## Out of scope

- Promo codes (already a stub).
- Saved payment methods / Stripe Customer reuse.
- Backend webhook changes — `stripe-webhook` already handles `payment_intent.succeeded` regardless of method.
