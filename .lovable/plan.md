## Context

`src/pages/Checkout.tsx` already has the two-column layout, sticky summary, project card, pill tab switcher, collapsible promo row, and trust bar from earlier rounds. Custom-offer pricing was also fixed previously via the `accept_custom_offer` cents→dollars migration plus a three-way amount-integrity guard (order price ↔ custom offer ↔ Stripe PaymentIntent). The remaining work is verification + targeted polish to match the new spec.

## Part 1 — Pricing read path (verify, harden, no schema change)

The checkout already reads `orders.price` fresh on every mount and resets `clientSecret` before each fetch. Two small hardening tweaks:

1. Confirm `loadOrderAndInit` clears `order`, `seller`, `gig`, `payState`, and `clientSecret` at the top so a stale render can never display a previous order's price during route changes between two different `/checkout/:order_id` URLs.
2. Always display `${order.price}` as the project amount (never a fallback like gig starting price), and continue gating "Pay Now" behind the existing `amountMismatch` guard. The error banner stays; no behavior change for valid orders.

No edge-function or DB changes — the cents→dollars fix in `accept_custom_offer` and the server/client integrity checks already in `stripe-payment-intent` and Checkout are the source of truth.

## Part 2 — UI refinements

Apply only the deltas vs the current implementation, in `src/pages/Checkout.tsx`:

- **Project card**
  - Add a circular initials avatar fallback when `seller.avatar_url` is empty (first letter of seller name on `#F7F7F7` bg).
  - Surface the package type prominently: keep the gig thumbnail + title, then under the seller row add a small pill showing "Standard package" for gig orders or "Custom offer" for custom-offer orders.
  - Keep delivery date row with the clock icon.

- **Payment method card**
  - Rename heading from "How would you like to pay?" to **"Pay with"**.
  - Soften the active pill: replace the black `#0A0A0A` active state with a light selected style (white bg, `#0A0A0A` text, 2px `#0A0A0A` border) so it reads as a tab, not a CTA. Inactive stays subtle gray border.
  - Drop the "Loading payment form…" line; rely on the existing shimmer skeleton inside the PaymentElement frame.
  - PaymentElement mounts unchanged — same `Elements` provider, same `clientSecret`, same `payMethod` keying. No Stripe behavior touched.

- **Order summary sidebar**
  - Reorder trust lines: **Money-back guarantee** first, then **3-day delivery guarantee**.
  - Pay Now button keeps full width, `#16A34A`, `${total}` label, disabled fallback `#9CA3AF`, and the existing `amountMismatch` block.
  - Keep "Secure 256-bit SSL encryption" lock row under the button.
  - Keep the small terms disclosure but reduce to a single line under the trust list.

- **Promo code** — already a chevron collapsible; no change beyond visual alignment with the other cards.

- **Trust bar** — already present (Secure Payment, Money-back Guarantee, 24/7 Support); leave as-is.

- **Typography & theme** — system stack already in use per project memory. No font swap to DM Sans (would break the project-wide system-font rule in `mem://style/typography`); if the user explicitly wants DM Sans here I'll surface that as a follow-up rather than override the global rule.

## Out of scope

- No design-direction exploration (spec is concrete; one rendered output is what's asked for).
- No new DB migration, no edge-function changes, no Stripe API change.
- No change to PayBlock internals or `confirmPayment` flow.

## One open question

The spec says "Use DM Sans font" but the project's locked typography rule is the system stack. I will keep the system stack (per memory) unless you confirm you want to override it just for Checkout.
