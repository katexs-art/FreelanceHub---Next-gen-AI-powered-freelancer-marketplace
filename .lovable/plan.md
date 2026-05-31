
## Scope

Create a brand-new `/how-it-works` page that fully matches the provided spec, register the route, and add a "How It Works" link to the existing navigation. No other pages, components, colors, fonts, or functionality change.

## Files

1. **Create `src/pages/HowItWorks.tsx`** — single self-contained page component containing all 8 sections below. Styles applied via inline `style={{...}}` for the spec-exact values (px sizes, hex colors, paddings, radii) so the rest of the design system stays untouched. Wrap the page in the existing `SiteHeader` (default variant) + `SiteFooter` so it matches site chrome.

   Sections, in order:
   - **Hero** — full-bleed video background using the exact Supabase URL provided (`autoPlay muted loop playsInline`, absolutely positioned, `object-fit: cover`), `rgba(0,0,0,0.65)` overlay, centered pill badge "Simple by design", H1 "How Katexs Works" (56px desktop / 36px mobile via a CSS media query injected with a `<style>` tag scoped by class), subhead. Min-height 500px.
   - **Terminology** — white bg, 4-col grid (responsive: 4 / 2 / 1), 8 term cards (Play, Expert, Partner, Project, Proposal, Brief, HQ, River Score) each with the small "formerly X" or green "Unique to Katexs" pill and description text exactly as specified.
   - **Two Paths** — two large cards side-by-side (stack on mobile). Left card black top border, right card green (`#22c55e`) top border. Buttons smooth-scroll to `#partner-flow` and `#expert-flow` via `scrollIntoView({ behavior: "smooth" })`.
   - **Partner Flow** (`id="partner-flow"`) — 5 vertical numbered steps on white, with thin connecting line, right-side grey example pill.
   - **Expert Flow** (`id="expert-flow"`) — 6 vertical numbered steps on `#0a0a0a` dark, white circles with black numbers, `#1a1a1a` example pills.
   - **River AI** — two-column (stack on mobile). Left: copy + 4 stat rows (15 / 98.9 / 3 days / 24hrs). Right: dark mock card with mock search input and 3 mock Expert rows (avatars are initials in colored circles, no real data fetched).
   - **Trust** — 3-card grid (Escrow / 3-day review / Same day payouts).
   - **Bottom CTA** — black bg, headline, two buttons: outline-white "Hire an Expert" → `/browse`, green filled "Become an Expert" → `/sign-up`.

   All copy is the exact text supplied by the user. All numeric style values are applied as specified.

2. **Edit `src/App.tsx`** — add lazy import `const HowItWorks = lazy(() => import("./pages/HowItWorks"));` and a public route `<Route path="/how-it-works" element={<HowItWorks />} />` in the Public marketplace block.

3. **Edit `src/components/layout/SiteHeader.tsx`** — add a "How It Works" link to both header variants:
   - **Transparent (homepage)**: insert `<Link to="/how-it-works">How It Works</Link>` into the nav, replacing the current anchor that smooth-scrolls to `#how-it-works` (since the spec says the link should go to `/how-it-works`). Keep the same `linkCls` styling.
   - **Default (all other pages)**: add `<Link to="/how-it-works" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">How It Works</Link>` alongside the other nav links.

4. **Edit `src/components/layout/AppShell.tsx`** — if it has a primary nav list, add the same How It Works link so the spec's "all pages" requirement holds for AppShell-wrapped pages. (Will verify the file's nav structure during build and only add if there's a top nav; sidebar already shown separately.)

## Not changed

- All other pages, routes, components.
- Existing colors, fonts, design tokens.
- Auth, routing logic, business logic, database.
- The homepage `#how-it-works` scroll target is replaced by the new page link per spec.

## Technical notes

- Inline styles are used intentionally for this page because the spec dictates exact non-token pixel values and hex colors that should not bleed into the design system.
- Mobile responsiveness handled via a scoped `<style>` block at the top of `HowItWorks.tsx` using unique class prefixes (`hiw-*`) for the few values that need media queries (hero H1 size, grid columns).
- No new dependencies. No data fetching. No backend changes.
