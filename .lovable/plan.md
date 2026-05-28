# Buyer Trust & Reviews

Strengthen the trust layer around gigs and sellers. Reviews already exist but are bare-bones (single star + text). This phase makes them informative, social-proof-worthy, and adds the seller-side stats Fiverr users expect.

## 1. Richer review submission

Upgrade `LeaveReview` for buyers to capture three sub-ratings already in the schema:
- **Communication** (1–5)
- **Service as described** (1–5)
- **Would recommend** (1–5)

Overall `rating` becomes the rounded average of the three. Add a 500-char limit on `review_text` with zod validation. Seller-side review form stays simple (overall + text — they're rating the buyer).

## 2. Seller replies

Add a "Reply" affordance under each review in `ReviewsList` when `auth.uid() === seller_id` and no reply exists yet. Inline textarea + Save → updates `reviews.reply`. Reply renders in the existing reply block.

## 3. Rating breakdown widget

New `RatingBreakdown` component shown on `GigDetail` and `SellerProfile` above the reviews list:
- Big average score + total count
- Bar chart of 5★/4★/3★/2★/1★ distribution
- Averages for Communication / Service / Recommend

Computed client-side from the reviews query (already loaded).

## 4. Seller response stats

Add a nightly-style recompute (run on demand from a SQL function `recompute_seller_response_stats(uuid)`):
- `response_rate` = % of buyer-initiated conversations the seller replied to
- `response_time_minutes` = median minutes from buyer message → seller's first reply

Trigger recompute after each message insert (debounced — only when sender is seller and prior message was from a different participant). Display on `SellerProfile` and the seller card on `GigDetail` (e.g. "Responds in ~2h · 98% response rate").

## 5. Verified buyer badge

Reviews where the buyer has ≥1 completed order get a small "Verified purchase" pill in `ReviewsList`. Since every review is tied to a completed order via RLS already, this is effectively always true — show the pill unconditionally on public reviews. Adds visual trust without new data.

## 6. Gig card upgrade

`GigCard` already shows average + count. Add:
- "★ 4.9 (132)" stays as-is
- Add a subtle "Top Rated" indicator when `average_rating >= 4.8 AND total_reviews >= 10`

Pure presentation, no schema change.

## Technical Details

**Schema**: No new tables. All fields already exist (`reviews.communication_rating`, `service_rating`, `recommend_rating`, `reply`; `profiles.response_rate`, `response_time_minutes`).

**New SQL**:
- `recompute_seller_response_stats(_seller uuid)` security-definer function
- Trigger `messages_after_insert_response_stats` that calls it when the sender is the conversation's seller party

**Frontend files**:
- `src/components/marketplace/LeaveReview.tsx` — add sub-rating sliders/stars, zod validation
- `src/components/marketplace/ReviewsList.tsx` — render sub-ratings, verified pill, seller-reply inline editor
- `src/components/marketplace/RatingBreakdown.tsx` (new)
- `src/components/marketplace/GigCard.tsx` — Top Rated badge
- `src/pages/GigDetail.tsx` — mount `RatingBreakdown`, show seller response stats in seller card
- `src/pages/SellerProfile.tsx` — mount `RatingBreakdown` and response stats

**Out of scope** (next phase candidates): seller levels (New/Level 1/2/Top Rated tied to thresholds), review photos, review helpfulness votes, review moderation queue in admin.
