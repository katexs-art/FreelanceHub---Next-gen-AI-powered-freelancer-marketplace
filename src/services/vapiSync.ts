import { supabase } from "@/integrations/supabase/client";

const VAPI_BASE = "https://api.vapi.ai";

function vapiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function safeFetch(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function validateVapiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${VAPI_BASE}/assistant`, { headers: vapiHeaders(apiKey) });
    return res.ok;
  } catch {
    return false;
  }
}

export interface VapiSyncResult {
  assistants: any[];
  phoneNumbers: any[];
  calls: any[];
  analytics: any;
}

export async function syncVapiData(userId: string, vapiApiKey: string): Promise<VapiSyncResult> {
  const headers = vapiHeaders(vapiApiKey);

  const [assistants, phoneNumbers, calls, analytics] = await Promise.all([
    safeFetch(`${VAPI_BASE}/assistant`, headers),
    safeFetch(`${VAPI_BASE}/phone-number`, headers),
    safeFetch(`${VAPI_BASE}/call?limit=100`, headers),
    safeFetch(`${VAPI_BASE}/analytics`, headers),
  ]);

  // Save assistants
  if (assistants?.length) {
    await supabase.from("vapi_assistants").upsert(
      assistants.map((a: any) => ({
        user_id: userId,
        vapi_id: a.id,
        name: a.name || "Unnamed Assistant",
        voice_provider: a.voice?.provider,
        voice_id: a.voice?.voiceId,
        model: a.model?.model,
        first_message: a.firstMessage,
        system_prompt: a.model?.messages?.[0]?.content || a.model?.systemPrompt,
        created_at_vapi: a.createdAt,
        raw_config: a,
        synced_at: new Date().toISOString(),
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  // Save phone numbers
  if (phoneNumbers?.length) {
    await supabase.from("vapi_phone_numbers").upsert(
      phoneNumbers.map((p: any) => ({
        user_id: userId,
        vapi_id: p.id,
        number: p.number || p.twilioPhoneNumber || p.phoneNumber,
        provider: p.provider,
        area_code: p.areaCode,
        name: p.name,
        assistant_id: p.assistantId,
        created_at_vapi: p.createdAt,
        raw_config: p,
        synced_at: new Date().toISOString(),
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  // Save calls
  if (calls?.length) {
    await supabase.from("vapi_calls").upsert(
      calls.map((c: any) => ({
        user_id: userId,
        vapi_id: c.id,
        assistant_id: c.assistantId,
        phone_number_id: c.phoneNumberId,
        type: c.type,
        status: c.status,
        caller_number: c.customer?.number,
        duration_seconds:
          c.endedAt && c.startedAt
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
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  // Save analytics
  if (analytics) {
    await supabase.from("vapi_analytics").upsert(
      { user_id: userId, data: analytics, synced_at: new Date().toISOString() } as any,
      { onConflict: "user_id" }
    );
  }

  // Update integration status
  await supabase
    .from("integration_settings")
    .update({
      status: "connected",
      config: {
        assistants_count: assistants?.length || 0,
        phone_numbers_count: phoneNumbers?.length || 0,
        calls_synced: calls?.length || 0,
        last_sync: new Date().toISOString(),
      },
      last_tested: new Date().toISOString(),
    } as any)
    .eq("user_id", userId)
    .eq("integration_name", "vapi");

  return {
    assistants: assistants || [],
    phoneNumbers: phoneNumbers || [],
    calls: calls || [],
    analytics: analytics || {},
  };
}

export async function syncVapiCalls(userId: string, vapiApiKey: string) {
  const headers = vapiHeaders(vapiApiKey);

  const { data: lastSync } = await supabase
    .from("vapi_analytics")
    .select("synced_at")
    .eq("user_id", userId)
    .single();

  const since = lastSync?.synced_at ? `&createdAtGt=${lastSync.synced_at}` : "";
  const calls = await safeFetch(`${VAPI_BASE}/call?limit=50${since}`, headers);

  if (calls?.length) {
    await supabase.from("vapi_calls").upsert(
      calls.map((c: any) => ({
        user_id: userId,
        vapi_id: c.id,
        assistant_id: c.assistantId,
        phone_number_id: c.phoneNumberId,
        type: c.type,
        status: c.status,
        caller_number: c.customer?.number,
        duration_seconds:
          c.endedAt && c.startedAt
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
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  return calls || [];
}

export function useVapiData(userId: string | undefined) {
  // Hook helper – not a real hook, just a fetcher factory
  return {
    async getAssistants() {
      if (!userId) return [];
      const { data } = await supabase.from("vapi_assistants").select("*").eq("user_id", userId).order("synced_at", { ascending: false });
      return (data as any[]) || [];
    },
    async getPhoneNumbers() {
      if (!userId) return [];
      const { data } = await supabase.from("vapi_phone_numbers").select("*").eq("user_id", userId).order("is_primary", { ascending: false });
      return (data as any[]) || [];
    },
    async getCalls(limit = 50) {
      if (!userId) return [];
      const { data } = await supabase.from("vapi_calls").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(limit);
      return (data as any[]) || [];
    },
    async getAnalytics() {
      if (!userId) return null;
      const { data } = await supabase.from("vapi_analytics").select("*").eq("user_id", userId).single();
      return data;
    },
  };
}
