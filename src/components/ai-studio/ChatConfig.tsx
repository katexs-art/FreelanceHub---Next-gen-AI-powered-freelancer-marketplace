import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const POSITIONS = [
  { id: "bottom-right", label: "↘" },
  { id: "bottom-left", label: "↙" },
  { id: "top-right", label: "↗" },
  { id: "top-left", label: "↖" },
];

const RESPONSE_STYLES = [
  { id: "concise", label: "Concise", desc: "Short, direct answers" },
  { id: "detailed", label: "Detailed", desc: "Thorough explanations" },
  { id: "conversational", label: "Conversational", desc: "Natural, friendly" },
];

const AUTO_OPEN = [
  { id: "never", label: "Never" },
  { id: "5", label: "After 5s" },
  { id: "10", label: "After 10s" },
  { id: "30", label: "After 30s" },
];

export function ChatConfig() {
  const { user } = useAuth();
  const [position, setPosition] = useState("bottom-right");
  const [primaryColor, setPrimaryColor] = useState("#020203");
  const [textColor, setTextColor] = useState("#f8f7f4");
  const [accentColor, setAccentColor] = useState("#4ade80");
  const [size, setSize] = useState("standard");
  const [launcherStyle, setLauncherStyle] = useState("icon");
  const [launcherText, setLauncherText] = useState("Chat with us");
  const [showAvatar, setShowAvatar] = useState(true);
  const [agentName, setAgentName] = useState("AI Assistant");
  const [agentTitle, setAgentTitle] = useState("AI Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi there! I'm the AI assistant for {business_name}. How can I help you today?");
  const [awayMessage, setAwayMessage] = useState("We're currently closed. Leave a message and we'll follow up!");
  const [responseStyle, setResponseStyle] = useState("conversational");
  const [autoOpen, setAutoOpen] = useState("never");
  const [knowledge, setKnowledge] = useState("");
  const [captureEnabled, setCaptureEnabled] = useState(true);
  const [captureName, setCaptureName] = useState(true);
  const [captureEmail, setCaptureEmail] = useState(true);
  const [capturePhone, setCapturePhone] = useState(false);
  const [websiteChat, setWebsiteChat] = useState(true);
  const [smsChannel, setSmsChannel] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config").eq("user_id", user.id).single().then(({ data }) => {
      const cc = (data?.river_config as any)?.chat_config;
      if (cc) {
        setPosition(cc.position || "bottom-right");
        setPrimaryColor(cc.primary_color || "#020203");
        setTextColor(cc.text_color || "#f8f7f4");
        setAccentColor(cc.accent_color || "#4ade80");
        setSize(cc.size || "standard");
        setLauncherStyle(cc.launcher_style || "icon");
        setLauncherText(cc.launcher_text || "Chat with us");
        setShowAvatar(cc.show_avatar ?? true);
        setAgentName(cc.agent_name || "AI Assistant");
        setAgentTitle(cc.agent_title || "AI Assistant");
        setWelcomeMessage(cc.welcome_message || welcomeMessage);
        setAwayMessage(cc.away_message || awayMessage);
        setResponseStyle(cc.response_style || "conversational");
        setAutoOpen(cc.auto_open_delay || "never");
        setKnowledge(cc.knowledge_base || "");
        setCaptureEnabled(cc.lead_capture_enabled ?? true);
        setCaptureName(cc.capture_name ?? true);
        setCaptureEmail(cc.capture_email ?? true);
        setCapturePhone(cc.capture_phone ?? false);
        setWebsiteChat(cc.website_chat ?? true);
        setSmsChannel(cc.sms_channel ?? false);
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("users").select("river_config").eq("user_id", user.id).single();
    const currentConfig = (existing?.river_config as Record<string, unknown>) || {};
    const chatConfig = {
      position, primary_color: primaryColor, text_color: textColor, accent_color: accentColor,
      size, launcher_style: launcherStyle, launcher_text: launcherText,
      show_avatar: showAvatar, agent_name: agentName, agent_title: agentTitle,
      welcome_message: welcomeMessage, away_message: awayMessage, response_style: responseStyle,
      auto_open_delay: autoOpen, knowledge_base: knowledge,
      lead_capture_enabled: captureEnabled, capture_name: captureName, capture_email: captureEmail, capture_phone: capturePhone,
      website_chat: websiteChat, sms_channel: smsChannel,
    };
    await supabase.from("users").update({
      river_config: { ...currentConfig, chat_config: chatConfig } as never
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: "Chat agent updated", description: "Your configuration has been saved." });
  };

  return (
    <>
      {/* Widget Design */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Widget Design</label>
        <div className="mt-2 space-y-3">
          <div>
            <span className="text-[12px] text-foreground-secondary">Position</span>
            <div className="flex gap-2 mt-1">
              {POSITIONS.map((p) => (
                <button key={p.id} onClick={() => setPosition(p.id)}
                  className={`w-10 h-10 rounded-lg border text-[14px] flex items-center justify-center ${position === p.id ? "border-foreground bg-background-elevated text-foreground" : "border-border bg-background-card text-foreground-secondary"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Widget", value: primaryColor, set: setPrimaryColor },
              { label: "Text", value: textColor, set: setTextColor },
              { label: "Accent", value: accentColor, set: setAccentColor },
            ].map((c) => (
              <div key={c.label}>
                <span className="text-[10px] text-foreground-secondary">{c.label}</span>
                <div className="flex gap-1 mt-1">
                  <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                  <Input value={c.value} onChange={(e) => c.set(e.target.value)} className="text-[10px] h-8 bg-background-elevated border-border px-1" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <span className="text-[12px] text-foreground-secondary">Launcher style</span>
            <div className="flex gap-2 mt-1">
              {[{ id: "icon", label: "Icon only" }, { id: "text", label: "Icon + text" }].map((s) => (
                <button key={s.id} onClick={() => setLauncherStyle(s.id)}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] ${launcherStyle === s.id ? "border-foreground bg-background-elevated text-foreground" : "border-border bg-background-card text-foreground-secondary"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {launcherStyle === "text" && (
              <Input value={launcherText} onChange={(e) => setLauncherText(e.target.value)} className="mt-2 text-[12px] h-8 bg-background-elevated border-border" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-foreground">Show avatar</span>
            <Switch checked={showAvatar} onCheckedChange={setShowAvatar} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-foreground-secondary">Agent name</span>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="mt-1 text-[12px] h-8 bg-background-elevated border-border" />
            </div>
            <div>
              <span className="text-[10px] text-foreground-secondary">Agent title</span>
              <Input value={agentTitle} onChange={(e) => setAgentTitle(e.target.value)} className="mt-1 text-[12px] h-8 bg-background-elevated border-border" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Behavior */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Chat Settings</label>
        <div className="mt-2 space-y-3">
          <div>
            <span className="text-[10px] text-foreground-secondary">Welcome message</span>
            <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="mt-1 text-[12px] bg-background-elevated border-border" rows={2} maxLength={200} />
            <span className="text-[10px] text-foreground-muted">{welcomeMessage.length}/200</span>
          </div>
          <div>
            <span className="text-[10px] text-foreground-secondary">Away message</span>
            <Textarea value={awayMessage} onChange={(e) => setAwayMessage(e.target.value)} className="mt-1 text-[12px] bg-background-elevated border-border" rows={2} />
          </div>
          <div>
            <span className="text-[12px] text-foreground-secondary">Response style</span>
            <div className="flex gap-2 mt-1">
              {RESPONSE_STYLES.map((s) => (
                <button key={s.id} onClick={() => setResponseStyle(s.id)}
                  className={`flex-1 p-2 rounded-lg border text-[11px] text-center ${responseStyle === s.id ? "border-foreground bg-background-elevated text-foreground" : "border-border bg-background-card text-foreground-secondary"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[12px] text-foreground-secondary">Auto-open</span>
            <div className="flex gap-2 mt-1">
              {AUTO_OPEN.map((o) => (
                <button key={o.id} onClick={() => setAutoOpen(o.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] ${autoOpen === o.id ? "border-foreground bg-background-elevated text-foreground" : "border-border bg-background-card text-foreground-secondary"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">What River Knows in Chat</label>
        <p className="text-[10px] text-foreground-muted mt-0.5">Shared between voice and chat agents</p>
        <Textarea value={knowledge} onChange={(e) => setKnowledge(e.target.value)} className="mt-2 text-[12px] bg-background-elevated border-border resize-y" rows={5} placeholder="Services, pricing, FAQs..." />
      </div>

      {/* Lead Capture */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Lead Capture</label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-foreground">Ask for contact info</span>
            <Switch checked={captureEnabled} onCheckedChange={setCaptureEnabled} />
          </div>
          {captureEnabled && (
            <div className="pl-2 space-y-2 border-l-2 border-border ml-1">
              {[
                { label: "Name", value: captureName, set: setCaptureName },
                { label: "Email", value: captureEmail, set: setCaptureEmail },
                { label: "Phone", value: capturePhone, set: setCapturePhone },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-foreground-secondary">{f.label}</span>
                  <Switch checked={f.value} onCheckedChange={f.set} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Active Channels</label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-foreground">Website chat widget</span>
            <Switch checked={websiteChat} onCheckedChange={setWebsiteChat} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-foreground">SMS (via Twilio)</span>
            <Switch checked={smsChannel} onCheckedChange={setSmsChannel} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save chat configuration"}
      </Button>
    </>
  );
}
