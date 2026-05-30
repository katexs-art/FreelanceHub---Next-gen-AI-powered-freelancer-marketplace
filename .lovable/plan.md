# Admin Command Center — Sidebar + New Pages

Scope: Only `/admin/*`. No changes to colors, fonts, images, layout, or functionality elsewhere.

## 1. Sidebar rebuild (`src/pages/admin/Admin.tsx` + new `AdminSidebar.tsx`)

Replace the current `AdminNav` with a self-contained `AdminSidebar` component:

- 220px wide, white bg, 1px solid `#e5e5e5` right border, `position: sticky` so it stays fixed on scroll.
- Header: `KATEXS` (15px / 700) + `Admin Panel` (10px uppercase tracking-wide `#999`).
- Section labels: 10px uppercase tracking-wide `#bbb`, padding `8px 20px 4px`.
- Links: 13px `#333`, padding `10px 16px`, radius 8, mb 2, flex gap 10. Active = black bg / white text. Hover = `#f5f5f5`.
- Sections & links exactly as specified (OVERVIEW, PEOPLE, MARKETPLACE, MONEY, RIVER, CONTENT, SYSTEM).
- Each link renders a right-aligned indicator slot: colored dot, count badge (blue / grey / red / orange / yellow), or both.
- Bottom **System Health Strip**: 3 dot+10px label indicators (Supabase, Stripe, Anthropic). Re-checks every 60s.

Indicator data hook `useAdminIndicators()` (extends current `useAdminNavIndicators`):
- Initial queries + Realtime subscriptions on `profiles`, `orders`, `disputes`, `seller_applications`, `seller_verifications`, `project_posts`, `gigs`, `reviews`, `withdrawals`, `categories`, `river_ops_conversations`, `ai_search_sessions`.
- Derived counts: new buyers today, pending sellers, pending verifications, active orders, late orders, open projects, active gigs, open disputes, reviews today, escrow-held orders, pending payouts, refunds this week, river searches today, river ops unread, active categories.
- System health: ping `system-health` edge function every 60s.

## 2. New routes (`src/App.tsx`)

Lazy add: `/admin/buyers`, `/admin/sellers`, `/admin/verifications`, `/admin/orders`, `/admin/projects`, `/admin/gigs`, `/admin/disputes`, `/admin/reviews`, `/admin/revenue`, `/admin/escrow`, `/admin/payouts`, `/admin/refunds`, `/admin/river`, `/admin/river-analytics`, `/admin/river-ops` (existing), `/admin/categories`, `/admin/announcements`, `/admin/featured`, `/admin/notifications`, `/admin/settings`, `/admin/audit`, `/admin/health`.

`/admin` keeps existing Overview. Existing single-file panels (Buyers/Sellers/Orders/Disputes/etc.) inside today's `Admin.tsx` are extracted into route-level pages so the sidebar can deep-link. Their internal markup/logic is preserved verbatim.

## 3. New pages to build

Each lives in `src/pages/admin/` and reuses existing tokens/components (Table, Button, Card, StatusBadge):

- **EscrowPage** — orange total card + table of held orders + Release Early (confirm modal) + Lock Funds (sets dispute) + CSV export. Row color by release date / dispute.
- **PayoutsPage** — Pending Payouts (per-seller approve + Bulk Approve All) + Payout History from `withdrawals` + `seller_accounts`.
- **RefundsPage** — month total card + filterable table from `orders` where `refunded_at IS NOT NULL` + CSV.
- **ReviewsPage** — table from `reviews` with rating filter, search, expand row, Remove (delete + notify), Flag.
- **GigsPage** — table from `gigs` with category/status filter, search, View/Edit/Pause/Remove, Feature Gig (uses `gig_promotions`).
- **FeaturedSellersPage** — dnd list (max 12) backed by new `featured_sellers` table; search-add by name; Save Order.
- **AnnouncementsPage** — compose (title, body, audience, schedule, in-app/email) + history. Backed by new `announcements` table + `announcement-send` edge function.
- **RiverAnalyticsPage** — stat cards + 30-day line chart + top 50 queries + zero-result queries, all derived from `ai_search_sessions`.
- **SystemHealthPage** — 4 status cards + 100-event live log. Calls `system-health` edge function; auto-refresh 30s.
- **AuditLogPage** — read-only table from new `audit_log` table; filters + CSV.

Stub pages for items that already have data but no dedicated route (Categories, Announcements list, Notifications composer, Settings) get minimal panels that render existing data with the new shared admin frame. No styling deviation.

## 4. Database (single migration)

```sql
-- featured sellers
create table public.featured_sellers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique,
  position int not null,
  created_at timestamptz not null default now()
);
grant select on public.featured_sellers to anon, authenticated;
grant all on public.featured_sellers to service_role;
alter table public.featured_sellers enable row level security;
create policy fs_public_read on public.featured_sellers for select using (true);
create policy fs_admin_write on public.featured_sellers for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null,            -- all|buyers|sellers|category:<slug>
  channel text not null default 'in_app', -- in_app|in_app_email
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid not null,
  open_count int not null default 0,
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy ann_admin_all on public.announcements for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy ann_user_read on public.announcements for select
  using (sent_at is not null);

-- audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_name text,
  action_type text not null,
  target_type text,
  target_id text,
  description text,
  ip_address text,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select using (is_admin(auth.uid()));
create policy audit_admin_insert on public.audit_log for insert with check (is_admin(auth.uid()));
-- no update/delete policies → immutable

-- realtime
alter publication supabase_realtime add table
  public.featured_sellers, public.announcements, public.audit_log,
  public.reviews, public.withdrawals, public.seller_applications,
  public.seller_verifications, public.ai_search_sessions,
  public.river_ops_conversations, public.gigs, public.project_posts, public.categories;
```

## 5. Edge functions

- `system-health` — pings DB (`select 1`), Stripe (`/v1/balance`), Anthropic (`/v1/models`), email (Resend/SendGrid ping if key present). Returns `{supabase, stripe, anthropic, email}` with status + latency + last_event_at. Cached 30s.
- `announcement-send` — fans out an announcement to `notifications` rows by audience, optionally calls email provider, sets `sent_at` + `recipient_count`.
- `admin-audit` helper invoked by mutating admin actions to insert `audit_log` rows (also called directly client-side via RPC where convenient).

## 6. Indicator → query mapping (technical)

| Indicator | Source |
|---|---|
| Buyers today | `profiles` where `role='client' and created_at >= today` |
| Sellers pending | `seller_applications` where `status='pending'` |
| Verifications | `seller_verifications` where `status='pending'` |
| Orders active | `orders` where status in (`in_progress`,`delivered`) |
| Orders late | `orders` where `delivery_deadline < now()` and status not in (`completed`,`cancelled`,`refunded`) |
| Projects open | `project_posts` where `status='open'` |
| Gigs active | `gigs` where `status='active'` |
| Disputes open | `disputes` where `status='open'` |
| Reviews today | `reviews` where `created_at >= today` |
| Escrow held | `orders` where `escrow_status='held'` |
| Payouts pending | `withdrawals` where `status='requested'` |
| Refunds week | `orders` where `refunded_at >= now()-'7d'` |
| River searches today | `ai_search_sessions` where `created_at >= today` |
| River ops unread | `river_ops_conversations` where `role='assistant' and created_at > last_seen` (last_seen kept in `localStorage`) |
| Categories | `categories` where `is_active=true` |
| Overview health dot | from `system-health` |

## 7. Constraints respected

- No edits outside `src/pages/admin/**`, `src/components/admin/**`, `src/App.tsx` (route registration only), and `supabase/**`.
- Existing admin panels keep current visual styling; only the navigation chrome changes.
- No new global CSS variables; new sidebar styles are scoped inline / in `AdminSidebar.tsx`.
