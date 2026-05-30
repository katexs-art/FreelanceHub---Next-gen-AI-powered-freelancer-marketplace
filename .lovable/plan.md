# Services page at `/services`

Scope: new page + one nav-link insertion + one small read of an existing prop in `Browse.tsx`. No other changes.

## 1. New file `src/pages/Services.tsx`

Single self-contained page using existing tokens where possible, with inline styles for the exact hex/px values from the spec.

Sections:
- **Header**: `<h1>AI Services</h1>` (28px / 700) + subtitle (14px / #666). Full-width, container-padded.
- **Services grid** — 4-col responsive grid (1→2→4 cols). 8 hard-coded category objects in the exact order: `Build with AI`, `Sound and Speak with AI`, `Create with AI`, `Grow with AI`, `Run with AI`, `Understand AI`, `Write with AI`, `Learn AI`, each with the spec description and 3 hard-coded top skill tags relevant to the category.
  - Card: white bg, 1px #e5e5e5 border, 12px radius, 24px padding, cursor pointer. Hover: `box-shadow: 0 4px 16px rgba(0,0,0,0.08)`, `border-color: #000`, `transition: 0.2s`.
  - Title 16/700, description 13/#666, count `X services available` 12/#999 from a single Supabase query (see below), tag pills (grey #f5f5f5 / #333), bottom link `Browse services →` 13/600 black.
  - Click → `navigate('/browse?category=' + encodeURIComponent(name))`.
- **Featured sellers strip**: heading `Top Experts This Week` 20/700. Horizontal scrollable strip (`overflow-x:auto`, `scroll-snap-x`) of top 5 approved sellers ordered by `river_score desc` over the last 7 days (query: `profiles where seller_status='approved' and suspended_at is null order by river_score desc nulls last limit 5`). Small card: avatar, name, "River Score X.X" pill, top skill tag, "View Profile" button linking to `/u/:username`.
- **How it works**: heading 20/700, three columns. Step number 48/700/#e5e5e5, title 16/700, description 13/#666. Exact copy from spec.
- **Bottom CTA**: full-width black banner, white heading 24/700 `Ready to get started?`, subtext 14/#ccc, white pill button (radius 999px, padding 12px 32px) `Find My Expert` → `/` (homepage River search bar).

Data fetching:
- One `supabase.from('gigs').select('category', { count: 'exact', head: false }).eq('status','active')` — group counts client-side by mapping each gig's `category` to its parent display name. Mapping uses a lookup table from category-name aliases (`build`, `sound`, `voice`, etc.) to the 8 parent labels. Anything unmatched is ignored.
- One realtime-free `profiles` query for the top sellers strip.

No existing styles, tokens, or components are modified.

## 2. Route registration — `src/App.tsx`

Add a lazy import:
```ts
const Services = lazy(() => import('./pages/Services'));
```
and a `<Route path="/services" element={<Services />} />` next to the existing `/browse` route. No other route changes.

## 3. Nav link — `src/components/layout/SiteHeader.tsx`

Insert one new link between the existing `Browse` link (line 28) and the `Messages` link (line 38) — placed right after the `Browse` link so it reads Browse · Services · Sell · Projects … Messages, matching the spec ("between Browse and Messages"):

```tsx
<Link to="/services" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Services</Link>
```

No styles or other links change.

## 4. Browse pre-select — `src/pages/Browse.tsx`

The Browse page already keeps a `category` state initialised to `"All"`. Read an initial value from the URL query string so `/browse?category=Build%20with%20AI` lands with that pill active:

```ts
const [searchParams] = useSearchParams();
const [category, setCategory] = useState(searchParams.get('category') ?? 'All');
```

Add `useSearchParams` to the existing `react-router-dom` import. No other change to Browse (no filter logic, layout, styles, or queries touched).

## Out of scope

- No DB migrations, edge functions, types, or other pages.
- No changes to colors, fonts, images, layout, or styling anywhere else.
- No new components, hooks, or utilities outside `Services.tsx`.
