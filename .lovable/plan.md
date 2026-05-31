## Scope

Add a third 260px right panel to `src/pages/Inbox.tsx` (only visible when a conversation is active) and apply the small color accents to message bubbles, conversation rows, date separators, and pitch cards. No changes to existing routing, RPCs, schema, or messaging logic.

## Layout change

In `Inbox.tsx`, change the outer grid:
- Currently: `gridTemplateColumns: "320px 1fr"`.
- New: if `active` exists → `"320px 1fr 260px"`, else `"320px 1fr"` (unchanged).

## New component `src/components/inbox/ConversationDetailsPanel.tsx`

Props: `{ otherUser, conversationId, currentUserId }`.

Sections (white bg, `border-left: 1px solid #EBEBEB`, vertical scroll if overflow):

**Top — person info** (padding 20, border-bottom 1px #F0F0F0):
- 48px circle avatar, 2px #EBEBEB border.
- Name 15/600 #0A0A0A, mt 10.
- `@username` 12 #AAAAAA.
- Last seen 12 #AAAAAA mb 12 (online → "Active now", else "Last seen …" from `profiles.last_seen`).
- 4 info rows (label 11 uppercase #AAA tracking 0.08em, value 13/500 #333):
  - **From** → `profiles.location` || `profiles.country` || "—"
  - **Member Since** → `profiles.member_since` formatted as `Month YYYY`
  - **Language** → `profiles.languages[0]` || "—"
  - **Rating** → `★ {average_rating} ({total_reviews})` if `total_reviews > 0` else "No reviews yet"

Fetched via one `supabase.from("profiles").select("location, country, member_since, languages, average_rating, total_reviews, primary_category").eq("id", otherUser.id).maybeSingle()` triggered by `useEffect` on `otherUser.id`.

**Middle — Related Plays** (padding 20, border-bottom 1px #F0F0F0):
- Header row: "Related Plays" 13/600 #0A0A0A + Link "See more →" 12 #AAA → `/services` (hover #0A0A0A).
- Up to 4 Play cards stacked, gap 10.
- Fetch order:
  1. `gigs` where `seller_id = otherUser.id` and `status = 'active'`, order by `average_rating desc, total_orders desc`, limit 4.
  2. If <4 and `otherUser.primary_category` exists: top-up by category `eq("category", otherUser.primary_category)`, exclude already-included ids, limit remaining. (The "last search query category" rule is dropped — we don't persist a per-user last search; the seller's primary category is the closest practical match and matches the third fallback. This is the explicit deviation.)
- Card: 64px tall, flex row, white bg, 1px #EBEBEB, radius 10, overflow hidden, cursor pointer; hover border #CCC + shadow `0 2px 8px rgba(0,0,0,0.06)`; click → `window.open('/gig/' + id, '_blank')`.
  - Left: 64×64 thumbnail (`thumbnail_url` or `#F5F5F5` fallback).
  - Right: padding 8px 10px. Title 12/500 #333, clamped to 2 lines (`-webkit-line-clamp:2`). Below: `★` #F59E0B 11 + " {rating}" + small spacer + label "FROM" 9 #AAA + price 12/700 #0A0A0A (`$${starting_price}`).

**Bottom — Quick actions** (padding 20):
- Heading "Quick actions" 13/600 #0A0A0A mb 12.
- Two buttons (full width, flex gap 8, padding 10px 14px, 1px #EBEBEB, radius 10, mb 8, hover bg #F7F7F7 / border #CCC):
  - **View their profile** — `Briefcase` lucide icon #888, text 13 #555. `onClick` → `nav('/u/' + otherUser.username)` if username present, else `/seller/${otherUser.id}`.
  - **Leave a review** — `Star` lucide icon #888, text 13 #555. Only render if a completed order exists between the two users. Click → `nav('/orders/${orderId}/review')`.
    - Check: `supabase.from("orders").select("id").or(\`and(buyer_id.eq.${currentUserId},seller_id.eq.${otherUser.id}),and(buyer_id.eq.${otherUser.id},seller_id.eq.${currentUserId})\`).eq("status","completed").order("completed_at",{ascending:false}).limit(1).maybeSingle()`. Use the existing `/orders/:order_id/review` route.

Panel renders only when `active` is non-null (Inbox already gates this naturally because the column itself is conditional in the grid).

## Color accents (`src/pages/Inbox.tsx` only)

All small targeted edits — no structural changes.

- **Received message bubble** (line ~644): background `#FAFAFA`, border `1px solid #E5E5E5` (currently `#FFFFFF` / `#EBEBEB`). Sent bubble untouched.
- **Conversation row** (lines ~291–382):
  - Active row already has `borderLeft: 3px solid #0A0A0A` and `#F0F0F0` bg → change active bg to `#F5F5F5` to match spec.
  - Unread row: if `(c.unread_count ?? 0) > 0 && !isActive` → `borderLeft: 3px solid #16A34A` and name color stays `#0A0A0A` already 600; bump name to 700 when unread.
  - Unread badge already `#16A34A` / `#FFFFFF` ✓.
- **Online indicator** already `#16A34A` ✓.
- **Date separator** (lines ~520–533): change to `background:#F0F0F0`, `color:#888888`, no border, padding `3px 12px`, radius 999, fontSize 11.
- **Pitch card** (lines ~550–610): already uses `#FAFAFA` bg, `borderLeft 3px #7C3AED`, Proposal label `#7C3AED`, price `#16A34A 700`, Accept button `#16A34A`, Reply outlined black ✓ — no changes needed; verify and leave as-is.

## Wiring

In `Inbox.tsx` add `import { ConversationDetailsPanel } from "@/components/inbox/ConversationDetailsPanel";` and after the `<section>` (around line 749) render:
```tsx
{active && active.other && user && (
  <ConversationDetailsPanel
    otherUser={active.other}
    conversationId={active.id}
    currentUserId={user.id}
  />
)}
```

## Out of scope

- No DB changes, no new RPCs.
- No changes to message send/receive/realtime/unread/RLS.
- No new routes (uses existing `/u/:username`, `/seller/:username`, `/gig/:slug`, `/orders/:order_id/review`, `/services`).
- "Last search query" tracking is not built — the second fallback uses the expert's primary category, which is the existing data model's closest equivalent.
