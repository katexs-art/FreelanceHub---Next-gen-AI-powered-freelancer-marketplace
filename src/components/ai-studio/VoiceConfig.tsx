import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Check, Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface VoiceOption {
  id: string;
  name: string;
  provider: string;
  desc: string;
}

const FALLBACK_VOICES: VoiceOption[] = [
  { id: "nova", name: "Nova", provider: "openai", desc: "Warm & friendly" },
  { id: "alloy", name: "Alloy", provider: "openai", desc: "Neutral & professional" },
  { id: "echo", name: "Echo", provider: "openai", desc: "Deep & authoritative" },
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
  const [voices, setVoices] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [personality, setPersonality] = useState("friendly");
  const [customPersonality, setCustomPersonality] = useState("");
  const [greeting, setGreeting] = useState("Hi, thanks for calling {business_name}. This is River, how can I help you today?");
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

  // Fetch voices from edge function
  useEffect(() => {
    async function fetchVoices() {
      try {
        const { data, error } = await supabase.functions.invoke("vapi-manage", {
          body: { action: "list-voices" },
        });
        if (!error && data?.data) {
          setVoices(data.data);
        }
      } catch {
        // keep fallback voices
      }
      setLoadingVoices(false);
    }
    fetchVoices();
  }, []);

  // Load saved config
  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config, business_name, industry").eq("user_id", user.id).single().then(({ data }) => {
      setBusinessName(data?.business_name || "");
      setIndustry(data?.industry || "");
      const vc = (data?.river_config as any)?.voice_config;
      if (vc) {
        setSelectedVoice(vc.voice_id || "nova");
        setSelectedProvider(vc.voice_provider || "openai");
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

  // Sync assistants on load
  useEffect(() => {
    if (!user) return;
    supabase.functions.invoke("vapi-manage", { body: { action: "sync-assistants" } }).catch(() => {});
  }, [user]);

  const selectVoice = (v: VoiceOption) => {
    setSelectedVoice(v.id);
    setSelectedProvider(v.provider);
  };

  const playVoiceSample = (voiceId: string) => {
    if (playingVoice === voiceId) {
      speechSynthesis.cancel();
      setPlayingVoice(null);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hi, thanks for calling. This is River, how can I help you today?");
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

    return `You are River, the AI phone assistant for ${businessName || "the business"}${industry ? `, a ${industry} company` : ""}.

${personalityText}

${knowledge ? `Here's what you know about the business:\n${knowledge}` : ""}

${bookAppointments ? "If the caller wants to book an appointment, collect their preferred date/time and confirm." : ""}
${collectInfo ? "Always collect the caller's name and best callback number." : ""}
Keep responses concise and natural for a phone conversation.`;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const voiceConfig: Record<string, unknown> = {
        voice_id: selectedVoice,
        voice_provider: selectedProvider,
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

      const systemPrompt = buildSystemPrompt();
      const resolvedGreeting = greeting
        .replace("{business_name}", businessName || "our business")
        .replace("{caller_name}", "there")
        .replace("{time_of_day}", "today")
        .replace("{day_of_week}", "");

      const { data: vapiResult, error: vapiError } = await supabase.functions.invoke("vapi-manage", {
        body: {
          action: vapiAssistantId ? "update-assistant" : "create-assistant",
          assistantId: vapiAssistantId || undefined,
          name: `River - ${businessName || "AI Assistant"}`,
          firstMessage: resolvedGreeting,
          voice: selectedVoice,
          voiceProvider: selectedProvider,
          systemPrompt,
          recordCalls,
          transcribeCalls,
          transferNumber: transferEnabled ? transferNumber : undefined,
        },
      });

      if (vapiError) throw vapiError;

      const newAssistantId = vapiResult?.data?.id || vapiAssistantId;
      voiceConfig.vapi_assistant_id = newAssistantId;
      if (newAssistantId) setVapiAssistantId(newAssistantId);

      const { data: existing } = await supabase.from("users").select("river_config").eq("user_id", user.id).single();
      const currentConfig = (existing?.river_config as Record<string, unknown>) || {};
      await supabase.from("users").update({
        river_config: { ...currentConfig, voice_config: voiceConfig } as never,
      }).eq("user_id", user.id);

      toast({ title: "Voice agent live!", description: vapiAssistantId ? "River voice agent updated on Vapi." : "River voice agent created and deployed." });
    } catch (err: any) {
      console.error("Save voice config error:", err);
      toast({ title: "Configuration saved locally", description: "Voice config saved. Vapi sync will retry automatically.", variant: "destructive" });

      const { data: existing } = await supabase.from("users").select("river_config").eq("user_id", user.id).single();
      const currentConfig = (existing?.river_config as Record<string, unknown>) || {};
      const voiceConfig = {
        voice_id: selectedVoice, voice_provider: selectedProvider, personality,
        custom_personality: customPersonality, greeting_script: greeting,
        knowledge_base: knowledge, record_calls: recordCalls, transcribe: transcribeCalls,
        book_appointments: bookAppointments, collect_info: collectInfo,
        transfer_enabled: transferEnabled, transfer_number: transferNumber,
        vapi_assistant_id: vapiAssistantId,
      };
      await supabase.from("users").update({
        river_config: { ...currentConfig, voice_config: voiceConfig } as never,
      }).eq("user_id", user.id);
    }
    setSaving(false);
  };

  const insertVariable = (v: string) => setGreeting((prev) => prev + " " + v);

  const vapiVoices = voices.filter((v) => v.provider === "vapi");
  const openaiVoices = voices.filter((v) => v.provider === "openai");

  return (
    <>
      {/* Voice Selection */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Voice</label>

        {loadingVoices ? (
          <div className="flex items-center gap-2 mt-2 text-[12px] text-foreground-secondary">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading voices...
          </div>
        ) : (
          <>
            {vapiVoices.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] text-foreground-muted uppercase tracking-[0.08em]">Vapi Voices</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {vapiVoices.map((v) => (
                    <VoiceCard key={`${v.provider}-${v.id}`} voice={v} selected={selectedVoice === v.id && selectedProvider === v.provider}
                      playing={playingVoice === v.id} onSelect={() => selectVoice(v)}
                      onPlay={() => playVoiceSample(v.id)} />
                  ))}
                </div>
              </div>
            )}

            {openaiVoices.length > 0 && (
              <div className="mt-3">
                <span className="text-[10px] text-foreground-muted uppercase tracking-[0.08em]">OpenAI Voices</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {openaiVoices.map((v) => (
                    <VoiceCard key={`${v.provider}-${v.id}`} voice={v} selected={selectedVoice === v.id && selectedProvider === v.provider}
                      playing={playingVoice === v.id} onSelect={() => selectVoice(v)}
                      onPlay={() => playVoiceSample(v.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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
            placeholder="Describe how River should speak and behave on calls..."
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
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">What River Knows</label>
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

      {vapiAssistantId && (
        <div className="flex items-center gap-2 text-[11px] text-accent-green">
          <Check className="w-3 h-3" />
          <span>Vapi assistant synced ({selectedProvider}/{selectedVoice})</span>
        </div>
      )}

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Deploying to Vapi...</> : "Save & deploy voice agent"}
      </Button>
    </>
  );
}

function VoiceCard({ voice, selected, playing, onSelect, onPlay }: {
  voice: VoiceOption; selected: boolean; playing: boolean;
  onSelect: () => void; onPlay: () => void;
}) {
  return (
    <button onClick={onSelect}
      className={`relative text-left p-3 rounded-[10px] border transition-all ${
        selected ? "border-border-strong bg-background-elevated" : "border-border bg-background-card hover:border-border-subtle"
      }`}>
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-background" />
        </div>
      )}
      <div className="text-[13px] font-semibold text-foreground">{voice.name}</div>
      <div className="text-[11px] text-foreground-secondary mt-0.5">{voice.desc}</div>
      <button onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className="mt-2 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20">
        {playing ? <Pause className="w-3 h-3 text-foreground" /> : <Play className="w-3 h-3 text-foreground ml-0.5" />}
      </button>
    </button>
  );
}
