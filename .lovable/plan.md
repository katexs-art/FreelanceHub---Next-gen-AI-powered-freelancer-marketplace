## Settings page upgrade

### 1. Form & field changes (`src/pages/account/Settings.tsx`)
- Remove the **Website URL** field (text input + `website_url` from form payload).
- **Display name**: 600ms debounced auto-save to `profiles.full_name` with a small "Saved" indicator; sticky save bar stays for the other fields.
- **Username**: read-only input with a `Lock` icon and tooltip "Username cannot be changed". Remove the availability checker logic.
- **Country**: replace the free-text `Location` input with a searchable `Popover` + `Command` combobox. New `src/lib/countries.ts` lists all ~195 ISO countries. Persists to `profiles.country` (already exists). Filters as you type (2-letter prefix surfaces matches).
- **Languages**: searchable multi-select combobox (same `Popover`+`Command` pattern) backed by `src/lib/languages.ts` (~100 entries). Selected languages render as removable chips above the trigger. Replaces the free-form `ChipInput` for languages.
- **Bio**: stays a textarea.
- **Required validation**: on save, if `full_name`, `country`, or `languages` is empty → red border (`border-destructive`) + inline `Required` helper. Block save until resolved.

### 2. Theme switcher fix (`src/index.css`)
The themes already write `kx-theme-*` on `AppShell`, but Ocean/Forest/Sunset/Purple Haze only change `--primary`, so the dashboard barely shifts. Fix:
- Extend each non-midnight theme block to also tint `--background-subtle`, `--sidebar-accent`, `--secondary`, `--ring`, and `--sidebar-ring` with a low-saturation wash of the accent hue (e.g. Ocean → `--background-subtle: 217 60% 97%`, `--sidebar-accent: 217 60% 94%`).
- Add an explicit empty `.kx-theme-clean-white {}` block as a reset target.
- No JS change needed — `useTheme` already persists `theme_preference` to Supabase, hydrates from `localStorage`, and `AppShell` re-renders on store change. Verify after the CSS change.

### 3. Visual cleanup (`src/pages/account/Settings.tsx`)
- Wrap each section (Profile photo, Basic info, Credentials & expertise, Security, Preferences) in a bordered card: `rounded-2xl border border-border bg-card p-6 space-y-5`. Drop the `HairlineDivider` separators in favor of the card borders + `space-y-6` between cards.
- Constrain inputs/selects/textareas with `max-w-[60%]` (full-width below `sm`).
- Section labels: change `Eyebrow` color in this page to `text-[#6B7280]` for readability.
- Tighten spacing: `space-y-6` between cards, `space-y-4` inside.

### 4. Recommendations rail
New file `src/components/settings/ExpertRecommendationsRail.tsx`:
- Reads recent gig views from `localStorage` via existing `getRecentlyViewed`.
- If history present: fetches those gigs → derives primary categories → fetches `profiles` where `seller_status='approved'`, matching `primary_category`, ordered by `river_score desc`, limit 12.
- Fallback (no history): top sellers ordered by `river_score desc, average_rating desc`, limit 12.
- Renders 3 cards visible at a time (avatar, full name, `primary_category`, `average_rating ★`, "View" → `/u/{username}`). 200px wide column. Rotates the 3-card window every 30s with a fade.
- Header chip: `Experts you might like`.

Mount in Settings: switch container from `max-w-3xl` to a two-column grid `grid lg:grid-cols-[minmax(0,1fr)_220px] gap-8`; rail collapses below the form on smaller screens.

### 5. New files
- `src/lib/countries.ts`
- `src/lib/languages.ts`
- `src/components/ui/searchable-select.tsx` (shared single + multi combobox built on `Popover` + `Command`)
- `src/components/settings/ExpertRecommendationsRail.tsx`

### 6. Out of scope
- No DB migration (`theme_preference`, `country`, `languages` columns already exist on `profiles`).
- No changes to public pages, auth, or other dashboards.
