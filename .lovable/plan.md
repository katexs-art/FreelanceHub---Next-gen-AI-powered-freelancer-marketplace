## Customizable HQ Dashboard with Widget Control

### 1. Route & Page
- Add new route `/hq` → new `src/pages/Hq.tsx`, wrapped in `ProtectedRoute` + `AppShell`.
- Update sidebar/nav links currently pointing to `/seller/dashboard` and `/buyer/dashboard` to also expose `/hq` (keep existing dashboards intact; `/hq` is the new unified, customizable workspace).
- Page adapts widget availability based on `profile.role` (seller-only widgets hidden for pure clients, and vice versa).

### 2. Database
Migration adds to `profiles`:
- `dashboard_layout jsonb NOT NULL DEFAULT '[]'::jsonb`

Shape:
```json
[
  { "id": "active_orders", "visible": true, "collapsed": false },
  { "id": "messages",      "visible": true, "collapsed": false },
  ...
]
```
Empty array → fall back to role-based default (Active Orders, Messages, Earnings, My Gigs for sellers; Active Orders, Messages, Open Projects, Notifications for buyers).

### 3. Widget registry
New `src/components/hq/widgets/index.ts` exporting a typed registry:
```
WIDGETS = {
  active_orders, messages, earnings, my_gigs,
  analytics, open_projects, river_ai, notifications
}
```
Each entry: `{ id, title, icon, roles: ('seller'|'client'|'admin')[], minHeight, Component }`.
Each `Component` is a small self-contained card that fetches its own data from Supabase (reusing existing queries already used in SellerDashboard/BuyerDashboard/Inbox/MyGigs).

Widgets:
- **Active Orders** — `orders` where status in (`in_progress`,`delivered`) for current user (buyer or seller side).
- **Messages** — last 3 `conversations` with avatar + preview + inline "Reply" → opens Inbox at that conversation.
- **Earnings Overview** — seller_accounts: available / pending / lifetime.
- **My Gigs** — top active gigs with impressions + total_orders.
- **Analytics** — profile views + gig clicks this week (sum `gigs.clicks`/`impressions` for the user).
- **Open Projects** — latest `project_posts` where status='open' (for sellers to bid).
- **River AI** — compact ask box, posts to existing `river-chat` edge function, shows last answer.
- **Notifications** — last 8 from `notifications`.

### 4. Layout + drag/drop
- Use **@dnd-kit/core** + **@dnd-kit/sortable** (lightweight, already common in shadcn ecosystems) — add as dependency.
- 2-column responsive grid on desktop (`md:grid-cols-2`), single column on mobile. Widgets flow in order from saved layout.
- Each `WidgetCard` shell renders: header (drag handle ⠿, title, collapse chevron, hide eye) + body (Component or hidden when collapsed).
- Only in **edit mode**: dashed border, drag handle active, hide button visible. In view mode the card is clean.

### 5. Edit mode UX
- Top-right of `/hq`: `Customize Dashboard` button (becomes `Done` in edit mode).
- Edit mode state local to page; entering it does NOT auto-save — saves on each reorder/hide/show via debounced `updateLayout()`.
- `Add Widget` button (visible in edit mode) opens a `Dialog` showing grid of currently-hidden widgets (icon + title + "Add"). Adding appends to end with `visible: true`.

### 6. State + persistence hook
New `src/hooks/useDashboardLayout.ts`:
- Reads `profile.dashboard_layout`; merges with registry to drop unknown ids and append any newly-introduced widgets at the end (hidden by default for existing users so we don't surprise them).
- Exposes `{ layout, visible, hidden, reorder(ids), toggleVisible(id), toggleCollapse(id), addWidget(id) }`.
- Persists via `supabase.from('profiles').update({ dashboard_layout })` (debounced 400ms), with localStorage mirror so layout loads instantly before profile fetch resolves.

### 7. Files
- `supabase/migrations/<new>.sql` — add `dashboard_layout` column
- `src/pages/Hq.tsx` — new
- `src/hooks/useDashboardLayout.ts` — new
- `src/components/hq/WidgetCard.tsx` — shell with drag/collapse/hide chrome
- `src/components/hq/AddWidgetDialog.tsx` — new
- `src/components/hq/widgets/*.tsx` — 8 widget components
- `src/components/hq/widgets/index.ts` — registry
- `src/App.tsx` — register `/hq` route
- `src/components/layout/AppShell.tsx` — add HQ to sidebar nav
- `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

### 8. Verification
- New user lands on `/hq` → sees default 4 widgets for their role.
- Click `Customize Dashboard` → dashed borders + drag handles + hide buttons appear.
- Drag to reorder → order persists across reload.
- Hide widget → moves to `Add Widget` dialog; re-add restores it at end.
- Collapse toggle hides body, persists.
- Theme from Settings still applies (page is AppShell-wrapped).
