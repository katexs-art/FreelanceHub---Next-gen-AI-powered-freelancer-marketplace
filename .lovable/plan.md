## /pricing page + dual-fee model (partner 5% on top, expert 10% deducted)

### 1. New page `src/pages/Pricing.tsx`
Sections built top-to-bottom, all inline-styled to the exact spec in the brief (no design-token detours, since spec hard-codes hex values):
- **Hero** — white, 80px pad, label "Transparent pricing", H1 "Simple. Fair. No surprises." (52/500), subtext.
- **Two cards** — flex row, 24px gap, 900px max. Partner card (black top border, 5% in #000) + Expert card (green top border, 10% in #22c55e). Each: label, heading, subtext, big % display, ✓ feature list (#22c55e check + #333 text), `#f8f8f8` example box, full-width CTA (black → `/sign-up` / green → `/sign-up`).
- **Comparison table** — single `<table>` inside `border-radius:16px; overflow:hidden` wrapper. Black header row, alternating white / `#fafafa` rows, exact 12 rows from spec.
- **FAQ** — Radix `Accordion` (single, collapsible) wired with the 6 Q/A pairs verbatim, restyled inline to match (16/500 question, 14/#666 answer).
- **Bottom CTA** — black bg, 100px pad, H "Start for free today.", two pill buttons → `/services` and `/sign-up`.
- `<SEO title="Pricing · KATEXS" description="…" />` at top. Wrapped in existing `SiteHeader` + `SiteFooter` so nav stays untouched.

### 2. Route wiring (`src/App.tsx`)
Add `const Pricing = lazy(() => import("./pages/Pricing"))` and `<Route path="/pricing" element={<Pricing />} />`. Header link already points to `/pricing`.

### 3. Fee model update — partner pays +5%, expert keeps 90%

**`platform_settings` (supabase--insert):**
Upsert two rows: `partner_fee = "5"`, `expert_fee = "10"`.

**`src/pages/Checkout.tsx`** (lines ~180-268):
- `partnerFee = round(price * 0.05)`
- `platformFee = round(price * 0.10)` (informational only)
- `total = price + partnerFee` — this is what the buyer pays.
- Update Row labels: "Service Fee (5%)" → `$partnerFee`; remove/relabel "Katexs Service Fee (10%)" line so checkout summary shows: Project price, Service fee (5%), Total. (Expert-side fee not shown on partner checkout.)

**`supabase/functions/stripe-payment-intent/index.ts`** (line 56) and **`stripe-checkout/index.ts`** (lines 55, 73):
Charge amount = `(price + round(price*0.05)) * 100` instead of `price * 100`. Apply same +5% to extras line items (or add a single "Service fee" line item — cleaner). Plan: add a dedicated `Service fee (5%)` line item equal to 5% of subtotal so Stripe receipt is itemized.

**`supabase/functions/stripe-webhook/index.ts`** (FEE_PCT, lines 13/62/109):
- Keep `FEE_PCT = 0.10` for the expert-side split (seller earnings = price × 0.90, platform_fee = price × 0.10). `price` recorded on `orders.price` stays the agreed Project price (not the +5% total), so the existing 10% deduction math continues to mean "10% of Project price deducted from expert".
- No schema change needed — the +5% partner fee is a buyer-side surcharge captured by Stripe and never enters `orders.price`.

### 4. Out of scope
No other page, component, color, layout, or route changes. Nav untouched. Existing `/pricing` (none today) is created fresh — no replacement needed.

### 5. Verification
- Visit `/pricing` at 1112px — hero, two cards side-by-side, table, accordion expands smoothly, bottom CTA.
- Create a test order: checkout shows `Service fee (5%)` line; Stripe total = price × 1.05.
- After webhook completion: `orders.platform_fee = price × 0.10`, `orders.seller_earnings = price × 0.90`.
- `platform_settings` query returns `partner_fee=5`, `expert_fee=10`.