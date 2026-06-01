## What's actually happening

Two separate issues are killing your verification emails — and both need to be fixed:

### 1. No sender domain is configured

Right now your project has **no email domain set up at all**. Auth emails are falling back to the default low-volume shared sender, which is heavily rate-limited and frequently routed to spam (or dropped entirely by Gmail/Outlook). This is why people sign up successfully but never see an email.

### 2. The auth log shows `user_repeated_signup`

Looking at recent auth logs, both signups you tested (`katexs@katexs.com` and `kdh@katexs.com`) returned `action: user_repeated_signup`. When an email already exists in `auth.users`, Supabase deliberately returns a `200 OK` **without resending the verification email** (anti-enumeration behavior). So the UI shows "Check your email" but no email is sent.

This is invisible to the user — the API doesn't return an error, so the success screen still appears.

## Plan

### Step 1 — Set up the email sender domain

Run the email domain setup dialog so we can send branded verification emails from `notify.katexs.com`. This requires you to add two NS records at your domain registrar (whoever hosts katexs.com DNS). Setup takes a few minutes; DNS verification can take up to a few hours.

### Step 2 — Set up email infrastructure + scaffold the auth email templates

Once the domain is in (status doesn't need to be fully verified yet):
- Provision the email queue, send log, suppression list, and dispatcher cron job
- Scaffold the 6 auth email templates (signup confirmation, magic link, password reset, email change, reauth, invite) — styled to match your light Fiverr-style Katexs branding (white bg, `#0a0a0a` text, `#16A34A` green accent, system font stack, "katexs." logo with green dot)
- Deploy the `auth-email-hook` so Supabase routes auth emails through your branded templates via the queue (with retries + rate-limit handling)

### Step 3 — Handle the "user already exists" case in the UI

In `src/pages/auth/Signup.tsx`, after a successful `signUp` call, inspect the response. When Supabase returns a `user` with an empty `identities` array, that's the silent signal that the email is already registered. Instead of showing the green "Check your email" success screen, render a clearer message:

> "An account with **{email}** already exists. [Sign in] or [Reset your password]."

This stops you (and real users) from waiting forever for an email that was never sent.

### Step 4 — Verify delivery

After DNS verifies and scaffolding is deployed:
- Sign up with a brand-new email address
- Confirm the email arrives from `notify.katexs.com`
- Confirm clicking the link lands on `/services` (already wired up in `AuthCallback.tsx`)
- Query `email_send_log` to confirm `status = sent`

## Technical notes

- No changes to `src/integrations/supabase/client.ts`, `.env`, `Login.tsx`, or `AuthCallback.tsx`.
- Edit limited to `src/pages/auth/Signup.tsx` for the repeated-signup detection (Step 3).
- All email infrastructure is provisioned by the platform tools — no hand-written SQL, no Edge Function code outside what the scaffolders generate.
- Templates will use white email body (#ffffff) per email infrastructure rules, even though the rest matches your brand.

## What I need from you to start

Just hit **Approve** and I'll open the email setup dialog. You'll need access to whoever manages DNS for `katexs.com` to paste in two NS records.
