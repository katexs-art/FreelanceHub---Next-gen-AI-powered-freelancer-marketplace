Edit `src/pages/RiverResults.tsx` only. Visual/style fixes per spec, no routing/data shape changes.

## Section 1 — River Top 15

- Section header strip above the grid: full-width `#111`, `borderBottom: 1px solid #222`, `padding: 16px 80px`, flex space-between. Left: 8px `#a855f7` dot + "River's Top 15 Matches" (13px/500 `#fff`, letter-spacing 0.05em, gap 10). Right: "Ranked by River Score and skill match" (11px `#555`). Remove the current in-section label row.
- Grid: `gridTemplateColumns: repeat(auto-fit, minmax(280px, 1fr))`, gap 20.
- Card: bg `#1a1a1a`, border `1px solid #333`, radius 20, padding 24, boxShadow `0 4px 24px rgba(255,255,255,0.04)`.
- River Score: 40px/600 `#fff`; add "RIVER SCORE" label below — 10px uppercase, letter-spacing 0.1em, `#666`.
- Match badge: 11px, padding `4px 12px`, radius 999.
  - Perfect: bg `#1a3a1a`, color `#4ade80`.
  - Strong: bg `#1a1a3a`, color `#60a5fa`.
  - Good: bg `#2a2a2a`, color `#aaa`.
- Name: 16px/600 `#fff`, marginTop 12. Specialty: 13px `#888`.
- Skill tag pills: bg `#252525`, border `1px solid #333`, color `#ccc`, 11px, padding `4px 10px`. Matching tags: bg `#1a3a1a`, border `1px solid #4ade80`, color `#4ade80`.
- Stats row: filled yellow stars `#f59e0b`, review count `#666`, delivery `#777`, starting price `#fff`/600/15px. Separators `·` in `#333`.
- View Profile button: transparent bg, `1px solid #444`, `#fff`, radius 999, padding `8px 18px`, 12px/500, hover swap to bg `#fff`/color `#000` (use `onMouseEnter/Leave` state — inline styles, no CSS file edits), transition 0.2s.
- Get a Pitch button: bg `#fff`, color `#000`, no border, radius 999, padding `8px 18px`, 12px/600, hover bg `#e5e5e5`.

## Divider between sections

Full-width band: white bg, `padding: 20px 80px`, `borderTop: 1px solid #1a1a1a`, `borderBottom: 1px solid #f0f0f0`, centered text "River's picks are above · All matching experts are below" — 13px `#999`.

## Section 2 — All Other Experts

- Data: keep approved-seller fetch. Tighten match predicate so a seller is included if **any** query token (case-insensitive) appears in: `seller_skills`, gig `tags`, `primary_category`, `secondary_category`, `bio`, or any gig `category`. Drop the current "hayMatch OR matchedSkills>0" formula in favor of this explicit predicate. Exclude Top 15 ids. Sort by `average_rating desc, total_reviews desc`. Keep 50-cap + 24 Load More (unchanged behavior).
- Add count line at the top of Section 2: "Showing {N} experts for [{query}]" — 13px `#999`, marginBottom 16.
- Card: bg `#fff`, border `1px solid #e5e5e5`, radius 16, padding 20. On hover apply `boxShadow: 0 2px 12px rgba(0,0,0,0.04)` via inline hover state.
- Avatar circle: 48px, bg `#f5f5f5`, fallback initials. If `last_seen` within 24h, render a 8px green dot (`#22c55e`, `border: 2px solid #fff`) bottom-right of avatar.
- Name: 15px/600 `#000`.
- Stars: filled yellow `#f59e0b`, numeric rating like `4.8` in 500 + `(count)` `#888` 12px.
- Bio: 13px `#666`, line-height 1.5, 2-line clamp.
- Skill pills: bg `#f5f5f5`, color `#555`, 11px, padding `3px 10px`, radius 999.
- Starting price: 14px/600 `#000`. Delivery: 13px `#888`.
- View Profile: white bg, `1px solid #000`, `#000`, radius 999, padding `7px 16px`, 12px/500, hover bg `#000`/color `#fff`, transition 0.2s.
- Message: white bg, `1px solid #e5e5e5`, `#555`, same shape; hover border `#000`/color `#000`.

No other files touched. Routing, RPCs, voice search, and overall page structure unchanged.