# Improve Visibility of Post a Job & Project Board

Four small additive edits. No existing colors, fonts, images, layouts, or functionality change.

## 1. Homepage — two-card section (`src/pages/Landing.tsx`)

Directly under the River AI search form inside the HERO section, insert a new block:

- Two cards side by side on md+, stacked on mobile, equal width, gap-4
- Both cards: `border-radius: 12px`, `padding: 24px`
- **Left card** — `background: #000`, white text
  - Title "Post a Project" — 18px / weight 700
  - Subtext "Describe what you need and let sellers compete for your job" — 13px
  - Button "Post a Job Now" → `/post-job` — white bg, black text
- **Right card** — white background, 1px solid black border
  - Title "Browse Open Projects" — 18px / weight 700
  - Subtext "Find live projects and place your bid right now" — 13px
  - Button "View All Projects" → `/projects` — black bg, white text

Uses inline styles for the exact sizes/colors so no global tokens or Tailwind theme values are altered.

## 2. Nav links (`src/components/layout/SiteHeader.tsx`)

Current state:
- "Projects" — already shown to everyone (sellers see it). Confirm — no change needed.
- "Post a Job" — currently only shown to `profile?.role === "client"`. Per spec ("visible as a nav link for buyers"), this is already correct. Confirm — no change needed.

No edits to SiteHeader.

## 3. `/projects` banner (`src/pages/Projects.tsx`)

At the very top of `<main>`, above the existing `<h1>`, insert a banner:
- White background, `border-bottom: 2px solid #000`, full width of container, padded
- Flex row, space-between, aligned center
- Left: "Open Projects" (24px / 700) + sub "Find a project that matches your skills and place your bid" (14px, color #666)
- Right: black filled button "Post a Project" → `/post-job`, only rendered when `profile?.role === "client"` (buyers)

Remove the existing `<h1>Project Board</h1>` to avoid duplication? **Keep it** — spec says don't change existing layout. The banner is added above it.

Pull `useAuth` to gate the button.

## 4. `/post-job` heading (`src/pages/PostJob.tsx`)

At the very top of the page content, add:
- "Post Your Project" — 28px / 700
- "Tell us what you need — qualified sellers will bid on your job within hours" — 15px, color #666

If the page currently has its own h1, the new heading is added above it (existing heading untouched).

## Technical notes

- All new typography and colors use inline `style={{...}}` to hit the exact pixel/hex values the spec lists without touching `index.css` or `tailwind.config.ts`.
- No new dependencies, no DB or RPC changes, no route changes.
- Files touched: `src/pages/Landing.tsx`, `src/pages/Projects.tsx`, `src/pages/PostJob.tsx`. SiteHeader inspected, no change required.
