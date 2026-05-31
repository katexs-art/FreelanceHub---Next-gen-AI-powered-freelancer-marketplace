# Auth Pages Redesign — Split-Screen Layout

Visual-only redesign of `/signup`, `/sign-up`, `/login`, `/sign-in`. Zero changes to auth logic, routing, form fields, validation, or Google OAuth handlers.

## Files touched

1. `src/components/auth/AuthLayout.tsx` — rebuild shell as 50/50 split (form left, branded panel right). Mobile: form only, full-width.
2. `src/components/auth/KxAuthControls.tsx` — update field/button/toggle styles to match new spec (14px radius, #fafafa fill, focus ring, role-aware submit, trust badges row).
3. `src/pages/auth/Signup.tsx` — wire role-aware submit color (black for buying, green for selling), pass role to layout, replace trust line with 3-badge row.
4. `src/pages/auth/Login.tsx` — use updated layout + controls, keep current fields, add trust badges row.

No edits to `App.tsx`, no route changes, no Supabase calls altered.

## Left side — form column

- White bg, centered, max-width 440px, padding 48px desktop / 24px mobile.
- Top: `katexs.` logo, 18px / 700 / letter-spacing 0.1em, black, with superscript green dot (#22c55e, 8px).
- Heading 28px/600 black; subtext 14px #888 — "Join 2,400+ experts and partners on Katexs" (signup) / "Welcome back to Katexs" (login).
- Signup only: full-width pill toggle ("I'm buying" / "I'm selling"). Container #f5f5f5, 999px radius, 4px pad. Selected buying = black bg + white; selected selling = #22c55e bg + white with green shadow; unselected transparent #888.
- Google button: 52px, white, 1.5px #e5e5e5, 14px radius, 14px/500 #333, hover #f8f8f8 / #ccc border.
- OR divider: thin #e5e5e5 lines, "OR" 12px #bbb.
- Inputs: 52px, #fafafa bg, 1.5px #e5e5e5, 14px radius, 15px text. Focus: black border, white bg, `0 0 0 4px rgba(0,0,0,0.06)`. Placeholders #bbb. Password eye icon #bbb→#000.
- Labels 13px/500 #444, 6px below.
- Submit: 52px, 14px radius, 15px/600, trailing `→`. Black on buying / login; #22c55e on selling (hover #16a34a).
- Trust badges row: 3 items, gap 16px, centered, 11px #bbb — Lock "Secure signup", Shield "No spam", Check "Free forever".
- Footer link 14px #888 with "Sign in" / "Join now" in black 600.

## Right side — branded panel (desktop ≥1024px only)

- Full-height column, gradient `linear-gradient(180deg, #0a0a0a 0%, #0d1a0d 100%)`. Border-radius 0 left / 24px right.
- Padding 48px. Flex column, space-between.
- Top:
  - `katexs.` logo white 16px/700.
  - Pill: "● Live — 2,400+ experts online", 12px, bg `rgba(34,197,94,0.1)`, color #22c55e, border `1px solid rgba(34,197,94,0.2)`, 999px radius, 4px/14px pad.
- Middle:
  - Heading "The AI freelance marketplace built for what's next." — white, 28px/500, line-height 1.3, max-width 360px, margin 40px 0 32px.
  - Three feature rows, gap 16px. Each: 32px icon circle (tinted bg, colored icon 16px) + text 14px #ccc.
    1. ⚡ Zap — green tint — "River AI matches you to the perfect Expert in seconds"
    2. 🛡 Shield — blue tint (#60a5fa) — "Secure escrow payments — funds only release when you approve"
    3. ★ Star — purple tint (#a855f7) — "Get paid in 3 days — fastest payouts of any marketplace"
- Bottom:
  - Three expert preview cards stacked, gap 10px. Card: `rgba(255,255,255,0.05)` bg, `1px solid rgba(255,255,255,0.08)`, 14px radius, 14px pad, flex align-center gap 12px.
    - 36px avatar (tinted bg + colored initials) | name 13px/500 white + sub-line 11px #555 | River pill on right.
    - DA — Diego Alvarez — "Voice AI · GHL" — River 98.9 (green)
    - SO — Sarah Okonkwo — "Automation · Zapier" — River 94.2 (blue)
    - TR — Tomas Ribeiro — "Chatbots · Claude" — River 91.7 (purple)
  - Caption "Join them today — it's free" 13px #555 center, margin-top 8px.

## Responsive

- `<1024px`: hide right panel, form occupies full viewport, 24px padding.
- `≥1024px`: 1fr 1fr grid, both columns full viewport height. Right panel `border-radius: 0 24px 24px 0`.

## Technical notes

- All styles inline + a single `<style>` block in `AuthLayout` / `KxAuthControls` for hover/focus/media-query rules (matches existing pattern in these files).
- Submit button accepts a `tone="black" | "green"` prop; `Signup` passes `role === "seller" ? "green" : "black"`, `Login` passes `"black"`.
- Toggle keeps current `role` state and handler in `Signup.tsx` — only the visual treatment changes.
- Icons via `lucide-react` (`Lock`, `Shield`, `Check`, `Zap`, `Star`, `Eye`, `EyeOff`) — already a project dep.
- No new files, no new routes, no schema changes.
