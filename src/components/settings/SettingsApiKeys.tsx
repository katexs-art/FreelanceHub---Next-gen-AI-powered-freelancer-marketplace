import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Key, Copy, Eye, EyeOff, RefreshCw, ExternalLink, Plus } from "lucide-react";

export default function SettingsApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setKeys(data || []);
    });
  }, [user]);

  const generateKey = async () => {
    if (!user) return;
    const keyValue = "ktx_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyValue,
      name: newKeyName || "Default",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "API key created" });
      setNewKeyName("");
      const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setKeys(data || []);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "API key copied" });
  };

  const webhookUrl = user ? `https://app.katexs.com/webhooks/${user.id.slice(0, 12)}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">API keys</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Manage your REST API access and webhooks</p>
      </div>

      {/* API Endpoint */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">REST API</h3>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">API endpoint</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 bg-[#161619] border border-[rgba(255,255,255,0.08)] rounded-md px-3 flex items-center text-[12px] text-foreground font-mono">
              https://api.katexs.com/v1
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText("https://api.katexs.com/v1"); toast({ title: "Copied" }); }} className="h-9 px-2">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="text-[11px] text-[#7a7975]">Rate limit: 1,000 requests/hour (Starter) · Unlimited (Growth+)</div>
      </div>

      {/* API Keys */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">Your API keys</h3>
          <div className="flex items-center gap-2">
            <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" className="h-8 text-[12px] w-[140px]" />
            <Button size="sm" onClick={generateKey} className="h-8 text-[10px] gap-1"><Plus className="w-3 h-3" /> Generate</Button>
          </div>
        </div>
        {keys.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-[#7a7975]">No API keys yet. Generate one to get started.</div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 p-3 bg-[#161619] rounded-[8px] border border-[rgba(255,255,255,0.06)]">
                <Key className="w-4 h-4 text-[#7a7975] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground font-medium">{key.name}</div>
                  <div className="text-[11px] font-mono text-[#7a7975] truncate">
                    {showKey[key.id] ? key.key_hash : key.key_hash.slice(0, 8) + "••••••••••••••••"}
                  </div>
                </div>
                <button onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })} className="text-[#7a7975] hover:text-foreground">
                  {showKey[key.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => copyKey(key.key_hash)} className="text-[#7a7975] hover:text-foreground">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook URL */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Inbound webhook URL</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 bg-[#161619] border border-[rgba(255,255,255,0.08)] rounded-md px-3 flex items-center text-[11px] text-foreground font-mono truncate">
            {webhookUrl}
          </div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Copied" }); }} className="h-9 px-2">
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[11px] text-[#7a7975]">Send POST requests to this URL to trigger workflows from external apps.</p>

        {/* Code example */}
        <div className="bg-[#08080a] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3">
          <pre className="text-[11px] font-mono text-[#c8c7c2] whitespace-pre overflow-x-auto">{`{
  "trigger": "new_lead",
  "contact": {
    "first_name": "John",
    "phone": "+16025550100"
  }
}`}</pre>
        </div>
      </div>

      {/* Quick link */}
      <button onClick={() => window.location.href = "/integrations"} className="flex items-center gap-2 text-[12px] text-[#7a7975] hover:text-foreground transition-colors">
        <ExternalLink className="w-3.5 h-3.5" /> View full integrations page →
      </button>
    </div>
  );
}
