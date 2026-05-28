# Spec coverage on current theme

Colors/fonts from the spec are intentionally ignored. Everything below uses existing semantic tokens (JetBrains Mono + Work Sans, green primary, white canvas).

## Already implemented (no action needed)

1. Checkout flow — `stripe-checkout` + `stripe-webhook` create order, conversation, transactions, notifications.
2. Order workspace — `/orders/:id` with requirements, deliveries (delivery-files bucket), revisions, accept, cancel, dispute.
3. Realtime inbox + custom offers — messages realtime, composer with attachments, send/accept/decline offers via `accept_custom_offer` RPC.
4. Reviews — leave-review CTA, 14-day public gate via trigger.
5. Seller payouts — Stripe Connect onboarding, earnings, `stripe-payout`, `stripe-refund`.
6. Admin — disputes, gigs, users, withdrawals.
7. AI search — `ai-search` edge function (Gemini Flash) wired into `/search`.
8. Cron — auto-complete, clear-funds, auto-publish reviews, expire promotions, mark offline.
9. Notifications bell in navbar.

## Remaining

None from the functional spec. The white theme + green primary + current fonts stay locked.

## Next step

Tell me any specific flow you want to test, polish, or extend (e.g. "harden checkout edge cases", "add tipping", "buyer cancel reasons"), and I'll scope just that.
