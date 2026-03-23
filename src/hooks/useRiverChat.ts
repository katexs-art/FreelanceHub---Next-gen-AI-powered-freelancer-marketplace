import { useState, useCallback } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`;

interface RiverContext {
  userName?: string;
  businessName?: string;
  industry?: string;
  date?: string;
  callsToday?: number;
  newLeads?: number;
  booked?: number;
  wonThisWeek?: number;
  lostThisWeek?: number;
  isGreeting?: boolean;
}

export function useRiverChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [tip, setTip] = useState("");

  const streamChat = async (msgs: Msg[], context: RiverContext, onDelta: (t: string) => void, onDone: () => void) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: msgs, context }),
    });

    if (!resp.ok || !resp.body) throw new Error(`Stream failed: ${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { buf = line + "\n" + buf; break; }
      }
    }
    onDone();
  };

  const fetchGreeting = useCallback(async (context: RiverContext) => {
    setIsLoading(true);
    let full = "";
    try {
      await streamChat(
        [{ role: "user", content: "Give me my morning briefing." }],
        { ...context, isGreeting: true },
        (chunk) => {
          full += chunk;
          // Split greeting and tip
          const tipIdx = full.indexOf("TIP:");
          if (tipIdx !== -1) {
            setGreeting(full.slice(0, tipIdx).trim());
            setTip(full.slice(tipIdx + 4).trim());
          } else {
            setGreeting(full);
          }
        },
        () => setIsLoading(false),
      );
    } catch {
      setGreeting("Good morning! I'm analyzing your business data. Check back shortly.");
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (input: string, context: RiverContext) => {
    const userMsg: Msg = { role: "user", content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setIsLoading(true);

    let assistantText = "";
    const update = (chunk: string) => {
      assistantText += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      await streamChat(newMsgs, context, update, () => setIsLoading(false));
    } catch {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, greeting, tip, isLoading, fetchGreeting, sendMessage };
}
