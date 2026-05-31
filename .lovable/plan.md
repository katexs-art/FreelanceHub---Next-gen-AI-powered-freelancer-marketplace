## Part 1 — Merge Browse into Services

- `src/components/layout/SiteHeader.tsx`
  - Desktop nav: change `Find Experts` link from `/browse` → `/services`. Remove any separate `Browse` link.
  - Mobile drawer: change `Browse` (→ `/explore`) item to `Find Experts` → `/services`. Remove the duplicate.
  - Keep both nav search forms but point them at `/services?q=...` instead of `/browse?q=...`.
- `src/components/layout/SiteFooter.tsx`
  - Catalog "Browse" link → `/services`.
- `src/pages/Landing.tsx`
  - Hero search form (line ~174) and any "Browse experts / Browse all experts / Browse" links → `/services` (and `/services?q=` for the search form).
- `src/App.tsx`
  - Replace the `/browse` route with a permanent redirect to `/services` using `<Navigate to={"/services" + location.search} replace />` so existing `?q=` / `?category=` query strings carry over.
  - Drop the lazy `Browse` import (file can stay on disk untouched to avoid risk; route removal is enough). If preferred, delete `src/pages/Browse.tsx`.
- Any other in-code links to `/browse` (Services page, etc.) → `/services`.

## Part 2 — River Score "New" state

Create a tiny helper `src/lib/riverScore.ts`:

```ts
export type RiverDisplay =
  | { kind: "new" }                 // no data
  | { kind: "score"; value: number }; // numeric

export function riverDisplay(opts: {
  score: number | null | undefined;
  reviews?: number | null;
  orders?: number | null;
}): RiverDisplay {
  const s = Number(opts.score ?? 0);
  const r = Number(opts.reviews ?? 0);
  const o = Number(opts.orders ?? 0);
  if (!s && !r && !o) return { kind: "new" };
  return { kind: "score", value: s };
}
```

Rule applied everywhere the score renders:
- "New" → render a green pill: bg `#dcfce7`, text `#166534`, 11px, radius 999px, padding `3px 10px`, label `New`. On dark surfaces use bg `#1a3a1a`, text `#4ade80`.
- Otherwise render the actual number (even if < 60). Never render `0.00`, never render `0`.

Touch every site that currently calls `.toFixed(...)` / `Math.round(... ?? 0)` on `river_score`:
- `src/pages/Browse.tsx` (River top section card line ~1079, seller card line ~776, etc.)
- `src/pages/Services.tsx` (lines ~287, ~417)
- `src/pages/Landing.tsx` (line ~305)
- `src/pages/SellerIntelligenceProfile.tsx` (lines ~301, ~466)

## Part 3 — Unified Expert card styling

Add `src/components/marketplace/ExpertCard.tsx` with two variants: `surface: "light" | "dark"`. Renders the exact spec:

- Light: bg `#fff`, border `1px solid #e5e5e5`, radius 16, padding 20, hover shadow `0 2px 12px rgba(0,0,0,0.06)`.
- Dark: bg `#1a1a1a`, border `1px solid #333`, radius 16, padding 20, hover border `#555`, hover shadow `0 4px 24px rgba(255,255,255,0.04)`.
- Name 15/600, specialty 13 (#555 light, #888 dark), skill tag pill, River Score pill (light) or 36px number + label (dark), star rating amber `#f59e0b` with muted review count, starting price 15/700, delivery 12/#888, `View Profile` outline pill button, `Get a Pitch` / `Message` solid pill button — all per spec.
- Uses `riverDisplay()` for the score block.

Replace the bespoke card markup in:
- `src/pages/Browse.tsx` — both the regular seller card (`SellerCard`-ish around line 684–800) and the River top-15 card (around 1052–1100). River section keeps `surface="dark"`, listing grid uses `surface="light"`.
- `src/pages/Services.tsx` — featured rail (~287) `surface="light"`, dark "Top Experts" panel (~414) `surface="dark"`.
- `src/pages/Landing.tsx` — homepage River top-15 rail (~270–310) `surface="dark"`.
- `src/pages/Search.tsx` — expert results `surface="light"`.
- `src/pages/Explore.tsx`, `src/pages/CategoryPage.tsx`, `src/pages/SellerProfile.tsx` related-experts strip, `src/pages/buyer/BuyerDashboard.tsx`, `src/pages/account/Saved.tsx`, `src/components/marketplace/RecentlyViewed.tsx` — use `surface="light"` (these currently render `GigCard`, not expert cards, so they remain `GigCard`; only swap when the card represents a person, not a gig).
- `src/components/marketplace/GigCard.tsx` is a gig card, not an expert card. It is out of scope.

No data, query, or routing changes.

## Part 4 — Text readability sweep

Audit text colors on dark surfaces (`#0a0a0a`, `#111`, `#1a1a1a`) and light surfaces (`#fff`, `#fafafa`) in:
- `src/pages/Landing.tsx`, `src/pages/Services.tsx`, `src/pages/Browse.tsx`, `src/pages/HowItWorks.tsx`, `src/pages/SellerIntelligenceProfile.tsx`, `src/components/layout/SiteHeader.tsx`, `src/components/layout/SiteFooter.tsx`, `src/components/layout/CategoryMegaNav.tsx`, `src/components/auth/AuthLayout.tsx`.

For each inline `color: "#..."` (and the few Tailwind classes that produce dark-on-dark / light-on-light), normalize to:
- Dark bg → primary `#ffffff`, secondary minimum `#888`. Bump anything dimmer (`#333`, `#444`, `#555`, `#666`, `#777`, `rgba(255,255,255,<0.5)`) up to `#888` for secondary text. Headings/values stay `#fff`.
- Light bg → primary `#000`, secondary minimum `#555`. Bump anything lighter (`#aaa`, `#bbb`, `#ccc`, `#888`, `#999`) down to `#555` for secondary text. Headings stay `#000`.

Pure decorative items (dividers, tag borders, icon strokes) are not "text" and are left alone. River Score `New` pill keeps its green tokens.

## Out of scope

No changes to routes besides `/browse → /services` redirect, no auth/DB/edge-function changes, no `GigCard` redesign, no admin pages.

## Files touched

- create: `src/lib/riverScore.ts`, `src/components/marketplace/ExpertCard.tsx`
- edit: `src/App.tsx`, `src/components/layout/SiteHeader.tsx`, `src/components/layout/SiteFooter.tsx`, `src/pages/Landing.tsx`, `src/pages/Services.tsx`, `src/pages/Browse.tsx`, `src/pages/Search.tsx`, `src/pages/SellerIntelligenceProfile.tsx`, `src/pages/HowItWorks.tsx`, `src/components/auth/AuthLayout.tsx`, `src/components/layout/CategoryMegaNav.tsx`
