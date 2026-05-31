## Global Contrast & Dark Card Fix

Single sweep across the entire site. Colors only — no layout, spacing, image, routing, or functionality changes.

### 1. Canonical Dark Card Spec (Play / Gig / Service / Expert cards)

Apply to every card with a dark background on Landing, Services, Browse (dark variants), Explore, Search, CategoryPage, SellerProfile, SellerIntelligenceProfile, RecentlyViewed, Saved, dashboards, and any modal/drawer using dark surfaces.

- Card: `bg-[#1a1a1a]` · `border border-[#333]` · `rounded-2xl` (16px)
- Body wrapper under image: `bg-[#1a1a1a]` · `p-[14px]`
- Avatar: 32px circle (unchanged size)
- Expert name: `#ffffff` · 13px · weight 500 · tracking 0.04em
- Title / description: `#dddddd` · 14px · leading 1.5 · weight 400 (never darker than `#aaa`)
- Star icon + rating number: `#f59e0b` (rating weight 600)
- Review count: `#888888`
- "FROM" label: `#777777` · 10px · uppercase · tracking 0.08em
- Price: `#ffffff` · 18px · weight 700
- Bookmark button: icon `#ffffff` · bg `rgba(0,0,0,0.5)` · border `1px solid rgba(255,255,255,0.2)`

### 2. Global Text Contrast Rules

**On dark backgrounds (`#000`–`#222`):**
- Headings: `#ffffff` weight 600
- Body: `#cccccc` min
- Labels: `#888888` min
- Sublabels: `#666666` min
- Floor for any visible body text: `#aaaaaa`

**On white / very light backgrounds:**
- Headings: `#000000`
- Body: `#444444`
- Meta: `#777777`
- Never `#999` or lighter for body

### 3. Files Touched (colors-only sweep)

- **Cards / marketplace:** `src/pages/Landing.tsx`, `src/pages/Services.tsx`, `src/pages/Browse.tsx`, `src/pages/Explore.tsx`, `src/pages/Search.tsx`, `src/pages/CategoryPage.tsx`, `src/pages/SellerProfile.tsx`, `src/pages/SellerIntelligenceProfile.tsx`, `src/pages/GigDetail.tsx`, `src/components/marketplace/GigCard.tsx`, `src/components/marketplace/CustomOfferCard.tsx`, `src/components/marketplace/RecentlyViewed.tsx`, `src/components/marketplace/SaveGigButton.tsx`, `src/components/marketplace/SellerLevelBadge.tsx`, `src/components/marketplace/VerifiedBadge.tsx`
- **Layout / nav:** `SiteHeader.tsx`, `SiteFooter.tsx`, `CategoryMegaNav.tsx`, `CategoryBar.tsx`, `AppShell.tsx`, `NotificationBell.tsx`, `TestModeBanner.tsx`, `RiverWidget.tsx`
- **Marketing:** `HowItWorks.tsx`, `Pitch.tsx`, `BecomeSeller.tsx`, `Projects.tsx`, `PostJob.tsx`
- **Auth:** `AuthLayout.tsx`, `KxAuthControls.tsx`, `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
- **Dashboards / orders / inbox:** `BuyerDashboard.tsx`, `SellerDashboard.tsx`, `MyGigs.tsx`, `Earnings.tsx`, `GigEditor.tsx`, `SellerAnalytics.tsx`, `Verification.tsx`, `SellerOnboarding.tsx`, `OrdersList.tsx`, `OrderWorkspace.tsx`, `CheckoutSuccess.tsx`, `LeaveReviewPage.tsx`, `Settings.tsx`, `Saved.tsx`, `NotificationPreferences.tsx`, `Inbox.tsx`, `Checkout.tsx`, `PlaceBid.tsx`, `ProjectBids.tsx`, `DashboardPlaceholder.tsx`, `Placeholder.tsx`, `NotFound.tsx`
- **Admin:** `Admin.tsx`, `AdminLogin.tsx`, `RiverOps.tsx`, `TestMode.tsx`, `admin/sections/*`
- **UI primitives:** `badge.tsx`, `alert.tsx`, `tooltip.tsx`, `toast.tsx`, `sonner.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tabs.tsx`, `popover.tsx`, `command.tsx`, `sheet.tsx`, `drawer.tsx`, `modal.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `table.tsx`, `pagination.tsx`, `breadcrumb.tsx`, `hover-card.tsx`, `menubar.tsx`, `context-menu.tsx`, `navigation-menu.tsx`

### 4. Method

For each file:
1. Identify surface (dark vs light) by container bg.
2. Replace any hardcoded greys below the floor (`#333`–`#7f7f7f` text on dark, `#999`+ on white) with the canonical values above.
3. Remove `opacity-*` / `text-white/60` style fades on dark surfaces that drop text below `#aaa` equivalent.
4. Standardize dark cards to the spec in §1.

### 5. Out of Scope

No changes to: JSX structure, sizing, spacing, images, icons, routing, data, handlers, design tokens in `index.css` / `tailwind.config.ts`, or any non-color CSS.

### 6. Verification

Spot-check `/`, `/services`, `/services?category=seo-strategy`, `/browse` (redirects), `/explore`, `/how-it-works`, `/login`, `/signup`, `/buyer/dashboard`, `/seller/dashboard`, `/inbox`, `/orders`, `/admin` — confirm every card matches the dark spec and no body text falls below the contrast floor.
