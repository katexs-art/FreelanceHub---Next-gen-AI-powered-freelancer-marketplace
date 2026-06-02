## /services page refresh

Scope is presentation-only in `src/pages/Services.tsx` and `src/components/services/RiverCommandBar.tsx`. No data/business logic changes.

### 1. Remove the left sidebar
- Drop the `<aside>` category panel and the `grid-cols-[240px_1fr]` wrapper in `Services.tsx`.
- Results area becomes full width inside `container-page`.

### 2. New horizontal filter bar (above the results count row)
A single flex row of 5 pill dropdown buttons, wrapping on small screens. Implemented with the existing shadcn `DropdownMenu` (matches the rest of the app) so we keep accessibility + portal behavior.

Pill style: `h-10 px-4 rounded-full bg-background border border-border text-sm font-medium hover:border-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors`, label + `ChevronDown` icon, active state shows the selected value (e.g. "Budget: $50–$200") with a small × to clear.

| Dropdown | Options | State |
|---|---|---|
| Category | Voice AI, Chatbot Dev, AI Automation, Prompt Engineering, GoHighLevel, AI Content, AI Agents, Custom AI | reuses existing `cat` state (replaces sidebar) |
| Budget | $0–$50, $50–$200, $200–$500, $500+ | new `budget` state, filters by `starting_price` |
| Delivery Time | 24hrs, 3 days, 7 days, Any | new `delivery` state, filters by min `gig_packages.delivery_days` |
| Seller Rating | 4.5+, 4.0+, Any | new `rating` state, filters by `average_rating` |
| Location | Online, US, UK, Canada, Global | new `location` state — UI-only for now (no `location` column on gigs); selecting just stores state and shows the chip, no row filtering. Noted inline as TODO. |

All filters compose in the existing `useMemo` alongside the current sort.

### 3. Remove the duplicate chips row
- Keep the single `QUICK_CHIPS` row directly under the River bar (hero section).
- That row continues to drive the Category filter (clicking a chip sets `cat` and the Category dropdown reflects it).
- No second chips row exists today outside the hero — confirmed; nothing else to remove.

### 4. Redesign `RiverCommandBar`
Rewrite the visual layer of `src/components/services/RiverCommandBar.tsx`; keep all existing behavior (input state, mic permission flow, recovery banner, submit handler, navigation).

New look:
- Outer container: `bg-background rounded-full border border-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] transition-all` with `focus-within:border-primary focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]` for the green glow.
- Height ~`h-14`, horizontal padding `pl-2 pr-2`, flex row.
- Left: 36px circular green "R" badge — `bg-primary text-primary-foreground font-bold` with a Tailwind `animate-pulse` ring (`ring-4 ring-primary/20`).
- Input: flex-1, transparent, no border, placeholder `"Describe what you need — River finds your perfect expert..."`.
- Right cluster: ghost mic icon button (existing logic), then primary pill button `Ask River →` (`bg-primary text-primary-foreground rounded-full h-10 px-5 hover:bg-primary/90`).
- Recovery banner styling kept, repositioned just below the new white bar.

### Technical notes
- All colors via semantic tokens (`bg-background`, `border-border`, `bg-primary`, `text-primary-foreground`, `hsl(var(--primary))`) — no raw hex.
- New filter state lives locally in `Services.tsx`; no schema or query changes.
- Budget/delivery/rating filters run client-side on the already-fetched gig list (same pattern as current sort).
- Location dropdown is rendered but non-filtering until a `location` field exists on gigs/profiles; clearly commented.

### Files
- `src/pages/Services.tsx` — remove sidebar, add filter bar + new state, keep hero chips + grid.
- `src/components/services/RiverCommandBar.tsx` — visual redesign only, behavior preserved.
