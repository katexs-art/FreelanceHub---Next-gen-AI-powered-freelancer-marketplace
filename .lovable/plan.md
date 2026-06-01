
## Goal

Make River the production-grade AI assistant on every page, powered by Anthropic Claude Sonnet directly, with real-gig grounding and a polished floating chat. Refactor existing files rather than create parallel ones.

## Part 1 — Edge function (`supabase/functions/river-chat/index.ts`, rewritten)

Keep the function name `river-chat` (avoids breaking any future callers + config.toml entry already exists). Rewrite internals to:

- **Auth required.** Reject if no valid Supabase JWT (`supabase.auth.getClaims(token)`). Return 401 → frontend shows "Please sign in".
- **Input:** `{ message: string, history?: {role,content}[], context?: any }`. Validate non-empty, ≥3 chars.
- **Rate limit:** keep existing `checkRateLimit` (15/min per user).
- **Gig retrieval:** keyword tokenize the message (lowercase, split, drop stopwords/<3 chars), then query `gigs` where `status='active'` and `(title ILIKE ANY(...) OR description ILIKE ANY(...) OR tags && ARRAY[...])`, order by `total_orders desc`, limit 3. Join `profiles` for seller name/username. (If zero matches, fall back to top 3 by orders so River never has zero context.)
- **Anthropic call:** `POST https://api.anthropic.com/v1/messages` with:
  - `model: "claude-sonnet-4-20250514"`
  - `max_tokens: 600`
  - `stream: true`
  - `system`: the exact prompt from the brief + an appended block listing the 3 gigs (id, title, seller, price, rating) and the instruction to emit `[EXPERT_CARD: <gig_id>]` on its own line when recommending one.
  - `messages`: prior `history` + `{role:'user', content: message}`.
  - Header: `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`.
- **Streaming:** read Anthropic's SSE, translate each `content_block_delta` text chunk into our own SSE `data: {"delta": "..."}\n\n` lines, end with `data: {"done": true, "cards": [...]}\n\n` where `cards` is the resolved gig metadata for any `[EXPERT_CARD: id]` tokens seen in the stream.
- **Errors:**
  - Anthropic non-2xx → stream a single `data: {"delta":"I'm taking a quick break. Please try again in a moment."}` then `done`.
  - Network/throw → same fallback message, never 500 with a blank body.
- **Secret:** add `ANTHROPIC_API_KEY` via the secrets tool before deploy.
- **CORS** preserved. `verify_jwt = false` stays in `config.toml` (we validate JWT in code).

## Part 2 — RiverWidget (`src/components/layout/RiverWidget.tsx`, rewritten)

- **Lazy loaded.** In `AppShell.tsx`, replace `import { RiverWidget }` with `const RiverWidget = lazy(...)` wrapped in `<Suspense fallback={null}>`. Module is fetched after first paint.
- **Auth gate.** Uses `useAuth()`. If no user, the FAB still shows; opening the panel renders a "Please sign in to chat with River" empty state with a `Sign in` button linking to `/login?next=<current>`.
- **Collapsed FAB:** fixed `bottom-6 right-6`, 56px circle, dark bg (`#0a0a0a`), white "R" mark, pulsing green dot (top-right, `animate-ping` ring + solid dot). Tooltip "Ask River" on hover (Radix `Tooltip`).
- **Expanded panel:** 380×520, rounded-2xl, shadow-2xl, border-hairline. On `< 480px` viewport: `inset-0` full-screen.
- **Header:** "River" + pulsing green dot + "AI Assistant" subtitle on a second line; X button to close. Esc key + outside-click also close (single document listener, cleaned up).
- **Welcome state:** if no messages, show "Hi! I'm River 👋 Tell me what you need and I'll find the perfect expert for you." plus 3 suggestion chips (Find a voice AI expert / Build me a chatbot / Automate my workflow).
- **Message list:**
  - User bubbles right-aligned, dark bg, white text.
  - River bubbles left-aligned, surface bg, with **typewriter streaming** — append characters from the SSE deltas as they arrive (no fake setTimeout — real stream); after `done`, render any `cards` as inline mini-cards (title, seller name, `$price`, ★rating, "View Gig" → `/gig/:id`).
- **Input bar:** textarea (Enter to send, Shift+Enter newline) + send button. Disabled when sending; spinner replaces send icon. **Debounce send 500ms** (ignore rapid Enter spam). Block submit if trimmed length < 3.
- **Fetch:** call the edge function via raw `fetch` (not `supabase.functions.invoke`, because we need the streaming body) at `${VITE_SUPABASE_URL}/functions/v1/river-chat` with `Authorization: Bearer ${session.access_token}` + `apikey` header. Parse SSE line-by-line per the streaming pattern.
- **Timeouts/errors:**
  - `AbortController` with 10s timeout from request start until first byte → on timeout show "River is taking too long. Please try again."
  - `fetch` throw / offline → "Connection lost. Check your internet and try again."
  - 401 → swap panel body to the sign-in CTA.
  - 429 → "You're sending messages too fast. Please wait a moment."
  - All errors render as a River bubble; the UI is never blank.
- **Session memory only:** messages live in component state. No localStorage. Clears on refresh as specified.

## Part 3 — Integration

- `AppShell.tsx`: lazy-import RiverWidget (already mounted there, so it appears on every authenticated page). Confirm public pages that don't use AppShell (Landing, /login) are out of scope per the spec's "appears on every page automatically" — RiverWidget will be lifted into `App.tsx` root so it's truly global. Files touched: `src/App.tsx` (add `<Suspense><RiverWidget/></Suspense>` at root), `src/components/layout/AppShell.tsx` (remove its local render to avoid duplicates).

## Part 4 — Secrets & deploy

- Call `secrets--add_secret` for `ANTHROPIC_API_KEY` — user pastes it in the secure form.
- After secret is added, write/deploy the rewritten edge function. No DB migration needed.

## Out of scope (for this phase)

- Voice input (existing widget has it; new spec doesn't list it — will be removed for a clean rewrite per "refactor in place").
- Custom-prompt admin override (was in old code; new spec uses a fixed system prompt).
- Persisted history across sessions (explicitly "clears on page refresh").

## Files touched

- `supabase/functions/river-chat/index.ts` — rewritten
- `src/components/layout/RiverWidget.tsx` — rewritten
- `src/components/layout/AppShell.tsx` — remove RiverWidget mount
- `src/App.tsx` — mount lazy RiverWidget at root with Suspense
- Secrets: add `ANTHROPIC_API_KEY`
