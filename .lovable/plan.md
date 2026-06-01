## Deploy stripe-webhook Edge Function

The `stripe-webhook` function code already exists at `supabase/functions/stripe-webhook/index.ts` and is correctly configured in `supabase/config.toml` with `verify_jwt = false`. It already handles all three required events and verifies signatures via `STRIPE_WEBHOOK_SECRET`.

### Note on URL
The URL you provided (`lquoahkuzqwtiihshdaf.supabase.co`) belongs to a different backend. This Lovable project's backend is `nswgubxabcjyfsgbiicz`, so the deployed webhook URL will be:

```
https://nswgubxabcjyfsgbiicz.supabase.co/functions/v1/stripe-webhook
```

Update your Stripe Dashboard webhook endpoint to this URL.

### Steps
1. Deploy `stripe-webhook` via `supabase--deploy_edge_functions`.
2. Pull recent logs to confirm a clean boot (no startup errors).
3. Confirm `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` are present in runtime secrets.
4. Report the correct production URL and the three configured events (`checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`) so you can register/update the endpoint in Stripe.

No code changes — deploy only.
