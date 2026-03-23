import { useState, useEffect } from "react";
import { Copy, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function VoicePhonePanel() {
  const { user } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [areaCode, setAreaCode] = useState("602");
  const [showPurchase, setShowPurchase] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [pnRes, asstRes, clRes] = await Promise.all([
      supabase.from("vapi_phone_numbers").select("*").eq("user_id", user.id).order("is_primary", { ascending: false }),
      supabase.from("vapi_assistants").select("*").eq("user_id", user.id).order("synced_at", { ascending: false }),
      supabase.from("vapi_calls").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(8),
    ]);
    setPhoneNumbers((pnRes.data as any[]) || []);
    setAssistants((asstRes.data as any[]) || []);
    setCalls((clRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  const handlePurchaseNumber = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-manage", {
        body: { action: "purchase-number", areaCode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to purchase number");
      toast({ title: "Phone number purchased!", description: "Your new AI number is ready." });
      setShowPurchase(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    }
    setPurchasing(false);
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    toast({ title: "Copied!" });
  };

  const todayCalls = calls.filter(c => c.started_at && new Date(c.started_at).toDateString() === new Date().toDateString());
  const answered = todayCalls.filter(c => c.status === "ended" || c.status === "completed").length;
  const missed = todayCalls.filter(c => c.status === "no-answer" || c.status === "busy").length;
  const avgDuration = todayCalls.length
    ? Math.round(todayCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / todayCalls.length)
    : 0;

  return (
    <>
      {/* Phone Numbers */}
      <div className="bg-background-card border border-border-subtle rounded-xl p-5">
        {phoneNumbers.length === 0 ? (
          <div className="text-center space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Get your AI phone number</p>
            <p className="text-[11px] text-foreground-secondary">Purchase a phone number for your AI agent to answer calls.</p>
            {showPurchase ? (
              <div className="space-y-2">
                <Input placeholder="Area code (e.g. 602)" value={areaCode}
                  onChange={e => setAreaCode(e.target.value)} className="text-center text-[13px]" />
                <Button onClick={handlePurchaseNumber} disabled={purchasing} className="w-full" size="sm">
                  {purchasing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Purchasing...</> : "Purchase number"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPurchase(false)} className="w-full text-[11px]">Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowPurchase(true)}>
                <Plus className="w-3 h-3 mr-1" />Get a number
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Your AI Numbers</p>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setShowPurchase(!showPurchase)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {showPurchase && (
              <div className="space-y-2 border border-border rounded-lg p-3">
                <Input placeholder="Area code" value={areaCode} onChange={e => setAreaCode(e.target.value)} className="text-center text-[13px]" />
                <Button onClick={handlePurchaseNumber} disabled={purchasing} className="w-full" size="sm">
                  {purchasing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Purchasing...</> : "Purchase"}
                </Button>
              </div>
            )}
            {phoneNumbers.map((pn) => (
              <div key={pn.id} className={`p-3 rounded-lg border ${pn.is_primary ? "border-foreground bg-background-elevated" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[18px] font-bold text-foreground tracking-wide">{pn.number || "(No number)"}</p>
                  {pn.is_primary && <Badge variant="green" className="text-[9px]">Primary</Badge>}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green" />
                  <span className="text-[11px] text-accent-green">Active</span>
                  {pn.name && <span className="text-[11px] text-foreground-secondary ml-2">· {pn.name}</span>}
                </div>
                {pn.assistant_id && (
                  <p className="text-[10px] text-foreground-secondary">
                    Assistant: {assistants.find(a => a.vapi_id === pn.assistant_id)?.name || pn.assistant_id.slice(0, 8)}
                  </p>
                )}
                <div className="flex gap-1.5 mt-2">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => copyNumber(pn.number || "")}>
                    <Copy className="w-3 h-3 mr-1" />Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Stats */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Call Stats Today</p>
        {[
          { label: "Calls received", value: todayCalls.length },
          { label: "Answered by River", value: answered },
          { label: "Missed", value: missed },
          { label: "Avg duration", value: `${avgDuration}s` },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[12px] text-foreground-secondary">{s.label}</span>
            <span className="text-[13px] font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Recent Calls */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Recent Calls</p>
        {calls.length === 0 ? (
          <p className="text-[11px] text-foreground-muted py-2">No calls yet — deploy your voice agent to start</p>
        ) : (
          calls.slice(0, 8).map(call => (
            <div key={call.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div>
                <p className="text-[12px] text-foreground truncate max-w-[160px]">{call.caller_number || "Unknown"}</p>
                <p className="text-[10px] text-foreground-muted">
                  {call.started_at ? new Date(call.started_at).toLocaleTimeString() : "—"}
                  {call.duration_seconds ? ` · ${call.duration_seconds}s` : ""}
                </p>
              </div>
              <Badge variant={call.status === "ended" || call.status === "completed" ? "green" : "destructive"} className="text-[9px]">
                {call.status === "ended" || call.status === "completed" ? "Answered" : call.status || "Unknown"}
              </Badge>
            </div>
          ))
        )}
      </div>
    </>
  );
}
