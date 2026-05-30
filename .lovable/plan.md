## Review System Build Plan

A dedicated 5-category review flow for completed orders, plus a public reviews section on seller profiles. All new UI; no existing colors, fonts, images, layout, or unrelated functionality are touched.

### 1. Database migration

Extend existing `reviews` table (keeps current data working):
- Add `rating_communication`, `rating_quality`, `rating_delivery`, `rating_value`, `rating_rehire` (int 1–5, nullable for legacy rows)
- Add `overall_rating` numeric(3,2)
- Add `standout_moment` text
- Add `helpful_count` int default 0 (for "Most Helpful" sort)
- Backfill `overall_rating` from existing `rating` for legacy rows

New `review_prompts` table to track the 14-day window:
- `order_id` (unique), `buyer_id`, `expires_at`, `notified_at`, `dismissed`
- RLS: buyer can read their own; service role inserts

New `profiles` columns:
- `river_score` numeric(4,2) — computed from reviews
- `average_rating` numeric(3,2)
- `total_reviews` int

New RPC `submit_full_review(order_id, c, q, d, v, r, text, standout)`:
- Validates buyer owns completed order, not past 14 days, no existing review
- Inserts review with all 5 sub-ratings + overall avg
- Recomputes seller's `average_rating`, `total_reviews`, and `river_score`
  (River Score formula: weighted avg of overall_rating × 20, adjusted by review count and on-time delivery rate — single deterministic function)
- Creates seller notification "You just received a new review — check it out." linking to `/u/<username>#reviews`

Trigger `on_order_completed_create_prompt`:
- When `orders.status` flips to `completed`, insert into `review_prompts` (14-day expiry) and create buyer notification "How did it go? Leave a review for your seller — it only takes 60 seconds." linking to `/orders/<id>/review`
- Also enqueues email via existing `send-marketplace-email` edge function pattern

### 2. Edge function

`review-prompt-email` (invoked from trigger via pg_net OR piggyback on existing notification email flow) — uses RESEND with existing FROM email, same template style as other marketplace emails.

### 3. Frontend — Review page

New route `/orders/:order_id/review` → `src/pages/orders/LeaveReviewPage.tsx`:
- Header card: seller avatar + name + River Score, then project title + delivery date
- 5 star rows (Communication, Quality of Work, On Time Delivery, Value for Money, Would Rehire) — black filled / grey unfilled, click-to-fill
- Live overall score "X.0 out of 5.0" large text
- Textarea "Tell others about your experience" + live counter "X characters — minimum 50 required" (turns green ≥50)
- Optional "Stand out moment" field
- Submit button: full-width, black, 999px radius, 48px h, 15px/700, disabled+grey until all 5 rated AND text ≥50
- On submit → call `submit_full_review` RPC → redirect to `/orders/:id`
- If prompt expired or already reviewed → show read-only state

Routing: add to `App.tsx` under `/orders/:order_id/review` protected.

### 4. Frontend — Profile reviews section

New `src/components/marketplace/ProfileReviewsSection.tsx` rendered on `SellerProfile.tsx` below bio:
- Aggregate header: large overall rating, 5-star visual, total count, 5-row distribution bar chart (% horizontal bars)
- Sort toggle: Newest (default) / Most Helpful / Highest Rated
- Each review card: buyer first name + last initial only, date, 5-star overall, 5 small category rows, review text, italic standout moment if present
- Seller-only "Respond to this review" link → inline textarea (max 300 chars) → saves to existing `reply` column; displays as "Seller response" label 11px uppercase #999, indented

### 5. Buyer notification CTA

Existing `NotificationBell` already routes via `link`; no change needed — link points to `/orders/:id/review`.

### Technical notes

- Existing `LeaveReview.tsx` and `ReviewsList.tsx` remain untouched (used elsewhere); the new page and section are additive.
- River Score formula encapsulated in a single SQL function `compute_river_score(seller_id)` so it can be reused/tuned.
- 14-day expiry enforced both in RPC (server) and UI (client).
- Email uses existing Resend infrastructure; no new secrets.
- No changes to existing styling tokens, layout, or any unrelated page.

### Files

**New:** migration, `src/pages/orders/LeaveReviewPage.tsx`, `src/components/marketplace/ProfileReviewsSection.tsx`
**Edited:** `src/App.tsx` (1 route), `src/pages/SellerProfile.tsx` (mount new section below bio)
