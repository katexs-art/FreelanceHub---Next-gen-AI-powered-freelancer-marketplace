import { useState, useCallback } from "react";
import { riverStream, type RiverContext } from "@/services/river";

type Msg = { role: "user" | "assistant"; content: string };

export function useRiverChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [tip, setTip] = useState("");

  const fetchGreeting = useCallback(async (context: RiverContext) => {
    setIsLoading(true);
    let full = "";
    await riverStream({
      fn: "morning_insight",
      messages: [{ role: "user", content: "Give me my morning briefing." }],
      context,
      onDelta: (chunk) => {
        full += chunk;
        const tipIdx = full.indexOf("TIP:");
        if (tipIdx !== -1) {
          setGreeting(full.slice(0, tipIdx).trim());
          setTip(full.slice(tipIdx + 4).trim());
        } else {
          setGreeting(full);
        }
      },
      onDone: () => setIsLoading(false),
      onError: () => {
        setGreeting("Good morning! I'm analyzing your business data. Check back shortly.");
        setIsLoading(false);
      },
    });
  }, []);

  const sendMessage = useCallback(async (input: string, context: RiverContext) => {
    const userMsg: Msg = { role: "user", content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setIsLoading(true);

    let assistantText = "";
    await riverStream({
      fn: "chat",
      messages: newMsgs,
      context,
      onDelta: (chunk) => {
        assistantText += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
          }
          return [...prev, { role: "assistant", content: assistantText }];
        });
      },
      onDone: () => setIsLoading(false),
      onError: () => setIsLoading(false),
    });
  }, [messages]);

  return { messages, greeting, tip, isLoading, fetchGreeting, sendMessage };
}
