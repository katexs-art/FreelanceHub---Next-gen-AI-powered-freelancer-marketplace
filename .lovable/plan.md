

# Master Vapi API Architecture — Keep Everything on Katexs

## The Problem

Right now, each client connects their own Vapi API key. This means:
- Clients must create and manage their own Vapi account
- Voice config saved in Katexs does NOT sync back to Vapi (no assistant create/update calls)
- Chat AI runs through River (Lovable AI gateway) but voice still depends on the client's Vapi setup
- Clients see a fragmented experience between two platforms

## The Solution: Single Master Vapi Account

You (as the platform owner) use ONE Vapi API key. All client assistants, phone numbers, and calls run under your master account. Clients never touch Vapi directly.

```text
┌─────────────────────────────────────────────┐
│                  KATEXS                      │
│                                              │
│  Client A ─┐                                 │
│  Client B ──┼─► Katexs Edge Function ─────► VAPI (your master key)
│  Client C ─┘    (vapi-manage)                │
│                                              │
│  Voice config saved in Supabase              │
│  Assistant created/updated via Vapi API      │
│  Phone numbers purchased under your account  │
│  Call costs tracked per-client in Supabase   │
└─────────────────────────────────────────────┘
```

## What Changes

### 1. Remove client-side Vapi API key requirement
- Clients no longer connect their own Vapi key in /integrations
- Vapi becomes a platform-level integration, not a per-client one
- The existing `VAPI_API_KEY` secret (already configured) becomes the master key

### 2. New Edge Function: `vapi-manage`
Server-side function that uses the master `VAPI_API_KEY` to:
- **Create assistant** when client saves voice config in AI Studio
- **Update assistant** when client changes voice/personality/greeting/knowledge
- **Purchase phone numbers** under the master account, tagged to the client
- **Trigger test calls** from the platform
- **Sync call history** for a specific client's assistants

Endpoints:
- `POST /create-assistant` — creates Vapi assistant from client's voice config
- `POST /update-assistant` — patches existing assistant
- `POST /purchase-number` — buys a number, assigns to client's assistant
- `POST /test-call` — initiates outbound test call
- `POST /sync-calls` — pulls recent calls for client's assistants

### 3. Update AI Studio Voice Config save flow
When client clicks "Save voice configuration":
1. Save config to `users.river_config.voice_config` (already works)
2. Call `vapi-manage/create-assistant` or `vapi-manage/update-assistant`
3. Store returned `vapi_assistant_id` in the config
4. Show "Voice agent live" confirmation

### 4. Update AI Studio Phone Panel
- "Get a number" searches available numbers via `vapi-manage`
- Purchase happens server-side under your account
- Number is stored in `vapi_phone_numbers` linked to the client
- Client sees their number but never touches Vapi

### 5. Per-client cost tracking
- Vapi webhook already logs calls with `cost` field
- Add a `client_vapi_balance` or track costs in `vapi_calls` aggregated per user
- You bill clients through their Katexs subscription (Starter/Growth plans already include pricing)
- Optional: add usage limits per plan tier

### 6. Update Integrations page
- Remove Vapi from client-facing integrations (or show it as "Included — powered by Katexs")
- Voice AI is a platform feature, not an integration clients configure
- Keep Twilio as a separate client integration (they bring their own SMS numbers)

### 7. Chat AI stays as-is
- Chat already runs through River (Lovable AI gateway) — no Vapi dependency
- Chat widget uses the `river-chat` edge function with Gemini models
- This is already fully on-platform

## Implementation Steps

1. **Create `vapi-manage` edge function** — CRUD operations against Vapi API using master key
2. **Update `VoiceConfig.tsx`** — on save, call the edge function to create/update Vapi assistant
3. **Update `VoicePhonePanel.tsx`** — purchase numbers through edge function
4. **Update `VoiceTester.tsx`** — trigger test calls through edge function
5. **Update Integrations page** — mark Vapi as platform-managed, remove client API key input
6. **Update `vapi-webhook`** — already works with master key since it matches by assistant ID

## What You Need to Do First

- **Confirm your Vapi account is on a plan that supports sub-accounts or multiple assistants** — the master key approach works on any Vapi plan, but check your limits
- **Top-ups**: Vapi charges per-minute for calls. With a master key, all client call costs come from YOUR Vapi balance. You'll need to either:
  - Mark up the cost in your Katexs subscription pricing (simplest)
  - Or build a prepaid credits system where clients top up within Katexs (more complex, later phase)

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/vapi-manage/index.ts` | Create — all Vapi API operations |
| `src/components/ai-studio/VoiceConfig.tsx` | Modify — call edge function on save |
| `src/components/ai-studio/VoicePhonePanel.tsx` | Modify — purchase via edge function |
| `src/components/ai-studio/VoiceTester.tsx` | Modify — test call via edge function |
| `src/pages/Integrations.tsx` | Modify — remove client Vapi key input, show as included |
| `src/services/vapiSync.ts` | Modify — sync uses master key via edge function |

