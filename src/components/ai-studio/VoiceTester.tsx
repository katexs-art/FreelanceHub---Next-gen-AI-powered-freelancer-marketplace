import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { makeVapiCall, getVapiCallStatus, syncCallToSupabase } from "@/services/vapiSync";

type CallState = "idle" | "initiating" | "ringing" | "in-progress" | "completed" | "failed";

export function VoiceTester() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [greeting, setGreeting] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config, phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.phone) setPhone(data.phone);
      const vc = (data?.river_config as any)?.voice_config;
      if (vc?.greeting_script) setGreeting(vc.greeting_script);
    });
  }, [user]);

  useEffect(() => {
    if (callState !== "in-progress") return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCall = async () => {
    if (!user || !phone) {
      toast({ title: "Enter your phone number", variant: "destructive" });
      return;
    }
    setErrorMsg("");
    setCallState("initiating");

    try {
      // Step 1: Get Vapi API key
      const { data: vapiIntegration } = await supabase
        .from("integration_settings")
        .select("api_key, config")
        .eq("user_id", user.id)
        .eq("integration_name", "vapi")
        .eq("status", "connected")
        .single();

      if (!vapiIntegration?.api_key) {
        throw new Error("Connect Vapi first in Settings → Integrations");
      }

      // Step 2: Get active assistant
      const { data: activeAssistant } = await supabase
        .from("vapi_assistants")
        .select("vapi_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!activeAssistant?.vapi_id) {
        throw new Error("No active assistant found. Create one in AI Studio first.");
      }

      // Step 3: Get primary phone number
      const { data: primaryNumber } = await supabase
        .from("vapi_phone_numbers")
        .select("vapi_id, number")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .single();

      if (!primaryNumber?.vapi_id) {
        throw new Error("No phone number found. Add a phone number in AI Studio first.");
      }

      // Step 4: Tell Vapi to make the call
      const vapiKey = vapiIntegration.api_key;
      const callData = await makeVapiCall(
        vapiKey,
        activeAssistant.vapi_id,
        primaryNumber.vapi_id,
        phone,
        user.user_metadata?.full_name || "Test Call"
      );

      setCallState("ringing");

      // Step 5: Poll for call status
      startPollingCallStatus(callData.id, vapiKey, user.id);
    } catch (err: any) {
      console.error("Test call error:", err);
      setCallState("failed");
      setErrorMsg(err.message || "Call failed");
      toast({ title: "Call failed", description: err.message, variant: "destructive" });
    }
  };

  const startPollingCallStatus = (callId: string, vapiKey: string, userId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const callStatus = await getVapiCallStatus(vapiKey, callId);

        if (callStatus.status === "in-progress") {
          setCallState("in-progress");
          setCallDuration(0);
        }

        if (callStatus.status === "ended") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCallState("completed");
          const duration = callStatus.endedAt && callStatus.startedAt
            ? Math.round((new Date(callStatus.endedAt).getTime() - new Date(callStatus.startedAt).getTime()) / 1000)
            : 0;
          setCallDuration(duration);
          // Save to Supabase
          syncCallToSupabase(userId, vapiKey, callId).catch(console.error);
        }

        if (["failed", "error"].includes(callStatus.status)) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCallState("failed");
          setErrorMsg(callStatus.endedReason || "Call failed");
        }
      } catch {
        // Silently continue polling
      }
    }, 2000);

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (callState !== "completed" && callState !== "failed") {
        setCallState("completed");
      }
    }, 120000);
  };

  const previewGreeting = () => {
    speechSynthesis.cancel();
    const text = greeting
      .replace("{business_name}", "your business")
      .replace("{caller_name}", "there")
      .replace("{time_of_day}", "today")
      .replace("{day_of_week}", "");
    const utterance = new SpeechSynthesisUtterance(text || "Hi, thanks for calling. How can I help you today?");
    speechSynthesis.speak(utterance);
  };

  const resetCall = () => {
    setCallState("idle");
    setCallDuration(0);
    setErrorMsg("");
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">Test your voice agent</h3>
        <p className="text-[12px] text-foreground-secondary">Vapi will call your phone with your configured AI agent</p>
      </div>

      <div className="bg-background-card border border-border-subtle rounded-2xl p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
          <Phone className="w-6 h-6 text-foreground" />
        </div>

        {callState === "idle" && (
          <>
            <div>
              <div className="text-[18px] font-bold text-foreground">Call River now</div>
              <p className="text-[13px] text-foreground-secondary mt-1">
                River will call your phone using your Vapi voice agent
              </p>
            </div>
            <Input className="bg-background-elevated border-border text-center text-[15px] max-w-[280px] mx-auto"
              placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button onClick={handleCall} className="w-full max-w-[280px] h-[52px] text-[15px] font-semibold">
              <Phone className="w-4 h-4 mr-2" />Call me now
            </Button>
          </>
        )}

        {callState === "initiating" && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-foreground animate-spin mx-auto" />
            <p className="text-[15px] text-foreground">Connecting to Vapi...</p>
          </div>
        )}

        {callState === "ringing" && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto animate-pulse">
              <Phone className="w-5 h-5 text-accent-green" />
            </div>
            <p className="text-[15px] text-foreground">Your agent is calling... Pick up!</p>
          </div>
        )}

        {callState === "in-progress" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[15px] text-foreground">Call in progress</span>
            </div>
            <div className="text-[32px] font-bold text-foreground tracking-wider">
              {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
            </div>
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
