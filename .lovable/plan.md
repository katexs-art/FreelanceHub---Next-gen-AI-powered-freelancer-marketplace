
## Scope

Only the homepage uses `SiteHeader` with `variant="transparent"` (see `src/pages/Landing.tsx`). All other pages use the default variant. I'll edit ONLY the `isTransparent` branch in `src/components/layout/SiteHeader.tsx` — the default branch stays untouched, so navigation on every other page is unchanged.

## Changes to the transparent header

1. Replace the left nav links with exactly, in order:
   - Find Experts → `/browse`
   - Post a Project → `/post-job`
   - How It Works → smooth-scroll to `#how-it-works` on the homepage (uses `location.pathname === "/"` to scroll, else navigates to `/#how-it-works`)
   - Pricing → `/pricing`
   - All links: white, 13px, opacity 0.8, hover opacity 1, no dropdowns.

2. Keep the existing center search bar and black "Search" button exactly as-is (placeholder already reads "Search the catalog…"; will update the ellipsis to literal "..." per spec).

3. Right side: remove RoleSwitcher, HQ, Sign out, Join. Show only:
   - "Sign In" — ghost white text link to `/sign-in`
   - "Join Free" — green filled button (`bg-[hsl(var(--primary))]`), white text, `rounded-full`, padding `8px 20px`, `text-[13px]`, `font-medium`, link to `/sign-up`
   - These show regardless of auth state (per spec — no Dashboard/Sign Out on homepage nav).

4. Remove the mobile Menu button's dependence on removed items; keep it as-is visually.

5. KATEXS logo stays unchanged (white, left).

## Not changed

- `AppShell` sidebar nav, default `SiteHeader` branch, all routes, all auth/search/role logic.
- No new routes added. `/sign-in`, `/sign-up`, and `/pricing` are used as specified by the user (existing app uses `/login`, `/signup` — I'll use exactly what the spec says: `/sign-in`, `/sign-up`, `/pricing`, even though those routes may 404 until added; user explicitly listed these hrefs).

## File touched

- `src/components/layout/SiteHeader.tsx` — only the `if (isTransparent)` block.
