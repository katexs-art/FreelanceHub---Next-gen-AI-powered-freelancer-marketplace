## Goal
Restyle only the signup and login auth pages per spec. Keep all auth/routing logic untouched.

## Files to change
- `src/components/auth/AuthLayout.tsx` — rebuild shell: `#f8f8f8` page bg, branded katexs logo (18px / 600 / letter-spacing 0.08em / `#000` with `#22c55e` 20px dot after the "s"), two-column desktop layout (form left, decorative dark preview right), white form card 480px max-width, `border-radius: 20px`, `padding: 48px`, `box-shadow: 0 4px 32px rgba(0,0,0,0.08)`, heading 28px/600 `#000`, subtitle 14px `#888`, footer link styling (`#888` with `#000` 500 underline-on-hover for "Sign in").
- `src/pages/auth/Signup.tsx` — restyle inline using spec tokens:
  - Buyer/Seller toggle: pill container `border: 1px solid #e5e5e5`, `border-radius: 999px`, `padding: 4px`; selected = black bg / white text; unselected = white bg / `#333` / `border: 1px solid #e5e5e5`.
  - Google button: 48px height, `border: 1px solid #e5e5e5`, radius 12px, 14px/500 `#333`, white bg, hover `#f8f8f8`, 0.2s, with Google `<svg>` logo on left (reuse Login's svg).
  - OR divider: `#e5e5e5` lines, "OR" text `#bbb` 12px.
  - Inputs (Full name, Email, Password, Username): replace shadcn `Input` with native `<input>` styled — white bg, `1px solid #e5e5e5`, radius 12px, 52px height, padding `0 16px`, 15px `#000`, placeholder `#bbb`, focus → border `#000` + `box-shadow: 0 0 0 3px rgba(0,0,0,0.06)`. Labels 13px/500 `#333`, mb 6px.
  - Password field: wrapper with eye toggle button on right, `#bbb` icon (lucide `Eye`/`EyeOff`), toggles input type.
  - Submit button: full-width 52px, `#000`/`#fff`, radius 12px, 15px/600, hover `#111`, transition 0.2s, "Create account →" with arrow.
  - Trust line under submit: lucide `Lock` 12px + "Your data is secure and encrypted", 12px `#bbb`, centered, mt 12px.
- `src/pages/auth/Login.tsx` — same Google button, OR divider, input, password-eye, submit-with-arrow, trust line, footer styling.
- `src/App.tsx` — add `/sign-in` and `/sign-up` route aliases pointing to `Login` / `Signup` (spec mentions both `/login` and `/sign-in`, plus `/sign-up` link in earlier work).

## Decorative right panel (desktop only, in AuthLayout)
Hidden below `lg`. Card: `#0a0a0a`, radius 20, padding 32, white text.
- White "katexs." wordmark (Syne 800).
- White pill on black ring: "River Score 98.9".
- Three mock expert rows: 32px circle initial + name (white 14/500) + small skill tag (`#1f1f1f` bg, `#aaa` text, 11px).
- Tagline: "The AI freelance marketplace. Built for what's next." 16px/500 white.
- Small line: "Join 2,400+ experts and partners" 12px `#888`.

## Out of scope
No changes to auth logic, validation, RPC calls, redirects, role handling, terms/privacy copy, or any other page.