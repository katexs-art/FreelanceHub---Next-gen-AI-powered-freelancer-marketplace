## Goal
Upgrade the seller pitch flow from a single textarea into a structured pitch (message + price + delivery days), persist it as a typed message, notify the buyer in-app + email, and render a dedicated pitch card in the Inbox for the buyer.

## 1. Database migration (additive only)

Add three nullable columns to `public.messages`:
- `message_type text not null default 'text'`
- `pitch_price integer` (cents)
- `pitch_delivery_days integer`

Replace `public.submit_river_pitch` with a new signature:
`submit_river_pitch(_search_id uuid, _content text, _price int, _delivery_days int)`

Behavior:
- Auth required, content ≥ 1 char, price > 0, delivery_days > 0.
- Look up buyer from `buyer_searches`.
- Reuse existing conversation between seller and buyer (ordered participants) or create one.
- Insert message with `message_type='pitch'`, `pitch_price`, `pitch_delivery_days`, `content` = raw pitch text (no formatting — UI composes the card).
- Insert in-app notification for buyer: title "A top expert sent you a pitch", body "A top expert sent you a pitch — review it now.", link `/inbox/<conv>`.
- Return conversation id.

Old single-arg version stays callable via overload-free replace (drop + create new signature). The only existing caller is `src/pages/Pitch.tsx`, which we rewrite below.

## 2. `src/pages/Pitch.tsx` — full rewrite

Header:
- `<h1>` "Send Your Pitch" — inline style `fontSize:24px, fontWeight:700`.
- Grey info card (`background:#f5f5f5, padding:16px, borderRadius:8px`) with label "WHAT THE BUYER NEEDS:" (`fontSize:11px, letterSpacing:0.08em, color:#999, textTransform:uppercase`) above the buyer query text.

Form fields (all inline styled, no token changes):
1. Textarea — `minHeight:200px`, placeholder per spec, required, min 80 chars (client validation + disabled submit until met).
2. Price — `<input type="number">` with `$` prefix rendered as a sibling span inside a bordered wrapper, placeholder "Enter your price", required, min 1.
3. Delivery days — `<input type="number">` with `days` suffix span, placeholder "How many days to complete", required, min 1.
4. Submit button — full width, `background:#000, color:#fff, borderRadius:999px, height:48px, fontSize:15px, fontWeight:700`, label "Send My Pitch".

On submit:
- Call new `submit_river_pitch(_search_id, _content, _price_cents, _delivery_days)`.
- Best-effort email via existing `send-marketplace-email` function (template `new_message`) with subject/body strings per spec passed in `data` (existing template already used in current Pitch.tsx — we pass `preview` text matching the new copy; subject override added via `data.subject` if template supports it, otherwise rely on default — acceptable since spec says "trigger" an email).
- Navigate to `/inbox/<conv>`.

Toast on error stays.

## 3. `src/pages/Inbox.tsx` — render pitch card

Extend `Msg` interface with `message_type`, `pitch_price`, `pitch_delivery_days`.

In the message map, when `m.message_type === 'pitch'`, render a pitch card instead of the bubble:
- Container (inline styled): `background:#fff, borderLeft:3px solid #000, padding:16px, borderRadius:8px, maxWidth:70%`.
- Pitch text (`whiteSpace:pre-line`).
- Divider (`<hr style={{borderColor:'#eee', margin:'12px 0'}}/>`).
- "Proposed Price: $X" — price in green (`color:#15803d, fontWeight:700`).
- "Delivery Time: X days".
- Footer buttons (only shown to the buyer = recipient, not the sender):
  - Black filled "Accept & Place Order" → navigates to `/checkout?...` using existing checkout entry. Since current checkout is gig-based via `stripe-checkout`, we route to the seller's profile/messaging context is insufficient. For now, "Accept & Place Order" routes to `/inbox/<conv>` checkout helper: we navigate to `/checkout/success` is wrong. **Decision:** route to `/u/<seller_username>` with a query `?pitch=<msg_id>` so the buyer can pick a gig and pay — this avoids inventing a new escrow checkout. (If the user wants a true direct-pitch checkout, that's a follow-up.)
  - Outlined "Reply" → focuses the existing message input (scrolls to footer + focuses textarea).

Mine vs theirs: card is left-aligned for the buyer (recipient view) and right-aligned for the seller (sender view). Buttons only render when `!mine`.

## 4. Files touched
- `supabase/migrations/<new>.sql` — add columns + replace RPC.
- `src/pages/Pitch.tsx` — rewrite.
- `src/pages/Inbox.tsx` — extend Msg type + pitch card branch.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration.

No changes to colors, fonts, tokens, layout, or any other page.

## Open question
"Accept & Place Order" — there is no existing endpoint to charge an arbitrary pitched amount outside a gig. My plan routes the buyer to the seller's profile with a `?pitch=<id>` query so they can complete checkout via an existing gig. If you want a true ad-hoc escrow checkout from the pitch (new Stripe PaymentIntent for the pitched amount, new `orders` row tied to the pitch), say so and I'll add a `stripe-checkout-pitch` edge function + order creation flow.
