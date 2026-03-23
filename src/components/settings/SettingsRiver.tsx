import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Play, Bot } from "lucide-react";

const voices = [
  { id: "alloy", name: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", name: "Echo", desc: "Male, professional" },
  { id: "nova", name: "Nova", desc: "Female, clear" },
  { id: "shimmer", name: "Shimmer", desc: "Female, warm" },
];

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-foreground">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-[#4ade80]" : "bg-[#161619] border border-[rgba(255,255,255,0.08)]"}`}
      >
        <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export default function SettingsRiver() {
  const [riverName, setRiverName] = useState("River");
  const [personality, setPersonality] = useState("professional");
  const [customPersonality, setCustomPersonality] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [rate, setRate] = useState(1.0);
  const [voiceScript, setVoiceScript] = useState("Hello, thanks for calling {business_name}. This is River, how can I help you today?");
  const [chatGreeting, setChatGreeting] = useState("Hi there! How can I help you today?");
  const [chatAway, setChatAway] = useState("We're currently outside business hours. Leave a message and we'll get back to you!");
  const [chatStyle, setChatStyle] = useState("conversational");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [features, setFeatures] = useState({
    copilot: true, auto_respond: true, workflow_suggest: true,
    weekly_summary: true, pipeline_insights: true, proactive_alerts: true,
  });

  const handleSave = () => {
    toast({ title: "River settings saved" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">River AI</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Configure your AI business partner</p>
      </div>

      {/* Configuration */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">River name</label>
            <Input value={riverName} onChange={(e) => setRiverName(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Personality</label>
            <select value={personality} onChange={(e) => setPersonality(e.target.value)} className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        {personality === "custom" && (
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Custom personality</label>
            <Textarea value={customPersonality} onChange={(e) => setCustomPersonality(e.target.value)} placeholder="Describe how River should speak..." className="min-h-[60px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
          </div>
        )}
      </div>

      {/* Voice agent */}
      <div className="bg-[rgba(127,119,221,0.06)] border border-[rgba(127,119,221,0.15)] border-t-2 border-t-[#7F77DD] rounded-[10px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#AFA9EC]" />
          <h3 className="text-[14px] font-semibold text-[#AFA9EC]">Voice agent</h3>
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-2 block">Voice selection</label>
          <div className="grid grid-cols-2 gap-2">
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`flex items-center justify-between p-3 rounded-[8px] border transition-colors ${voice === v.id ? "bg-[rgba(127,119,221,0.12)] border-[#7F77DD]" : "bg-[#161619] border-[rgba(255,255,255,0.06)]"}`}
              >
                <div className="text-left">
                  <div className="text-[12px] font-medium text-foreground">{v.name}</div>
                  <div className="text-[10px] text-[#7a7975]">{v.desc}</div>
                </div>
                <Play className="w-3 h-3 text-[#7a7975]" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Speaking rate: {rate.toFixed(1)}x</label>
          <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full accent-[#7F77DD]" />
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Voice agent script</label>
          <Textarea value={voiceScript} onChange={(e) => setVoiceScript(e.target.value)} className="min-h-[60px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
          <p className="text-[10px] text-[#7a7975] mt-1">Variables: {"{business_name}"}, {"{caller_name}"}, {"{time_of_day}"}</p>
        </div>
      </div>

      {/* Chat agent */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Chat agent</h3>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Greeting message</label>
          <Textarea value={chatGreeting} onChange={(e) => setChatGreeting(e.target.value)} className="min-h-[50px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Away message</label>
          <Textarea value={chatAway} onChange={(e) => setChatAway(e.target.value)} className="min-h-[50px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Response style</label>
          <select value={chatStyle} onChange={(e) => setChatStyle(e.target.value)} className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground">
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="conversational">Conversational</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Knowledge base</label>
          <Textarea value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)} placeholder="Tell River about your services, pricing, FAQs, unique selling points..." className="min-h-[80px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>

      {/* Feature toggles */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-1">
        <h3 className="text-[14px] font-semibold text-foreground mb-2">River controls</h3>
        <Toggle label="Co-pilot chat (dashboard)" enabled={features.copilot} onChange={(v) => setFeatures({ ...features, copilot: v })} />
        <Toggle label="Inbox auto-responses" enabled={features.auto_respond} onChange={(v) => setFeatures({ ...features, auto_respond: v })} />
        <Toggle label="Workflow suggestions" enabled={features.workflow_suggest} onChange={(v) => setFeatures({ ...features, workflow_suggest: v })} />
        <Toggle label="Weekly summary" enabled={features.weekly_summary} onChange={(v) => setFeatures({ ...features, weekly_summary: v })} />
        <Toggle label="Pipeline insights" enabled={features.pipeline_insights} onChange={(v) => setFeatures({ ...features, pipeline_insights: v })} />
        <Toggle label="Proactive alerts" enabled={features.proactive_alerts} onChange={(v) => setFeatures({ ...features, proactive_alerts: v })} />
      </div>

      <Button onClick={handleSave} className="h-9 text-[12px] gap-1.5">
        <Save className="w-3.5 h-3.5" /> Save River settings
      </Button>
    </div>
  );
}
