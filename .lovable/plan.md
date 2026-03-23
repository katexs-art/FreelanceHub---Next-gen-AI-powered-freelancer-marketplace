

# Fix: Route Vapi Calls Through Backend (CORS Fix)

## The Problem

`VoiceTester.tsx` and `vapiSync.ts` call `https://api.vapi.ai/*` directly from the browser. Vapi's API does not set `Access-Control-Allow-Origin` headers, so browsers block these requests. The calls silently fail.

## The Fix

Route ALL Vapi API calls through the existing `vapi-manage` edge function. The browser calls your backend, your backend calls Vapi — no CORS issues.

```text
Browser → vapi-manage edge function → api.vapi.ai
```

## Changes

### 1. Update `supabase/functions/vapi-manage/index.ts`
Add these actions (some may already exist, verify and add missing ones):
- `make-call` — POST to Vapi `/call` with assistantId, phoneNumberId, customer
- `get-call-status` — GET from Vapi `/call/{callId}`
- `full-sync` — fetch assistants, phone numbers, calls, analytics from Vapi and return them
- `create-assistant` — POST to Vapi `/assistant`
- `update-assistant` — PATCH to Vapi `/assistant/{id}`

Each action receives the user's Vapi API key from the request body (fetched from `integration_settings` on the client) OR the edge function reads it from `integration_settings` using the service role key (more secure — avoids sending API key to frontend).

**Preferred approach**: Edge function reads the Vapi key from `integration_settings` using the authenticated user's ID. The frontend never touches the raw API key.

### 2. Update `src/services/vapiSync.ts`
Replace all `fetch("https://api.vapi.ai/...")` calls with `supabase.functions.invoke("vapi-manage", { body: { action, params } })`. Remove `vapiKey` parameter from all exported functions since the edge function handles it.

Functions to update:
- `makeVapiCall()` → invoke `vapi-manage` with `action: "make-call"`
- `getVapiCallStatus()` → invoke `vapi-manage` with `action: "get-call-status"`
- `fullVapiSync()` → invoke `vapi-manage` with `action: "full-sync"`
- `createVapiAssistant()` → invoke `vapi-manage` with `action: "create-assistant"`
- `updateVapiAssistant()` → invoke `vapi-manage` with `action: "update-assistant"`
- `syncVapiCalls()` → invoke `vapi-manage` with `action: "sync-calls"`
- `validateVapiKey()` → invoke `vapi-manage` with `action: "validate-key"`

### 3. Update `src/components/ai-studio/VoiceTester.tsx`
- Remove `vapiKey` from the call flow
- `handleCall` calls updated `makeVapiCall(assistantId, phoneNumberId, phone, name)` — no key param
- `startPollingCallStatus` calls updated `getVapiCallStatus(callId)` — no key param
- `syncCallToSupabase` calls updated version — no key param

### 4. Update `src/components/ai-studio/VoiceConfig.tsx`
- Remove Vapi key fetch from save logic
- Call updated `createVapiAssistant(config, userId)` and `updateVapiAssistant(vapiId, config, userId)` — no key param

### 5. Update `src/pages/Integrations.tsx`
- Sync button calls updated `fullVapiSync(userId, onProgress)` — no key param

## Edge Function Design (`vapi-manage`)

```typescript
// Pseudocode for the edge function
const user = await getAuthenticatedUser(req);
const { data: integration } = await supabase
  .from("integration_settings")
  .select("api_key")
  .eq("user_id", user.id)
  .eq("integration_name", "vapi")
  .eq("status", "connected")
  .single();

if (!integration?.api_key) return error("Connect Vapi first");

const vapiKey = integration.api_key;
// Now use vapiKey to call Vapi API server-side — no CORS
```

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/vapi-manage/index.ts` | Add all Vapi proxy actions, read key from DB |
| `src/services/vapiSync.ts` | Replace direct Vapi calls with edge function invocations |
| `src/components/ai-studio/VoiceTester.tsx` | Remove vapiKey handling, use updated service |
| `src/components/ai-studio/VoiceConfig.tsx` | Remove vapiKey handling, use updated service |
| `src/pages/Integrations.tsx` | Remove vapiKey from sync call |

