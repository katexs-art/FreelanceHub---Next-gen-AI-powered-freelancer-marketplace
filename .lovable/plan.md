## Category / Filter Empty State

### 1. New component

`src/components/marketplace/EmptyCategoryState.tsx`

- Props: `surface?: "light" | "dark"` (default `"light"`), optional `heading`, `subtext`, `categoryLabel` overrides.
- Renders the exact spec:
  - Wrapper: `bg #fff` (light) or `#0a0a0a` (dark) · `max-width: 480px` · `margin: 0 auto` · `padding: 80px 24px` · centered text.
  - Icon: 64px circle, 2px border `#e5e5e5` (light) / `#333` (dark), Lucide `Plus` 28px, color matches border, centered, 24px bottom margin.
  - Heading "No experts in this category yet" — 22px / 500 / `#000` light, `#fff` dark / 12px bottom margin.
  - Subtext "Be the first expert in this category and get early access to all partner requests — zero competition." — 14px / `#666` light, `#888` dark / line-height 1.6 / 32px bottom margin.
  - Two buttons row, centered, gap 12px:
    - Primary "Apply as an Expert" → `/sign-up`, pill, padding 12px 28px, 14px / 500. Light: bg `#000` text `#fff`. Dark: bg `#fff` text `#000`.
    - Outline "Browse all experts" → `/services`, pill, padding 12px 28px, 14px. Light: border `#000` color `#000`. Dark: border `#555` color `#888`, hover border `#fff` hover color `#fff`.
  - Trust line: 12px `#bbb` "Free to apply · Approved within 24 hours · Start earning immediately."

### 2. Wire-in points (replace existing empty fallbacks only — no layout/logic change)

- `src/pages/CategoryPage.tsx` line 112 — replace `<p>No active plays…</p>` with `<EmptyCategoryState surface="light" />` (wrapped in `col-span-full`).
- `src/pages/Explore.tsx` line 85 — replace `<p>No plays published yet.</p>` with `<EmptyCategoryState surface="light" />`.
- `src/pages/Search.tsx` line 180 — replace `<p>No plays match those filters.</p>` with `<EmptyCategoryState surface="light" />`.
- `src/pages/Services.tsx`:
  - Trending Plays grid (line ~462): when `gigs.length === 0` after loading, render `<EmptyCategoryState surface="dark" />` in place of the skeleton fallback once a category filter is active.
  - River Intel grid (line ~261/387): when filtered `picks`/`intel` empty under a category, render `<EmptyCategoryState surface="dark" />`.
- `src/pages/Browse.tsx`:
  - line 608–611 (filtered empty) — swap the existing empty block for `<EmptyCategoryState surface="light" />`.
  - line 931–935 (River search empty) — same swap, surface light.

### 3. Out of scope

No changes to routing, data fetching, grid layout, card components, colors elsewhere, fonts, images, or any other page. Empty-state only renders when the relevant collection is empty after loading (existing condition reused).

### 4. Verification

Visit `/services?category=facebook-marketing` (current route, no gigs), `/explore`, `/browse?q=zzzzzzz`, and a category page with no plays — confirm the empty state renders centered with correct surface variant.
