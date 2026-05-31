# Sitewide Contrast & Readability Fix

Goal: enforce the contrast rules across every page and component. Colors only — no layout, spacing, sizing, image, routing, or logic changes.

## Approach

Two layers of work:

1. **Token + global CSS layer** (`src/index.css`, `tailwind.config.ts`) — establish the canonical color values so anything using semantic tokens picks them up automatically.
2. **Per-file sweep** — fix the many components/pages that use hardcoded hex values (the codebase has lots of inline styles like `color: "#666"`, `#999`, `#bbb`, `#444` on both dark and light surfaces).

## Color contract (applied everywhere)

**On dark surfaces** (`#000`, `#0a0a0a`, `#111`, `#1a1a1a`, `#222`, `#2a2a2a`):
- Primary text → `#ffffff`
- Secondary text → `#aaaaaa` (never darker than `#888`)
- Tertiary text → `#666666` minimum
- Skill/tag pills → bg `#2a2a2a`, border `#3a3a3a`, text `#cccccc`
- Primary button → bg `#ffffff`, text `#000000`
- Secondary button → transparent bg, border `#555555`, text `#ffffff`

**On light surfaces** (`#fff`, `#fafafa`, `#f8f8f8`, `#f5f5f5`):
- Primary text → `#000000`
- Secondary text → `#444444`
- Tertiary text → `#888888` (no lighter than this for readable text)

## Files to update

### Tokens / global
- `src/index.css` — bump `--foreground-muted` and `--foreground-subtle` to meet `#444`/`#888` on light; add `.text-on-dark-*` utilities for components rendered on dark surfaces (primary/secondary/tertiary).
- `tailwind.config.ts` — no structural changes; verify token names.

### Auth
- `src/components/auth/AuthLayout.tsx`, `KxAuthControls.tsx`
- `src/pages/auth/Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
  - Labels `#444`, placeholders `#bbb`, input text `#000`, headings `#000`, subtext `#888`.

### Marketing / public
- `src/pages/Landing.tsx` — Play cards, River top-15 dark cards, footer, hero subtext, "FROM" labels, review counts, category sections.
- `src/pages/Services.tsx` — dark expert cards (name `#fff`, specialty `#aaa`, tags `#ccc/#2a2a2a/#3a3a3a`, price `#fff/700`, River score `#fff`), section headings/subheadings, category cards.
- `src/pages/Browse.tsx` — light expert cards (`#000` primary, `#444` secondary, `#888` tertiary), dark River top section.
- `src/pages/HowItWorks.tsx` — step numbers `#f0f0f0`, titles `#fff`, descriptions `#aaa`, example pills `#ccc on #252525`.
- `src/pages/Explore.tsx`, `Search.tsx`, `CategoryPage.tsx`, `GigDetail.tsx`, `SellerProfile.tsx`, `SellerIntelligenceProfile.tsx`, `Pitch.tsx`, `Projects.tsx`, `PostJob.tsx`, `BecomeSeller.tsx`.

### Layout / nav
- `src/components/layout/SiteHeader.tsx` — light variant links `#333`→hover `#000`, logo `#000`; transparent/dark variant links `#fff` at 0.8 opacity→1 on hover, logo `#fff`.
- `src/components/layout/SiteFooter.tsx` — secondary text `#aaa` on dark, tertiary `#666`.
- `src/components/layout/CategoryMegaNav.tsx`, `CategoryBar.tsx` — category names `#333`, hover `#000`, active `#000/500`.
- `src/components/layout/AppShell.tsx`, `NotificationBell.tsx`, `RoleSwitcher.tsx`, `RiverWidget.tsx`, `TestModeBanner.tsx`.

### Marketplace components
- `GigCard.tsx`, `CustomOfferCard.tsx`, `CustomOfferComposer.tsx`, `SellerLevelBadge.tsx`, `VerifiedBadge.tsx`, `ReviewsList.tsx`, `RatingBreakdown.tsx`, `ProfileReviewsSection.tsx`, `LeaveReview.tsx`, `RecentlyViewed.tsx`, `SaveGigButton.tsx`, `FollowSellerButton.tsx`, `PromoteGigDialog.tsx`, `ReportDialog.tsx`, `OrderTimeline.tsx`, `OrderResolutionActions.tsx`, `PayoutMethodCard.tsx`, `StripeConnectCard.tsx`.

### Dashboards
- `src/pages/buyer/BuyerDashboard.tsx`
- `src/pages/seller/SellerDashboard.tsx`, `MyGigs.tsx`, `Earnings.tsx`, `GigEditor.tsx`, `SellerAnalytics.tsx`, `Verification.tsx`, `SellerOnboarding.tsx`
- `src/pages/orders/*` (OrdersList, OrderWorkspace, CheckoutSuccess, LeaveReviewPage)
- `src/pages/account/*` (Settings, Saved, NotificationPreferences)
- `src/pages/Inbox.tsx` — message text, timestamps, sender names.
- `src/pages/Checkout.tsx`, `PlaceBid.tsx`, `ProjectBids.tsx`, `DashboardPlaceholder.tsx`, `Placeholder.tsx`, `NotFound.tsx`.

### Admin
- `src/pages/admin/Admin.tsx`, `AdminLogin.tsx`, `RiverOps.tsx`, `TestMode.tsx`
- `src/pages/admin/sections/*` (ReportsQueue, SellerApprovalsQueue, VerificationsQueue)
- Verify every `.admin-status-*` badge in `index.css` passes contrast (current values already meet WCAG AA — keep as-is, just confirm).

### UI primitives (component library)
- `src/components/ui/badge.tsx` — variants currently rely on `text-foreground`/`text-foreground-muted`; ensure they read correctly on both light card surfaces and dark panel surfaces. Add an explicit `on-dark` style where needed, otherwise rely on parent color override.
- `src/components/ui/alert.tsx`, `tooltip.tsx`, `toast.tsx`, `sonner.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tabs.tsx`, `popover.tsx`, `command.tsx`, `sheet.tsx`, `drawer.tsx`, `modal.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `table.tsx`, `pagination.tsx`, `breadcrumb.tsx`, `hover-card.tsx`, `menubar.tsx`, `context-menu.tsx`, `navigation-menu.tsx` — sweep for any hardcoded muted greys lighter than `#888` on light or darker than `#aaa` on dark.

## Mechanics

For each file:
1. Read it.
2. Find every hardcoded color literal (`#xxx`, `rgba(255,255,255,0.x)` text usage) and every `text-foreground-muted/subtle` usage that sits on a known dark/light surface.
3. Replace with the contract value above.
4. Skip purely decorative borders, dividers, shadows, and icon strokes that aren't text.

No changes to:
- JSX structure, classNames affecting layout, spacing, sizing
- Images, icons (only color of icon when it's a text-companion meta icon)
- Routing, data fetching, state, handlers
- Token *names*, only token *values*
- `GigCard.tsx` structure (only color values inside it)

## Verification

After edits, spot-check in the preview at: `/`, `/services`, `/services?category=mobile-app-development`, `/browse`, `/explore`, `/how-it-works`, `/login`, `/signup`, `/buyer/dashboard`, `/seller/dashboard`, `/inbox`, `/orders`, `/admin`. Confirm no remaining `#666`/`#999`/`#bbb` body text on white, and no `#444`/`#555` body text on dark.
