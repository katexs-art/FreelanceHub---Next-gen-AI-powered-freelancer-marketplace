import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Check, Play, Pause, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { createVapiAssistant, updateVapiAssistant } from "@/services/vapiSync";

const VOICES = [
  { id: "alloy", name: "Alloy", desc: "Neutral & Professional" },
  { id: "echo", name: "Echo", desc: "Deep & Authoritative" },
  { id: "nova", name: "Nova", desc: "Warm & Friendly" },
  { id: "shimmer", name: "Shimmer", desc: "Bright & Energetic" },
  { id: "fable", name: "Fable", desc: "Calm & Reassuring" },
  { id: "onyx", name: "Onyx", desc: "Rich & Confident" },
];

const PERSONALITIES = [
  { id: "professional", label: "Professional", desc: "Formal, efficient, business-focused" },
  { id: "friendly", label: "Friendly", desc: "Warm, conversational, approachable" },
  { id: "casual", label: "Casual", desc: "Relaxed, natural, like talking to a person" },
  { id: "custom", label: "Custom", desc: "Write your own personality" },
];

const VARIABLES = ["{business_name}", "{caller_name}", "{time_of_day}", "{day_of_week}"];

export function VoiceConfig() {
  const { user } = useAuth();
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [personality, setPersonality] = useState("friendly");
  const [customPersonality, setCustomPersonality] = useState("");
  const [greeting, setGreeting] = useState("Hi, thanks for calling {business_name}. How can I help you today?");
  const [knowledge, setKnowledge] = useState("");
  const [recordCalls, setRecordCalls] = useState(false);
  const [transcribeCalls, setTranscribeCalls] = useState(true);
  const [bookAppointments, setBookAppointments] = useState(true);
  const [collectInfo, setCollectInfo] = useState(true);
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [assistants, setAssistants] = useState<any[]>([]);
  const [vapiConnected, setVapiConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load user config + check Vapi connection + load assistants
    Promise.all([
      supabase.from("users").select("river_config, business_name, industry").eq("user_id", user.id).single(),
      supabase.from("integration_settings").select("api_key, status").eq("user_id", user.id).eq("integration_name", "vapi").eq("status", "connected").single(),
      supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false }),
    ]).then(([userRes, vapiRes, asstRes]) => {
      setBusinessName(userRes.data?.business_name || "");
      setIndustry(userRes.data?.industry || "");
      setVapiConnected(!!vapiRes.data?.api_key);
      setAssistants((asstRes.data as any[]) || []);

      const vc = (userRes.data?.river_config as any)?.voice_config;
      if (vc) {
        setSelectedVoice(vc.voice_id || "nova");
        setPersonality(vc.personality || "friendly");
        setCustomPersonality(vc.custom_personality || "");
        setGreeting(vc.greeting_script || greeting);
        setKnowledge(vc.knowledge_base || "");
        setRecordCalls(vc.record_calls ?? false);
        setTranscribeCalls(vc.transcribe ?? true);
        setBookAppointments(vc.book_appointments ?? true);
        setCollectInfo(vc.collect_info ?? true);
        setTransferEnabled(vc.transfer_enabled ?? false);
        setTransferNumber(vc.transfer_number || "");
        setVapiAssistantId(vc.vapi_assistant_id || null);
      }
    });
  }, [user]);

  const playVoiceSample = (voiceId: string) => {
    if (playingVoice === voiceId) {
      speechSynthesis.cancel();
      setPlayingVoice(null);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hi, thanks for calling. How can I help you today?");
    utterance.rate = 1.0;
    utterance.onend = () => setPlayingVoice(null);
    setPlayingVoice(voiceId);
    speechSynthesis.speak(utterance);
  };

  const buildSystemPrompt = () => {
    const personalityText = personality === "custom" ? customPersonality :
      personality === "professional" ? "Be formal, efficient, and business-focused." :
      personality === "friendly" ? "Be warm, conversational, and approachable." :
      "Be relaxed and natural, like talking to a friend.";

    return `You are the AI phone assistant for ${businessName || "the business"}${industry ? `, a ${industry} company` : ""}.

${personalityText}

${knowledge ? `Here's what you know about the business:\n${knowledge}` : ""}

${bookAppointments ? "If the caller wants to book an appointment, collect their preferred date/time and confirm." : ""}
${collectInfo ? "Always collect the caller's name and best callback number." : ""}
Keep responses concise and natural for a phone conversation.
If asked if you are a robot or AI: say you are the virtual assistant for ${businessName || "the business"}.`;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const voiceConfig: Record<string, unknown> = {
        voice_id: selectedVoice,
        personality,
        custom_personality: customPersonality,
        greeting_script: greeting,
        knowledge_base: knowledge,
        record_calls: recordCalls,
        transcribe: transcribeCalls,
        book_appointments: bookAppointments,
        collect_info: collectInfo,
        transfer_enabled: transferEnabled,
        transfer_number: transferNumber,
      };

      // Check if Vapi is connected
      if (vapiConnected) {
        const { data: vapiIntegration } = await supabase
          .from("integration_settings")
          .select("api_key")
          .eq("user_id", user.id)
          .eq("integration_name", "vapi")
          .eq("status", "connected")
          .single();

        if (vapiIntegration?.api_key) {
          const config = {
            businessName: businessName || "AI Assistant",
            industry: industry || "",
            voiceId: selectedVoice,
            personality,
            greetingScript: greeting,
            knowledgeBase: knowledge,
            recordCalls,
            transferEnabled,
            systemPrompt,
          };

          let assistant;
          if (vapiAssistantId) {
            assistant = await updateVapiAssistant(vapiAssistantId, config, vapiIntegration.api_key, user.id);
          } else {
            assistant = await createVapiAssistant(config, vapiIntegration.api_key, user.id);
          }

          const newId = assistant?.id || vapiAssistantId;
          voiceConfig.vapi_assistant_id = newId;
          if (newId) setVapiAssistantId(newId);

          // Refresh assistants list
          const { data: updatedAssistants } = await supabase
            .from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false });
          setAssistants((updatedAssistants as any[]) || []);

          toast({ title: "Voice agent live!", description: vapiAssistantId ? "Updated on Vapi." : "Created and deployed to Vapi." });
        }
      } else {
        voiceConfig.vapi_assistant_id = vapiAssistantId;
        toast({ title: "Config saved locally", description: "Connect Vapi in Integrations to deploy your voice agent." });
      }

      // Save to user profile
      const { data: existing } = await supabase.from("users").select("river_config").eq("user_id", user.id).single();
      const currentConfig = (existing?.river_config as Record<string, unknown>) || {};
      await supabase.from("users").update({
        river_config: { ...currentConfig, voice_config: voiceConfig } as never,
      }).eq("user_id", user.id);
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const loadAssistant = (asst: any) => {
    setVapiAssistantId(asst.vapi_id);
    if (asst.voice_id) setSelectedVoice(asst.voice_id);
    if (asst.first_message) setGreeting(asst.first_message);
    if (asst.system_prompt) setKnowledge(asst.system_prompt);
    toast({ title: `Loaded: ${asst.name}` });
  };

  const setActiveAssistant = async (vapiId: string) => {
    if (!user) return;
    await supabase.from("vapi_assistants").update({ is_active: false } as any).eq("user_id", user.id);
    await supabase.from("vapi_assistants").update({ is_active: true } as any).eq("user_id", user.id).eq("vapi_id", vapiId);
    const { data } = await supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("created_at_vapi", { ascending: false });
    setAssistants((data as any[]) || []);
    toast({ title: "Active assistant updated" });
  };

  const insertVariable = (v: string) => setGreeting((prev) => prev + " " + v);

  return (
    <>
      {/* Synced Assistants */}
      {assistants.length > 0 && (
        <div>
          <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Your Assistants</label>
          <div className="space-y-2 mt-2">
            {assistants.map((a) => (
              <div key={a.id}
                className={`p-3 rounded-[10px] border transition-all cursor-pointer ${
                  a.is_active ? "border-accent-green bg-accent-green/5" : "border-border bg-background-card hover:border-border-subtle"
                }`}
                onClick={() => loadAssistant(a)}>
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold text-foreground truncate">{a.name || "Unnamed"}</div>
                  {a.is_active ? (
                    <span className="text-[9px] text-accent-green font-medium">Active</span>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setActiveAssistant(a.vapi_id); }}
                      className="text-[9px] text-foreground-secondary hover:text-foreground">Set active</button>
                  )}
                </div>
                <div className="text-[10px] text-foreground-secondary mt-0.5">
                  {a.voice_provider}/{a.voice_id} · {a.model || "gpt-4o-mini"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Selection */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Voice</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {VOICES.map((v) => (
            <button key={v.id} onClick={() => setSelectedVoice(v.id)}
              className={`relative text-left p-3 rounded-[10px] border transition-all ${
                selectedVoice === v.id ? "border-border-strong bg-background-elevated" : "border-border bg-background-card hover:border-border-subtle"
              }`}>
              {selectedVoice === v.id && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-background" />
                </div>
              )}
              <div className="text-[13px] font-semibold text-foreground">{v.name}</div>
              <div className="text-[11px] text-foreground-secondary mt-0.5">{v.desc}</div>
              <button onClick={(e) => { e.stopPropagation(); playVoiceSample(v.id); }}
                className="mt-2 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20">
                {playingVoice === v.id ? <Pause className="w-3 h-3 text-foreground" /> : <Play className="w-3 h-3 text-foreground ml-0.5" />}
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Personality</label>
        <div className="space-y-2 mt-2">
          {PERSONALITIES.map((p) => (
            <button key={p.id} onClick={() => setPersonality(p.id)}
              className={`w-full text-left p-3 rounded-[10px] border transition-all ${
                personality === p.id ? "border-border-strong bg-background-elevated" : "border-border bg-background-card hover:border-border-subtle"
              }`}>
              <div className="text-[13px] font-medium text-foreground">{p.label}</div>
              <div className="text-[11px] text-foreground-secondary">{p.desc}</div>
            </button>
          ))}
        </div>
        {personality === "custom" && (
          <Textarea className="mt-2 bg-background-elevated border-border text-foreground text-[13px]"
            placeholder="Describe how your agent should speak and behave on calls..."
            value={customPersonality} onChange={(e) => setCustomPersonality(e.target.value)} rows={3} />
        )}
      </div>

      {/* Greeting */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Opening Greeting</label>
        <Textarea className="mt-2 bg-background-elevated border-border text-foreground text-[13px]"
          value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} maxLength={300} />
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1 flex-wrap">
            {VARIABLES.map((v) => (
              <button key={v} onClick={() => insertVariable(v)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-background-elevated border border-border text-foreground-secondary hover:text-foreground">{v}</button>
            ))}
          </div>
          <span className="text-[10px] text-foreground-muted">{greeting.length}/300</span>
        </div>
      </div>

      {/* Knowledge */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Agent Knowledge Base</label>
        <Textarea className="mt-2 bg-background-elevated border-border text-foreground text-[13px] resize-y"
          placeholder="Services you offer, pricing, service area, hours, common questions and answers..."
          value={knowledge} onChange={(e) => setKnowledge(e.target.value)} rows={6} />
      </div>

      {/* Call Settings */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Call Settings</label>
        <div className="space-y-3 mt-2">
          {[
            { label: "Record calls", value: recordCalls, set: setRecordCalls },
            { label: "Transcribe calls", value: transcribeCalls, set: setTranscribeCalls },
            { label: "Book appointments during call", value: bookAppointments, set: setBookAppointments },
            { label: "Collect caller name + number", value: collectInfo, set: setCollectInfo },
            { label: "Transfer to human option", value: transferEnabled, set: setTransferEnabled },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[13px] text-foreground">{item.label}</span>
              <Switch checked={item.value} onCheckedChange={item.set} />
            </div>
          ))}
          {transferEnabled && (
            <Input className="bg-background-elevated border-border text-[13px]"
              placeholder="Transfer phone number" value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)} />
          )}
        </div>
      </div>

      {!vapiConnected && (
        <div className="flex items-center gap-2 text-[11px] text-foreground-secondary bg-background-elevated border border-border rounded-lg p-3">
          ⚠ Connect Vapi in Integrations to deploy your voice agent to a real phone number.
        </div>
      )}

      {vapiAssistantId && vapiConnected && (
        <div className="flex items-center gap-2 text-[11px] text-accent-green">
          <Check className="w-3 h-3" />
          <span>Vapi assistant synced</span>
        </div>
      )}

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Deploying...</> : vapiConnected ? "Save & deploy voice agent" : "Save configuration"}
      </Button>
    </>
  );
}
