# Apply katexs_design.html as the global design system

Goal: make the live site visually match the uploaded design system file exactly, without changing routing, data, or functionality. All changes are in tokens, base styles, and a small number of shared visual components.

## What changes

### 1. Design tokens (`src/index.css`)
Rewrite `:root` to mirror the design file's exact colors:

- `--background` → `#FFFFFF` (light sections)
- `--background-subtle` → `#F7F7F7` (page canvas / browse sections)
- `--background-elevated` → `#FFFFFF` (cards on subtle bg)
- `--background-dark` → `#0A0A0A` (new — for dark sections like River AI)
- `--foreground` → `#0A0A0A`
- `--foreground-muted` → `#666`
- `--foreground-subtle` → `#888` / `#AAA` (two-stop)
- `--primary` → `#16A34A` green (unchanged in spirit, exact hex pinned)
- `--border` → `#EBEBEB`
- `--border-strong` → `#D0D0D0`
- `--ring` → `#0A0A0A`
- Status palette pinned to spec: success `#DCFCE7/#16A34A`, warning `#FEF3C7/#D97706`, info `#DBEAFE/#2563EB`, destructive `#FEE2E2/#DC2626`, river `#EDE9FE/#7C3AED`, elite `#0A0A0A/#FFF`.
- `--radius` → `16px` (cards). Pills stay `999px`.

### 2. Typography
Switch global font stack to the design's system stack:

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

- `font-body`, `font-heading`, `font-sans` all → system stack
- `font-mono` stays as monospace fallback (still used for `.eyebrow`, keycaps, tabular numbers)
- Remove `font-feature-settings: "ss01", "cv11"` (JetBrains-specific)
- Headings: weight 500, tight letter-spacing (already matches)
- Drop the Google Fonts `<link>` for JetBrains Mono / Work Sans from `index.html`

Memory `mem://style/typography` and the Core line in `mem://index.md` will be updated to record the new system-font rule.

### 3. Shared visual components (presentation only — no behavior changes)

Updated to match the design file's exact CSS:

- **`SiteHeader`** — 64px tall, white bg, `#EBEBEB` bottom border, 40px horizontal padding, search bar pill `#F7F7F7` bg, "Join Free" green pill, "Sign In" plain link, nav-link hover bolds.
- **`CategoryBar` / `CategoryMegaNav`** — 46px row, white bg, items with bottom-border underline on hover/active, chevron `#AAA`.
- **`GigCard`** (play card) — 16px radius, white bg, `#EBEBEB` border, hover translateY(-2px) + soft shadow, 160px image header, bookmark pill top-right, expert row with uppercase name `#0A0A0A`, two-line title clamp, bottom row with star rating (`#F59E0B`) and "FROM $X" price block.
- **Expert card (light)** — 16px radius, 52px round avatar with online dot, badge row (River / Elite / New / Pro variants), tag chips `#F5F5F5`, bottom row with "From $X / Delivers in N days" and two pill buttons (outline + black).
- **Expert card (dark)** — used in River AI sections (`.section-dark`, `#0A0A0A` bg): `#111` card bg, `#2A2A2A` border, big River score number, match badge (Perfect/Strong/Good), dark tag chips, outline + white pill buttons.
- **Empty state** (`EmptyCategoryState`) — already exists; re-skin to match (white or `#0A0A0A` bg, pill buttons, 12px `#bbb` trust line).
- **Status badges** — small pill, 11px weight 600: active, pending, in-progress, disputed, late, completed, river, elite, suspended, locked. Replace ad-hoc badge classes in CRM/Admin with these.
- **Buttons** (`components/ui/button.tsx` variants) — pill (999px), 12×28 padding, weight 600. Variants: `primary` (black `#0A0A0A`), `secondary` (white + 1.5px black border), `green` (`#16A34A`), `destructive` (`#DC2626`), `ghost` (transparent + `#EBEBEB` border).

### 4. Section helpers (`src/index.css` `@layer components`)
Add reusable classes mirroring the design file so pages can opt in without per-component rewrites:

- `.section-light` (white, 48×40 padding) and `.section-dark` (`#0A0A0A`)
- `.section-label` / `.section-label-dark` (eyebrow)
- `.section-heading` / `.section-heading-dark` (28px / weight 500)
- `.section-sub` / `.section-sub-dark` (14px muted)
- `.grid-cards-3` / `.grid-cards-4` (responsive grid: 1 col mobile, 2 col tablet, 3/4 col desktop)

### 5. Pages touched (visual reskin only — no logic changes)
Apply the new tokens/components by replacing class names where needed. No data flow changes, no new routes.

- `Landing`, `Services`, `Browse`, `Explore`, `Search`, `CategoryPage` — section wrappers + grids switch to the new helpers; cards already render through `GigCard`/expert card components.
- River AI sections on Landing/Browse switch to `.section-dark` + dark expert card.
- Admin pages adopt the unified status-badge classes (already present in `index.css`, will be aligned to spec).

### 6. Out of scope (explicit)
- No routing changes
- No copy/content changes (except where the design file dictates label like "FROM")
- No backend, RLS, or edge function changes
- No new pages
- Functionality, data, images all preserved

## Technical notes
- All colors stay HSL in `:root` (Lovable design-system rule); the hexes above are converted on write.
- Existing semantic token names are kept so shadcn components continue to work.
- The `dark` class is unused in this app (it forces `color-scheme: light`), so the dark sections are scoped via `.section-dark` and the `.expert-card-dark` component — not a global theme toggle.
- Files expected to change:
  - `src/index.css` (tokens + section helpers)
  - `tailwind.config.ts` (font stack, radius scale tweak — `2xl: 16px`)
  - `index.html` (remove unused Google Fonts link)
  - `src/components/layout/SiteHeader.tsx`
  - `src/components/layout/CategoryBar.tsx`, `CategoryMegaNav.tsx`
  - `src/components/marketplace/GigCard.tsx`
  - `src/components/marketplace/EmptyCategoryState.tsx`
  - `src/components/ui/button.tsx` (variant tweaks)
  - A new `src/components/marketplace/ExpertCard.tsx` (light) and `ExpertCardDark.tsx` if not already split, OR reskin existing usage in `Browse`/`Search`/`SellerProfile` lists.
  - `mem://index.md` + `mem://style/visual-identity` + `mem://style/typography` updated.

## Acceptance check after build
- Header, category bar, gig card, expert card, dark River section all render pixel-close to the design file at 1112px viewport.
- No console errors. No layout regressions on `/`, `/services`, `/browse`, `/explore`, a category page, a gig detail page, and the admin dashboard.
