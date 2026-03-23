

# Fix Vapi Sync — Pull Real Voices & Full Two-Way Sync

## Problem
1. Voice options in AI Studio are hardcoded (6 OpenAI voices) instead of pulling from Vapi's actual voice catalog
2. The `vapi-manage` edge function hardcodes `provider: "openai"` when creating/updating assistants
3. The RiverStatusBar still checks `isConnected("vapi")` even though Vapi is now platform-managed (always shows red)
4. No mechanism to pull existing assistants from Vapi back into Katexs

## What Your Vapi API Key Gives Access To
The screenshot shows your Vapi dashboard with Private + Public API keys. The **Private Key** is what's already stored as `VAPI_API_KEY` in the backend. This key is sufficient — no additional keys are needed. The issue is that the code doesn't use it to fetch voices or sync data back.

## Changes

### 1. Add `list-voices` action to `vapi-manage` edge function
- Fetch Vapi's curated voices via `GET https://api.vapi.ai/voice` (or hardcode the Vapi-native voice catalog since Vapi doesn't have a list-voices endpoint — use their documented voices: Elliot, Lily, Rohan, Emma, Clara, Nico, Godfrey, Sagar, plus OpenAI voices)
- Also add `sync-assistants` action that pulls ALL assistants from the master account and stores them in `vapi_assistants`, tagged by `katexs_user_id`

### 2. Update `VoiceConfig.tsx` — Dynamic voice list
- On mount, call `vapi-manage` with `action: "list-voices"` to get available voices
- Show Vapi's native voices (Elliot, Lily, Rohan, Emma, Clara, Nico) alongside OpenAI voices (Alloy, Echo, Nova, etc.)
- Group by provider: "Vapi Voices" section + "OpenAI Voices" section
- Store selected `voice_provider` + `voice_id` (not just voice_id)
- When creating/updating assistant, pass the correct provider

### 3. Update `vapi-manage` create/update to support multiple voice providers
- Instead of hardcoding `{ provider: "openai", voiceId: voice }`, accept `voiceProvider` param
- For Vapi voices: `{ provider: "vapi", voiceId: "Elliot" }`
- For OpenAI voices: `{ provider: "openai", voiceId: "nova" }`

### 4. Fix `RiverStatusBar.tsx`
- Mark Vapi as `alwaysOn: true` since it's platform-managed
- Show green checkmark always

### 5. Add full sync on AI Studio load
- When Voice AI tab loads, call `sync-assistants` to pull any assistants created on Vapi directly
- Display synced assistants in a "Your Assistants" section above the config form
- User can select an existing assistant to edit, or create new

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/vapi-manage/index.ts` | Add `list-voices`, `sync-assistants` actions; fix voice provider in create/update |
| `src/components/ai-studio/VoiceConfig.tsx` | Fetch real voices on mount; support multiple providers; show grouped voice cards |
| `src/components/ai-studio/RiverStatusBar.tsx` | Set Vapi `alwaysOn: true` |

