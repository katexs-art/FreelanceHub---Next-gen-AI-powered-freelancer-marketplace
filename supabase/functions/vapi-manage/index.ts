import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_BASE = "https://api.vapi.ai";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserVapiKey(userId: string): Promise<string> {
  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient
    .from("integration_settings")
    .select("api_key")
    .eq("user_id", userId)
    .eq("integration_name", "vapi")
    .eq("status", "connected")
    .single();

  if (error || !data?.api_key) {
    throw new Error("Connect Vapi first in Settings → Integrations.");
  }
  return data.api_key;
}

function vapiHeaders(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function handleVapiStatus(status: number, data: unknown): never {
  const msg = (data as Record<string, string>)?.message || "";
  if (status === 401) throw new Error("Your Vapi API key is invalid or expired. Update it in Settings → Integrations.");
  if (status === 402) throw new Error("Your Vapi account needs payment info. Visit vapi.ai to update billing.");
  if (status === 429) throw new Error("Vapi is rate limiting requests. Try again in 60 seconds.");
  if (status === 503) throw new Error("Vapi is temporarily down. Your agents are still active — just can't sync right now.");
  throw new Error(msg || `Vapi error (${status})`);
}

// Voice catalog
const VOICE_CATALOG = [
  { id: "Elliot", name: "Elliot", provider: "vapi", desc: "Natural & conversational" },
  { id: "Lily", name: "Lily", provider: "vapi", desc: "Warm & articulate" },
  { id: "Rohan", name: "Rohan", provider: "vapi", desc: "Clear & professional" },
  { id: "Emma", name: "Emma", provider: "vapi", desc: "Friendly & approachable" },
  { id: "Clara", name: "Clara", provider: "vapi", desc: "Calm & reassuring" },
  { id: "Nico", name: "Nico", provider: "vapi", desc: "Energetic & upbeat" },
  { id: "Godfrey", name: "Godfrey", provider: "vapi", desc: "Authoritative & deep" },
  { id: "Sagar", name: "Sagar", provider: "vapi", desc: "Warm & confident" },
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

    let result: unknown;

    switch (action) {
      case "list-voices": {
        result = VOICE_CATALOG;
        break;
      }

      case "validate-key": {
        // Validate a Vapi key before saving — uses provided key, not DB
        const { apiKey } = params;
        if (!apiKey) throw new Error("apiKey required");
        try {
          const res = await fetch(`${VAPI_BASE}/assistant?limit=1`, {
            headers: vapiHeaders(apiKey),
          });
          result = { valid: res.ok };
        } catch {
          result = { valid: false };
        }
        break;
      }

      case "make-call": {
        const vapiKey = await getUserVapiKey(userId);
        const { assistantId, phoneNumberId, customerNumber, customerName, firstMessageOverride } = params;
        if (!assistantId || !customerNumber) throw new Error("assistantId and customerNumber required");

        const body: Record<string, unknown> = {
          assistantId,
          customer: {
            number: customerNumber,
            name: customerName || "Test Call",
          },
        };
        if (phoneNumberId) body.phoneNumberId = phoneNumberId;
        if (firstMessageOverride) {
          body.assistantOverrides = { firstMessage: firstMessageOverride };
        }

        const res = await fetch(`${VAPI_BASE}/call`, {
          method: "POST",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);
        result = data;
        break;
      }

      case "get-call-status": {
        const vapiKey = await getUserVapiKey(userId);
        const { callId } = params;
        if (!callId) throw new Error("callId required");
        const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
          headers: vapiHeaders(vapiKey),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);
        result = data;
        break;
      }

      case "full-sync": {
        const vapiKey = await getUserVapiKey(userId);
        const headers = vapiHeaders(vapiKey);
        const serviceClient = getServiceClient();

        const [assistantsRes, phoneNumbersRes, callsRes, analyticsRes] = await Promise.allSettled([
          fetch(`${VAPI_BASE}/assistant?limit=100`, { headers }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
          fetch(`${VAPI_BASE}/phone-number?limit=100`, { headers }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
          fetch(`${VAPI_BASE}/call?limit=100&sortOrder=DESC`, { headers }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
          fetch(`${VAPI_BASE}/analytics`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        const assistants = assistantsRes.status === "fulfilled" ? assistantsRes.value : [];
        const phoneNumbers = phoneNumbersRes.status === "fulfilled" ? phoneNumbersRes.value : [];
        const calls = callsRes.status === "fulfilled" ? callsRes.value : [];
        const analytics = analyticsRes.status === "fulfilled" ? analyticsRes.value : null;

        if (Array.isArray(assistants) && assistants.length > 0) {
          await serviceClient.from("vapi_assistants").upsert(
            assistants.map((a: Record<string, unknown>) => ({
              user_id: userId,
              vapi_id: a.id,
              name: (a as any).name || "Unnamed Assistant",
              voice_provider: (a as any).voice?.provider || "unknown",
              voice_id: (a as any).voice?.voiceId || (a as any).voice?.voice_id || "",
              model: (a as any).model?.model || "",
              first_message: (a as any).firstMessage || "",
              system_prompt: (a as any).model?.systemPrompt || (a as any).model?.messages?.[0]?.content || "",
              created_at_vapi: (a as any).createdAt,
              raw_config: a,
              is_active: false,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "vapi_id" }
          );
        }

        if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
          await serviceClient.from("vapi_phone_numbers").upsert(
            phoneNumbers.map((p: any, index: number) => ({
              user_id: userId,
              vapi_id: p.id,
              number: p.number || p.twilioPhoneNumber || p.phoneNumber,
              provider: p.provider || "twilio",
              area_code: p.areaCode || p.number?.substring(2, 5),
              name: p.name || p.number,
              assistant_id: p.assistantId || null,
              created_at_vapi: p.createdAt,
              raw_config: p,
              is_primary: index === 0,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "vapi_id" }
          );
        }

        if (Array.isArray(calls) && calls.length > 0) {
          await serviceClient.from("vapi_calls").upsert(
            calls.map((c: any) => ({
              user_id: userId,
              vapi_id: c.id,
              assistant_id: c.assistantId || null,
              phone_number_id: c.phoneNumberId || null,
              type: c.type || "inbound",
              status: c.status || "unknown",
              caller_number: c.customer?.number || null,
              duration_seconds: c.endedAt && c.startedAt
                ? Math.max(0, Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000))
                : null,
              ended_reason: c.endedReason || null,
              transcript: typeof c.transcript === "string" ? c.transcript : c.transcript ? JSON.stringify(c.transcript) : null,
              recording_url: c.recordingUrl || null,
              summary: c.summary || null,
              cost: c.cost || null,
              started_at: c.startedAt || null,
              ended_at: c.endedAt || null,
              raw_data: c,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "vapi_id" }
          );
        }

        if (analytics) {
          await serviceClient.from("vapi_analytics").upsert(
            { user_id: userId, data: analytics, synced_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }

        // Update integration_settings with sync metadata
        await serviceClient.from("integration_settings")
          .update({
            config: {
              assistants_count: Array.isArray(assistants) ? assistants.length : 0,
              phone_numbers_count: Array.isArray(phoneNumbers) ? phoneNumbers.length : 0,
              calls_synced: Array.isArray(calls) ? calls.length : 0,
              has_analytics: !!analytics,
              last_full_sync: new Date().toISOString(),
            },
            last_tested: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("integration_name", "vapi");

        result = {
          assistants: Array.isArray(assistants) ? assistants.length : 0,
          phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers.length : 0,
          calls: Array.isArray(calls) ? calls.length : 0,
          hasAnalytics: !!analytics,
        };
        break;
      }

      case "sync-calls": {
        const vapiKey = await getUserVapiKey(userId);
        const serviceClient = getServiceClient();
        const res = await fetch(`${VAPI_BASE}/call?limit=50&sortOrder=DESC`, {
          headers: vapiHeaders(vapiKey),
        });
        if (!res.ok) handleVapiStatus(res.status, await res.json());
        const calls = await res.json();

        if (Array.isArray(calls) && calls.length > 0) {
          await serviceClient.from("vapi_calls").upsert(
            calls.map((c: any) => ({
              user_id: userId,
              vapi_id: c.id,
              assistant_id: c.assistantId,
              phone_number_id: c.phoneNumberId,
              type: c.type,
              status: c.status,
              caller_number: c.customer?.number,
              duration_seconds: c.endedAt && c.startedAt
                ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
                : null,
              ended_reason: c.endedReason,
              transcript: typeof c.transcript === "string" ? c.transcript : JSON.stringify(c.transcript),
              recording_url: c.recordingUrl,
              summary: c.summary,
              cost: c.cost,
              started_at: c.startedAt,
              ended_at: c.endedAt,
              raw_data: c,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "vapi_id" }
          );
        }

        result = { synced: Array.isArray(calls) ? calls.length : 0 };
        break;
      }

      case "create-assistant": {
        const vapiKey = await getUserVapiKey(userId);
        const serviceClient = getServiceClient();
        const { name, firstMessage, voice, voiceProvider, model, systemPrompt, recordCalls, transcribeCalls, transferNumber } = params;
        const provider = voiceProvider || "openai";
        const voiceId = voice || "nova";

        const body: Record<string, unknown> = {
          name: name || "AI Agent",
          firstMessage: firstMessage || "Hi, thanks for calling. How can I help you today?",
          voice: { provider, voiceId },
          model: {
            provider: "openai",
            model: model || "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt || "You are a helpful AI phone assistant." }],
          },
          recordingEnabled: recordCalls ?? false,
          transcriptionEnabled: transcribeCalls ?? true,
          metadata: { katexs_user_id: userId },
        };
        if (transferNumber) body.forwardingPhoneNumber = transferNumber;

        const res = await fetch(`${VAPI_BASE}/assistant`, {
          method: "POST",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);

        await serviceClient.from("vapi_assistants").upsert({
          user_id: userId,
          vapi_id: data.id,
          name: data.name,
          voice_provider: provider,
          voice_id: voiceId,
          model: data.model?.model,
          first_message: data.firstMessage,
          system_prompt: systemPrompt,
          created_at_vapi: data.createdAt,
          raw_config: data,
          synced_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "vapi_id" });

        // Deactivate others
        await serviceClient.from("vapi_assistants")
          .update({ is_active: false })
          .eq("user_id", userId)
          .neq("vapi_id", data.id);

        result = data;
        break;
      }

      case "update-assistant": {
        const vapiKey = await getUserVapiKey(userId);
        const serviceClient = getServiceClient();
        const { assistantId, name, firstMessage, voice, voiceProvider, systemPrompt, transferNumber, recordCalls, transcribeCalls } = params;
        if (!assistantId) throw new Error("assistantId required");

        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (firstMessage) body.firstMessage = firstMessage;
        if (voice) body.voice = { provider: voiceProvider || "openai", voiceId: voice };
        if (systemPrompt) {
          body.model = {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
          };
        }
        if (recordCalls !== undefined) body.recordingEnabled = recordCalls;
        if (transcribeCalls !== undefined) body.transcriptionEnabled = transcribeCalls;
        if (transferNumber) body.forwardingPhoneNumber = transferNumber;

        const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
          method: "PATCH",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);

        await serviceClient.from("vapi_assistants")
          .update({
            name: data.name,
            voice_provider: voiceProvider || data.voice?.provider,
            voice_id: voice || data.voice?.voiceId,
            first_message: data.firstMessage,
            system_prompt: systemPrompt,
            raw_config: data,
            synced_at: new Date().toISOString(),
          })
          .eq("vapi_id", assistantId);

        result = data;
        break;
      }

      case "sync-assistants": {
        const vapiKey = await getUserVapiKey(userId);
        const res = await fetch(`${VAPI_BASE}/assistant`, { headers: vapiHeaders(vapiKey) });
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

      case "purchase-number": {
        const vapiKey = await getUserVapiKey(userId);
        const { areaCode } = params;
        const res = await fetch(`${VAPI_BASE}/phone-number`, {
          method: "POST",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify({
            provider: "twilio",
            areaCode: areaCode || "602",
            name: `Katexs-${userId.slice(0, 8)}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_phone_numbers")
          .update({ is_primary: false }).eq("user_id", userId);

        await serviceClient.from("vapi_phone_numbers").upsert({
          user_id: userId,
          vapi_id: data.id,
          number: data.number || data.twilioPhoneNumber || data.phoneNumber,
          provider: data.provider || "twilio",
          area_code: areaCode || "602",
          name: data.name,
          assistant_id: data.assistantId,
          created_at_vapi: data.createdAt,
          raw_config: data,
          synced_at: new Date().toISOString(),
          is_primary: true,
        }, { onConflict: "vapi_id" });

        result = data;
        break;
      }

      case "test-call": {
        const vapiKey = await getUserVapiKey(userId);
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
          method: "POST",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify({ assistantId: asstId, customer: { number: phoneNumber } }),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);
        result = data;
        break;
      }

      case "list-assistants": {
        const vapiKey = await getUserVapiKey(userId);
        const res = await fetch(`${VAPI_BASE}/assistant`, { headers: vapiHeaders(vapiKey) });
        const all = await res.json();
        const userAssistants = (all || []).filter(
          (a: { metadata?: { katexs_user_id?: string } }) =>
            a.metadata?.katexs_user_id === userId
        );
        result = userAssistants;
        break;
      }

      case "assign-number": {
        const vapiKey = await getUserVapiKey(userId);
        const { phoneNumberId, assistantId: aId } = params;
        if (!phoneNumberId || !aId) throw new Error("phoneNumberId and assistantId required");
        const res = await fetch(`${VAPI_BASE}/phone-number/${phoneNumberId}`, {
          method: "PATCH",
          headers: vapiHeaders(vapiKey),
          body: JSON.stringify({ assistantId: aId }),
        });
        const data = await res.json();
        if (!res.ok) handleVapiStatus(res.status, data);

        const serviceClient = getServiceClient();
        await serviceClient.from("vapi_phone_numbers")
          .update({ assistant_id: aId, synced_at: new Date().toISOString() })
          .eq("vapi_id", phoneNumberId);

        result = data;
        break;
      }

      case "search-numbers": {
        const { areaCode } = params;
        result = { message: "Numbers are assigned automatically by area code when purchased", areaCode: areaCode || "602" };
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
