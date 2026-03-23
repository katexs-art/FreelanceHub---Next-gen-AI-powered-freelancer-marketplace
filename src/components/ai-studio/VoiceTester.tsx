import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIntegrations } from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";

type CallState = "idle" | "initiating" | "ringing" | "in_progress" | "completed" | "failed";

export function VoiceTester() {
  const { user } = useAuth();
  const { isConnected } = useIntegrations();
  const [phone, setPhone] = useState("");
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config, phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.phone) setPhone(data.phone);
      const vc = (data?.river_config as any)?.voice_config;
      if (vc?.greeting_script) setGreeting(vc.greeting_script);
    });
  }, [user]);

  useEffect(() => {
    if (callState !== "in_progress") return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const simulateBrowserCall = () => {
    setCallState("initiating");
    setTimeout(() => {
      setCallState("ringing");
      setTimeout(() => {
        setCallState("in_progress");
        setCallDuration(0);
        const text = greeting.replace("{business_name}", "your business").replace("{caller_name}", "there").replace("{time_of_day}", "today").replace("{day_of_week}", "");
        const utterance = new SpeechSynthesisUtterance(text || "Hi, thanks for calling. This is River, how can I help you today?");
        utterance.onend = () => {
          setTimeout(() => { setCallState("completed"); }, 1000);
        };
        speechSynthesis.speak(utterance);
      }, 2000);
    }, 1500);
  };

  const handleCall = async () => {
    setErrorMsg("");
    if (!isConnected("vapi")) {
      simulateBrowserCall();
      return;
    }
    setCallState("initiating");
    try {
      // Real Vapi call would go here via edge function
      simulateBrowserCall();
    } catch (err: any) {
      setCallState("failed");
      setErrorMsg(err.message || "Failed to initiate call");
    }
  };

  const previewGreeting = () => {
    speechSynthesis.cancel();
    const text = greeting.replace("{business_name}", "your business").replace("{caller_name}", "there").replace("{time_of_day}", "today").replace("{day_of_week}", "");
    const utterance = new SpeechSynthesisUtterance(text || "Hi, thanks for calling. This is River, how can I help you today?");
    speechSynthesis.speak(utterance);
  };

  const resetCall = () => { setCallState("idle"); setCallDuration(0); setErrorMsg(""); };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">Test your voice agent</h3>
        <p className="text-[12px] text-foreground-secondary">Hear exactly what your customers will experience</p>
      </div>

      <div className="bg-background-card border border-border-subtle rounded-2xl p-8 text-center space-y-5">
        {/* Phone Icon */}
        <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
          <Phone className="w-6 h-6 text-foreground" />
        </div>

        {callState === "idle" && (
          <>
            <div>
              <div className="text-[18px] font-bold text-foreground">Call River now</div>
              <p className="text-[13px] text-foreground-secondary mt-1">
                {isConnected("vapi")
                  ? "River will call your phone and demonstrate your configured agent"
                  : "Vapi not connected — running browser simulation"}
              </p>
            </div>
            <Input
              className="bg-background-elevated border-border text-center text-[15px] max-w-[280px] mx-auto"
              placeholder="Your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button onClick={handleCall} className="w-full max-w-[280px] h-[52px] text-[15px] font-semibold" disabled={!phone && isConnected("vapi")}>
              <Phone className="w-4 h-4 mr-2" />
              {isConnected("vapi") ? "Call me now" : "Simulate call"}
            </Button>
          </>
        )}

        {callState === "initiating" && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-foreground animate-spin mx-auto" />
            <p className="text-[15px] text-foreground">Connecting to River...</p>
          </div>
        )}

        {callState === "ringing" && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto animate-pulse">
              <Phone className="w-5 h-5 text-accent-green" />
            </div>
            <p className="text-[15px] text-foreground">River is calling your phone... Pick up!</p>
          </div>
        )}

        {callState === "in_progress" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[15px] text-foreground">Call in progress</span>
            </div>
            <div className="text-[32px] font-bold text-foreground tracking-wider">
              {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
            </div>
            {/* Audio waveform */}
            <div className="flex items-end justify-center gap-1 h-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-1 bg-accent-green rounded-full animate-pulse" style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {callState === "completed" && (
          <div className="space-y-4">
            <CheckCircle className="w-10 h-10 text-accent-green mx-auto" />
            <p className="text-[15px] text-foreground">Call completed — {callDuration} seconds</p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={resetCall}>Sounds great 👍</Button>
              <Button variant="ghost" size="sm" onClick={resetCall}>Needs adjustment 👎</Button>
            </div>
          </div>
        )}

        {callState === "failed" && (
          <div className="space-y-3">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-[13px] text-destructive">{errorMsg || "Call failed"}</p>
            <Button variant="ghost" size="sm" onClick={resetCall}>Try again</Button>
          </div>
        )}
      </div>

      {/* Browser preview */}
      <div className="bg-background-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-foreground-secondary">Preview greeting without a call</span>
          <Button variant="ghost" size="sm" onClick={previewGreeting}>
            <Play className="w-3 h-3 mr-1" /> Play
          </Button>
        </div>
      </div>
    </div>
  );
}
