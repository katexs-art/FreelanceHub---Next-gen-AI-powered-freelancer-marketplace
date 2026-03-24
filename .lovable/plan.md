

# Fix: Preview Greeting Using the Real Vapi Voice

## Problem
The "Preview greeting without a call" button uses `window.speechSynthesis` (browser robot voice), not the actual Vapi assistant voice (e.g., vapi/Tara). Users expect to hear their configured voice.

## Solution
Route the preview through the `vapi-manage` edge function, which will call Vapi's playback/TTS endpoint or — since Vapi doesn't expose a standalone TTS preview API — use the assistant's voice provider directly. Two options:

### Option A: Use ElevenLabs TTS (if voice provider is 11labs)
If the assistant uses ElevenLabs, call the ElevenLabs TTS API through an edge function with the same voice ID configured in Vapi.

### Option B: Use browser SpeechSynthesis but label it clearly (quick fix)
Keep the browser TTS but rename the button to "Preview text (browser voice)" and add a note: "To hear your actual AI voice, use 'Call me now'."

### Recommended: Option A with fallback to B

Since the active assistant's voice provider varies (vapi, openai, 11labs, etc.), the cleanest approach:

1. **Add a `preview-voice` action to `vapi-manage` edge function** that:
   - Reads the active assistant's `raw_config.voice` from `vapi_assistants`
   - If provider is `11labs`: calls ElevenLabs TTS API with the voice ID (requires ElevenLabs API key — which may not be available)
   - If provider is `openai`: calls OpenAI TTS API
   - If provider is `vapi` (Vapi's built-in voices): no standalone TTS API available

2. **Problem**: Vapi doesn't expose a "generate audio sample" endpoint. The voice providers (11labs, OpenAI) each need their own API keys, which users may not have separately from Vapi.

3. **Pragmatic fix**: Update the UI to be honest about what the preview does, and encourage using "Call me now" for real voice testing.

### Changes

| File | Change |
|------|--------|
| `src/components/ai-studio/VoiceTester.tsx` | Update preview section label to "Preview greeting text (browser voice)" and add helper text: "Use 'Call me now' to hear your actual Vapi voice" |

This is a small cosmetic fix. A full voice preview would require separate TTS API keys beyond Vapi, which adds complexity without clear value since "Call me now" already tests the real voice.

