# Homepage Redesign — x.ai cinematic style

Scope: visual redesign of `src/pages/Landing.tsx` only. No changes to routing, data fetching, auth, DB, or any other page. Existing `useNavigate`, `supabase` featured-gigs query, and category slugs are preserved.

## Files touched

- `src/pages/Landing.tsx` — full rewrite of JSX/markup with new sections
- `src/components/layout/SiteHeader.tsx` — variant prop `transparent` so it renders white text over the video hero and adds the scroll-darken behavior (background transparent → `rgba(0,0,0,0.85)` + backdrop-blur after 50px scroll). All existing nav items, search, RoleSwitcher, Dashboard, Sign Out preserved — only colors switch to white when `transparent` is active.

No other files change. `SiteFooter` is not used on the new landing — the new black footer is inlined in `Landing.tsx` per spec (other pages still use `SiteFooter`).

## Section breakdown (all in Landing.tsx)

1. **Fixed nav** — `SiteHeader` rendered with `variant="transparent"` and scroll listener.
2. **Hero (100vh)** — `<video autoplay muted loop playsinline>` with the provided Supabase MP4 URL, absolute-positioned full cover, z-0. Dark overlay div (`rgba(0,0,0,0.6)`, z-1). Centered content z-2: pill badge → H1 "Hire AI experts. Ship faster." → subheading → River search form (reuses existing `nav(`/river-results?q=...`)` submit) → 3 trust stats row.
3. **Categories** — white bg, 4-col grid of the 8 AI categories using existing `/category/:slug` links and the existing CATEGORIES array. Card hover: border darkens, lift -2px, shadow.
4. **Top performers** — white bg, 3-col grid. New Supabase query: `profiles` where `seller_status='approved'` order by `river_score desc` limit 6. Each card: avatar, name, River Score pill, bio, top 3 `seller_skills` as grey pills, starting price (from their top gig — single batched query like existing featured logic), View Profile (`/seller/:username`) + Message (`/inbox?to=:id`) buttons. Uses existing routes only.
5. **How it works** — black bg, 3 columns with big step numbers.
6. **Trust stats** — white bg, 4 stats separated by hairlines.
7. **Bottom CTA** — black bg, "Stop searching. Tell River." with white pill button → `/signup`.
8. **Footer** — inline black footer with KATEXS, link row, copyright, Privacy/Terms links (using existing `/privacy` and `/terms` routes).

## Styling approach

Spec uses very specific pixel values, exact colors (#000, #888, rgba whites), and px font sizes that don't map cleanly to the project's semantic tokens. To match x.ai exactly without polluting the design system, the new Landing will use inline `style={{}}` objects and a scoped `<style>` block at the top of the component for the hover states, media query (H1 72px → 40px ≤768px), and scroll-nav transition. This keeps the redesign self-contained to the homepage and leaves `index.css` / tokens untouched for the rest of the app.

`SEO` component and JSON-LD stay as-is.

## Preserved functionality

- River search submit → `/river-results?q=`
- Category links → `/category/:slug`
- Featured/top-performers data via `supabase`
- All header nav, role switcher, auth buttons
- Routing, auth, RLS, edge functions, other pages — untouched

## Risk / non-goals

- Not changing `SiteFooter` (still used elsewhere).
- Not introducing new tokens or breaking dark/light theming on other pages — inline styles are scoped to Landing.
- Video is a large MP4 streamed from Supabase storage; no preload tuning beyond browser defaults.
