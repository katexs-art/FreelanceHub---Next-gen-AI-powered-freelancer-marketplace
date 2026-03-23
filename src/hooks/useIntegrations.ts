import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface IntegrationSetting {
  id: string;
  user_id: string;
  integration_name: string;
  api_key: string | null;
  config: Record<string, unknown>;
  connected_at: string | null;
  last_tested: string | null;
  status: string;
}

export interface WebhookLog {
  id: string;
  direction: string;
  event_type: string;
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
  status: string;
  response_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

export function useIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [intRes, logRes] = await Promise.all([
      supabase.from("integration_settings").select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (intRes.data) setIntegrations(intRes.data as unknown as IntegrationSetting[]);
    if (logRes.data) setWebhookLogs(logRes.data as unknown as WebhookLog[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const connectIntegration = async (name: string, apiKey: string, config: Record<string, unknown> = {}) => {
    if (!user) return;
    const existing = integrations.find(i => i.integration_name === name);
    if (existing) {
      await supabase.from("integration_settings").update({
        api_key: apiKey, config, status: "connected", connected_at: new Date().toISOString(), last_tested: new Date().toISOString(),
      } as never).eq("id", existing.id);
    } else {
      await supabase.from("integration_settings").insert({
        user_id: user.id, integration_name: name, api_key: apiKey, config, status: "connected",
        connected_at: new Date().toISOString(), last_tested: new Date().toISOString(),
      } as never);
    }
    await fetchAll();
  };

  const disconnectIntegration = async (name: string) => {
    if (!user) return;
    await supabase.from("integration_settings").update({ status: "disconnected", api_key: null } as never)
      .eq("integration_name", name).eq("user_id", user.id);
    await fetchAll();
  };

  const isConnected = (name: string) => integrations.some(i => i.integration_name === name && i.status === "connected");
  const getIntegration = (name: string) => integrations.find(i => i.integration_name === name);

  return { integrations, webhookLogs, loading, connectIntegration, disconnectIntegration, isConnected, getIntegration, refetch: fetchAll };
}
