# Ready-for-First-Test Hardening

Close the remaining Fiverr-parity gaps and prep the app for a real end-to-end test run.

## 1. Stripe Connect Express (automated payouts)
- New edge functions `stripe-connect-onboard` and `stripe-connect-refresh`: create/fetch Express account, return onboarding link, sync `charges_enabled` / `payouts_enabled` / `onboarding_complete` into `seller_accounts`
- Extend `stripe-webhook` to handle `account.updated` and `payout.*` events
- New `request-payout` edge function: validate `available_balance` ≥ amount, create Stripe Transfer to connected account, write `withdrawals` row as `processing`
- Seller Earnings page: replace manual withdrawal UI with "Connect bank" (when not onboarded) → "Withdraw" (when ready); show payout status

## 2. SEO pass
- Install `react-helmet-async`, wrap app in `<HelmetProvider>`
- Per-route `<Helmet>` on Landing, Search, GigDetail, SellerProfile (title, description, canonical, og:*)
- JSON-LD: Organization on Landing, Product on GigDetail (price, rating, seller), BreadcrumbList on category
- Clean `index.html` sitewide tags (remove duplicate canonical)

## 3. Seller Analytics charts
- New `/seller/analytics` page with Recharts: orders trend (30d line), earnings trend (30d bar), funnel (impressions→clicks→orders), top gigs table
- Link from Seller Dashboard

## 4. Multi-step gig wizard
- Refactor `GigEditor` into 5 steps: Overview → Pricing (3 packages + extras) → Description & FAQ → Requirements → Gallery & Publish
- Step nav with validation per step, draft autosave

## 5. Smoke-test prep
- Seed 1 buyer + 1 seller account with master credentials documented
- Seed 3 sample gigs across categories with packages, extras, requirements
- Verify cron jobs run, realtime channels connect, email templates send (Resend)
- Manual walk: signup → publish gig → admin approve → checkout → requirements → deliver → review → withdraw

## Explicitly out of scope
- Real KYC automation, video calls, multi-currency, native mobile

## Technical notes
- Stripe Connect needs `STRIPE_SECRET_KEY` (already set) plus `STRIPE_WEBHOOK_SECRET` (already set); no new secrets required
- Recharts already in dependency tree
- Helmet is the only new dep
- All work is additive; no destructive migrations

After build I'll run the smoke walk in the browser and report any defects before you start your test.
