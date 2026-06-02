## /hq dashboard upgrades + currency + black-bar fixes

### 1. Fix black bar on /hq
Root cause: `AppShell` outer wrapper is `min-h-screen bg-background`, but the inner `<div className="flex">` (sidebar + main) has no min-height. When the page is short, the area between the bottom of the sidebar/main and the (dark) `SiteFooter` collapses, but the dark footer's overflow paint plus html background can show as a black strip. Also `<main>` doesn't extend to the bottom of the viewport.

Fix:
- In `src/components/layout/AppShell.tsx`: wrap the flex row so it grows: change container to `flex flex-col min-h-screen bg-background`, and give the row `flex-1` + `bg-background`. Ensure `<main>` is `flex-1 bg-background`.
- Add `bg-background` to the html/body via `index.css` `html,body { background: hsl(var(--background)); }` to remove any default black showing during paint/scroll.

### 2. Currency formatting fix
Notifications like `$10.0000000000000000` come from two migrations that build the body in SQL: `'You received a ... $' || (NEW.price/100.0)::text`. Postgres `numeric` cast leaves trailing zeros.

Fix:
- New migration to `CREATE OR REPLACE` the trigger function (`notify_custom_offer` / equivalent — to be confirmed by reading the existing function) so the body uses `to_char(NEW.price/100.0, 'FM999999990.00')` and renders `$10.00`.
- Backfill: `UPDATE notifications SET body = regexp_replace(body, '\$(\d+)\.\d+', '$' || ... )` — single SQL statement to round any existing `$N.000…` strings to 2dp.
- Frontend helper `src/lib/money.ts` exporting `formatUSD(cents)` and `formatAmount(n)` (uses `Intl.NumberFormat('en-US', { style:'currency', currency:'USD' })`). Sweep components currently rendering raw `$${amount}` (Earnings widget, Active Orders widget, Order pages, Custom Offer cards, Notifications display) to use it. Scope: replace existing `$${…}` template literals only; no logic changes.

### 3. Right side "Top Picks For You" rail on /hq
Reuse `ExpertRecommendationsRail` (already built for Settings) but generalized:
- Move to `src/components/hq/TopPicksRail.tsx` (copy + tweak: heading "Top Picks For You", same 3-card rotation every 30s, fallback to top-rated when no history).
- Mount on `/hq` to the right of the widget grid. Update `Hq.tsx` layout to `grid grid-cols-[1fr_240px] gap-8` on `lg`, single column below.
- Source signals: `getRecentlyViewed()` gig categories + buyer's past order categories (query `orders` for `gig.primary_category`). Falls back to `profiles` ordered by `river_score`.

### 4. Bottom "Experts you might need next" row (full width, just above footer)
- New `src/components/hq/ExpertsYouMightNeed.tsx`: horizontal scroll of `GigCard` items with left/right chevron buttons that scroll the container by ~320px. Uses snap-x + scrollbar-hidden.
- Data: combines recently-viewed gig categories + categories of past orders → query `gigs` where `primary_category in (...)` + `status='active'`, ordered by `average_rating desc, total_reviews desc`, limit 12. Falls back to top-rated gigs if no signal.
- Renders inside `AppShell` but outside the `max-w-6xl` wrapper, full width, with internal `px-10` to align.

### 5. Second row "Open projects matching your skills" / "Recently posted projects"
- New `src/components/hq/ProjectRecsRow.tsx`: same horizontal-scroll shell with arrows.
- Heading switches by `profile.role`:
  - seller: title = "Open projects matching your skills", query `project_posts` where `status='open'` and `skills && profile.seller_skills` (Postgres array overlap), order by `created_at desc`, limit 12.
  - buyer: title = "Recently posted projects", query `project_posts` where `status='open'`, order by `created_at desc`, limit 12.
- Each card: title, budget range, category chip, deadline, "View" link to `/projects/:id`.

### 6. Browse-history tracking
- Extend `src/lib/recentlyViewed.ts` to also track category visits (`trackCategoryView(slug)`) into a parallel `katexs:recent-categories` LRU.
- Call `trackCategoryView` from `CategoryPage.tsx` and on `Services.tsx` filter changes.
- Recommendation queries read both `getRecentlyViewedGigs()` (existing) and `getRecentCategories()`.

### File map
**Create:** `src/lib/money.ts`, `src/components/hq/TopPicksRail.tsx`, `src/components/hq/ExpertsYouMightNeed.tsx`, `src/components/hq/ProjectRecsRow.tsx`, new migration for notification trigger + backfill.

**Edit:** `src/pages/Hq.tsx` (add rail + two horizontal rows), `src/components/layout/AppShell.tsx` (flex-col + bg fix), `src/index.css` (html/body bg), `src/lib/recentlyViewed.ts` (add category tracking), `src/pages/CategoryPage.tsx` + `src/pages/Services.tsx` (hook), and currency call sites identified by sweep.

### Out of scope
- No changes to widget customization, settings page, sidebar nav, or theme system.
- No new tables; uses existing `gigs`, `profiles`, `project_posts`, `orders`.
