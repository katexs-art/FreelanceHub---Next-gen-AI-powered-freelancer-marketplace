import { useState, useEffect } from "react";
import { Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIntegrations } from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function VoicePhonePanel() {
  const { user } = useAuth();
  const { getIntegration, isConnected } = useIntegrations();
  const [stats, setStats] = useState({ received: 0, answered: 0, missed: 0, avgDuration: 0, booked: 0 });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  const twilioConfig = getIntegration("twilio")?.config as any;
  const phoneNumber = twilioConfig?.phone_number;

  useEffect(() => {
    if (!user) return;
    supabase.from("activities").select("*").eq("user_id", user.id).eq("type", "call").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) {
          setRecentCalls(data);
          setStats({
            received: data.length,
            answered: data.filter((a) => a.description?.includes("completed")).length,
            missed: data.filter((a) => a.description?.includes("Missed")).length,
            avgDuration: 0,
            booked: 0,
          });
        }
      });
  }, [user]);

  const copyNumber = () => {
    if (phoneNumber) { navigator.clipboard.writeText(phoneNumber); toast({ title: "Copied!" }); }
  };

  return (
    <>
      {/* Phone Number Card */}
      <div className="bg-background-card border border-border-subtle rounded-xl p-5">
        {!isConnected("twilio") ? (
          <div className="text-center space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Get your AI phone number</p>
            <p className="text-[11px] text-foreground-secondary">Connect Twilio in Integrations to get a phone number for River</p>
            <Button variant="ghost" size="sm" asChild>
              <a href="/integrations">Connect Twilio →</a>
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Your AI number</p>
            <p className="text-[24px] font-bold text-foreground tracking-wide">{phoneNumber || "(No number)"}</p>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-[11px] text-accent-green">Active</span>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={copyNumber}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
              <Button variant="ghost" size="sm"><QrCode className="w-3 h-3 mr-1" /> QR</Button>
            </div>
          </div>
        )}
      </div>

      {/* Call Stats */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Call Stats Today</p>
        {[
          { label: "Calls received", value: stats.received },
          { label: "Answered by River", value: stats.answered },
          { label: "Missed", value: stats.missed },
          { label: "Avg duration", value: `${stats.avgDuration}s` },
          { label: "Appointments booked", value: stats.booked },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[12px] text-foreground-secondary">{s.label}</span>
            <span className="text-[13px] font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Recent Calls */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Recent Calls</p>
        {recentCalls.length === 0 ? (
          <p className="text-[11px] text-foreground-muted py-2">No calls yet</p>
        ) : (
          recentCalls.slice(0, 8).map((call) => (
            <div key={call.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div>
                <p className="text-[12px] text-foreground truncate max-w-[160px]">{call.description?.slice(0, 40)}...</p>
                <p className="text-[10px] text-foreground-muted">{new Date(call.created_at).toLocaleTimeString()}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                call.description?.includes("Missed") ? "bg-destructive/10 text-destructive" : "bg-accent-green/10 text-accent-green"
              }`}>
                {call.description?.includes("Missed") ? "Missed" : "Answered"}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
