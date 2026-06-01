# Rename "Play"/"Plays" → "Service"/"Services" (UI only)

Replace all user-visible occurrences of "Play"/"Plays" with "Service"/"Services" while preserving:
- Existing capitalization (Play → Service, play → service, Plays → Services, plays → services)
- Code aliases and DB field names (PostgREST aliases like `plays:gig_id(...)` and downstream `o.plays` accessors stay untouched — not user-facing)
- Unrelated words (display, playwright, autoplay, playsInline, displayName)

## Files to update

**Sidebar / shell**
- `src/components/layout/AppShell.tsx` — `"My plays"` → `"My services"`

**Seller area**
- `src/pages/seller/SellerDashboard.tsx` — "Active plays", "Create a play", "No plays yet", "Create your first play" (×2)
- `src/pages/seller/MyGigs.tsx` — "My plays", "New play", "No plays yet", "Create a play", `<th>Play</th>`, "Untitled play"
- `src/pages/seller/GigEditor.tsx` — "Play published", "Edit play"/"Create a new play", "Play title", "Play description", "Publish play"
- `src/pages/seller/SellerAnalytics.tsx` — SEO description, "Top plays", `<th>Play</th>`, "No plays yet"

**Buyer / marketplace**
- `src/pages/GigDetail.tsx` — "Play not found", "Browse plays", "About this play", "Report play"
- `src/pages/Explore.tsx` — "trending plays"
- `src/pages/Services.tsx` — "Trending Plays" → "Trending Services"
- `src/pages/SellerProfile.tsx` — "No active plays yet."
- `src/pages/account/Saved.tsx` — "Saved plays", "Plays you've hearted…"
- `src/pages/account/Settings.tsx` — "Saved plays →"
- `src/pages/buyer/BuyerDashboard.tsx` — "Find a play" (leave `plays:gig_id` alias as-is)
- `src/pages/orders/OrdersList.tsx` — fallback label `"Play"` → `"Service"`
- `src/components/marketplace/SaveGigButton.tsx` — aria-label "Save/Unsave play"
- `src/components/marketplace/PromoteGigDialog.tsx` — toast + dialog copy
- `src/components/inbox/ConversationDetailsPanel.tsx` — "Related Plays" header + empty state
- `src/components/layout/RiverWidget.tsx` — "Play matcher" → "Service matcher"

**Pricing / How it works (marketing copy)**
- `src/pages/Pricing.tsx` — "Free to list up to 10 Plays", "List your Plays…"
- `src/pages/HowItWorks.tsx` — glossary entry "Play" → "Service" (keep "formerly Gig"), and prose mentions of Plays in steps

**Admin**
- `src/pages/admin/Admin.tsx` — nav label "Plays", stat labels "Plays"/"Saved Plays", `<a>Plays</a>`, section title "Plays", "No plays.", label map `gigs: "Plays"`, confirm "Delete play?"
- `src/pages/admin/sections/ReportsQueue.tsx` — "Hide play"

**Internal QA labels (optional, ask)**
- `src/lib/testFlows.ts` — internal test titles ("Browse loads active plays", "Create project from play", "no active plays"). These appear in an internal admin Test Flows panel. I'll update them too for consistency.

## Out of scope (intentionally untouched)

- Supabase query aliases `plays:gig_id(...)` in `BuyerDashboard.tsx`, `Search.tsx`, `CheckoutSuccess.tsx` and the `.plays` accessors that read them — these are code identifiers, not UI strings. Renaming would touch business logic the user did not ask to change.
- DB column/table names (gigs table stays `gigs`).
- CSS utility classes containing "display", and HTML attrs `autoPlay`/`playsInline`.

## Verification

After edits, re-run `rg -n "[Pp]lays?\b" src/` filtered to exclude code-only matches and confirm only the intentionally-skipped aliases remain.
