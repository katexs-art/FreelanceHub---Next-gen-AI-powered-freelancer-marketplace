import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string; daily_briefing?: boolean };

const BRIEFING_PROMPT =
  "Give me this morning's briefing: revenue today, active orders, open disputes, new signups, and one recommendation.";

function todayStartISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export default function RiverOps() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessages = async (next: Msg[], dailyBriefing = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const token = session?.access_token ?? supabaseAnonKey;

      const response = await fetch(supabaseUrl + '/functions/v1/river-ops-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          daily_briefing: dailyBriefing,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any)?.error || 'request failed');
      const reply = (data as any)?.reply || (data as any)?.error || "Couldn't reach River Ops.";
      setMessages([...next, { role: "assistant", content: reply, daily_briefing: dailyBriefing }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `Error: ${e.message || "request failed"}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Boot: load today's conversation; trigger briefing if none today
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sod = todayStartISO();
      const { data } = await supabase
        .from("river_ops_conversations")
        .select("role, message, daily_briefing, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sod)
        .order("created_at", { ascending: true });

      const today = (data ?? []) as any[];
      const hasBriefing = today.some((r) => r.daily_briefing && r.role === "assistant");
      const existing: Msg[] = today.map((r) => ({ role: r.role, content: r.message, daily_briefing: r.daily_briefing }));
      setMessages(existing);
      setBooting(false);

      if (!hasBriefing) {
        const next: Msg[] = [...existing, { role: "user", content: BRIEFING_PROMPT, daily_briefing: true }];
        setMessages(next);
        await sendMessages(next, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    await sendMessages(next, false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-page py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="mono-tag mb-2">ADMIN · RIVER OPS</div>
            <h1 className="display-md flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" /> River Ops
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Your AI co-founder. Live platform data, daily briefings, direct opinions.
            </p>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm">Back to Admin</Button>
          </Link>
        </div>

        <div className="surface rounded-lg flex flex-col h-[70vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {booting && <p className="text-sm text-foreground-muted">Loading today's session…</p>}
            {!booting && messages.length === 0 && (
              <p className="text-sm text-foreground-muted">Ask River Ops anything about the platform.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background-elevated border-hairline"
                  )}
                >
                  {m.daily_briefing && m.role === "assistant" && (
                    <div className="mono-tag mb-2">MORNING BRIEFING</div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-background-elevated border-hairline rounded-lg px-4 py-3 text-sm text-foreground-muted">
                  River Ops is thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t-hairline p-3 flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about revenue, disputes, sellers, predictions…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || loading}>
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
