# Browse AI Experts (`/browse`) — Seller Directory

A new dedicated directory page that lists approved sellers (people, not gigs). Built as a single new file so nothing else on the site changes.

## What gets built

A new page `src/pages/Browse.tsx`, wrapped in the existing `SiteHeader` / `SiteFooter` so site chrome stays intact. The `/browse` route currently aliases `Explore`; it will be repointed to the new page. `/explore` continues to render the existing `Explore` page unchanged.

## Page structure (top to bottom)

1. **Header row** — left: "Browse AI Experts" (28px / 700) + subtitle (14px / #666). Right: live "X experts on Katexs" count, subscribed to `profiles` changes via Supabase Realtime (filtered to `seller_status = approved`).
2. **Search bar** — pill input (white, 1px #e5e5e5, radius 999, padding 14/24, 15px) with black pill "Search" button. Enter or click triggers filtering. Query matches against `seller_skills`, `primary_category`, `secondary_category`, `bio`, plus any of the seller's gig `title` / `tags`.
3. **Category pill row** — All, Build with AI, Sound and Speak with AI, Create with AI, Grow with AI, Run with AI, Understand AI, Write with AI, Learn AI. Active = black bg / white text. Single-select.
4. **Quick-filter pill row** — Available Now (online in last 24h), Top Rated (avg_rating ≥ 4.8), Fast Delivery <3d (min gig delivery_days), Budget <$50 (min starting_price), Pro Sellers (river_score ≥ 7), Elite Sellers (river_score ≥ 9). Outlined pills, multi-select.
5. **Results bar** — "Showing X experts" + sort dropdown (River Recommended, Highest Rated, Most Orders, Fastest Delivery, Lowest Price, Newest). If a tag was clicked, an "X clear" chip shows next to the count.
6. **Seller grid** — responsive 3-column (`md:grid-cols-2 lg:grid-cols-3`), 24 per page, "Load More" button at the bottom.
7. **Empty state** — centered text + black "Clear Search" button when filtered results are 0.

## Seller card spec (per user)

- White card, 1px #e5e5e5, radius 12, padding 20, hover shadow `0 4px 16px rgba(0,0,0,0.08)` + `translateY(-2px)` 0.2s.
- 52px avatar with green online dot if `is_online` or `last_seen` within 24h. Full name 14/600.
- "River Score X.X" pill (black/white). Level pill: Elite (black) if score ≥ 9, Pro (dark grey) if ≥ 7, Rising (light grey) otherwise.
- Bio: 13px #555, `line-clamp-2`.
- Up to 4 skill tags as `#f5f5f5` / `#333` 11px pills. Clicking a tag fills the search bar with the tag and refilters.
- Divider, then row: ★ rating + count · `From $X` · `X days`.
- Two full-width pill buttons (38px, radius 999, 13/600): "View Profile" (black) → `/u/:username`; "Message" (white outlined) → opens or creates a conversation, then navigates to `/inbox/:conversationId`.

## Message-button flow

On click (must be signed in — otherwise redirect to `/login?next=/browse`):
1. Look up an existing `conversations` row where `(participant_one, participant_two)` is the unordered pair `{ currentUser, seller }`.
2. If none, insert a new conversation with the two participants.
3. Navigate to `/inbox/<conversationId>`.

## Data fetching

Single load on mount (no pagination at the DB layer — fetch up to 500 approved sellers, filter/sort client-side as required):

- `profiles` where `seller_status = 'approved'` and `suspended_at IS NULL` — id, username, full_name, avatar_url, bio, seller_skills, primary_category, secondary_category, river_score, average_rating, total_reviews, is_online, last_seen, member_since.
- `gigs` where `status = 'active'` and `seller_id IN (...)` — id, seller_id, title, tags, starting_price, delivery_days (from cheapest `gig_packages` row), total_orders, average_rating. Aggregated per seller to derive starting price, min delivery, total orders, and a searchable title/tag pool.

All filtering, sorting, tag-click refiltering, and pagination is client-side and instant. Initial sort = River Score desc.

## Realtime count

Subscribe to `postgres_changes` on `profiles` (event `*`, filter `seller_status=eq.approved`) to keep the header count fresh. Unsubscribe on unmount.

## Technical notes

- New file: `src/pages/Browse.tsx`.
- Route change in `src/App.tsx`: lazy-import `Browse` and point `/browse` to it. `/explore` keeps pointing at `Explore`.
- Styling uses the existing design tokens and `SiteHeader`/`SiteFooter`. The specific hex values requested (#e5e5e5, #666, #f5f5f5, #333, #555, black) are applied via inline styles / Tailwind arbitrary values on this page only so no global token is altered.
- No DB migrations, no edge functions, no changes to other pages or components.
