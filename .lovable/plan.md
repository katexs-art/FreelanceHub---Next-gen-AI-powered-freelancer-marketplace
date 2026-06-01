## Scope

Three small infrastructure pieces + a defensive guard in `Inbox`. `/orders/:id` was already fixed in the previous turn (hooks-order crash + missing-FK joins) — leave it.

## Changes

1. **`src/components/ErrorBoundary.tsx`** (new) — class component that catches render errors anywhere in the route tree and shows a "Something went wrong" card with a "Try again" button and a "Back to home" link. Stops one component's crash from blanking the entire app.

2. **`src/components/ScrollToTop.tsx`** (new) — listens to `useLocation()` and calls `window.scrollTo(0, 0)` on every pathname change so route transitions land at the top. (Inbox/Orders detail keep their own internal scroll; we only reset the window scroll.)

3. **`src/App.tsx`** — wrap the `<Routes>` in `<ErrorBoundary>` and mount `<ScrollToTop />` inside `<BrowserRouter>`. Upgrade the Suspense `<Loading />` fallback from "Loading…" to a real skeleton block (centered card with three shimmering bars using the existing `Skeleton` UI component) so first paint of any lazy route is never a blank white screen.

4. **`src/pages/Inbox.tsx`** — minor defensive fixes so an empty/unauthenticated state never sticks on a blank canvas:
   - `loadConvs` currently early-returns when `user` is `null`, leaving `loading=true` forever. Set `loading` to `false` in that branch.
   - Wrap the conv/message fetches in `try/finally` so a thrown query never freezes the spinner.
   - Render an explicit "Sign in to view your inbox" empty state if `loadConvs` finishes with `!user`.
   No layout or visual changes.

## Out of scope

- Per-page skeletons across every route — the global Suspense skeleton + each page's existing loading state already cover the "never blank" requirement. Adding tailored skeletons to ~30 pages would be a separate, much larger task. Mention this and offer it as a follow-up if the user wants it.
- Performance budget enforcement (<2s) — already-fast routes stay fast; the global error boundary + skeleton fallback ensures we never *appear* blank during lazy loading.

## Verification

- Reload `/inbox` and `/inbox/:id` — confirm the 3-column shell paints immediately (skeleton during chunk load, then full UI).
- Navigate from `/services` → `/projects` → back — confirm the page scrolls to top each time.
- Temporarily throw inside a page component → confirm the error boundary card replaces just the route, the header/sidebar (where applicable) stay intact, and "Try again" recovers.
- Visit `/orders/222ab2db-627c-4d38-a3aa-d7eddd01c1c5` → confirm the page renders (already fixed last turn).
