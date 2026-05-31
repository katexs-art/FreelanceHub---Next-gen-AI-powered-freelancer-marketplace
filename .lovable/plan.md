## Goal
Retire `/river-results` and surface River Top 15 + "More experts" sections directly inside `/browse` when a `q` URL param is present. Keep current `/browse` UI untouched when there is no `q`.

## Changes

### 1. Delete RiverResults
- Delete `src/pages/RiverResults.tsx`.
- `src/App.tsx`: remove the `RiverResults` lazy import and the `<Route path="/river-results" ...>`.

### 2. Re-target every search entrypoint to `/browse?q=...`
- `src/pages/Landing.tsx` line 174 — River search form: navigate to `/browse?q=...` instead of `/river-results?q=...`.
- `src/pages/Services.tsx` line 206 — same swap to `/browse?q=...`.
- `src/components/layout/SiteHeader.tsx` lines 70 and 143 — both nav search forms currently go to `/search?q=...`; change both to `/browse?q=...`.

### 3. `src/pages/Browse.tsx` — render River sections when `q` is present
Add a parallel data-flow that activates only when `searchParams.get("q")` is non-empty. The existing filter UI, sellers state, and default grid stay unchanged when `q` is empty.

Implementation outline:
- Read `q` from `useSearchParams`; on mount/change, seed `pendingQuery` and `query` from it so the existing filter pipeline already narrows `filtered`.
- New component-local `RiverSections` block rendered above the current results bar **only when `q` is non-empty**:
  - Reuse the existing `sellers` fetch (already includes `bio`, `seller_skills`, primary/secondary category, gig tags, river_score, average_rating, total_reviews).
  - Token-match against `seller_skills + gigTags + primary/secondary_category + bio + full_name` (case-insensitive, `tokenize` ≥3 chars; if no tokens fall back to substring of full q).
  - `top15` = matched, sorted by `river_score desc, average_rating desc`, take 15.
  - `others` = matched minus top15 ids, sorted by `average_rating desc, total_reviews desc`.
  - Render dark Section 1 (`#0a0a0a`, `48px 80px`), purple-dot header strip, 3-col `repeat(auto-fit, minmax(280px, 1fr))` grid of dark cards.
  - Render divider strip ("River's picks are above · All matching experts are below", 13px `#999`).
  - Render Section 2 (white, `48px 80px`) with header row ("More experts for this search" 13px uppercase `#999` left, "Sorted by rating — highest first" 11px `#bbb` right) and white cards.
  - When `q` is present, hide the existing default "Showing X experts" results bar, category-aware seller grid, and load-more (they're replaced by the two sections). Keep search bar, category pills, quick filters, sort dropdown visible so users can refine.
- Card components: port `TopCard` and `OtherCard` (and `Stars`, `fmtPrice`, helpers) from RiverResults into Browse.tsx as local components before deleting RiverResults. Use the same dark/white styling already shipped.
- Reuse existing `openMessage` in Browse for "Get a Pitch" and "Message" buttons (links to `/inbox/{id}`).
- "View Profile" links to `/u/{username || id}`.

### Out of scope
- No changes to colors, fonts, images, layout, or behavior of the default `/browse` page when `q` is absent.
- No changes to other pages or RPCs.
- Skip the `notify_river_match` RPC call (it was tied to the old page; not in this spec).