## Goal
The homepage renders, but several sections look blank or sparse: category cards have no icons, there's no Featured Gigs grid, and the How It Works / Stats sections have no headings. Fix all of these in `src/pages/Landing.tsx` only — no backend/business-logic changes.

## Changes

### 1. Category cards — add icons + visual polish
- Add a `lucide-react` icon to each entry in the `CATEGORIES` array (Code2, Mic, Sparkles, TrendingUp, Settings, BarChart3, PenTool, GraduationCap).
- Render the icon in a 44×44 rounded square at the top of each card (subtle white/5 background, white stroke), above the label. Removes the "blank dark box" feeling.

### 2. New "Featured gigs" grid section (between Categories and Top Performers)
- Query `gigs` table on mount: `status = 'active'`, ordered by `created_at desc`, limit 8. Join `profiles` for seller name/avatar.
- Render a 4-col grid (responsive: 2 cols tablet, 1 col mobile) of gig cards: thumbnail (or gradient fallback), title (2-line clamp), seller mini-row, "From $price".
- Section heading "Featured gigs" + "Browse all →" link to `/services`. Skeletons while loading.
- Pure presentation; reuses existing `gigs` schema.

### 3. How It Works — add heading + eyebrow
- Add eyebrow "HOW IT WORKS" and H2 "Three steps to ship" above the 3-column grid. Currently the section is just floating numbers with no title.

### 4. Trust stats — add heading
- Add eyebrow "BY THE NUMBERS" and H2 "Trusted by builders" above the stats grid.

### 5. Section spacing
- Reduce `padding: 60px 80px` to `padding: 80px 80px` consistently and ensure each section has a visible header so the black background never looks like dead space.

## Out of scope
- No DB migrations, no edge functions, no schema changes, no route changes.
- No font/theme tokens changed.
- Only `src/pages/Landing.tsx` is edited.

## Technical notes
- Icons imported from existing `lucide-react` dependency.
- Featured gigs uses the existing Supabase client and `gigs` + `profiles` tables already used elsewhere (see `Browse.tsx`/`Services.tsx`).
- All new markup uses the same inline-style dark palette (`#1a1a1a` cards, `#333` borders, `#fff` text) already used on this page — no design-system token changes.
