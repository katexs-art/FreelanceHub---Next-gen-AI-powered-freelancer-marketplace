## Heads up about the dashboard

You're checking **supabase.com directly**. The functions don't live in any Supabase account you log into — this app runs on **Lovable Cloud**, which provisions its own internal Supabase project. That's why it looks empty there. The functions are deployed; they just live in a project you can't see from supabase.com.

To view them, open **Lovable Cloud → Backend → Edge Functions** from inside the project, not supabase.com.

That said, I'll still force a redeploy of every function to confirm they're all live and healthy.

## What I'll do

1. **Redeploy all 20 existing edge functions** in one batch:
   - `ai-search`, `stripe-payment-intent`, `stripe-webhook`, `stripe-checkout`, `stripe-refund`, `stripe-payout`, `stripe-instant-payout`, `stripe-auto-transfer`, `stripe-connect-onboard`, `stripe-connect-status`, `payout-method-save`, `order-reminders`, `announcement-send`, `auth-email-hook`, `process-email-queue`, `send-marketplace-email`, `river-chat`, `river-ops-chat`, `river-public-match`, `system-health`

2. **Verify `verify_jwt = false`** for `stripe-webhook` and `ai-search` in `supabase/config.toml` (Lovable defaults to false, but I'll confirm both are explicitly set so webhooks and public search work without an auth header).

3. **Verify required secrets are present**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`. If any are missing I'll ask you to add them via the secret prompt — I won't deploy a function that depends on a missing secret without flagging it first.

4. **Confirm deployment** by listing logs / hitting a health endpoint on a couple of the critical functions (`stripe-payment-intent`, `stripe-webhook`).

## What I will NOT do

- Create new edge functions for `complete-order`, `clear-funds`, `auto-complete`, `create-payout`, `resolve-dispute`. These already exist as Postgres functions (`approve_delivery`, `clear_due_seller_credits`, `auto_complete_orders`, etc.) invoked via RPC or cron — wrapping them in edge functions would be duplicate code with no benefit. If you specifically want HTTP-callable wrappers, tell me and I'll add them in a follow-up.
- Touch `create-payment-intent` — the equivalent is `stripe-payment-intent`, which is already deployed and was fixed earlier today.
