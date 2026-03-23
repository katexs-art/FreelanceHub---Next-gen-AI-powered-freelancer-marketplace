import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Check, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config").eq("user_id", user.id).single().then(({ data }) => {
      const vc = (data?.river_config as any)?.voice_config;
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
    const utterance = new SpeechSynthesisUtterance("Hi, thanks for calling. This is River, how can I help you today?");
    utterance.rate = 1.0;
    utterance.onend = () => setPlayingVoice(null);
    setPlayingVoice(voiceId);
    speechSynthesis.speak(utterance);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("users").select("river_config").eq("user_id", user.id).single();
    const currentConfig = (existing?.river_config as Record<string, unknown>) || {};
    const voiceConfig = {
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
    await supabase.from("users").update({
      river_config: { ...currentConfig, voice_config: voiceConfig } as never
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: "River voice agent updated", description: "Your configuration has been saved." });
  };

  const insertVariable = (v: string) => setGreeting((prev) => prev + " " + v);

  return (
    <>
      {/* Voice Selection */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Voice</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVoice(v.id)}
              className={`relative text-left p-3 rounded-[10px] border transition-all ${
                selectedVoice === v.id
                  ? "border-border-strong bg-background-elevated"
                  : "border-border bg-background-card hover:border-border-subtle"
              }`}
            >
              {selectedVoice === v.id && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-background" />
                </div>
              )}
              <div className="text-[13px] font-semibold text-foreground">{v.name}</div>
              <div className="text-[11px] text-foreground-secondary mt-0.5">{v.desc}</div>
              <button
                onClick={(e) => { e.stopPropagation(); playVoiceSample(v.id); }}
                className="mt-2 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20"
              >
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
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`w-full text-left p-3 rounded-[10px] border transition-all ${
                personality === p.id
                  ? "border-border-strong bg-background-elevated"
                  : "border-border bg-background-card hover:border-border-subtle"
              }`}
            >
              <div className="text-[13px] font-medium text-foreground">{p.label}</div>
              <div className="text-[11px] text-foreground-secondary">{p.desc}</div>
            </button>
          ))}
        </div>
        {personality === "custom" && (
          <Textarea
            className="mt-2 bg-background-elevated border-border text-foreground text-[13px]"
            placeholder="Describe how River should speak and behave on calls..."
            value={customPersonality}
            onChange={(e) => setCustomPersonality(e.target.value)}
            rows={3}
          />
        )}
      </div>

      {/* Greeting */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Opening Greeting</label>
        <Textarea
          className="mt-2 bg-background-elevated border-border text-foreground text-[13px]"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={3}
          maxLength={300}
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1 flex-wrap">
            {VARIABLES.map((v) => (
              <button key={v} onClick={() => insertVariable(v)} className="text-[10px] px-2 py-0.5 rounded-full bg-background-elevated border border-border text-foreground-secondary hover:text-foreground">{v}</button>
            ))}
          </div>
          <span className="text-[10px] text-foreground-muted">{greeting.length}/300</span>
        </div>
      </div>

      {/* Knowledge */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">What River Knows</label>
        <Textarea
          className="mt-2 bg-background-elevated border-border text-foreground text-[13px] resize-y"
          placeholder="Services you offer, pricing, service area, hours, common questions and answers..."
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          rows={6}
        />
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
            <Input
              className="bg-background-elevated border-border text-[13px]"
              placeholder="Transfer phone number"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
            />
          )}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save voice configuration"}
      </Button>
    </>
  );
}
