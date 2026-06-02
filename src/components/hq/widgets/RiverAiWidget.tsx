import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export function RiverAiWidget() {
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setA(null);
    try {
      const { data, error } = await supabase.functions.invoke("river-chat", { body: { messages: [{ role: "user", content: q }] } });
      if (error) throw error;
      const text = (data as any)?.reply ?? (data as any)?.content ?? (typeof data === "string" ? data : JSON.stringify(data));
      setA(typeof text === "string" ? text : "—");
    } catch (e: any) {
      setA(e?.message ?? "River is unavailable.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask River anything…"
          className="flex-1 h-9 px-3 rounded-full bg-background-subtle border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" onClick={ask} disabled={busy || !q.trim()}>
          <Sparkles className="h-3.5 w-3.5" /> Ask
        </Button>
      </div>
      {a && <div className="text-sm text-foreground-muted whitespace-pre-wrap max-h-40 overflow-y-auto">{a}</div>}
    </div>
  );
}
