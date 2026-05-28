## Phase 11 — Trust, growth, and discovery polish (all four)

Builds out the remaining marketplace pillars in one pass: a real dispute flow, social signals (saves + follows), paid placement, and trust & safety (KYC + reporting).

### 1. Disputes & resolution center

- Buyer/seller can open a dispute from the order workspace when status is `delivered`, `in_revision`, or `pending_acceptance`. New `OpenDisputeDialog` writes to existing `disputes` table.
- `OrderWorkspace` shows a "Dispute open" banner with timeline of admin notes once raised; both parties can post replies via `messages` thread tied to that order.
- Admin queue at `/admin` → new "Disputes" tab listing open disputes with order context, two resolution actions:
  - **Refund buyer** → calls existing `stripe-refund` function, sets dispute `resolved`, order `refunded`.
  - **Release to seller** → marks order `completed`, dispute `resolved`.
- Adds `resolution_outcome` column (`refunded` | `released` | `mutual`) and `admin_notes` text on `disputes`.

### 2. Saved gigs & follow sellers

- Use existing `saved_gigs` table; add a heart toggle on `GigCard` + `GigDetail`. New `/saved` page lists the user's saved gigs.
- New `seller_follows` table (`follower_id`, `seller_id`, unique). "Follow" button on `SellerProfile`.
- Inbox bell already exists — add a `new_gig` notification fanned out to followers when a seller publishes a gig (trigger on `gigs` insert with `status='active'`).
- Add a "From sellers you follow" rail at the top of `Explore` (auth-only, hidden when empty).

### 3. Promoted gigs & seller boosts

- New `gig_promotions` table: `gig_id`, `seller_id`, `daily_budget_cents`, `starts_at`, `ends_at`, `status` (`active`|`paused`|`ended`), `impressions`, `clicks`, `spend_cents`.
- Seller dashboard: "Promote" action on each active gig → modal sets daily budget + duration. Charges flat $5/day from seller `available_balance` upfront via a new `transactions` row of type `promotion_charge` (added to enum).
- `Search.tsx` + `Explore.tsx`: query promoted gigs first (limit 3, sorted by remaining budget), render with a small "Promoted" pill, then the normal results minus those ids.
- Click + impression counters on the promoted slot bump `gig_promotions` counters via a `track_promotion_event` RPC.

### 4. Trust & safety — KYC + reporting

- New `seller_verifications` table: `seller_id`, `status` (`unverified`|`pending`|`verified`|`rejected`), `id_document_url`, `selfie_url`, `submitted_at`, `reviewed_by`, `reviewed_at`, `rejection_reason`.
- Seller settings → new "Verification" card with a 2-file upload flow into a new private `kyc-documents` bucket. Status badge on `SellerProfile` ("Verified seller" pill) when `verified`.
- New `reports` table: `reporter_id`, `target_type` (`gig`|`user`|`message`), `target_id`, `reason` (enum), `description`, `status` (`open`|`reviewing`|`actioned`|`dismissed`).
- "Report" item in the `…` menu on `GigDetail`, `SellerProfile`, and each inbox message bubble. Submits to `reports`.
- Admin panel gains "Verification queue" and "Reports" tabs with approve/reject and take-action flows (hide gig, suspend seller via a new `profiles.suspended_at` column — suspended sellers' gigs are hidden by extending `gigs_public_read`).

## Technical details

### New tables / columns

- `disputes`: add `resolution_outcome text`, `admin_notes text`.
- `seller_follows(follower_id uuid, seller_id uuid, created_at timestamptz, unique(follower_id, seller_id))`.
- `gig_promotions(... as above)`.
- `seller_verifications(... as above)`.
- `reports(... as above)`.
- `profiles`: add `suspended_at timestamptz`.
- Enum `transaction_type`: add `promotion_charge`.
- Enum `notification_type`: add `system` (used for verification + report status pings) if not already present.

Every new public table gets explicit `GRANT`s (authenticated full CRUD where policies allow, `service_role ALL`, no `anon` grants — all are auth-only) plus RLS:
- `seller_follows`: follower can insert/delete own rows; anyone can read counts via a `seller_follower_count(uuid)` SQL function.
- `gig_promotions`: seller owns rows; public read of `active` rows (for the Promoted rail).
- `seller_verifications`: seller reads/writes own; admin reads all + updates status.
- `reports`: reporter inserts/reads own; admin reads/updates all.

### New SQL functions / triggers

- `track_promotion_event(_promotion_id uuid, _event text)` security-definer — bumps `impressions`/`clicks`.
- `notify_followers_on_new_gig()` trigger on `gigs` (after insert/update where new status='active').
- `suspend_seller(_seller uuid)` admin-only helper that sets `profiles.suspended_at` and flips all seller gigs to `paused`.
- Extend `gigs_public_read` policy: also require `profiles.suspended_at IS NULL`.

### Storage

- New private bucket `kyc-documents` with policies restricting read to the owning seller and admins; writes restricted to owner.

### Edge functions

- `stripe-refund` already exists — reused from the admin dispute action.
- New `promotion-charge` function: validates seller balance, inserts a `transactions` row, activates the `gig_promotions` row. (Lives separately so we can swap in real Stripe later without touching UI.)

### Frontend files

New:
- `src/components/marketplace/OpenDisputeDialog.tsx`
- `src/components/marketplace/SaveGigButton.tsx`
- `src/components/marketplace/FollowSellerButton.tsx`
- `src/components/marketplace/ReportDialog.tsx`
- `src/components/marketplace/PromoteGigDialog.tsx`
- `src/components/marketplace/VerifiedBadge.tsx`
- `src/pages/account/Saved.tsx`
- `src/pages/seller/Verification.tsx`
- `src/pages/admin/sections/DisputesQueue.tsx`
- `src/pages/admin/sections/VerificationsQueue.tsx`
- `src/pages/admin/sections/ReportsQueue.tsx`
- `src/lib/promotions.ts` (impression/click tracking helper)

Edited:
- `src/App.tsx` — routes for `/saved`, `/seller/verification`.
- `src/pages/orders/OrderWorkspace.tsx` — dispute banner + open-dispute entry.
- `src/pages/admin/Admin.tsx` — three new tabs.
- `src/pages/GigDetail.tsx`, `src/pages/SellerProfile.tsx`, `src/components/marketplace/GigCard.tsx` — heart, follow, verified badge, report menu.
- `src/pages/Search.tsx`, `src/pages/Explore.tsx` — promoted rail + follow-feed.
- `src/pages/seller/MyGigs.tsx` — Promote action per gig.
- `src/components/layout/AppShell.tsx` — "Saved" link in buyer nav.

### Out of scope (future)

- Per-impression billing (we use a flat daily charge for now).
- Messaging report auto-redaction.
- Buyer KYC.
- Real document verification provider integration (Stripe Identity / Persona) — current flow stores docs for manual admin review.
