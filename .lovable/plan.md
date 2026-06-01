## Goal
Visually overhaul `src/pages/Checkout.tsx` to a world-class two-column checkout while keeping every piece of existing functionality (Stripe init, `PayBlock`, order loading, promo state, retry flows).

## Scope
- Only `src/pages/Checkout.tsx`. No backend, hook, or routing changes.
- Keep the `<Elements>` provider, `PayBlock` component, `loadOrderAndInit`, and all state intact.

## Layout
- Wrap main in `max-w-5xl mx-auto px-6 py-10` on a `#F7F7F7` canvas.
- Grid: left 60% / right 40%, 32px gap. Stacks on `<900px`.
- Page eyebrow + H1 "Checkout" above the grid; small "Back" link to gig.

## Left column
1. **Project card** (white, border, radius 16, subtle shadow):
   - 80px thumbnail, full (un-truncated, `line-clamp-2`) gig title at 16/600.
   - Package subtitle in muted text.
   - Thin divider.
   - Row: 40px circular seller avatar, seller name (medium), small "Top seller" muted hint if available.
   - Row: clock icon + "Delivery by {date}" in muted text.
2. **Payment method card**:
   - Heading "How would you like to pay?" (15/600).
   - Pill toggle group (rounded-full, border, active = `#0A0A0A` bg + white text; inactive = white + border). Two pills: "Credit / Debit card" and "PayPal". Switching sets `payMethod` (Stripe re-mounts on key change — already wired).
   - Remove the "Enter your card details on the right" helper text.
   - Render `PayBlock` (which contains `<PaymentElement>`) **inside this card**, directly under the pills, so the element mounts in the left column. This requires moving `<PayBlock>` from the right sidebar to here. The Pay button stays inside `PayBlock`; we will pass a `hidePayButton` prop and instead render the CTA in the right sidebar — OR simpler: keep `PayBlock` intact under the pills and add a sticky summary CTA on the right that scrolls to it. **Decision:** keep `PayBlock` unchanged (Pay button + element together) under the pills — sidebar CTA becomes a non-functional total display + scroll-to-pay button on mobile only. Actually cleanest: split `PayBlock` so the `PaymentElement` renders in the left card and the Pay button renders in the right sidebar. Will refactor `PayBlock` minimally into two pieces sharing one `useStripe/useElements` context by lifting `onPay` to a parent ref/callback. Simpler approach chosen: **keep `PayBlock` as one unit under the pills on the left**, and the right sidebar shows the total + a visual "Pay" mirror button that triggers the same click via a shared ref. To avoid double-render of `PaymentElement`, only one instance exists (left). The right "Pay Now" button calls the same handler via a callback ref passed down.
3. **Promo code**: collapsible row with chevron icon. Closed state: full-width ghost row "Apply promo code" + chevron-right. Open: chevron-down + input + Apply button.

## Right column (sticky `top-24`)
- White card, border, radius 16, padding 24:
  - "Order summary" heading (16/600).
  - Row: amount label + `$price`.
  - Row: "Katexs service fee (5%)" + `$fee` with `Info` tooltip icon (Radix `Tooltip` already in deps).
  - Divider.
  - Bold TOTAL row, label 14, value 20/700.
  - Green CTA "Pay Now — $total" (full-width, h-52, brand green `#16A34A`, radius 12). Wires to the same `onPay` ref exposed by `PayBlock`.
  - Below: shield icon + "Secure 256-bit SSL encryption" (12, gray).
  - Below: two rows with `Check` icons — "3-day delivery guarantee", "Money-back guarantee".

## Trust bar
- Below the grid, full-width centered row with 3 items (icon + label, 13, muted):
  - `ShieldCheck` "Secure Payment"
  - `RefreshCcw` "Money-back Guarantee"
  - `Headphones` "24/7 Support"
- Top border-hairline, py-6.

## Typography & theming
- Use existing system font + Tailwind tokens (`text-foreground`, `text-foreground-muted`, `border-border`, `bg-surface`). Replace inline `#888`, `#0A0A0A`, etc. with semantic classes where reasonable; keep brand green `#16A34A` for CTA (matches design token `--primary`).
- Note: project memory states light Fiverr theme (not dark). The user said "Keep dark theme consistent" — interpreting as "consistent with site theme" (which is light). Will keep current light styling.

## PayBlock refactor (minimal)
- Add optional prop `payButtonSlot?: (props: { onPay, disabled, label }) => ReactNode` so the parent can render the Pay button in the sidebar while the `PaymentElement` stays in the left card. If slot provided, internal button is hidden. Error/secure-text stays under the element.
- All current logging, retry, error UI preserved.

## Out of scope
- No changes to Stripe Elements options, `confirmPayment` call, payment intent invocation, or order fetch logic.
- No new dependencies.

## Files
- `src/pages/Checkout.tsx` — edited.
