

# Remove River Branding from AI Studio — Use Vapi for Voice, Clean Chat AI

## What's Happening Now

"River" is hardcoded everywhere in the AI Studio as the agent name — greetings, system prompts, test call messages, UI labels. The user wants the AI Studio to feel like it's powered directly by Vapi (for voice) and the platform's own AI (for chat), not "River."

River AI should remain as the internal business assistant (floating chat button, dashboard insights, pipeline analysis) but should NOT be the name/brand of the client-facing voice and chat agents.

## Changes

### 1. `VoiceConfig.tsx` — Remove River from voice agent
- Default greeting: change `"This is River"` → `"How can I help you today?"`
- System prompt (`buildSystemPrompt`): change `"You are River, the AI phone assistant"` → `"You are the AI phone assistant for {businessName}"`
- Custom personality placeholder: remove "River" reference
- Knowledge label: `"What River Knows"` → `"Agent Knowledge Base"`

### 2. `VoiceTester.tsx` — Remove River from test UI
- `"Call River now"` → `"Test your voice agent"`
- `"River will call your phone"` → `"Your AI agent will call your phone via Vapi"`
- `"River is calling your phone"` → `"Your agent is calling..."`
- Default preview utterance: remove "River" mention
- Keep Vapi as the call engine (already correct)

### 3. `vapiSync.ts` — Remove River from Vapi assistant names
- Assistant name: `"{businessName} — River AI"` → `"{businessName} — AI Agent"`
- Test call firstMessage: `"test call from River AI"` → `"test call from your AI agent"`

### 4. `ChatConfig.tsx` — Remove River defaults from chat widget
- Default agent name: `"River"` → `"AI Assistant"`
- Default welcome message: remove "River" → use agent name variable
- Default away message: remove "River"
- Knowledge label: `"What River Knows in Chat"` → `"Agent Knowledge Base"`

### 5. `ChatTester.tsx` — Keep using Lovable AI gateway but remove River name
- Default agent name: `"River"` → `"AI Assistant"`
- Default welcome message: remove "River"
- Still uses `riverCall` from `river.ts` service — this is the Lovable AI gateway, which is correct for chat. Just the branding changes.

### 6. `RiverStatusBar.tsx` — Rebrand for AI Studio context
- `"River AI is powering your agents"` → `"AI agents powered by Katexs"`
- Remove Anthropic from the status bar (it's Lovable AI gateway now, not user-facing)
- Keep Vapi and Twilio status indicators

### 7. `river-chat/index.ts` (edge function) — No changes needed
- The system prompt there is for River as the internal business assistant (floating chat, dashboard insights). This is separate from the client-facing agents and should stay as "River."

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ai-studio/VoiceConfig.tsx` | Remove "River" from defaults and system prompt |
| `src/components/ai-studio/VoiceTester.tsx` | Remove "River" from UI labels |
| `src/components/ai-studio/ChatConfig.tsx` | Remove "River" from defaults |
| `src/components/ai-studio/ChatTester.tsx` | Remove "River" from defaults |
| `src/components/ai-studio/RiverStatusBar.tsx` | Rebrand status bar |
| `src/services/vapiSync.ts` | Remove "River AI" from assistant names and test messages |

