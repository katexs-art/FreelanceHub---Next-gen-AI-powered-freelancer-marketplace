const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function listVoices() {
  if (!ELEVENLABS_API_KEY) {
    return jsonResponse({ error: "ElevenLabs not configured" }, 503);
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });

  if (!res.ok) {
    return jsonResponse({ error: "ElevenLabs API error" }, res.status);
  }

  const data = await res.json();
  const voices = (data.voices || []).map((v: any) => ({
    id: v.voice_id,
    name: v.name,
    accent: v.labels?.accent ?? null,
    gender: v.labels?.gender ?? null,
    age: v.labels?.age ?? null,
    description: v.labels?.description ?? null,
    category: v.category ?? null,
    preview_url: v.preview_url ?? null,
  }));

  return jsonResponse({ voices, count: voices.length });
}

async function previewVoice(req: Request) {
  if (!ELEVENLABS_API_KEY) {
    return jsonResponse({ error: "ElevenLabs not configured" }, 503);
  }

  const { voice_id, text } = await req.json();
  if (!voice_id) {
    return jsonResponse({ error: "voice_id is required" }, 400);
  }

  const previewText =
    text || "Hello! I am your AI assistant. How can I help you today?";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: previewText,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    }
  );

  if (!res.ok) {
    return jsonResponse({ error: "TTS generation failed" }, res.status);
  }

  const audioBuffer = await res.arrayBuffer();
  return new Response(audioBuffer, {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json().catch(() => ({ action: "list" }));

    if (action === "preview") {
      const fakeReq = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify(params),
      });
      return await previewVoice(fakeReq);
    }

    return await listVoices();
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
});
