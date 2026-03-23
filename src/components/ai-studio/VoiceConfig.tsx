import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { updateVapiAssistant } from "@/services/vapiSync";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VOICE_PROVIDERS = ["vapi", "openai", "11labs", "azure", "deepgram", "neets", "rime-ai"];

export function VoiceConfig() {
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vapiConnected, setVapiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRawConfig, setShowRawConfig] = useState(false);

  // Editable fields for the selected assistant
  const [editName, setEditName] = useState("");
  const [editFirstMessage, setEditFirstMessage] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editVoiceProvider, setEditVoiceProvider] = useState("");
  const [editVoiceId, setEditVoiceId] = useState("");
  const [editingVoice, setEditingVoice] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [vapiRes, asstRes] = await Promise.all([
      supabase.from("integration_settings").select("api_key, status").eq("user_id", user.id).eq("integration_name", "vapi").eq("status", "connected").single(),
      supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false }),
    ]);

    const connected = !!vapiRes.data?.api_key;
    setVapiConnected(connected);
    const aList = (asstRes.data as any[]) || [];
    setAssistants(aList);

    // Auto-activate first assistant if none active
    if (aList.length > 0 && !aList.some((a) => a.is_active)) {
      await supabase.from("vapi_assistants").update({ is_active: true } as any).eq("id", aList[0].id);
      aList[0].is_active = true;
      setAssistants([...aList]);
    }

    // Select active or first
    const active = aList.find((a) => a.is_active) || aList[0];
    if (active) selectAssistant(active);
    setLoading(false);
  };

  const selectAssistant = (a: any) => {
    setSelectedId(a.vapi_id);
    setEditName(a.name || "");
    setEditFirstMessage(a.first_message || "");
    setEditSystemPrompt(a.system_prompt || "");
    const rc = a.raw_config || {};
    setEditVoiceProvider(rc.voice?.provider || a.voice_provider || "");
    setEditVoiceId(rc.voice?.voiceId || rc.voice?.voice || a.voice_id || "");
    setEditingVoice(false);
  };

  const setActiveAssistant = async (vapiId: string) => {
    if (!user) return;
    await supabase.from("vapi_assistants").update({ is_active: false } as any).eq("user_id", user.id);
    await supabase.from("vapi_assistants").update({ is_active: true } as any).eq("user_id", user.id).eq("vapi_id", vapiId);
    const { data } = await supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false });
    setAssistants((data as any[]) || []);
    toast({ title: "Active assistant updated" });
  };

  const handleSave = async () => {
    if (!user || !selectedId) return;
    setSaving(true);
    try {
      await updateVapiAssistant(selectedId, {
        businessName: editName,
        voiceId: editVoiceId,
        greetingScript: editFirstMessage,
        recordCalls: false,
        systemPrompt: editSystemPrompt,
      }, user.id);

      // Refresh local data
      const { data } = await supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false });
      setAssistants((data as any[]) || []);
      const updated = (data as any[])?.find((a) => a.vapi_id === selectedId);
      if (updated) selectAssistant(updated);

      toast({ title: "Assistant updated", description: "Changes saved to Vapi." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const selected = assistants.find((a) => a.vapi_id === selectedId);
  const modelProvider = selected?.raw_config?.model?.provider || "";
  const modelName = selected?.raw_config?.model?.model || selected?.model || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-foreground-secondary" />
      </div>
    );
  }

  if (!vapiConnected) {
    return (
      <div className="p-4 rounded-xl border border-border bg-background-card text-center space-y-2">
        <p className="text-[13px] font-semibold text-foreground">Connect Vapi</p>
        <p className="text-[11px] text-foreground-secondary">Go to Integrations to connect your Vapi account and see your assistants here.</p>
      </div>
    );
  }

  if (assistants.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-border bg-background-card text-center space-y-2">
        <p className="text-[13px] font-semibold text-foreground">No assistants found</p>
        <p className="text-[11px] text-foreground-secondary">No assistants found in your Vapi account. Create one in your Vapi dashboard or sync again.</p>
      </div>
    );
  }

  return (
    <>
      {/* Assistants List */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Your Assistants</label>
        <div className="space-y-2 mt-2">
          {assistants.map((a) => (
            <div
              key={a.id}
              className={`p-3 rounded-[10px] border transition-all cursor-pointer ${
                a.vapi_id === selectedId
                  ? "border-foreground bg-background-elevated"
                  : a.is_active
                  ? "border-accent-green bg-accent-green/5"
                  : "border-border bg-background-card hover:border-border-subtle"
              }`}
              onClick={() => selectAssistant(a)}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-foreground truncate">{a.name || "Unnamed"}</div>
                {a.is_active ? (
                  <span className="text-[9px] bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full font-medium">Active</span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAssistant(a.vapi_id);
                    }}
                    className="text-[9px] text-foreground-secondary hover:text-foreground"
                  >
                    Set active
                  </button>
                )}
              </div>
              <div className="text-[11px] text-foreground-muted mt-0.5">
                {a.raw_config?.voice?.provider || a.voice_provider || "—"}/{a.raw_config?.voice?.voiceId || a.raw_config?.voice?.voice || a.voice_id || "—"} · {a.raw_config?.model?.model || a.model || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Assistant Detail */}
      {selected && (
        <>
          {/* Current Voice */}
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Current Voice</label>
            <div className="mt-2 p-3 rounded-[10px] border border-border bg-background-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-foreground-secondary">Provider</div>
                  <div className="text-[14px] font-semibold text-foreground">{editVoiceProvider || "—"}</div>
                </div>
                <div>
                  <div className="text-[12px] text-foreground-secondary">Voice ID</div>
                  <div className="text-[14px] font-semibold text-foreground">{editVoiceId || "—"}</div>
                </div>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setEditingVoice(!editingVoice)}>
                  {editingVoice ? "Done" : "Edit"}
                </Button>
              </div>
              {editingVoice && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div>
                    <label className="text-[10px] text-foreground-secondary">Voice Provider</label>
                    <Select value={editVoiceProvider} onValueChange={setEditVoiceProvider}>
                      <SelectTrigger className="h-8 text-[12px] bg-background-elevated">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p} className="text-[12px]">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-foreground-secondary">Voice ID</label>
                    <Input
                      className="h-8 text-[12px] bg-background-elevated border-border"
                      placeholder="e.g. Elliot, nova, alloy"
                      value={editVoiceId}
                      onChange={(e) => setEditVoiceId(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Model Info */}
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Model</label>
            <div className="mt-2 p-3 rounded-[10px] border border-border bg-background-card">
              <div className="text-[11px] text-foreground-secondary">Provider: {modelProvider || "—"}</div>
              <div className="text-[14px] font-semibold text-foreground">{modelName || "—"}</div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Assistant Name</label>
            <Input
              className="mt-2 bg-background-elevated border-border text-[13px]"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          {/* First Message */}
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">First Message (Greeting)</label>
            <Textarea
              className="mt-2 bg-background-elevated border-border text-foreground text-[13px]"
              value={editFirstMessage}
              onChange={(e) => setEditFirstMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">System Prompt</label>
            <Textarea
              className="mt-2 bg-background-elevated border-border text-foreground text-[13px] resize-y"
              value={editSystemPrompt}
              onChange={(e) => setEditSystemPrompt(e.target.value)}
              rows={8}
            />
          </div>

          {/* Save */}
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving to Vapi...
              </>
            ) : (
              "Save changes to Vapi"
            )}
          </Button>

          {/* Raw Config */}
          <div className="border border-border rounded-[10px] overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 text-[11px] text-foreground-secondary hover:text-foreground transition-colors"
              onClick={() => setShowRawConfig(!showRawConfig)}
            >
              <span>Advanced — Raw Vapi Configuration</span>
              {showRawConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showRawConfig && (
              <div className="p-3 border-t border-border bg-[#08080a] overflow-x-auto max-h-[400px] overflow-y-auto">
                <pre className="text-[11px] font-mono text-accent-green whitespace-pre-wrap break-all">
                  {JSON.stringify(selected.raw_config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
