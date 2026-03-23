import { supabase } from "@/integrations/supabase/client";

/**
 * All Vapi API calls are routed through the vapi-manage edge function.
 * The edge function reads the user's Vapi key from integration_settings.
 * No Vapi API key is needed on the frontend.
 */

async function invokeVapi(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("vapi-manage", {
    body: { action, ...params },
  });

  if (error) {
    throw new Error(error.message || "Failed to reach backend");
  }

  if (data && !data.success) {
    throw new Error(data.error || "Vapi operation failed");
  }

  return data?.data;
}

export async function validateVapiKey(apiKey: string): Promise<boolean> {
  try {
    const result = await invokeVapi("validate-key", { apiKey });
    return result?.valid === true;
  } catch {
    return false;
  }
}

export interface VapiSyncResult {
  assistants: number;
  phoneNumbers: number;
  calls: number;
  hasAnalytics: boolean;
}

export type SyncProgressCallback = (message: string) => void;

export async function fullVapiSync(
  userId: string,
  onProgress?: SyncProgressCallback
): Promise<VapiSyncResult> {
  onProgress?.("Syncing with Vapi...");
  const result = await invokeVapi("full-sync");
  onProgress?.("Complete!");
  return result;
}

// Legacy alias
export const syncVapiData = fullVapiSync;

export async function syncVapiCalls(userId: string) {
  return invokeVapi("sync-calls");
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
  userId: string
) {
  const firstMessage = config.greetingScript
    .replace("{business_name}", config.businessName)
    .replace("{time_of_day}", getTimeOfDay())
    .replace("{caller_name}", "there")
    .replace("{day_of_week}", "");

  return invokeVapi("create-assistant", {
    name: `${config.businessName} — AI Agent`,
    firstMessage,
    voice: config.voiceId || "nova",
    voiceProvider: "openai",
    systemPrompt: config.systemPrompt,
    recordCalls: config.recordCalls,
    transcribeCalls: true,
  });
}

export async function updateVapiAssistant(
  vapiAssistantId: string,
  config: {
    businessName: string;
    voiceId: string;
    greetingScript: string;
    recordCalls: boolean;
    systemPrompt: string;
    voiceProvider?: string;
  },
  userId: string
) {
  return invokeVapi("update-assistant", {
    assistantId: vapiAssistantId,
    name: config.businessName,
    firstMessage: config.greetingScript,
    voice: config.voiceId,
    voiceProvider: config.voiceProvider || undefined,
    systemPrompt: config.systemPrompt,
    recordCalls: config.recordCalls,
  });
}

export async function makeVapiCall(
  assistantId: string,
  phoneNumberId: string,
  customerNumber: string,
  customerName: string
) {
  return invokeVapi("make-call", {
    assistantId,
    phoneNumberId,
    customerNumber,
    customerName,
    firstMessageOverride: "Hi, this is a test call from your AI agent. Your voice agent is working correctly. Thank you for testing Katexs.",
  });
}

export async function getVapiCallStatus(callId: string) {
  return invokeVapi("get-call-status", { callId });
}

export async function syncCallToSupabase(userId: string, callId: string) {
  // get-call-status returns the call data; the edge function already handles DB sync via sync-calls
  // But we do a targeted sync here
  const callData = await getVapiCallStatus(callId);

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
    .select("config, last_tested")
    .eq("user_id", userId)
    .eq("integration_name", "vapi")
    .eq("status", "connected")
    .single();

  if (!vapi) return;

  const lastSync = (vapi.config as any)?.last_full_sync;
  const minutesSinceSync = lastSync
    ? (Date.now() - new Date(lastSync).getTime()) / 60000
    : 999;

  if (minutesSinceSync > 15) {
    try {
      await syncVapiCalls(userId);
    } catch {
      // Silent fail for background sync
    }
  }
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
