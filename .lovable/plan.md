## Scope

Two changes, no other site behavior affected:
1. Redesign `/checkout/:order_id` (`src/pages/Checkout.tsx`) with the new 2-column layout, order summary card, styled Stripe element, promo-code row, and sticky right-side order details card.
2. Add a new `/orders/:order_id/confirmed` page (`src/pages/orders/OrderConfirmed.tsx`) and route it in `src/App.tsx`. Redirect from Checkout to this page after successful payment instead of `/orders/:id`.

No DB, RPC, edge-function, or other route changes. Existing `/orders/:id` workspace untouched.

## Checkout page (`src/pages/Checkout.tsx`)

Keep all current data loading (order fetch, seller aggregate, PaymentIntent mint, auth/redirect, status guard) exactly as is. Only the JSX/styling and post-payment redirect target change.

Layout:
- Outer `<main>` bg `#F7F7F7`, max-width 960, centered, padding `48px 24px`.
- Grid `grid-template-columns: 65% 35%`, gap 32. Single column under 900px.

Left column:
- **Order summary card** (white, 1px #EBEBEB, radius 16, padding 24, mb 20): 80px thumbnail (use gig image if available via existing `gig_id` join — fetch `gigs.title, package_name, images[0]` alongside seller; fall back to `/placeholder.svg` and project_title), title 16/600 #0A0A0A, package/project type 13 #888, expert row (24px avatar + name 13 #555), delivery time 13 #888.
- **Payment method card** (same wrapper styling): heading "Payment method" 15/600 mb 16. Inner Stripe `<PaymentElement />` wrapped in a div bg `#F7F7F7`, 1px #EBEBEB, radius 12, padding 16. Pass appearance variables to `Elements` so the Stripe iframe matches.
- **Promo code row**: collapsed link "+ Apply promo code" 14 #888. On click expand `<input>` + Apply button. Visual only — button is a no-op stub (request says "do not change functionality"); shows a toast "Promo codes coming soon" so it's not silently broken.

Right column (sticky `position: sticky; top: 24px`):
- **Order details card** (white, 1px #EBEBEB, radius 16, padding 24): heading "Order details" 16/600 mb 20. Rows: "Selected package" / "Project amount" (depends on whether order is gig-based or project-based — use existing `order.gig_id` vs `project_title` distinction), Katexs service fee 5%, divider, Total 16/700.
- Green Pay button full-width, label `Pay Now — $X`. This button triggers the same `stripe.confirmPayment` flow currently inside `PayForm` — refactor so the green button is the submit trigger and `PayForm` exposes a ref/handler, or move the form so the Pay button lives in the right column but the `<Elements>` provider still wraps both columns. Implementation: wrap entire two-column grid inside the `<Elements>` provider once `clientSecret` is ready; the green button calls `useStripe().confirmPayment` directly from a child component rendered in the right column.
- Trust line: shield icon (lucide `ShieldCheck`) + "Safe and secure payment" 12 #888 centered, mt 10.
- Terms line: 11 #AAA centered.

Post-payment redirect:
- On success, `nav(\`/orders/${order.id}/confirmed\`, { replace: true })` instead of `/orders/${orderId}`.
- Keep the existing "already paid" guard pointing to `/orders/:id` workspace (since past-tense confirmation only makes sense right after pay).

## New page `src/pages/orders/OrderConfirmed.tsx` at `/orders/:order_id/confirmed`

Protected route, mirrors Checkout's data loading pattern:
- Fetch order by `:order_id`, verify `buyer_id === auth.uid`, redirect to `/orders/:id` if not the buyer.
- Fetch seller profile (`profiles`: full_name, username, avatar_url, last_seen_at if column exists, otherwise omit).
- Fetch gig title if `order.gig_id` set.

Layout: bg #F7F7F7, max-width 960, padding 48 24, 65/35 grid, gap 32.

Left column:
- **Success banner**: white, border-left 4px #16A34A, radius `0 12px 12px 0`, padding 24, mb 24. H1 "Your project is now in the works" 22/600. Subtext with seller name + delivery date (`order.delivery_deadline` formatted as `Month Day Year, h:mm A`).
- **Activity timeline card**: white, 1px #EBEBEB, radius 16, padding 24. Section label "Today" 12 #AAA uppercase tracking 0.08em mb 16. Three timeline rows (📋 placed @ `order.created_at`, ✅ payment confirmed @ now, 🔔 expert notified @ now). Row: flex gap 14, py 12, border-bottom 1px #F5F5F5 (last row no border). Icon circle 36px bg #F0F0F0. Title 14/500 #0A0A0A, timestamp 12 #AAA mt 2.

Right column (sticky top 24):
- **Expert card** (white, 1px #EBEBEB, radius 16, padding 24, mb 16): 56px avatar 2px #EBEBEB border, name 16/600 mt 12, `@username` 13 #AAA, last active 12 #AAA mb 16, black full-width button "Message {firstName}" — links to `/inbox` (uses existing `get_or_create_conversation` RPC pattern the project already has on the seller profile; reuses same handler — on click, call RPC then `nav(\`/inbox/${conversationId}\`)`. Falls back to plain `/inbox` if RPC fails).
- **Order details card** (white, 1px #EBEBEB, radius 16, padding 24): rows for Ordered from (name 500), Delivery date (500 #0A0A0A), Total price (700 #0A0A0A), Order number (mono #0A0A0A, prefer `order.order_number` else short order id).
- **Track Project collapsible**: heading "Track Project" + chevron. Uses `useState` for open/close. When open, vertical timeline with 5 dots; dot 1 filled green with `order.created_at`, dots 2–5 grey empty placeholder labels.
- **Escrow info**: bg #F7F7F7, radius 8, padding 12, mt 16. ShieldCheck icon + "Your payment of $X is held securely in escrow. Released after you approve delivery." 12 #666 line-height 1.5.

No buttons besides Message and the (visual) Track Project toggle. Page is read-only confirmation; the workspace at `/orders/:id` remains the place users go for delivery/approval actions.

## Route wiring (`src/App.tsx`)

Add:
```tsx
const OrderConfirmed = lazy(() => import("./pages/orders/OrderConfirmed"));
...
<Route path="/orders/:order_id/confirmed" element={<ProtectedRoute><OrderConfirmed /></ProtectedRoute>} />
```
Place above the existing `/orders/:id` route so it matches first.

## Out of scope
- No changes to schema, edge functions, `stripe-payment-intent`, `OrderWorkspace`, `CheckoutSuccess`, or any other page/route.
- No promo-code backend.
- No real-time wiring on the confirmation page — it's a snapshot.
