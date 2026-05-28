
# Plan — Flows-only buildout on the current white theme

Goal: implement every functional flow the spec calls for, **without** touching the locked white/green design system. All new UI uses the existing semantic tokens (white bg, dark text, green primary, JetBrains Mono + Work Sans).

## What already exists (no rebuild needed)

- **Theme & layout**: white canvas locked, navbar, footer.
- **DB schema**: profiles, gigs, gig_packages/extras/requirements, orders, order_deliveries, order_requirements_answers, conversations, messages, custom_offers, reviews, disputes, cancellation_requests, transactions, withdrawals, seller_accounts, notifications, saved_gigs, ai_search_sessions, platform_settings, categories. Triggers for notifications, balance recompute, review gating, gig rating, response stats — all in place.
- **Edge functions**: `stripe-checkout`, `stripe-webhook`, `stripe-connect-onboard`, `stripe-payout`, `stripe-refund`, `payout-method-save`.
- **Pages**: Landing, Explore, Search, CategoryPage, GigDetail, SellerProfile, BecomeSeller, Inbox, BuyerDashboard, SellerDashboard, MyGigs, GigEditor, Earnings, SellerAnalytics, Verification, OrdersList, OrderWorkspace, CheckoutSuccess, account/Settings, account/Saved, account/NotificationPreferences, admin/Admin, auth pages.

## What's missing — build in this order

### 1. Checkout flow (buyer purchase)
- New `/checkout` page: package summary, extras toggles, requirements preview, total + 20% fee breakdown, "Pay now" button.
- Wire to existing `stripe-checkout` edge function; on success Stripe redirects to `/orders/checkout-success` which already exists.
- Confirm `stripe-webhook` creates the order, conversation, transactions, notifications (verify against current implementation; patch if missing pieces).

### 2. Order workspace — finish the buyer/seller fulfilment loop
- `/orders/:id` (`OrderWorkspace`): make sure these tabs work end-to-end:
  - **Requirements**: buyer answers `gig_requirements` → writes `order_requirements_answers`, flips order to `active`, sets `delivery_deadline`.
  - **Deliveries**: seller uploads files to `delivery-files` bucket → inserts `order_deliveries`, flips order to `delivered`, sets `auto_complete_at`.
  - **Revisions**: buyer "Request revision" → increments `revision_count`, status `revision_requested`.
  - **Accept delivery**: buyer "Mark complete" → calls new `complete-order` edge function.
  - **Cancellation**: either party opens `cancellation_requests`; counterpart accept/decline.
  - **Dispute**: either party opens a `disputes` row; admin resolves.

### 3. Realtime inbox + custom offers
- `/inbox` / `/inbox/:conversationId`: subscribe to `messages` via Supabase realtime, append on insert, `is_read` on focus.
- Composer: text + attachment (upload to `message-attachments`), and a **Send custom offer** modal (price, delivery, revisions, description) → inserts `custom_offers` and a placeholder message linking to it.
- Custom offer card in thread: buyer Accept → calls `accept_custom_offer` RPC (already exists) and redirects to checkout for that order; Decline → updates status.

### 4. Reviews flow
- On completed order, both parties see a "Leave review" CTA on `/orders/:id` → writes `reviews` row (rating + sub-ratings + text). Existing trigger gates `is_public` until counterpart reviews or 14 days pass. Show public reviews on `GigDetail` and `SellerProfile`.

### 5. Seller payouts (Stripe Connect)
- New `/selling/onboarding` page: calls `stripe-connect-onboard`, redirects to Stripe, returns to `/selling/earnings?connected=true`.
- `Earnings` page: show available / pending / lifetime, withdraw button → calls `stripe-payout`; list `withdrawals` and `transactions`.

### 6. Admin disputes & moderation
- `/admin/disputes`: list open `disputes`, resolve with refund or release → calls new `resolve-dispute` edge function.
- `/admin/gigs`: approve/deny pending gigs (status `pending_review` → `active`/`denied`).
- `/admin/users`: suspend via existing `suspend_seller` RPC.

### 7. AI search + Explore
- New `ai-search` edge function (Lovable AI gateway, Gemini Flash) that takes a natural-language query, returns refined query + suggested categories + ranked gig ids, and logs to `ai_search_sessions`.
- Wire the Explore/Search hero input to call it, render results.

### 8. Cron jobs
- Schedule existing `auto_complete_orders`, `auto_publish_reviews`, `expire_promotions`, `mark_offline_stale`, `clear_due_seller_credits` via `pg_cron` (hourly / daily as appropriate).
- New `complete-order` edge function (credits seller pending balance with 14-day clearance) + `auto-complete` cron caller for `delivered` orders past `auto_complete_at`.

### 9. Notifications & realtime badges
- Bell in navbar subscribes to `notifications` for `auth.uid()`, shows unread count, marks read on open.

## Technical notes

- **Money**: every credit/debit happens server-side in edge functions with the service role key. Client never writes `transactions`, `withdrawals`, `seller_accounts.*_balance`.
- **Storage buckets**: `delivery-files`, `message-attachments`, `order-files`, `kyc-documents` already exist with private ACL — access via signed URLs from edge functions or RLS-scoped client reads.
- **Realtime**: add `messages`, `notifications`, `orders` to `supabase_realtime` publication.
- **Design**: everything uses existing tokens (`bg-background`, `text-foreground`, `bg-primary`, JetBrains Mono headings, Work Sans body). No new colors, no spec colors (`#caff00`, `#000`).
- **Auth**: existing global redirect to `/login` stays; admin checks via `is_admin(auth.uid())` already defined.

## Out of scope (per "ignore spec colors/fonts" decision)

- Black background, `#caff00` lime accent, DM Sans / Space Mono fonts, pill-only buttons. The spec's design directives are dropped; functional spec is honored.

## Suggested execution order (each step is a separate commit)

1. Checkout page + verify webhook order creation
2. Order workspace requirements + deliveries
3. Revisions, cancellations, disputes UI
4. Realtime inbox + custom offers
5. Reviews flow
6. Stripe Connect onboarding + payouts
7. `complete-order`, `auto-complete`, `clear-funds` edge functions + cron
8. Admin disputes/gigs/users
9. AI search
10. Notifications bell + realtime polish

Tell me to start, and I'll begin with step 1 (checkout) unless you want a different order.
