## Plan — Database connection hardening pass

### Important note on the schema
In this project `profiles.id` is already equal to `auth.uid()` (set in `handle_new_user`). There is no separate `auth_id` column, so a literal "look up profile id from auth id" step is a no-op. I will still defensively call `supabase.auth.getUser()` before any write that depends on the current user, so we surface an unauthenticated state with a friendly toast instead of a database error.

### 1. Order creation flow (Play page → Checkout)
- `src/pages/GigDetail.tsx` Continue handler: before calling `create_gig_order`, call `supabase.auth.getUser()`. If no user → redirect to `/login?redirect=/gig/:id`. Wrap the RPC in try/catch, toast a friendly message on failure, then navigate to `/checkout/:order_id`.
- `src/pages/Checkout.tsx`: keep existing logic; add try/catch around the `stripe-payment-intent` invoke with a toast on failure.

### 2. Wrap every insert/RPC write in try/catch + toast
Audit and harden every client-side write to: `orders`, `bids`, `messages`, `conversations`, `reviews`, `notifications`, `custom_offers`, `project_posts`, `saved_gigs`, `seller_follows`, `disputes`, `cancellation_requests`. For each:
- pre-check `supabase.auth.getUser()` where the row depends on the current user
- `try { ... } catch (e) { toast({ title: "Friendly message", description: e.message, variant: "destructive" }) }`
- never swallow errors silently

Files to touch (insert/RPC sites):
- `src/pages/GigDetail.tsx` (order RPC, save, follow, custom offer accept)
- `src/pages/PlaceBid.tsx` (`submit_bid` RPC)
- `src/pages/Pitch.tsx` (`submit_river_pitch` RPC)
- `src/pages/Inbox.tsx` (messages insert, conversation create via `get_or_create_conversation`)
- `src/pages/orders/OrderWorkspace.tsx` (deliveries, dispute, approve, cancel, requirements answers)
- `src/pages/orders/LeaveReviewPage.tsx` (`submit_full_review`)
- `src/components/marketplace/CustomOfferComposer.tsx` (custom_offers insert + message insert)
- `src/components/marketplace/SaveGigButton.tsx`, `FollowSellerButton.tsx`, `ReportDialog.tsx`, `LeaveReview.tsx`
- `src/pages/PostJob.tsx` (project_posts insert)
- `src/pages/buyer/BuyerDashboard.tsx` and `src/pages/seller/SellerDashboard.tsx` if they perform writes

No visual / layout / copy changes — only error handling.

### 3. Foreign key audit (single migration)
Run a migration that adds missing FK constraints so bad inserts fail loudly at the DB layer instead of silently corrupting state. Constraints to ensure exist (all `ON DELETE` chosen to match current behavior — `CASCADE` for child rows, `SET NULL` for optional links):

```
orders.buyer_id            → profiles(id)  ON DELETE CASCADE
orders.seller_id           → profiles(id)  ON DELETE CASCADE
orders.gig_id              → gigs(id)      ON DELETE SET NULL
orders.package_id          → gig_packages(id) ON DELETE SET NULL
bids.seller_id             → profiles(id)  ON DELETE CASCADE
bids.project_id            → project_posts(id) ON DELETE CASCADE
notifications.user_id      → profiles(id)  ON DELETE CASCADE
reviews.buyer_id           → profiles(id)  ON DELETE CASCADE
reviews.seller_id          → profiles(id)  ON DELETE CASCADE
reviews.order_id           → orders(id)    ON DELETE CASCADE
messages.sender_id         → profiles(id)  ON DELETE CASCADE
messages.recipient_id      → profiles(id)  ON DELETE CASCADE   (note: column is `recipient_id`, not `receiver_id`)
messages.conversation_id   → conversations(id) ON DELETE CASCADE
conversations.participant_one → profiles(id) ON DELETE CASCADE  (note: schema uses participant_one/two, not buyer_id/seller_id)
conversations.participant_two → profiles(id) ON DELETE CASCADE
```

Each constraint is added with `IF NOT EXISTS`-style guard (drop-if-exists then add) so the migration is idempotent. Before adding I'll run a pre-check `SELECT` for orphan rows; if any exist the migration will surface them so we can clean before constraining (otherwise the ALTER fails).

The brief asked for `conversations.buyer_id/seller_id` and `messages.receiver_id`, but those columns do not exist in this schema — using the real column names above.

### 4. Edge function audit
Read each function under `supabase/functions/*` that performs DB writes and confirm:
- uses `SUPABASE_SERVICE_ROLE_KEY` for privileged writes, anon+user JWT for user-scoped reads
- inserts user-scoped rows with `auth.uid()` (which equals `profiles.id` here)
- has try/catch returning proper JSON errors with CORS headers

Only patch functions that fail those checks. No deploys are forced beyond what's edited.

### 5. End-to-end manual verification
After applying, verify:
1. Logged-in buyer clicks Continue on a `/gig/:id` package → order row inserted, redirected to `/checkout/:order_id` with correct price.
2. Payment intent mints, Stripe test card succeeds → order transitions to `in_progress`.
3. Order appears in `/buyer/dashboard` and seller's `/seller/dashboard`.
4. Force a failure (e.g. log out then click Continue) → friendly toast, no raw error.

### Order of execution
1. Submit the FK migration (requires user approval) — runs first so step 2's try/catch surfaces real constraint violations cleanly.
2. After approval, edit all the client files in parallel batches.
3. Edge function tweaks.
4. Walk through the e2e flow in preview.

### Out of scope (explicitly not changed)
Colors, fonts, layout, copy, routes, RLS policies, business logic. Only error handling + missing FK constraints.
