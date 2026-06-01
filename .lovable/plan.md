# Fix signup UX (keep current Lovable Cloud backend)

## Context

- Backend connection is healthy. Auth logs confirm signups are reaching the server and creating users in `auth.users` with `user_confirmation_requested`. Users only appear in the `profiles` table after they click the verification link (the `handle_new_user` trigger runs on confirm).
- The URL `lquoahkuzqwtiihshdaf.supabase.co` belongs to a different project — swapping to it would break this app's entire database. Not touching `src/integrations/supabase/client.ts` or `.env` (both auto-managed).

## Changes (only `src/pages/auth/Signup.tsx`)

1. **Set explicit redirect**: change `emailRedirectTo` from `` `${window.location.origin}/auth/callback` `` to `'https://katexs.com/services'`.
2. **Inline red error**: replace the `toast.error(error.message)` with a persistent red error block rendered below the form, showing the exact `error.message` text. Keep the toast as well (non-blocking).
3. **Success screen**: on successful signup, instead of `nav("/login")`, swap the form for a centered success card reading:
   > Check your email at **{email}** — click the link to verify your account.
   Include a small "Back to sign in" link.
4. Keep all existing styling, fields, Google button, role toggle, username check, and validation untouched.

## Out of scope

- No changes to `Login.tsx`, `AuthCallback.tsx`, the Supabase client, `.env`, or any other page.
- No color/font/layout changes.
