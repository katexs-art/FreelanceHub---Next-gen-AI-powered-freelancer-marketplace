import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT, MONO } from "@/lib/marketplace/theme";

type Msg = { role: "user" | "assistant"; content: string };

const SEED: Msg[] = [
  { role: "assistant", content: "What do you need built today? Tell me about your project and I'll find the right expert." },
];

export function RiverChat() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("river-chat", {
        body: { messages: next, sessionId: sessionRef.current },
      });
      if (error) throw error;
      if (data?.sessionId) sessionRef.current = data.sessionId;
      setMessages((m) => [...m, { role: "assistant", content: data?.reply || "Hmm, I couldn't generate a reply. Try again." }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: "River is offline right now — please try again in a moment." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
  };

  return (
    <div style={{ background: C.card, padding: "1.6rem", display: "flex", flexDirection: "column", gap: "0.55rem", minHeight: 360 }}>
      <div ref={scrollRef} style={{ display: "flex", flexDirection: "column", gap: "0.55rem", maxHeight: 320, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <Bubble key={i} from={m.role === "assistant" ? "river" : "user"}>
            {m.role === "assistant" && <span style={{ color: C.neon }}>River: </span>}
            {m.content}
          </Bubble>
        ))}
        {loading && <Bubble from="river"><span style={{ color: C.neon }}>River: </span><span style={{ opacity: 0.6 }}>thinking…</span></Bubble>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Type your project..."
          style={{ flex: 1, background: "#0a0a0a", border: "0.5px solid #1a1a1a", borderRadius: 999, padding: "0.5rem 1rem", color: C.gray, fontSize: "0.78rem", outline: "none", fontFamily: FONT }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ background: C.white, color: C.black, borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, padding: "0.5rem 1rem", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: FONT, opacity: loading ? 0.6 : 1 }}
        >
          <Send size={12} /> Send
        </button>
      </div>
    </div>
  );
}

function Bubble({ from, children }: { from: "river" | "user"; children: React.ReactNode }) {
  const isRiver = from === "river";
  return (
    <div style={{
      background: isRiver ? "#0a0a0a" : "#111",
      border: "0.5px solid #1a1a1a",
      borderRadius: 8, padding: "0.7rem 1rem", fontSize: "0.8rem",
      color: isRiver ? "#aaa" : C.gray,
      alignSelf: isRiver ? "flex-start" : "flex-end",
      maxWidth: "90%", fontFamily: FONT, whiteSpace: "pre-wrap",
    }}>{children}</div>
  );
}

export { MONO };
