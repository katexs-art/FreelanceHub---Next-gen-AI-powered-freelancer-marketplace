# Category Mega-Nav for /explore and /services

Add a sticky horizontal category bar with hover mega-dropdowns. Only mounted on `/explore` and `/services`. No other pages change. No existing colors, fonts, images, layouts, or functionality are modified.

## New component

`src/components/layout/CategoryMegaNav.tsx`

- Self-contained. Styles inline + a single scoped `<style>` block (matches the pattern used by `KxAuthControls`).
- Static data structure: `CATEGORIES: { label, slug, columns: { heading, items: { label, slug }[] }[] }[]` — populated with the exact 10 categories and the exact column headings + subcategory lists provided in the request.
- Subcategory slug = kebab-case of label (e.g. `AI Websites and Software` → `ai-websites-and-software`), generated once at module load.

### Bar markup
- Wrapper: `position: sticky; top: <header-height>; z-index: 50; background: #fff;` so it pins directly under the existing `SiteHeader` when scrolling.
- Bar: full-width white, height 48px, `border-bottom: 1px solid #f0f0f0`, `display: flex; align-items: center; padding: 0 40px; gap: 0; overflow-x: auto;` with hidden scrollbar (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`).
- Each item: button with `padding: 0 20px; height: 48px; font-size: 13px; color: #333; white-space: nowrap; border-bottom: 2px solid transparent; cursor: pointer;` + small `ChevronDown` icon from `lucide-react` at `size={10} color="#aaa"` with `margin-left: 4px`.
- Hover/active state via CSS class: hover → `color: #000; border-bottom-color: #000;`. Active (currently-open) → same plus `font-weight: 500`.

### Dropdown markup
- One panel per category, rendered conditionally on hover.
- Open state managed by a single `openSlug` state set on `onMouseEnter` of bar item or panel, cleared on `onMouseLeave` of the wrapper (so moving from item → panel doesn't close it).
- Panel: `position: absolute; left: 0; right: 0; top: 48px; background: #fff; border-top: 1px solid #f0f0f0; box-shadow: 0 8px 32px rgba(0,0,0,0.08); padding: 32px 80px; z-index: 100; display: grid; grid-template-columns: repeat(<n>, 1fr); gap: 32px;` where `<n>` matches the category (4 for AI Services, GHL, Digital Marketing, Programming & Tech; 3 for Data, Business, Video & Animation, Writing & Content, Design & Creative; 2 for Music & Audio).
- Column heading: 13px, `font-weight: 600`, color `#000`, `margin-bottom: 14px`.
- Subcategory link: `<button>` styled as 13px, color `#555`, `line-height: 2`, `text-align: left`, hover → `color: #000; font-weight: 500;`. On click calls `navigate(`/browse?category=${slug}`)` and closes the panel.

### Accessibility / behavior
- Keyboard: each top-level item is a button; Enter opens the panel, Esc closes. (Hover is primary; keyboard is best-effort.)
- Mobile: bar remains horizontally scrollable; dropdowns are disabled below 768px — tapping a top-level item navigates to `/browse?category=<top-level-slug>` instead.

## Mounting

- `src/pages/Explore.tsx` — render `<CategoryMegaNav />` immediately after `<SiteHeader />`. No other changes.
- `src/pages/Services.tsx` — same: render `<CategoryMegaNav />` immediately after `<SiteHeader />`. No other changes.

No router, no global layout, and no other page is touched.

## Browse filter wiring

`src/pages/Browse.tsx` already reads `?category=` into a `category` state, but two adjustments are needed so deep links from the mega-nav actually filter:

1. **Sync on URL change** — add a `useEffect` that updates `category` when `searchParams.get("category")` changes (mirrors the existing `urlQ` effect). Without this, navigating between subcategories while already on `/browse` doesn't update the filter.

2. **Broaden the match** — current filter only compares against `primary_category` / `secondary_category` exact equality. Extend it so that when `category !== "All"` we also match against `seller_skills`, `gigTags`, `gigTitles`, and `bio` using kebab-slug equality or token containment. Concretely:
   - Build `slug = category` (already a slug from the URL) and `words = slug.split("-").filter(w => w.length > 2)`.
   - A seller passes if any of: primary/secondary category slugified equals `slug`, OR any skill/tag slugified equals `slug`, OR every word in `words` appears (case-insensitive) in the concatenated haystack of skills + gigTags + gigTitles + bio + primary/secondary category.
   - Fallback to existing exact-match behavior when `category` is one of the existing top-level labels (`"All"`, `"Build with AI"`, etc.) so the in-page chip filter row keeps working unchanged.

3. River results section already renders at top when there are matches; the "sorted by rating" behavior for the lower section is unchanged. No visual changes to Browse — only the filter predicate is expanded.

## Out of scope / explicitly unchanged

- `SiteHeader`, `SiteFooter`, Landing, Profiles, Auth pages, all other routes.
- Existing in-page category chips on Browse, all sorts, all quick filters, all colors/fonts/spacing.
- No new dependencies. Uses existing `react-router-dom` and `lucide-react`.

## Files

- **Create**: `src/components/layout/CategoryMegaNav.tsx`
- **Edit**: `src/pages/Explore.tsx` (add 2 lines: import + render)
- **Edit**: `src/pages/Services.tsx` (add 2 lines: import + render)
- **Edit**: `src/pages/Browse.tsx` (URL sync effect + extended filter predicate; no UI changes)
