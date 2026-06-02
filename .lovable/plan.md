## Goal

Replace the static 3-column testimonials grid in `src/pages/Landing.tsx` with a carousel that lets visitors page through the 5 quotes.

## Behavior

- Show **3 cards at a time** on desktop, **2 on tablet** (≤960px), **1 on mobile** (≤640px).
- **Prev / Next arrow buttons** in the section header (right side, next to the H2) — circular, white-bordered on black, with hover state.
- **Dot indicators** centered below the carousel showing current page; click to jump.
- **Auto-advance every 6 seconds**; pause on hover or when a control is focused.
- **Loop**: advancing past the last page returns to the first.
- Smooth horizontal slide transition (CSS `transform: translateX` with `transition: transform 500ms ease`).
- Keyboard: Left/Right arrows navigate when the carousel region is focused. Arrow buttons are real `<button>`s with `aria-label`s; the track has `aria-roledescription="carousel"`.

## Implementation

- Keep the existing testimonials data array and card markup (visual design unchanged — same #0a0a0a card, green quote glyph, avatar/name/title footer).
- Wrap the cards in a viewport `<div>` with `overflow: hidden` and an inner track `<div>` that holds all cards side-by-side. Each card gets a fixed flex-basis based on `cardsPerView` so the track width = `cards.length * (100 / cardsPerView)%`.
- New local state: `page` (0-indexed), `cardsPerView` (derived from a `useEffect` listening to `window.matchMedia` for 640px and 960px breakpoints).
- `pageCount = Math.ceil(testimonials.length / cardsPerView)`; translateX offset = `-(page * 100 / pageCount)%` of the track.
- Auto-advance via `useEffect` + `setInterval(6000)`; cleared on hover (`onMouseEnter`/`Leave` toggles a `paused` ref).
- All styling inline to match the surrounding landing-page pattern. No new dependencies, no new files.

## Scope

- Only `src/pages/Landing.tsx` is modified (the testimonials section, ~lines 411-484).
- No backend, data, or design-system changes. Colors and typography stay identical to the current section.
