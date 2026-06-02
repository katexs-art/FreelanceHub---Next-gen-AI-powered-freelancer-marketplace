# Add recommendation rails to more dashboard pages

Add the two horizontal recommendation rails shown in the screenshot — "Experts you might need next" and the projects rail ("Open projects matching your skills" / "Recently posted projects") — to the following pages:

- Projects: `/buyer/orders` (`src/pages/orders/OrdersList.tsx`) and `/seller/orders` (same file, role-aware)
- Saved: `/saved` (`src/pages/account/Saved.tsx`)
- Messages: `/inbox` (`src/pages/Inbox.tsx`)
- Settings: `/settings` (`src/pages/account/Settings.tsx`)

## Approach

1. Create a small wrapper `src/components/hq/RecommendationsBlock.tsx` that renders:
   ```
   <ExpertsYouMightNeed />
   <ProjectRecsRow />
   ```
   with consistent vertical spacing (`flex flex-col gap-12 mt-12`) and a top divider so it sits cleanly below each page's primary content.

2. Mount `<RecommendationsBlock />` at the bottom of each target page's main container (inside `AppShell`), after the existing content but before the shell closes.

3. No changes to the rails' internal logic, queries, data sources, or `/hq` layout — they already handle buyer vs. seller via `profile.role` and fall back to top-rated when no history exists.

4. Inbox is a full-height 3-column layout — append the block below the inbox panel inside the page's outer wrapper so it scrolls naturally with the page rather than inside a column.

## Files

**Create**
- `src/components/hq/RecommendationsBlock.tsx`

**Edit**
- `src/pages/orders/OrdersList.tsx` — append block at bottom
- `src/pages/account/Saved.tsx` — append block at bottom
- `src/pages/Inbox.tsx` — append block below inbox layout
- `src/pages/account/Settings.tsx` — append block at bottom

No DB, no styling changes to the rails themselves, no impact on `/hq`.
