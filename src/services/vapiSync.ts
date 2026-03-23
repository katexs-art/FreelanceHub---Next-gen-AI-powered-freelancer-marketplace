import { supabase } from "@/integrations/supabase/client";

const VAPI_BASE = "https://api.vapi.ai";

function vapiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function safeFetch(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Your Vapi API key is invalid or expired. Update it in Settings → Integrations.");
      if (res.status === 402) throw new Error("Your Vapi account needs payment info. Visit vapi.ai to update billing.");
      if (res.status === 429) throw new Error("Vapi is rate limiting requests. Try again in 60 seconds.");
      if (res.status === 503) throw new Error("Vapi is temporarily down. Your agents are still active — just can't sync right now.");
      return null;
    }
    return await res.json();
  } catch (err: any) {
    if (err.message?.includes("Vapi")) throw err;
    throw new Error("Cannot reach Vapi. Check your internet connection.");
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

export type SyncProgressCallback = (message: string) => void;

export async function fullVapiSync(
  userId: string,
  vapiKey: string,
  onProgress?: SyncProgressCallback
): Promise<VapiSyncResult> {
  const headers = vapiHeaders(vapiKey);

  onProgress?.("Verifying API key...");

  const [assistantsRes, phoneNumbersRes, callsRes, analyticsRes] = await Promise.allSettled([
    fetch(`${VAPI_BASE}/assistant?limit=100`, { headers }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    fetch(`${VAPI_BASE}/phone-number?limit=100`, { headers }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    fetch(`${VAPI_BASE}/call?limit=100&sortOrder=DESC`, { headers }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    fetch(`${VAPI_BASE}/analytics`, { headers }).then(r => r.json()).catch(() => null),
  ]);

  const assistants = assistantsRes.status === "fulfilled" ? assistantsRes.value : [];
  const phoneNumbers = phoneNumbersRes.status === "fulfilled" ? phoneNumbersRes.value : [];
  const calls = callsRes.status === "fulfilled" ? callsRes.value : [];
  const analytics = analyticsRes.status === "fulfilled" ? analyticsRes.value : null;

  onProgress?.("Saving assistants...");

  if (Array.isArray(assistants) && assistants.length > 0) {
    await supabase.from("vapi_assistants").upsert(
      assistants.map((a: any) => ({
        user_id: userId,
        vapi_id: a.id,
        name: a.name || "Unnamed Assistant",
        voice_provider: a.voice?.provider || "unknown",
        voice_id: a.voice?.voiceId || a.voice?.voice_id || a.voice?.voice || "",
        model: a.model?.model || "",
        first_message: a.firstMessage || "",
        system_prompt: a.model?.systemPrompt || a.model?.system_prompt || a.model?.messages?.[0]?.content || "",
        created_at_vapi: a.createdAt,
        raw_config: a,
        is_active: false,
        synced_at: new Date().toISOString(),
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  onProgress?.("Saving phone numbers...");

  if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
    await supabase.from("vapi_phone_numbers").upsert(
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
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  onProgress?.("Saving call history...");

  if (Array.isArray(calls) && calls.length > 0) {
    await supabase.from("vapi_calls").upsert(
      calls.map((c: any) => ({
        user_id: userId,
        vapi_id: c.id,
        assistant_id: c.assistantId || null,
        phone_number_id: c.phoneNumberId || null,
        type: c.type || "inbound",
        status: c.status || "unknown",
        caller_number: c.customer?.number || c.phoneNumber || null,
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
      })) as any,
      { onConflict: "vapi_id" }
    );
  }

  onProgress?.("Saving analytics...");

  if (analytics) {
    await supabase.from("vapi_analytics").upsert(
      { user_id: userId, data: analytics, synced_at: new Date().toISOString() } as any,
      { onConflict: "user_id" }
    );
  }

  await supabase.from("integration_settings")
    .update({
      status: "connected",
      config: {
        assistants_count: Array.isArray(assistants) ? assistants.length : 0,
        phone_numbers_count: Array.isArray(phoneNumbers) ? phoneNumbers.length : 0,
        calls_synced: Array.isArray(calls) ? calls.length : 0,
        has_analytics: !!analytics,
        last_full_sync: new Date().toISOString(),
      },
      last_tested: new Date().toISOString(),
    } as any)
    .eq("user_id", userId)
    .eq("integration_name", "vapi");

  onProgress?.("Complete!");

  return {
    assistants: Array.isArray(assistants) ? assistants : [],
    phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers : [],
    calls: Array.isArray(calls) ? calls : [],
    analytics,
  };
}

// Legacy alias
export const syncVapiData = fullVapiSync;

export async function syncVapiCalls(userId: string, vapiApiKey: string) {
  const headers = vapiHeaders(vapiApiKey);
  const calls = await safeFetch(`${VAPI_BASE}/call?limit=50&sortOrder=DESC`, headers);

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

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export async function createVapiAssistant(
  config: {
    businessName: string;
    industry: string;
    voiceId: string;
    personality: string;
    greetingScript: string;
    knowledgeBase: string;
    recordCalls: boolean;
    transferEnabled: boolean;
    systemPrompt: string;
  },
  vapiKey: string,
  userId: string
) {
  const payload = {
    name: `${config.businessName} — AI Agent`,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: config.systemPrompt }],
    },
    voice: {
      provider: "openai",
      voiceId: config.voiceId || "nova",
    },
    firstMessage: config.greetingScript
      .replace("{business_name}", config.businessName)
      .replace("{time_of_day}", getTimeOfDay())
      .replace("{caller_name}", "there")
      .replace("{day_of_week}", ""),
    recordingEnabled: config.recordCalls,
    transcriptionEnabled: true,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800,
    endCallFunctionEnabled: true,
  };

  const response = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: vapiHeaders(vapiKey),
    body: JSON.stringify(payload),
  });

  const assistant = await response.json();
  if (!response.ok) {
    handleVapiError(response.status, assistant);
  }

  await supabase.from("vapi_assistants").insert({
    user_id: userId,
    vapi_id: assistant.id,
    name: assistant.name,
    voice_provider: assistant.voice?.provider,
    voice_id: assistant.voice?.voiceId || assistant.voice?.voice,
    model: assistant.model?.model,
    first_message: assistant.firstMessage,
    system_prompt: config.systemPrompt,
    created_at_vapi: assistant.createdAt,
    raw_config: assistant,
    is_active: true,
    synced_at: new Date().toISOString(),
  } as any);

  // Deactivate others
  await supabase.from("vapi_assistants")
    .update({ is_active: false } as any)
    .eq("user_id", userId)
    .neq("vapi_id", assistant.id);

  return assistant;
}

export async function updateVapiAssistant(
  vapiAssistantId: string,
  config: {
    businessName: string;
    voiceId: string;
    greetingScript: string;
    recordCalls: boolean;
    systemPrompt: string;
  },
  vapiKey: string,
  userId: string
) {
  const response = await fetch(`${VAPI_BASE}/assistant/${vapiAssistantId}`, {
    method: "PATCH",
    headers: vapiHeaders(vapiKey),
    body: JSON.stringify({
      name: `${config.businessName} — River AI`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: config.systemPrompt }],
      },
      voice: {
        provider: "openai",
        voiceId: config.voiceId,
      },
      firstMessage: config.greetingScript
        .replace("{business_name}", config.businessName),
      recordingEnabled: config.recordCalls,
    }),
  });

  const updated = await response.json();
  if (!response.ok) {
    handleVapiError(response.status, updated);
  }

  await supabase.from("vapi_assistants")
    .update({
      name: updated.name,
      voice_id: updated.voice?.voiceId || updated.voice?.voice,
      first_message: updated.firstMessage,
      system_prompt: config.systemPrompt,
      raw_config: updated,
      synced_at: new Date().toISOString(),
    } as any)
    .eq("vapi_id", vapiAssistantId)
    .eq("user_id", userId);

  return updated;
}

export async function makeVapiCall(
  vapiKey: string,
  assistantId: string,
  phoneNumberId: string,
  customerNumber: string,
  customerName: string
) {
  const response = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: vapiHeaders(vapiKey),
    body: JSON.stringify({
      assistantId,
      phoneNumberId,
      customer: {
        number: customerNumber,
        name: customerName || "Test Call",
      },
      assistantOverrides: {
        firstMessage: "Hi, this is a test call from River AI. Your voice agent is working correctly. Thank you for testing Katexs.",
      },
    }),
  });

  const callData = await response.json();
  if (!response.ok) {
    handleVapiError(response.status, callData);
  }
  return callData;
}

export async function getVapiCallStatus(vapiKey: string, callId: string) {
  const response = await fetch(`${VAPI_BASE}/call/${callId}`, {
    headers: vapiHeaders(vapiKey),
  });
  const data = await response.json();
  if (!response.ok) {
    handleVapiError(response.status, data);
  }
  return data;
}

export async function syncCallToSupabase(userId: string, vapiKey: string, callId: string) {
  const callData = await getVapiCallStatus(vapiKey, callId);

  await supabase.from("vapi_calls").upsert({
    user_id: userId,
    vapi_id: callData.id,
    type: "outbound",
    status: callData.status,
    caller_number: callData.customer?.number,
    assistant_id: callData.assistantId,
    duration_seconds: callData.endedAt && callData.startedAt
      ? Math.max(0, Math.round((new Date(callData.endedAt).getTime() - new Date(callData.startedAt).getTime()) / 1000))
      : null,
    ended_reason: callData.endedReason,
    transcript: typeof callData.transcript === "string" ? callData.transcript : callData.transcript ? JSON.stringify(callData.transcript) : null,
    recording_url: callData.recordingUrl,
    summary: callData.summary,
    cost: callData.cost,
    started_at: callData.startedAt,
    ended_at: callData.endedAt,
    raw_data: callData,
    synced_at: new Date().toISOString(),
  } as any, { onConflict: "vapi_id" });

  return callData;
}

export async function autoSyncIfNeeded(userId: string) {
  const { data: vapi } = await supabase
    .from("integration_settings")
    .select("api_key, config, last_tested")
    .eq("user_id", userId)
    .eq("integration_name", "vapi")
    .eq("status", "connected")
    .single();

  if (!vapi?.api_key) return;

  const lastSync = (vapi.config as any)?.last_full_sync;
  const minutesSinceSync = lastSync
    ? (Date.now() - new Date(lastSync).getTime()) / 60000
    : 999;

  if (minutesSinceSync > 15) {
    try {
      await syncVapiCalls(userId, vapi.api_key);
    } catch {
      // Silent fail for background sync
    }
  }
}

function handleVapiError(status: number, data: any): never {
  if (status === 401) throw new Error("Your Vapi API key is invalid or expired. Update it in Settings → Integrations.");
  if (status === 402) throw new Error("Your Vapi account needs payment info. Visit vapi.ai to update billing.");
  if (status === 429) throw new Error("Vapi is rate limiting requests. Try again in 60 seconds.");
  if (status === 503) throw new Error("Vapi is temporarily down. Your agents are still active — just can't sync right now.");
  throw new Error(data?.message || "Unknown Vapi error");
}

export function useVapiData(userId: string | undefined) {
  return {
    async getAssistants() {
      if (!userId) return [];
      const { data } = await supabase.from("vapi_assistants").select("*").eq("user_id", userId).order("created_at_vapi", { ascending: false });
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
