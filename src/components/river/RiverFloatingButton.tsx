import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { riverStream, buildBusinessContext, type RiverContext } from "@/services/river";
import { supabase } from "@/integrations/supabase/client";
import { RiverThinking } from "./RiverThinking";

type Msg = { role: "user" | "assistant"; content: string };

export function RiverFloatingButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<RiverContext>({});
  const { user } = useAuth();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load profile for context
  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setContext(buildBusinessContext(data));
    });
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const currentPage = location.pathname.replace("/", "") || "dashboard";

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setLoading(true);

    let assistantText = "";
    const contextWithPage = { ...context, currentPage };

    await riverStream({
      fn: "chat",
      messages: allMsgs,
      context: contextWithPage,
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
      onDone: () => setLoading(false),
      onError: () => {
        setMessages((prev) => [...prev, { role: "assistant", content: "River is taking a moment. Try again in a few seconds." }]);
        setLoading(false);
      },
    });
  }, [input, messages, loading, context, currentPage]);

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{
            background: "rgba(127,119,221,0.9)",
            border: "2px solid rgba(175,169,236,0.4)",
            boxShadow: "0 0 20px rgba(127,119,221,0.3)",
          }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          className="fixed bottom-0 right-0 z-50 w-[360px] h-[calc(100vh-48px)] flex flex-col"
          style={{
            background: "#0a0a0c",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="w-2 h-2 rounded-full bg-accent-purple" />
            <span className="text-[13px] font-semibold" style={{ color: "#AFA9EC" }}>River AI</span>
            <span className="text-[10px] text-accent-green bg-accent-green/10 rounded-full px-1.5 py-0.5">Online</span>
            <span className="flex-1" />
            <span className="text-[10px] text-foreground-muted capitalize">{currentPage}</span>
            <button onClick={() => setOpen(false)} className="p-1 text-foreground-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                </div>
                <p className="text-[13px] text-foreground mb-1">Ask River anything</p>
                <p className="text-[11px] text-foreground-muted">I have context about your {currentPage} page</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-background-elevated text-foreground"
                      : "text-foreground-secondary"
                  }`}
                  style={m.role === "assistant" ? {
                    background: "rgba(127,119,221,0.06)",
                    borderLeft: "2px solid #7F77DD",
                  } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="pl-1"><RiverThinking /></div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask River anything..."
                className="flex-1 h-9 bg-background-elevated border border-border rounded-lg px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-strong"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-lg bg-accent-purple flex items-center justify-center hover:opacity-90 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
