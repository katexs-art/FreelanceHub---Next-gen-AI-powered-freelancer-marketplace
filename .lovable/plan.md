## Diagnosis

The function code is correct:
- Raw body via `req.text()` ✓
- `constructEventAsync` with `SubtleCryptoProvider` ✓
- Reads `STRIPE_WEBHOOK_SECRET` ✓
- `verify_jwt = false` ✓

Stripe itself is rejecting with `invalid signature`, which means **the `STRIPE_WEBHOOK_SECRET` stored in Lovable Cloud does not match the signing secret of the endpoint Stripe is calling.**

Two clues from your screenshot confirm this:

1. You have **two webhook endpoints** registered in Stripe:
   - `https://lquoahkuzqwtiihshdaf.supabase.co/...` → 404 (old/dead project)
   - `https://nswgubxabcjyfsgbiicz.supabase.co/...` → 400 invalid signature (current project)
   Each Stripe endpoint has its **own** signing secret (`whsec_...`). The secret currently stored in Lovable was almost certainly copied from the old endpoint (or a different one), so the new endpoint's signatures never verify.

2. The failing event is `account.updated` from a Connect account (`acct_1RdZfwG3VPLjdDVY`, `livemode: true`). That means this is a **Connect** webhook (created under "Connect applications" in Stripe), which has a *separate* signing secret from your normal account webhooks. If you copied a non-Connect `whsec_...`, every Connect event will fail signature verification.

## Fix (no code changes needed)

### Step 1 — Clean up the dead endpoint in Stripe
In Stripe Dashboard → Developers → Webhooks, **delete** the endpoint pointing to `lquoahkuzqwtiihshdaf.supabase.co`. That's an old project and is the source of the 404s.

### Step 2 — Grab the correct signing secret
In Stripe Dashboard, open the endpoint pointing to:

```
https://nswgubxabcjyfsgbiicz.supabase.co/functions/v1/stripe-webhook
```

Click **"Reveal" / "Signing secret"** → copy the value (starts with `whsec_`).

Important: if this endpoint is registered under **Connect → Webhooks** (because it receives events like `account.updated`), use that endpoint's signing secret — not the one from a standard account-level endpoint.

### Step 3 — Update the secret in Lovable Cloud
I'll call `update_secret` for `STRIPE_WEBHOOK_SECRET` so you can paste the fresh `whsec_...` into a secure form. No new code, no redeploy needed — the edge function reads the env var on each invocation.

### Step 4 — Verify
- In Stripe, click **"Resend"** on one of the failed 400 events.
- Expected: `200 OK` in Stripe and a clean `received: true` log on our side.
- I'll tail `stripe-webhook` logs to confirm.

## Optional follow-up

If you actually want **both** standard *and* Connect events flowing into this same function, Stripe gives you two different `whsec_` values (one per endpoint). The function can only verify against one secret at a time. Options:
- (A) Keep only the Connect endpoint (recommended if you only need Connect events like `account.updated`, `payout.*`, etc.).
- (B) Register the function URL twice — once as a standard endpoint, once as a Connect endpoint — and I'll update the function to accept either secret (`STRIPE_WEBHOOK_SECRET` + `STRIPE_CONNECT_WEBHOOK_SECRET`, try each in turn).

Tell me which one applies and I'll wire it up after you paste the secret.
