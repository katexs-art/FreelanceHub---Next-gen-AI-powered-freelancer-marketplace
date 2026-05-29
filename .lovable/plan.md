Remove the keyboard shortcut badge (⌘ K) from the header search bar in `SiteHeader.tsx`. Keep the search input, icon, and submit button intact so search remains fully functional. Also remove the `Command` import from `lucide-react` since it will no longer be used.

**Files to change:**
- `src/components/layout/SiteHeader.tsx` — remove the `hidden md:inline-flex` keycap span block inside the search form, and remove the `Command` import.
