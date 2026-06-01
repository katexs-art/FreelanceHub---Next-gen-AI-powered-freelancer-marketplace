## Fix stripe-webhook Edge Function

Audit of `supabase/functions/stripe-webhook/index.ts` against the four requirements:

| # | Requirement | Current state |
|---|---|---|
| 1 | Read `STRIPE_WEBHOOK_SECRET` via `Deno.env.get` | Already correct |
| 2 | Use `Stripe.createSubtleCryptoProvider()` + `constructEventAsync()` | Uses `constructEventAsync()` but does **not** pass an explicit `SubtleCryptoProvider` |
| 3 | `verify_jwt = false` in `supabase/config.toml` | Already correct |
| 4 | Read body as raw text via `req.text()` | Already correct |

Only item 2 needs a code change. The rest already comply.

### Change

In `supabase/functions/stripe-webhook/index.ts`:

1. Instantiate the crypto provider once at module scope:
   ```ts
   const cryptoProvider = Stripe.createSubtleCryptoProvider();
   ```
2. Pass it as the 4th argument to `constructEventAsync`:
   ```ts
   event = await stripe.webhooks.constructEventAsync(
     body, sig, webhookSecret, undefined, cryptoProvider
   );
   ```

This makes signature verification work reliably in Deno (Web Crypto) instead of relying on Stripe's auto-detection.

### Deploy

After the edit, redeploy via `supabase--deploy_edge_functions` for `stripe-webhook` and tail logs to confirm a clean boot.

No other files, no schema changes, no business-logic changes.
