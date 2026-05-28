# Final Fiverr-Parity QA & Fix Pass

The prior cycle landed the backend automation (cron, review gating, presence), Buyer Dashboard, Settings, and promotion tracking. This pass closes the remaining gaps in one build cycle.

## Scope

### 1. Route & navigation completeness
- Add `/browse` alias → Explore (verify wired)
- Add `/categories/:slug` and `/categories/:slug/:sub` → Search with prefilter
- Add `NotFound` (404) and `ErrorBoundary` (500) pages, wire catch-all
- Verify header/footer links resolve for both guest and authed states

### 2. Order lifecycle gating
- `OrderDetail`: block delivery/messages UI until `requirements_submitted = true`
- `RequirementsForm`: on submit, set `requirements_submitted_at` + status → `in_progress`, compute `delivery_deadline`
- `LeaveReview`: confirm two-way gating copy matches new trigger behavior

### 3. Search & ranking
- `Search.tsx`: order by `gig_promotions.status='active'` first, then `average_rating DESC, total_orders DESC`
- Wire FTS query via `search_vector` when `q` param present
- Empty state + result count

### 4. Seller surfaces
- `SellerAnalytics`: basic stats (orders, earnings, completion rate, response time/rate) — no Recharts, simple cards
- `Withdrawals`: ensure request form validates against `available_balance`
- Online status badge on seller profile + gig card uses `is_online`

### 5. Presence & realtime
- Verify `useOnlineHeartbeat` mounted in `AppShell` (already added) and pings every 60s
- Confirm `messages`, `orders`, `notifications` realtime subscriptions live on Inbox, OrderDetail, NotificationBell

### 6. UX polish
- Empty states for: Inbox, Orders, Saved, Notifications, Search
- Loading skeletons on Landing, Search, GigDetail, Inbox
- SEO: per-page `<title>` + meta description on Landing, Search, GigDetail, Profile
- Responsive audit on Landing, Search, GigDetail, Inbox

### 7. Smoke test (manual walk after build)
Signup buyer → browse → open gig → place order → submit requirements → seller delivers → buyer accepts → both review → review publishes → seller withdraws.

## Explicitly deferred
- Stripe Connect Express onboarding (manual payouts remain)
- Recharts analytics, JSON-LD SEO, real KYC, multi-currency, video calls, native mobile

## Technical notes
- All edits frontend-only except optional small migration if a missing index surfaces during search testing
- No new tables; reuse existing schema and RPCs
- Keep monochrome x.ai tokens; no new colors

After implementation I'll do the smoke walk and report any residual defects.
