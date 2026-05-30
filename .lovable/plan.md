# Fix River Ops "Method Not Allowed"

Scope: only the River Ops chat call site and the `river-ops-chat` edge function. Nothing else changes.

## 1. Frontend — `src/pages/admin/RiverOps.tsx`

Replace the `supabase.functions.invoke("river-ops-chat", …)` call inside `sendMessages` with an explicit `fetch` POST that matches the required shape.

- Read the Supabase URL and anon key from existing env: `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.
- Use the current user's access token if available (via `supabase.auth.getSession()`) for the `Authorization` header; fall back to the anon key — the edge function requires an Authorization header and admin role.
- Body: `{ messages, daily_briefing }` (preserving today's `daily_briefing` flag — only that field name is added next to `messages`, matching the existing server contract).
- Parse JSON, handle non-2xx by surfacing `data.error`.

The call will look exactly like:

```ts
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-ops-chat`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: next.map(m => ({ role: m.role, content: m.content })),
      daily_briefing: dailyBriefing,
    }),
  }
);
const data = await response.json();
if (!response.ok) throw new Error(data?.error || 'request failed');
```

No other logic in `RiverOps.tsx` changes.

## 2. Edge function — `supabase/functions/river-ops-chat/index.ts`

At the top of `Deno.serve`, add strict method gating:

- `OPTIONS` → return `new Response(null, { status: 200, headers: corsHeaders })` immediately.
- Any method other than `POST` → return `new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'POST, OPTIONS' } })` before any auth or Anthropic work.
- `POST` → continues into the existing auth check + Anthropic call (unchanged).

No other edge-function logic changes (auth, context gathering, Anthropic request body, response shape all stay the same).

## Out of scope

- No changes to other pages, components, routes, styles, DB, or other edge functions.
- No change to the system prompt, context gathering, or response format.
