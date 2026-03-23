import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_BASE = "https://api.vapi.ai";

function vapiHeaders() {
  const key = Deno.env.get("VAPI_API_KEY");
  if (!key) throw new Error("VAPI_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Full voice catalog — Vapi doesn't have a list-voices endpoint, so we maintain the catalog
const VOICE_CATALOG = [
  // Vapi native voices
  { id: "Elliot", name: "Elliot", provider: "vapi", desc: "Natural & conversational" },
  { id: "Lily", name: "Lily", provider: "vapi", desc: "Warm & articulate" },
  { id: "Rohan", name: "Rohan", provider: "vapi", desc: "Clear & professional" },
  { id: "Emma", name: "Emma", provider: "vapi", desc: "Friendly & approachable" },
  { id: "Clara", name: "Clara", provider: "vapi", desc: "Calm & reassuring" },
  { id: "Nico", name: "Nico", provider: "vapi", desc: "Energetic & upbeat" },
  { id: "Godfrey", name: "Godfrey", provider: "vapi", desc: "Authoritative & deep" },
  { id: "Sagar", name: "Sagar", provider: "vapi", desc: "Warm & confident" },
  // OpenAI voices
  { id: "alloy", name: "Alloy", provider: "openai", desc: "Neutral & professional" },
  { id: "echo", name: "Echo", provider: "openai", desc: "Deep & authoritative" },
  { id: "nova", name: "Nova", provider: "openai", desc: "Warm & friendly" },
  { id: "shimmer", name: "Shimmer", provider: "openai", desc: "Bright & energetic" },
  { id: "fable", name: "Fable", provider: "openai", desc: "Calm & reassuring" },
  { id: "onyx", name: "Onyx", provider: "openai", desc: "Rich & confident" },
  { id: "ash", name: "Ash", provider: "openai", desc: "Soft & gentle" },
  { id: "coral", name: "Coral", provider: "openai", desc: "Clear & expressive" },
  { id: "sage", name: "Sage", provider: "openai", desc: "Wise & measured" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { action, ...params } = await req.json();
    const headers = vapiHeaders();

    let result: unknown;

    switch (action) {
      case "list-voices": {
        result = VOICE_CATALOG;
        break;
      }

      case "sync-assistants": {
        const res = await fetch(`${VAPI_BASE}/assistant`, { headers });
        const all = await res.json();
        if (!res.ok) throw new Error("Failed to fetch assistants from Vapi");

        const userAssistants = (all || []).filter(
          (a: { metadata?: { katexs_user_id?: string } }) =>
            a.metadata?.katexs_user_id === userId
        );

        const serviceClient = getServiceClient();
        for (const a of userAssistants) {
          await serviceClient.from("vapi_assistants").upsert({
            user_id: userId,
            vapi_id: a.id,
            name: a.name,
            voice_provider: a.voice?.provider,
            voice_id: a.voice?.voiceId,
            model: a.model?.model,
            first_message: a.firstMessage,
            system_prompt: a.model?.messages?.[0]?.content,
            created_at_vapi: a.createdAt,
            raw_config: a,
            synced_at: new Date().toISOString(),
            is_active: a.metadata?.is_active !== false,
          }, { onConflict: "vapi_id" });
        }

        result = { synced: userAssistants.length, assistants: userAssistants };
        break;
      }

      case "create-assistant": {
        const { name, firstMessage, voice, voiceProvider, model, systemPrompt, transferNumber } = params;
        const provider = voiceProvider || "openai";
        const voiceId = voice || "nova";

        const body: Record<string, unknown> = {
          name: name || "River AI",
          firstMessage: firstMessage || "Hi, thanks for calling. This is River, how can I help you today?",
          voice: { provider, voiceId },
          model: {
            provider: "openai",
            model: model || "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt || "You are River, a helpful AI phone assistant." }],
          },
          recordingEnabled: params.recordCalls ?? false,
          transcriptionEnabled: params.transcribeCalls ?? true,
          metadata: { katexs_user_id: userId },
        };
        if (transferNumber) body.forwardingPhoneNumber = transferNumber;

        const res = await fetch(`${VAPI_BASE}/assistant`, {
          method: "POST", headers, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create assistant");

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_assistants").upsert({
          user_id: userId, vapi_id: data.id, name: data.name,
          voice_provider: provider, voice_id: voiceId,
          model: data.model?.model, first_message: data.firstMessage,
          system_prompt: systemPrompt, created_at_vapi: data.createdAt,
          raw_config: data, synced_at: new Date().toISOString(), is_active: true,
        }, { onConflict: "vapi_id" });

        await serviceClient.from("vapi_assistants")
          .update({ is_active: false })
          .eq("user_id", userId)
          .neq("vapi_id", data.id);

        result = data;
        break;
      }

      case "update-assistant": {
        const { assistantId, name, firstMessage, voice, voiceProvider, systemPrompt, transferNumber, recordCalls, transcribeCalls } = params;
        if (!assistantId) throw new Error("assistantId required");

        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (firstMessage) body.firstMessage = firstMessage;
        if (voice) body.voice = { provider: voiceProvider || "openai", voiceId: voice };
        if (systemPrompt) {
          body.model = {
            provider: "openai", model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
          };
        }
        if (recordCalls !== undefined) body.recordingEnabled = recordCalls;
        if (transcribeCalls !== undefined) body.transcriptionEnabled = transcribeCalls;
        if (transferNumber) body.forwardingPhoneNumber = transferNumber;

        const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
          method: "PATCH", headers, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update assistant");

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_assistants")
          .update({
            name: data.name, voice_provider: voiceProvider || data.voice?.provider,
            voice_id: voice || data.voice?.voiceId, first_message: data.firstMessage,
            system_prompt: systemPrompt, raw_config: data, synced_at: new Date().toISOString(),
          })
          .eq("vapi_id", assistantId);

        result = data;
        break;
      }

      case "purchase-number": {
        const { areaCode } = params;
        const res = await fetch(`${VAPI_BASE}/phone-number`, {
          method: "POST", headers,
          body: JSON.stringify({
            provider: "twilio", areaCode: areaCode || "602",
            name: `Katexs-${userId.slice(0, 8)}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to purchase number");

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_phone_numbers")
          .update({ is_primary: false }).eq("user_id", userId);

        await serviceClient.from("vapi_phone_numbers").upsert({
          user_id: userId, vapi_id: data.id,
          number: data.number || data.twilioPhoneNumber || data.phoneNumber,
          provider: data.provider || "twilio", area_code: areaCode || "602",
          name: data.name, assistant_id: data.assistantId,
          created_at_vapi: data.createdAt, raw_config: data,
          synced_at: new Date().toISOString(), is_primary: true,
        }, { onConflict: "vapi_id" });

        result = data;
        break;
      }

      case "search-numbers": {
        const { areaCode } = params;
        result = { message: "Numbers are assigned automatically by area code when purchased", areaCode: areaCode || "602" };
        break;
      }

      case "test-call": {
        const { phoneNumber, assistantId } = params;
        if (!phoneNumber) throw new Error("phoneNumber required");

        let asstId = assistantId;
        if (!asstId) {
          const serviceClient = getServiceClient();
          const { data: activeAsst } = await serviceClient
            .from("vapi_assistants").select("vapi_id")
            .eq("user_id", userId).eq("is_active", true).single();
          asstId = activeAsst?.vapi_id;
        }
        if (!asstId) throw new Error("No active assistant. Save your voice config first.");

        const res = await fetch(`${VAPI_BASE}/call/phone`, {
          method: "POST", headers,
          body: JSON.stringify({ assistantId: asstId, customer: { number: phoneNumber } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to initiate call");

        result = data;
        break;
      }

      case "sync-calls": {
        const serviceClient = getServiceClient();
        const { data: assistants } = await serviceClient
          .from("vapi_assistants").select("vapi_id").eq("user_id", userId);

        if (!assistants?.length) { result = { calls: [] }; break; }

        const res = await fetch(`${VAPI_BASE}/call?limit=100`, { headers });
        const allCalls = await res.json();
        if (!res.ok) throw new Error("Failed to fetch calls");

        const assistantIds = new Set(assistants.map((a: { vapi_id: string }) => a.vapi_id));
        const userCalls = (allCalls || []).filter((c: { assistantId?: string }) =>
          c.assistantId && assistantIds.has(c.assistantId)
        );

        if (userCalls.length > 0) {
          await serviceClient.from("vapi_calls").upsert(
            userCalls.map((c: Record<string, unknown>) => ({
              user_id: userId, vapi_id: c.id, assistant_id: c.assistantId,
              phone_number_id: c.phoneNumberId, type: c.type, status: c.status,
              caller_number: (c.customer as Record<string, unknown>)?.number,
              duration_seconds: c.endedAt && c.startedAt
                ? Math.round((new Date(c.endedAt as string).getTime() - new Date(c.startedAt as string).getTime()) / 1000)
                : null,
              ended_reason: c.endedReason,
              transcript: typeof c.transcript === "string" ? c.transcript : JSON.stringify(c.transcript),
              recording_url: c.recordingUrl, summary: c.summary, cost: c.cost,
              started_at: c.startedAt, ended_at: c.endedAt, raw_data: c,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "vapi_id" }
          );
        }

        result = { calls: userCalls.length };
        break;
      }

      case "list-assistants": {
        const res = await fetch(`${VAPI_BASE}/assistant`, { headers });
        const all = await res.json();
        const userAssistants = (all || []).filter(
          (a: { metadata?: { katexs_user_id?: string } }) =>
            a.metadata?.katexs_user_id === userId
        );
        result = userAssistants;
        break;
      }

      case "assign-number": {
        const { phoneNumberId, assistantId: aId } = params;
        if (!phoneNumberId || !aId) throw new Error("phoneNumberId and assistantId required");
        const res = await fetch(`${VAPI_BASE}/phone-number/${phoneNumberId}`, {
          method: "PATCH", headers, body: JSON.stringify({ assistantId: aId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to assign number");

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_phone_numbers")
          .update({ assistant_id: aId, synced_at: new Date().toISOString() })
          .eq("vapi_id", phoneNumberId);

        result = data;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("vapi-manage error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
