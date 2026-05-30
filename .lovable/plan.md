## Scope
Admin panel only. No other site changes.

## 1. Remove separate seller applications page
- Delete `src/pages/admin/SellerApplicationsPage.tsx`.
- Remove the `/admin/seller-applications` route and lazy import in `src/App.tsx`.
- Remove the existing "Seller Approvals" tab from `Admin.tsx` (and its `SellerApprovalsQueue` section usage in the tab list).

## 2. Merge application flow into Sellers tab
In `Admin.tsx` Sellers tab:
- Fetch `seller_applications` alongside seller profiles; join by `seller_id`.
- Sort so sellers whose `seller_status = 'pending_approval'` (with a pending application) appear at the top.
- Show a yellow "Pending" badge in the Status column for those rows.
- Expanding a pending row reveals the full application inline: bio, location, language, skills, primary/secondary category, experience description, packages, portfolio URLs, submitted date.
- Inline Approve / Reject buttons that call existing `approve_seller` / `reject_seller` RPCs (Reject opens existing reason dialog).

## 3. Status color tokens
Add semantic status classes in `src/index.css` (HSL equivalents of the requested hexes) and small Tailwind utilities:
- `.status-pending` (yellow #FEF3C7 / #92400E)
- `.status-approved` (green #D1FAE5 / #065F46) — also used for Active, Completed, Funds Released
- `.status-suspended` (orange #FED7AA / #B45309)
- `.status-banned` (red #FEE2E2 / #991B1B) — also used for Disputed, Late, Funds Locked
- `.status-in-progress` (blue #DBEAFE / #1E40AF)

Build a `<StatusBadge variant="..." withLock?>` helper component used everywhere in admin (Buyers Status, Sellers Status, Orders status, Disputes, Withdrawals/Revenue payout state, escrow lock badges). Late and Funds Locked variants render a `Lock` icon from lucide. No styling changes outside admin.

## 4. Convert admin to left sidebar layout
Replace the horizontal `Tabs` bar in `Admin.tsx` with a shadcn `Sidebar` (`SidebarProvider` + collapsible="icon"):
- Nav links: Buyers, Sellers, Orders, Revenue (new), Disputes, Withdrawals, Verifications, Reports.
- Selected nav drives the same internal section state — existing tab content components are reused unchanged.
- Header keeps the existing title and "River Ops →" link; add a `SidebarTrigger`.
- Add a new "Revenue" section that surfaces platform revenue (sum of `platform_fee` from completed orders, grouped by day/month — read-only summary using existing data).

## 5. Real-time dot indicators on sidebar links
Small colored dot rendered next to the nav label:
- **Disputes** — red dot when any `orders.status = 'disputed'` OR `disputes.status = 'open'` exists.
- **Sellers** — yellow dot when any `profiles.seller_status = 'pending_approval'` exists.
- **Revenue** — always green dot.
- **Orders** — blue dot when any order in `pending_requirements`, `in_progress`, or `delivered` exists.

Implementation: a `useAdminNavIndicators()` hook does initial counts via Supabase queries, then subscribes via Supabase Realtime channels to `public.orders`, `public.disputes`, and `public.profiles` (`postgres_changes` event `*`). On any change it re-runs the affected count. Cleanup on unmount.

No DB migration required (realtime publication already includes these core tables; if not, add `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for the missing ones in a small migration).

## Files
- Edit: `src/App.tsx`, `src/pages/admin/Admin.tsx`, `src/index.css`
- Delete: `src/pages/admin/SellerApplicationsPage.tsx`
- Create: `src/components/admin/StatusBadge.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/hooks/useAdminNavIndicators.ts`
- Possible: small migration to ensure realtime publication includes `orders`, `disputes`, `profiles`.

## Out of scope
No changes to colors, fonts, layout, or behavior anywhere outside `/admin`.
