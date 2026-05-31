## Scope

Visual redesign only. No changes to routing, Supabase queries, realtime subscriptions, message sending logic, custom-offer/pitch data flow, or any other page.

Files touched:
- `src/pages/Inbox.tsx` — full visual rewrite of conversation list and active chat panel.
- `src/components/layout/AppShell.tsx` — rename three sidebar labels only.

No other files are modified. `AuthLayout`, shared `Input`/`Button`, other pages, edge functions, and the database remain untouched.

## 1. Sidebar label rename (`AppShell.tsx`)

Rename only the labels in the existing nav arrays — keep routes, icons, and structure identical:
- `Inbox` → `Messages`
- `My projects` (buyer) → `Projects`
- `Explore` → `Find experts`
- `HQ`, `Saved`, `Settings` unchanged.

Note: The sidebar's current width is `w-56` (224px) and is preserved exactly as-is per the requirement that column 1 stays unchanged.

## 2. Inbox page rewrite (`src/pages/Inbox.tsx`)

Keep all existing behavior:
- `loadConvs`, `loadMessages`, `send`, realtime channel, mark-as-read, pitch RPC `create_escrow_order`, navigation to `/checkout/:id`, `CustomOfferComposer`, `CustomOfferCard` — all unchanged.
- Continues to use `AppShell` wrapper so column 1 (the left sidebar) renders exactly as it does today.

Replace the current 2-column bordered card with a full-height 2-column layout that sits inside `AppShell`'s `<main>` (becoming columns 2 and 3 of the requested 3-column page). To make it truly full-height edge-to-edge, the Inbox component will render a wrapper that uses negative margins to cancel `AppShell`'s `p-10` and a fixed height of `calc(100vh - 3.5rem)` (subtracting the 56px header), so columns extend to the viewport edges with no gaps.

### Column 2 — Conversation list (320px)

- Container: `width: 320px`, `background: #FFFFFF`, `border-right: 1px solid #EBEBEB`, flex column.
- Header row: `padding: 20px 16px`, `border-bottom: 1px solid #EBEBEB`, "Messages" 18px/600 #0A0A0A on left, pencil compose icon button (`Pencil` from lucide) on right, `color: #888`, hover `#0A0A0A`. Compose button is visual only (no new feature) — it can be a no-op `<button>` to satisfy the spec without adding functionality.
- Search input: `#F7F7F7` bg, `1px solid #EBEBEB`, `border-radius: 999px`, `padding: 8px 16px`, `font-size: 13px`, `color: #333`, placeholder "Search messages…", margin `12px 16px`, focus `border-color: #0A0A0A`. Filters the `convs` array client-side by `other.full_name`/`username`/`last_message_preview` (purely client-side filter — no new backend query).
- Conversation rows: `padding: 14px 16px`, `border-bottom: 1px solid #F5F5F5`, flex with `gap: 12px`. Hover `#F7F7F7`. Active conv: `background: #F0F0F0`, `border-left: 3px solid #0A0A0A` (with compensating left padding so content does not shift).
- Each row: 42px avatar circle (initials, 14px/600). Online dot 8px bottom-right of avatar, green `#16A34A`, shown when the other participant is currently online (uses the existing profile data already loaded; if `is_online`/`last_seen_at` is not in the existing `select`, the dot is omitted gracefully rather than adding a new query). Name 14px/600 `#0A0A0A`. Preview 12px `#888`, one-line truncate. Right column: timestamp 11px `#AAAAAA` on top; unread count badge in green circle `#16A34A` with white text only when unread count > 0 (computed from existing `messages` data already returned — no new schema).

### Column 3 — Active conversation (flex 1)

Empty state (no `conversationId`):
- Full panel `background: #F7F7F7`, centered. 80px circle `#F0F0F0` with `MessageSquare` icon `#AAAAAA` 32px. Heading "Select a conversation" 18px/500 `#888`. Subtext "Choose a conversation from the left to start messaging" 14px `#AAAAAA`.

Active chat:
- Header (64px, `#FFFFFF`, `border-bottom: 1px solid #EBEBEB`, `padding: 16px 24px`, flex space-between): left = 40px avatar + name (15px/600 `#0A0A0A`) + online status line (12px `#16A34A` "Online" if online, else "Last seen …" in `#AAAAAA`). Right = `Video` icon button + `MoreHorizontal` icon button, both `#888` hover `#0A0A0A`. Both right-side icons are visual only (no new feature). The existing `CustomOfferComposer` will be relocated into a small overflow or kept inline next to the icons so the existing "Send custom offer" capability is preserved without adding new features.
- Messages area: `flex: 1`, `overflow-y: auto`, `padding: 24px`, `background: #F7F7F7`. Group messages by calendar date with a centered date pill (11px `#AAAAAA`, `#F7F7F7` bg, `padding: 4px 12px`, `border-radius: 999px`). Grouping is computed client-side from existing `created_at` — no schema changes.
- Received bubbles (left): 32px avatar beside bubble, `background: #FFFFFF`, `border: 1px solid #EBEBEB`, `border-radius: 18px 18px 18px 4px`, `padding: 12px 16px`, 14px `#333`, `max-width: 65%`. Timestamp 11px `#AAAAAA` below.
- Sent bubbles (right): `background: #0A0A0A`, `color: #FFFFFF`, `border-radius: 18px 18px 4px 18px`, same padding/size, `max-width: 65%`. Timestamp 11px `#AAAAAA` right-aligned below.
- Pitch messages (`message_type === "pitch"`): restyled per spec — `border-left: 3px solid #7C3AED`, `background: #FAFAFA`, "Proposal" eyebrow 11px uppercase `#7C3AED`, body `#333`, "Proposed Price" 12px `#888` + amount 15px/700 `#16A34A`, "Delivery Time" 12px `#888`. Two buttons (only for non-mine pitches, same condition as today): "Accept Proposal" — green `#16A34A` filled, `border-radius: 999px`, `padding: 6px 14px`, 12px, calls the same existing `create_escrow_order` RPC and navigates to `/checkout/:id`. "Reply" — outlined `#0A0A0A`, same shape, focuses the input (same existing behavior).
- Custom-offer messages (`custom_offer_id`): keep rendering existing `<CustomOfferCard offerId={…} />` unchanged, just aligned mine/theirs.

- Chat input footer (`#FFFFFF`, `border-top: 1px solid #EBEBEB`, `padding: 16px 24px`, flex `gap: 12px`):
  - Left: `Paperclip` icon button `#AAAAAA` hover `#0A0A0A` (visual only — no new attachment feature).
  - Center: native `<input>` (replacing the shared `Input`) with `#F7F7F7` bg, `1px solid #EBEBEB`, `border-radius: 999px`, `padding: 12px 20px`, 14px `#333`, focus `border-color: #0A0A0A` + `background: #FFFFFF`, placeholder "Type a message…", `flex: 1`. Enter (no shift) triggers the existing `send()`.
  - Right: 42×42 round black `<button>` `#0A0A0A` hover `#333`, white `ArrowRight` icon, triggers the existing `send()`. Disabled state at `opacity: 0.4` when draft is empty.

### Behavior preserved verbatim

- Clicking a conv navigates via `nav('/inbox/${id}')` (existing).
- `loadMessages` runs on `conversationId` change (existing).
- Realtime subscription on `messages` table updates the open conversation and refreshes the list (existing).
- Sending inserts into `messages` with the same payload and updates UI optimistically via realtime (existing).
- Pitch accept still calls `supabase.rpc("create_escrow_order", { _source: "pitch", _source_id: m.id })` and navigates to `/checkout/:data` (existing).
- Custom-offer composer still rendered for the active conv (existing — moved into the chat header right cluster).

## Technical notes

- All styles are written inline as `style={{…}}` objects or scoped utility classes via Tailwind arbitrary values, so the design system tokens and other pages are not affected.
- No `index.css`, `tailwind.config.ts`, or shared component edits.
- No new dependencies. Icons (`Pencil`, `Video`, `MoreHorizontal`, `Paperclip`, `ArrowRight`, `MessageSquare`) come from already-installed `lucide-react`.
- TypeScript types for `Conv`/`Msg` are kept; if online status fields are not already on the profiles select, the online dot/status falls back gracefully (rendered only when data is present).
- No database migrations. No edge function changes. No new RLS policies.
