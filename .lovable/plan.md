
## Heads up — the proposed fix won't resolve this error

I want to flag this before changing code, because applying the suggested edit will not fix the problem and will introduce a different bug.

### What the error actually is

The browser shows `Error: forbidden`. That string comes from **line 76** of `supabase/functions/river-ops-chat/index.ts`:

```ts
const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
if (prof?.role !== "admin")
  return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, ... });
```

It is a **403 from our own admin-role guard**, returned *before* the function ever calls Anthropic. The Anthropic API key is not involved in this code path.

Evidence:
- `ANTHROPIC_API_KEY` is already configured (visible in the project secrets list).
- Edge-function logs for `river-ops-chat` show only `booted`/`shutdown` — no Anthropic errors, no 5xx.
- `profiles` shows the signed-in user `katexs@katexs.com` currently has `role = 'admin'`, but the React app uses a stale `useAuth` profile snapshot from before the most recent role promotion migration. The browser session was loaded before the promotion took effect, so locally the route renders but the edge function (re-checking the DB via service role) sees… actually the DB row is admin. So the most likely remaining cause is the **JWT itself is stale** (issued before the role-change/session refresh) OR the user is signed in as a different account in this preview tab than the one we promoted.

### Why the suggested edit is wrong here

1. `ANTHROPIC_API_KEY` is already set — the new `if (!anthropicApiKey)` branch would never trigger.
2. The replacement fetch removes the existing `ctxBlock` (live platform data) from the `system` prompt, drops `max_tokens` from 1200 → 1000, and hardcodes an old model (`claude-sonnet-4-20250514`) instead of the current `claude-sonnet-4-6`. That's a regression with no upside.
3. It changes nothing about the 403 path that is actually firing.
4. There is no separate "Edge Function Secrets vs Vault" split in Lovable Cloud — secrets shown in the project are already injected into every edge function's `Deno.env`.

### What I recommend instead (one of these, your call)

- **A. Verify the signed-in account.** Open DevTools → Application → Local Storage → copy the `sb-…-auth-token` `user.email`. Confirm it is `katexs@katexs.com`. If it is a different demo account, sign out and sign back in as the admin.
- **B. Force-refresh the session** so the JWT is reissued: sign out, hard-reload, sign back in, then retry River Ops.
- **C. If A and B don't resolve it,** add one diagnostic line to the edge function (temporary) that logs `userId` and `prof?.role` when the 403 returns, redeploy, and re-test — that will pinpoint whether it's a wrong user, missing profile row, or stale token.

I will not apply the dictated edit because it would silently break River Ops' live-context briefings without fixing the 403. If you still want it applied verbatim after reading this, say "apply it anyway" and I will.
