# Split Admin Users into Buyers + Sellers

Replace the single **Users** tab in `src/pages/admin/Admin.tsx` with two dedicated tabs. Nothing else on the site changes.

> Note: the `user_role` enum stores buyers as `"client"`. The new **Buyers** tab will filter `role = 'client'` and display the label "Buyers" in the UI.

## Tab 1 — Buyers (`role = 'client'`)

Columns: Profile Photo · Full Name · Email · Status · Member Since · Total Orders Placed · Total Amount Spent · Last Active · Actions

- **Status**: derived — `suspended_at` → "Suspended", else "Active" (Ban = soft via `suspended_at` + flag; see Technical).
- **Total Orders Placed**: count of `orders` where `buyer_id = profile.id`.
- **Total Amount Spent**: sum of `orders.price` where `buyer_id = profile.id AND status = 'completed'`.
- **Last Active**: `last_seen` (fallback `updated_at`).
- **Row actions**: View Profile (link to `/u/:username` in new tab) · Send Notification (dialog → insert into `notifications`) · Suspend Account (sets `suspended_at = now()`) · Ban Account (sets `suspended_at = now()` + future-proof flag).
- **Expandable row**: clicking the row toggles an inline detail panel (no navigation) showing:
  - Full order history table (order #, seller, amount, status, date)
  - Recent activity: messages sent count, reviews left, saved gigs, last login

## Tab 2 — Sellers (`role = 'seller'`)

Columns: Profile Photo · Full Name · Email · Seller Status badge · River Score · Member Since · Total Orders Completed · Total Earned · Completion Rate · Last Active · Actions

- **Seller Status badge**: from `profiles.seller_status` (`approved`/`pending`/`rejected`/etc) — color-coded with existing tokens.
- **River Score**: `profiles.river_score`.
- **Total Orders Completed**: count of `orders` where `seller_id = profile.id AND status = 'completed'`.
- **Total Earned**: `seller_accounts.lifetime_earnings` (fallback to sum of `orders.seller_earnings` for completed).
- **Completion Rate**: completed / (completed + cancelled) as %.
- **Row actions**: View Profile · Approve (sets `seller_status='approved'`) · Reject (dialog for reason → `seller_status='rejected'` + `rejection_reason`) · Suspend · Ban · Send Notification · View Gigs (link to public seller profile, gigs section).
- **Expandable row**: inline panel showing:
  - Application: latest row from `seller_applications` (bio, skills, categories, portfolio, packages, status)
  - Gigs: list from `gigs` (title, status, price, orders, rating)
  - Orders: recent `orders` as seller
  - Reviews: recent `reviews` where `seller_id`
  - Earnings: `seller_accounts` balances + recent `transactions`

## UX behavior

- Single row expansion at a time (clicking another row collapses prior).
- Detail panel lazy-loads its data on first expand (per-row state map).
- Action buttons in the row use `stopPropagation` so they don't toggle expansion.
- Confirm dialogs for Suspend / Ban / Reject. Toast on success, then refresh list.
- Send Notification dialog: title + body fields → insert one row in `notifications` for that user.

## Technical

- File touched: `src/pages/admin/Admin.tsx` only (plus small extracted subcomponents in the same file, matching current pattern).
- Replace the existing `<TabsTrigger value="users">` with `buyers` and `sellers` triggers; keep all other tabs unchanged.
- Data fetching: extend `load()` to pull two lists in parallel:
  - Buyers: `profiles.select('id, full_name, username, email, avatar_url, suspended_at, created_at, last_seen').eq('role','client')`
  - Sellers: `profiles.select('id, full_name, username, email, avatar_url, seller_status, river_score, suspended_at, created_at, last_seen').eq('role','seller')`
- Aggregates per row computed via grouped queries:
  - One `orders` query grouped client-side by `buyer_id` to derive count + sum for buyers.
  - One `orders` query grouped client-side by `seller_id` for sellers (counts + cancellation).
  - `seller_accounts` fetched once and joined client-side by `seller_id`.
- Expanded-row data fetched on demand (separate effect keyed by expanded id) to avoid loading everything up front.
- Mutations:
  - Suspend: `update profiles set suspended_at = now()`.
  - Ban: same as suspend (no separate column today). If you want a distinct "banned" state later we'd add a `banned_at` column — flagged but not part of this change unless you ask.
  - Approve/Reject: `update profiles set seller_status = ...`.
  - Send Notification: `insert into notifications (user_id, type, title, body)`.
- All writes already permitted by existing `profiles_admin_update` / admin RLS.
- No DB migration required.
- No changes to colors, fonts, layout, or any other tab/page. Uses existing `Tabs`, `Button`, `Badge`, table styles, `cn`, lucide icons.

## Out of scope

- No new columns on `profiles` (Ban reuses `suspended_at` for now).
- No changes to the existing `SellerApprovalsQueue` tab — it stays as-is.
