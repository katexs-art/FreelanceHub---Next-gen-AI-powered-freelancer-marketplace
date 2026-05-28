# Full Fiverr-Parity QA + Fix Pass (one build cycle)

Approve this plan and I'll do the entire audit + every fix in a single build session, no further check-ins.

## What I'll do

### 1. Audit (read-only, fast)
- Walk every route in `App.tsx`, hit each in the browser, screenshot and log defects.
- Run Supabase linter + inspect cron jobs, triggers, and edge functions.
- Cross-check the original Fiverr-clone spec against current code; produce a defect list grouped P0 / P1 / P2.

### 2. Backend fixes (one migration)
- Add `is_online` heartbeat RPC + `last_seen` update function.
- Add `pending_review` to `gig_status` enum + admin approval flow.
- pg_cron hourly jobs: `clear_due_seller_credits`, `auto_complete_orders` (3d post-delivery), `auto_publish_reviews` (14d), `expire_promotions`.
- Two-way review gating trigger (auto-publish after both sides review OR 14d).
- Notification fan-out triggers for: new_message, custom_offer, delivery, revision_request, dispute_opened, payout_paid, new_follower, kyc_result.
- Promoted-first ordering: helper view `gigs_ranked` (active promotion boost).
- Search FTS index on `gigs.search_vector` (title + description + tags) + trigger.
- Enable Realtime on `messages`, `orders`, `notifications`, `disputes`.

### 3. Edge function fixes
- `stripe-connect-onboard` + `stripe-connect-refresh` (Express accounts).
- Extend `stripe-webhook` for `account.updated`, `payout.paid`, `payout.failed`, `charge.refunded`.
- `start-order` guard: block transition out of `pending_requirements` until `requirements_submitted=true`.

### 4. Frontend fixes
- Wire `is_online` heartbeat hook in `AppShell` (60s interval while focused).
- Promotion impression/click tracking on `GigCard` + `GigDetail` via `trackPromotionEvent`.
- Search/Explore: apply promoted-first ordering + missing filters (delivery time, seller level, online now, rating).
- Requirements form blocks order start; OrderWorkspace surfaces gate.
- LeaveReview: enforce two-way visibility + show "waiting on counterpart" state.
- Add missing pages flagged as `Placeholder`/`DashboardPlaceholder`: real Buyer Dashboard, Account Settings, Seller Analytics (Recharts monochrome).
- Add `/browse` and `/categories/:slug/:sub` route aliases.
- Add 404/500 styled pages, empty states across all list surfaces, hairline skeletons.
- SEO: per-page `<title>`/`<meta>`, JSON-LD on GigDetail (Product) + SellerProfile (Person), `sitemap.xml`, canonical tags.
- Responsive audit pass at 360 / 768 / 1280; fix any breakpoints found.

### 5. End-to-end smoke test
Drive the browser through: signup → become seller → create gig → admin approves → buyer browses → orders → submits requirements → chats → seller delivers → buyer accepts → reviews exchanged → seller withdraws. Screenshot each step, report pass/fail.

## Deliverable
- All P0/P1 defects fixed in code.
- Single defect report at end: what passed, what was fixed, what remains as P2 with recommendations.
- No further questions — I run the whole loop and report at the end.

## Out of scope
Native mobile apps, real KYC provider, multi-currency, video calls, AI image generation.
