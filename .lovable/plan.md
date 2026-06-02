Add a "Testimonials" section to `src/pages/Landing.tsx`, inserted between the **How it works** section (ends ~line 409) and the **Featured gigs** section (~line 411).

### Section design

- Full-width black band matching the surrounding landing sections (`background: #000`, `padding: 80px`, `maxWidth: 1200` inner).
- Eyebrow: "Testimonials" (uppercase, tracked, #888).
- H2: "Trusted by service business innovators" (32px, weight 500, white).
- 3-column responsive grid (collapses to 1 column on mobile via existing `.kx-grid-3` rule).
- 5 testimonial cards (grid wraps the 4th/5th into a second row).

### Card

- `#0a0a0a` background, `1px solid #1f1f1f` border, 16px radius, 28px padding.
- Green "(quote mark)" glyph at top (#16A34A, brand primary).
- Quote body (15px, #e5e5e5, 1.6 line-height).
- Footer row separated by a 1px divider: circular initials avatar in brand green tint, name (white, 14/500), title (12px, #888).

### Quotes (placeholders, service-business innovators)

1. Marcus Tan — Founder, Northbound HVAC
2. Priya Shah — COO, Bright Smile Dental Group
3. Diego Alvarez — CEO, Helix Home Services
4. Sarah Okonkwo — Owner, Pinnacle Roofing Co.
5. Kevin Herring — Managing Partner, Herring Legal

Each quote highlights a concrete outcome (after-hours leads, voice AI IVR, onboarding automation, etc.).

### Scope

- Frontend only. No new components, no data fetching, no backend changes.
- No new dependencies. Inline styles match the existing landing page pattern.
