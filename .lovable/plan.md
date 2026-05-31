## Part 1 — Voice search on homepage River bar

Edit `src/pages/Landing.tsx` (the existing form at lines ~144–172 only — no other styling touched).

- Detect Web Speech API once on mount:
  ```ts
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [voiceSupported] = useState(!!SR);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  ```
- Add a mic `<button type="button">` inside the white pill, placed left of the existing `<Search>` icon (or replacing its position — left side of the input as specified). Hidden entirely when `!voiceSupported`.
  - Idle: simple inline SVG mic, `#999`, 18px, hover `#000` (via `onMouseEnter/Leave` since inline styles).
  - Listening: red pulsing dot (red circle + CSS `@keyframes kx-pulse` injected via a scoped `<style>` tag in the component, no global CSS edits).
- Click handler:
  ```ts
  const r = new SR();
  r.continuous = false; r.interimResults = true; r.lang = 'en-US';
  r.onresult = (e) => { 
    const t = Array.from(e.results).map((x:any)=>x[0].transcript).join('');
    setQ(t);
  };
  r.onend = () => setListening(false);
  r.onerror = () => setListening(false);
  recogRef.current = r; setListening(true); r.start();
  ```
- Show small grey "Listening..." text (12px, `#999`) directly below the form only while `listening`.
- Submit behavior unchanged — still navigates to `/river-results?q=...`.

No other Landing.tsx markup, colors, or layout changes.

## Part 2 — Rebuild `/river-results`

Replace the contents of `src/pages/RiverResults.tsx` with a new self-contained page (keep `SiteHeader`/`SiteFooter` wrapper as it already has, but remove the existing surface container styling and use only inline styles per spec). No other files touched.

### Data fetch (single Supabase round-trip block on mount when `q` changes)

1. `profiles` where `seller_status = 'approved'` selecting `id, username, full_name, avatar_url, bio, primary_category, secondary_category, seller_skills, average_rating, total_reviews, river_score, response_time_minutes`.
2. `gigs` where `status = 'active'` selecting `seller_id, title, tags, category, starting_price, average_rating, total_reviews` — used to enrich tags + starting price per seller.

Tokenize the query: lowercase, split on non-alphanumerics, drop tokens length <= 2.

For each approved seller compute:
- `matchedSkills`: count of distinct `seller_skills` tags (and gig tags) that contain any query token.
- `hayMatch`: bool — any token appears in `full_name|bio|primary_category|secondary_category|gig.title|gig.tags|gig.category`.
- `startingPrice`: min `gigs.starting_price` for that seller.
- `riverScore`: use existing `profiles.river_score` if non-null, else fallback `(average_rating/5)*100`.

Section 1 list: sellers with `hayMatch` true (or `matchedSkills > 0`), sorted by `(matchedSkills desc, riverScore desc, average_rating desc)`, take top 15.

Section 2 list: all other approved sellers where `hayMatch` true OR `matchedSkills > 0`, excluding Section 1 ids; sort by `average_rating desc, total_reviews desc`; cap 50; paginate client-side 24 at a time with a "Load More" button.

Match-strength badge per Section 1 card: `matchedSkills >= 3` → "Perfect match" green pill; `===2` → "Strong match" blue pill; otherwise "Good match" grey pill.

### Layout (all inline styles, exact spec)

- Page header: white bg, `padding: 32px 80px`, `borderBottom: 1px solid #f0f0f0`. Left: back arrow `<Link to="/">`. Center: "Results for" 13px `#888`, below `"q"` 20px weight 500 `#000`. Right: `{totalCount} experts found` 13px `#888`.
- Section 1 wrapper: `background: #0a0a0a; padding: 48px 80px;`. Label row + 3-col grid `gap: 16px` (`grid-template-columns: repeat(3, 1fr)`). Each dark card per spec (bg `#111`, border `0.5px solid #1e1e1e`, radius 16, padding 20) with River Score 32px, badge pill, name 15px, specialty 12px `#555`, up to 3 skill tag pills (matching → white text, non-matching → `#444`), stats row (★ rating yellow, reviews `#555`, delivery `#555`, starting price white) separated by `·` in `#333`, border-top divider, two pill buttons "View Profile" (outlined) → `/u/:username`, "Get a Pitch" (filled white) → opens conversation via `get_or_create_conversation` then navigates to `/inbox/:id` (reuses existing pattern already in the file).
- Empty-Section-1 fallback inside the dark section: "River is still learning this category — browse all experts below" centered 14px white padding 32.
- Section 2 wrapper: white bg `padding: 48px 80px`. Label row + responsive grid (`repeat(auto-fill, minmax(320px, 1fr))`, gap 16) of light cards per spec (white bg, border `0.5px solid #e5e5e5`, radius 16, padding 20). 44px avatar, name 14/500, ★ rating + (count) `#888`, bio 2-line clamp `#666`, up to 3 grey skill pills, divider, starting price + delivery + "View Profile"/"Message" pill buttons.
- "Load More" button below the grid when more remain (outlined, 999 radius, centered).
- Empty state (both sections empty): white centered block — circle icon (lucide `Search` in a `#f5f5f5` 64px circle), heading 20/500 "No experts found for this search", subtext 14 `#888` "Try different keywords or browse all experts", two pill buttons "Try Another Search" → `/` and "Browse All Experts" → `/browse`.

### Preserved behavior

- Keep the existing `notify_river_match` RPC call after results load (so matched sellers still get a notification) — unchanged from current file.
- Keep `SiteHeader` and `SiteFooter`.
- No DB / RPC / route changes. `/river-results` route already exists in `App.tsx`.

## Files touched

- `src/pages/Landing.tsx` — mic button + listening state inside the existing form only.
- `src/pages/RiverResults.tsx` — full rewrite of page body per spec.

Nothing else changes.