## Scope

Visual redesign of `src/pages/buyer/BuyerDashboard.tsx` only. All existing data fetching, state, routing, and Supabase queries remain identical — only JSX, layout, and inline styles change. No changes to `AppShell`, sidebar, or any other file.

## Approach

Rewrite the `<AppShell>` children block in `BuyerDashboard.tsx` using the exact spec the user provided. Use inline styles with literal hex values (per spec) rather than semantic tokens, since the user explicitly dictated colors. Keep all existing data hooks (`orders`, `saved`, `recs`, `stats`, `personalized`) wired to the new markup.

### Layout

- Outer wrapper: `max-width: 1200px`, `padding: 32px` (AppShell already wraps with sidebar).
- Welcome header card (#111 bg, #1E1E1E border, radius 16, 28×32 padding) with left label/heading/date and right action buttons ("Post a Project" → `/post-job`, "Find an Expert" → `/explore`).
- Stats row: 4 cards, grid `repeat(4, 1fr)` gap 14:
  - Active (#1E3A5F border, blue dot/label, "In progress" pill) → `stats.active`
  - Completed (#052E16 border, green) → `stats.completed`
  - Open Proposals (#2E1065 border, purple) → new count from existing `orders` filtered by `status === 'pending_acceptance'` if present, else 0 (no new query — derive from already-fetched `orders`/`all` arrays; fallback to 0 if not derivable without new fetch)
  - Lifetime Spend (#1A1A1A border, white) → `$${stats.spent}`
- Two-column flex below: left 63%, right 37%, gap 20.

### Left column

- **Recent Projects card** (#111 / #1E1E1E / radius 16 / pad 24):
  - Header "Recent Projects" + "View all →" → `/buyer/orders`.
  - If `orders.length === 0` → empty state with icon circle, copy, white pill button "Post a Project" → `/post-job`.
  - Else map `orders` to rows: title (`o.gigs?.title`), status badge with status-based color, expert name (currently not loaded — show `o.order_number` as secondary line to avoid new queries), deadline color logic skipped (no deadline field on order row currently — omit gracefully).
- **Recommended Plays card**: header "Recommended Plays" + "Browse all →" → `/explore`. Show first 2 of existing `recs` as side-by-side cards (image 110px, expert name uppercase, title clamped 2 lines, stars + price row).

### Right column

- **River AI card** (gradient bg, #2E1065 border): label "RIVER AI", heading, subtext, textarea (controlled local state), "Find My Expert →" button. On submit, navigate to `/explore?q=${encodeURIComponent(text)}` (matches existing explore route; no new backend).
- **Quick Actions card**: 4 stacked rows with colored circles → `/post-job`, `/services`, `/projects`, `/inbox` (note: user spec says `/messages` but actual route is `/inbox` per AppShell; use `/inbox` to preserve routing).
- **Activity card**: derive feed from existing `orders` array (recent status changes). If empty → "No activity yet". Colored dots: green = completed, blue = messages (skip if no data), purple = pending proposals, orange = active. Time-ago computed inline from `created_at`.

### Styling rules

- All colors per spec as literal hex inline styles (`style={{ background: '#111111', ... }}`).
- Hover states implemented via `onMouseEnter`/`onMouseLeave` toggling inline style state, or via a small scoped `<style>` block with classnames like `pj-quick-row:hover`.
- Buttons use `<Link>` from react-router-dom styled inline (not the shared `Button` component, to avoid token conflicts).
- Page background: wrap the whole content in a div with `background: #0A0A0A` covering the main area.

### Preservation

- All `useEffect` data loading stays untouched.
- All existing state variables continue to drive the UI.
- No edits to `AppShell`, `SiteHeader`, routes, schema, RLS, or shared UI primitives.

## Out of scope

- No new Supabase queries, RPC, or schema changes.
- No new routes or nav changes.
- No edits to other pages or shared components.
- "Open Proposals" count is derived from already-loaded data; if not present, displays 0 (no extra fetch).
