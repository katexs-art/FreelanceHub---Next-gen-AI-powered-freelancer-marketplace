## Locked design tokens (from your picks)

- **Canvas**: `#000000` page, `#0a0a0a` surface, `#1c1c1c` elevated, hairline borders `rgba(255,255,255,0.08)`.
- **Type**: `#ffffff` primary, `rgba(255,255,255,0.64)` secondary, `rgba(255,255,255,0.4)` muted. No colored text except status (success/danger/warn).
- **Fonts**: JetBrains Mono (display, all-caps tracked, numerics, eyebrows, badges) + Work Sans (body, UI, long-form). No serifs.
- **Geometry**: 1px borders, 4px radii on inputs/cards, 999px on pills. No shadows, no gradients, no glows — depth comes from borders + spacing only.
- **Motion**: ≤200ms ease-out, opacity + 2-4px translate only. No bounce, no parallax, no scroll-jacking.
- **Memory update**: overwrite the prior `katexs.` purple/green identity with this monochrome x.ai system; River AI keeps purple only inside its own panel.

This becomes the new `index.css` token layer + Tailwind theme. Every existing semantic token (`--background`, `--foreground`, `--primary`, `--card`, `--border`, etc.) is rewritten so existing components inherit the new look without touching their JSX.

---

## Phase A — Design system rewrite (foundation)

1. Rewrite `src/index.css` tokens + base layer: pure-black canvas, mono eyebrow class `.eyebrow` (JetBrains Mono, 11px, 0.18em tracking, uppercase), hairline `.divider`, `.surface` / `.surface-2` utilities, focus ring `1px solid #fff`.
2. Rewrite `tailwind.config.ts` font families, container (max-w 1200, centered), and spacing scale tuned to 8px grid.
3. Update shadcn primitives' variants only (Button, Input, Card, Tabs, Dialog, Badge, Select, DropdownMenu, Tooltip, Toast): monochrome, hairline borders, mono labels on Button. Default Button = white bg / black text; secondary = transparent + 1px white border; ghost = transparent + hover surface.
4. New atoms in `src/components/ui/`: `Eyebrow`, `StatNumber` (large mono tabular numerals), `HairlineDivider`, `KeycapHint`, `Marquee` (logos/keywords), `MonoTag`.

## Phase B — Global chrome

5. Rebuild `AppShell` top bar: black, hairline bottom, mono wordmark `KATEXS`, centered nav (Browse · Sell · Messages · Orders), right-side icon-only auth/cart/notifications, command-K search trigger.
6. New `CommandPalette` (cmd-k) for global search + jump-to with mono styling.
7. Rebuild footer: 4-column hairline grid, mono section headers, legal row with status dot ("All systems nominal").

## Phase C — Public marketing pages (centered manifesto)

8. **Home `/`** (full rebuild to x.ai feel):
   - Massive centered headline (clamp 56–112px, JetBrains Mono, tight leading), one-line sub in Work Sans, single AI search input pill underneath with rotating placeholder.
   - Below: hairline-bordered "popular" mono chip row.
   - Section bands (all centered, max-w 1100): Featured gigs (3-up), Categories (8-up icon grid, mono labels), "How Katexs works" 3-step with monospace numerals, Top sellers rail, Trust stats strip (StatNumber row: gigs delivered / avg rating / countries / payout volume), AI search demo block, Press/Logos marquee, Final CTA.
9. **Browse / Explore / Search / Category / Subcategory**: shared `MarketShell` with mono filter rail (left on desktop, sheet on mobile), result grid using redesigned `GigCard` (square thumb, 1px border, mono price, hover = border whitens).
10. **GigDetail**: two-column → hero image gallery + sticky package selector card (mono tabs Basic/Standard/Premium, tabular-num prices), seller strip, FAQ, reviews. Increments `clicks` on mount for promoted gigs.
11. **SellerProfile**: centered identity block, mono stats row, gig grid, reviews. Verified + level badges in new monochrome style.
12. **Static pages**: About, Trust & Safety, Pricing/Fees, Terms, Privacy, Help — single-column long-form with editorial measure (max-w 720), mono section eyebrows.

## Phase D — Authenticated app surfaces

13. Auth pages (`/login`, `/signup`, `/forgot`, `/reset`): centered card, hairline border, mono labels, single white CTA.
14. Buyer dashboard (`/dashboard`): stat row + active orders + saved gigs + recommendations, all monochrome.
15. **Seller dashboard `/selling`**: Overview (StatNumbers: earnings, active orders, response rate, completion rate), gigs table, orders table, analytics link.
16. **Seller Analytics `/selling/analytics`** (new): impressions/clicks/orders/conversion charts (Recharts, monochrome lines, mono axis), date range.
17. **My Gigs / Gig Editor**: multi-step editor (Overview → Pricing → Description → Requirements → Gallery → Publish) with mono step indicator; `pending_review` status surfaced.
18. **Orders `/orders` + `/orders/:id` Workspace**: redesigned timeline, realtime chat panel, custom offers, delivery, accept/revision/dispute/cancellation, requirements gate before start.
19. **Messages `/messages`**: 3-pane (threads / conversation / context), realtime, mono timestamps, attachment chips.
20. **Account**: Profile, Notification prefs, Security, Payment methods, Saved, Following, Verification (KYC).
21. **Earnings + Withdrawals `/selling/earnings`**: available / pending / clearing, withdrawal request UI tied to Connect payout.

## Phase E — Admin

22. Redesign `/admin` with mono left rail + sections: Overview (KPIs), Users, Gigs (moderation incl. `pending_review`), Orders, Disputes, Revenue, Categories CRUD, Verifications, Reports, Settings.

## Phase F — Functional gap closure (Fiverr parity)

Backend/logic work performed alongside the visual rewrite:

- **Profiles**: add `is_online` heartbeat (writes every 60s while tab focused) + live username availability check on signup/edit.
- **Catalog**: add `pending_review` gig status; admin queue approves/rejects; route aliases `/browse`, `/categories/:slug`, `/categories/:slug/:sub`.
- **Stripe**: migrate to Stripe Connect Express. New edge functions `stripe-connect-onboard`, `stripe-connect-refresh`, extend `stripe-webhook` for `account.updated` / `payout.*` / `charge.refunded`. Destination charges with application_fee for marketplace cut. Requirements gate blocks `start_order` until buyer submits requirements.
- **Cron (pg_cron, hourly)**: `clear_due_seller_credits` (move pending→available after clearance window), `auto_complete_orders` (3 days post-delivery), `auto_publish_reviews` (14-day window), `expire_promotions` (zero remaining budget or past `ends_at`).
- **Reviews**: enforce two-way gating (buyer can review after delivery accepted; seller can review after buyer review or auto-publish window).
- **Notifications**: ensure every state transition fans out (new message, offer, delivery, revision, dispute, payout, follow, KYC result).
- **Promoted gigs**: wire impression/click tracking on GigCard + GigDetail through `track_promotion_event`; daily budget enforcement via cron.
- **Search**: full-text on `gigs.title + description + tags`, filters (price, delivery time, seller level, rating, online now), promoted-first ordering.
- **Realtime**: enable on `messages`, `orders`, `notifications`, `disputes`.
- **Responsive pass**: every page audited at 360 / 768 / 1280 / 1600.
- **E2E smoke**: scripted walk — signup → become seller → create gig → admin approves → buyer searches → orders → submits requirements → chat → delivery → accept → review → seller withdrawal.

## Phase G — Polish

- Empty states (mono illustration-free, eyebrow + sentence + single CTA) on every list surface.
- Skeleton loaders using hairline shimmer (opacity pulse, no gradient).
- 404 / 500 pages in centered manifesto style.
- SEO pass: per-page title/description, JSON-LD for gigs (Product) and sellers (Person), sitemap.xml, robots.txt, canonical tags.

---

## Technical notes

- Token rewrite is non-destructive: components already consume `bg-background`, `text-foreground`, `border-border`, etc., so the visual flip is mostly CSS-layer.
- Stripe Connect requires `STRIPE_SECRET_KEY` (already present per prior phases) — no new secret unless using a different account.
- pg_cron + pg_net are enabled by Lovable Cloud; schedules added via migration.
- Memory file `mem://style/visual-identity` will be overwritten to reflect the x.ai monochrome system; River AI exception kept.
- Out of scope: native mobile apps, AI-generated gig images, video calls, multi-currency display (USD only), real KYC provider (manual admin review remains).

## Sequencing

```text
A (tokens) → B (chrome) → C (public) → D (app) → E (admin) → F (logic) → G (polish)
```

Phases A+B are prerequisites; C–F can interleave per route. Estimated as one large build cycle; I'll work top-down and report at each phase boundary.
