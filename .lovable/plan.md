# Wire Anthropic Claude into River Public and River Ops

Uses the existing `ANTHROPIC_API_KEY` Supabase secret. Model: `claude-sonnet-4-6`. No visual changes anywhere.

## 1. Database migration

New table `river_ops_conversations`:
- `id` uuid pk
- `user_id` uuid (Kevin / admin author)
- `role` text ('user' | 'assistant')
- `message` text
- `daily_briefing` boolean default false
- `created_at` timestamptz default now()

GRANTs + RLS: admins only (via `is_admin(auth.uid())`) can select/insert. `service_role` full access for edge functions.

## 2. Edge function: `river-public-match`

- Input: `{ query: string }` from buyer.
- Calls Anthropic `claude-sonnet-4-6` with the exact River Public system prompt from the spec, asking for strict JSON (`required_skills`, `category`, `budget_signal`, `urgency_signal`, `match_summary`).
- Parses JSON, then queries `profiles` + `gigs` (active, approved sellers) and scores each seller:
  - +3 per matching skill in `seller_skills` / gig tags
  - +5 if `primary_category` or gig `category` matches
  - + river_score / 20, + rating weight, completed orders weight
- Returns top 15 sellers + the parsed signals.

## 3. Hook River Public into `RiverResults.tsx`

Replace the current client-side keyword scoring with a single call to `river-public-match`. Render the same existing cards/markup with the returned sellers — **no visual changes**. Fallback: if the edge call fails, keep the existing local scoring path so the page never breaks.

## 4. Edge function: `river-ops-chat`

- Verifies caller is admin (JWT → `is_admin`).
- Input: `{ messages: [{role, content}], daily_briefing?: boolean }`.
- Fetches live context in parallel from Supabase (service role):
  - orders today count
  - revenue today = sum(`platform_fee`) on today's completed orders
  - open disputes count
  - pending seller applications count
  - active orders count (in_progress / delivered / pending_*)
  - top 5 sellers by completed orders this week (join profiles for name)
  - new signups today (profiles created today)
  - River searches today (`buyer_searches` created today)
- Builds a `Live platform data` system context block and prepends the exact River Ops system prompt from the spec.
- Calls Anthropic `claude-sonnet-4-6`, returns `{ reply }`.
- Persists both the user message and the assistant reply into `river_ops_conversations` (with `daily_briefing` flag on the auto briefing pair).

## 5. New admin page: River Ops Chat

Route: `/admin/river-ops` (lazy in `App.tsx`, protected like other admin pages).

- Reuses existing admin shell styling — same tokens, same fonts, same layout patterns as `Admin.tsx`. No new colors or images.
- Chat layout: scrollable message list + input + Send button using existing UI primitives (`Button`, `Input`, `surface`, `border-hairline`, etc.).
- On mount: query `river_ops_conversations` for today's messages for the current admin.
  - If no `daily_briefing=true` row exists for today, automatically invoke `river-ops-chat` with `daily_briefing: true` and a synthetic user prompt: *"Give me this morning's briefing: revenue today, active orders, open disputes, new signups, and one recommendation."* Render the reply as the first assistant message.
- Subsequent messages stream through the same edge function.
- Add a small "River Ops" link in the existing admin tab bar in `Admin.tsx` (same styling as other tabs, no new visual treatment).

## 6. Files

**Created**
- `supabase/migrations/<ts>_river_ops_conversations.sql`
- `supabase/functions/river-public-match/index.ts`
- `supabase/functions/river-ops-chat/index.ts`
- `src/pages/admin/RiverOps.tsx`

**Edited**
- `src/App.tsx` — add lazy route `/admin/river-ops`
- `src/pages/admin/Admin.tsx` — add tab/link to River Ops (no style changes)
- `src/pages/RiverResults.tsx` — swap to edge function, keep existing UI

## Notes

- `ANTHROPIC_API_KEY` already exists; no secret prompt needed.
- All Anthropic calls happen server-side in edge functions; the key is never exposed to the client.
- Existing River widget (`RiverWidget.tsx`) continues to use the current `river-chat` function — untouched, per "do not change existing functionality".
