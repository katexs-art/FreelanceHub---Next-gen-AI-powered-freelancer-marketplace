
# Katexs — Full Fiverr-clone build plan

The attached spec is a complete rebuild of the marketplace into a production Fiverr clone with Stripe Connect, gig packages/extras/requirements, custom offers, two-way reviews, disputes, cancellations, ledgered earnings + clearance, withdrawals, admin moderation, and an AI search bar. The existing app has a thin marketplace (profiles, experts, services, projects, transactions) that does **not** map cleanly to the spec — schema, statuses, money flow, and routes are all different.

This needs to ship in phases. Each phase is independently testable and approved before moving on. Below is phase 1 in detail (what I'd build first if you approve). Subsequent phases are summarized — I'll write a fresh detailed plan for each one when we get there.

---

## Phase 1 — Schema + Auth foundation (this plan)

### Database migration
Create / replace tables to match the spec exactly:
- `profiles` — add `username` (unique, validated), `bio`, `country`, `languages[]`, `member_since`, `is_online`, `last_seen`, `response_time_minutes`, `response_rate`. Role enum: client | seller | admin.
- `seller_accounts` — Stripe Connect: `stripe_account_id`, `onboarding_complete`, `charges_enabled`, `payouts_enabled`, `available_balance`, `pending_balance`, `lifetime_earnings` (all cents).
- `gigs` — replaces `services`. Includes `status` (draft/pending_review/active/paused/denied), `tags[]`, `gallery_urls[]`, `search_vector tsvector` (generated) + GIN index, impressions/clicks/rating counters.
- `gig_packages` (basic/standard/premium), `gig_extras`, `gig_requirements`.
- `orders` — replaces `projects`. Adds `order_number` (human-readable KX-XXXXX), `selected_extra_ids[]`, `requirements_submitted` + timestamp, `delivery_deadline`, `auto_complete_at`, `revision_count`, full status enum (pending_payment / pending_requirements / active / delivered / revision_requested / completed / cancelled / disputed).
- `order_requirements_answers`, `order_deliveries`, `custom_offers`, `cancellation_requests`, `disputes`.
- `messages` — replace/extend current schema with `conversation_id`, `order_id` (nullable), `custom_offer_id`, `attachment_url`.
- `reviews` — two-way (reviewer_role buyer/seller), sub-scores, reply, `is_public` gating, unique (order_id, reviewer_role).
- `transactions` — ledger (charge / platform_fee / seller_credit / refund / withdrawal) with `clears_at`.
- `withdrawals`, `notifications`, `saved_gigs`, `ai_search_sessions`.
- `categories` — add `parent_id`, `sort_order`.
- `platform_settings` — seed `platform_fee_percent=20`, `auto_complete_days=3`, `clearance_days=14`, `min_gig_price=5`.
- Drop / archive unused legacy tables (experts, services, projects, deals, contacts, vapi_*, channels, messenger_messages, etc.) **only after** confirming with you — see open question.
- Full RLS + GRANT statements on every table per the spec. All money-mutating writes restricted to service role.
- Storage buckets: `gig-images` (public), `avatars` (public), `order-files` (private), `delivery-files` (private), `message-attachments` (private).

### Auth
- Email/password + Google OAuth (`configure_social_auth`).
- Disable auto-confirm (turn off — spec implies normal verification; confirm with you).
- Signup: buyer vs seller tabs, live username validation for sellers, country, terms.
- Login: role-based redirect (client → `/dashboard`, seller → `/selling` or `/selling/onboarding` if Stripe not complete, admin → `/admin`).
- Online heartbeat (5-min interval) updating `is_online` / `last_seen`.
- `handle_new_user` trigger already in place — extend to insert `seller_accounts` row when role=seller.

### Frontend skeleton
- Wipe existing marketplace pages (`Browse`, `ExpertSignup`, `DashboardClient`, `DashboardExpert`, `ExpertProfile`, `ProjectDetail`, `MarketplaceAdmin`, etc.) and the inline-styled theme/components — they don't match the spec.
- Set up the design system in Tailwind: DM Sans + Space Mono from Google Fonts, color tokens (`#000`, `#050505`, `#0c0c0c`, `#1c1c1c`, `#2a2a2a`, `#caff00`, `#378add`, `#e24b4a`, `#3ecf8e`), button variants (`btn-primary`, `btn-white`, `btn-ghost`, `btn-outline`), card variant, all radius 999px / 12px.
- Routing skeleton for every route in the spec (public / buyer / seller / admin) with role-protected wrappers — pages can be empty placeholders for now and filled in subsequent phases.

### Phase 1 deliverable
You can sign up as buyer or seller, log in, get role-routed, and see empty placeholder pages with correct nav and theme. Database is ready for all later phases.

---

## Phases 2–12 (summary — separate plan per phase)

2. **Homepage + AI search bar** + `ai-search` edge function (keyword adapter, swappable for LLM later).
3. **Browse / search** — full-text rank, filters, sort, gig card grid.
4. **Gig creation flow** (5-step wizard: overview, pricing, requirements, description, gallery) + gig detail page + admin moderation queue.
5. **Checkout + Stripe Connect** — `create-payment-intent` (destination charge with application_fee), `stripe-webhook` (creates order pending_requirements, writes transactions), requirements submission gates the delivery clock.
6. **Order detail** — realtime chat, attachments, custom offers (accept → new order), delivery upload, accept / revision / dispute / cancellation flows.
7. **Reviews** — two-way gated, sub-scores, replies, public release rules.
8. **Notifications** — realtime bell + unread badges in nav.
9. **Earnings / clearance / withdrawals** — `complete-order`, `clear-funds` (pg_cron hourly), `auto-complete` (pg_cron hourly), `create-payout`, `resolve-dispute` edge functions.
10. **Buyer + seller dashboards** + seller analytics (impressions / clicks / CTR / conversion).
11. **Admin** — overview, gigs moderation, orders, disputes, revenue, categories, settings (`platform_settings` editor).
12. **Responsive pass** (1024 / 768 / 480) + end-to-end QA of every flow.

---

## Open questions before I start phase 1

1. **Legacy data**: there are a lot of tables from the old CRM build (contacts, deals, channels, vapi_*, affiliates, integration_settings, etc.). Are you OK with me **dropping** them as part of phase 1? Or do you want them kept around? I recommend dropping — they have no place in the new app.
2. **Email verification**: spec doesn't say. Keep auto-confirm **on** (instant login, no email needed) like we just enabled, or turn it **off** for real verification?
3. **Stripe Connect**: phase 5 will need `STRIPE_SECRET_KEY` (already set) and you'll need to enable Connect in your Stripe dashboard and provide the Connect client ID. OK to handle when we get there?
4. **Existing admin account** (`admin@katexs.com`): keep it as admin role on the new `profiles` schema? (Yes is the default.)

Once you answer these I'll implement phase 1.
