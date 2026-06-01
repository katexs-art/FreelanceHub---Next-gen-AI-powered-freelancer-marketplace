import { useState, useRef, useEffect } from "react";
import { X, Send, Mic, MicOff, Minus, Star, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ExpertCard {
  id: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  seller_name: string;
  seller_username: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  cards?: ExpertCard[];
  /** Streaming typewriter target — for assistant messages we animate to this */
  fullContent?: string;
}

const WELCOME =
  "Hi! I'm River, your AI marketplace assistant. I can help you find the perfect expert, post a project, or answer any questions.";

const SUGGESTIONS = [
  "I need a voice AI for my app",
  "How do I post a project?",
  "What does AI automation cost?",
];

// Strip [EXPERT_CARD: id] tokens from rendered text — cards render below
const stripCardTokens = (s: string) =>
  s.replace(/\n?\[EXPERT_CARD:\s*[0-9a-f-]{8,}\s*\]\n?/gi, "\n").trim();

export function RiverWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Typewriter: progressively reveal the last assistant message's fullContent
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.fullContent == null) return;
    if (last.content.length >= last.fullContent.length) return;
    const t = setTimeout(() => {
      setMessages((prev) => {
        const arr = [...prev];
        const i = arr.length - 1;
        const target = arr[i].fullContent ?? "";
        const nextLen = Math.min(target.length, arr[i].content.length + 3);
        arr[i] = { ...arr[i], content: target.slice(0, nextLen) };
        return arr;
      });
    }, 16);
    return () => clearTimeout(t);
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("river-chat", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      const replyRaw: string = data?.reply || data?.error || "Sorry, I couldn't respond right now.";
      const cards: ExpertCard[] = Array.isArray(data?.cards) ? data.cards : [];
      const clean = stripCardTokens(replyRaw);
      setMessages([...next, { role: "assistant", content: "", fullContent: clean, cards }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Something went wrong. Please try again.", fullContent: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    setListening(true);
    r.start();
  };

  const voiceSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const panelVisible = open && !minimized;

  return (
    <>
      {/* Floating launcher */}
      {!panelVisible && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          aria-label="Ask River anything"
          className="group fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
          {/* Online pulse */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background" />
          </span>
          {/* Tooltip */}
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Ask River anything
          </span>
        </button>
      )}

      {/* Chat panel */}
      {panelVisible && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0 bg-background">
            <div className="relative h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
              R
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">River AI</div>
              <div className="text-[11px] text-foreground-muted">Online · usually replies instantly</div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                aria-label="Minimize"
                className="h-8 w-8 rounded-full hover:bg-foreground/5 grid place-items-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setOpen(false); setMinimized(false); }}
                aria-label="Close"
                className="h-8 w-8 rounded-full hover:bg-foreground/5 grid place-items-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-foreground/5 px-3.5 py-2.5 text-sm">
                    {WELCOME}
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">Try asking</div>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-sm px-3 py-2 rounded-xl border border-border hover:bg-foreground/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-foreground/5 rounded-tl-sm",
                    )}
                  >
                    {m.content}
                    {m.role === "assistant" && m.fullContent && m.content.length < m.fullContent.length && (
                      <span className="inline-block w-1.5 h-3.5 align-middle ml-0.5 bg-foreground/60 animate-pulse" />
                    )}
                  </div>
                </div>
                {m.role === "assistant" && m.cards && m.cards.length > 0 && (
                  <div className="space-y-2">
                    {m.cards.map((c) => (
                      <Link
                        key={c.id}
                        to={`/gig/${c.id}`}
                        onClick={() => { /* keep widget open */ }}
                        className="block rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-sm transition p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{c.title}</div>
                            <div className="text-xs text-foreground-muted mt-0.5 truncate">
                              by {c.seller_name}{c.category ? ` · ${c.category}` : ""}
                            </div>
                            {c.reviews > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-foreground-muted">
                                <Star className="h-3 w-3 fill-current text-amber-500" />
                                <span className="font-medium text-foreground">{c.rating.toFixed(1)}</span>
                                <span>({c.reviews})</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] uppercase tracking-wide text-foreground-muted">From</div>
                            <div className="text-sm font-bold">${c.price}</div>
                          </div>
                        </div>
                        <div className="mt-2 inline-flex items-center text-xs font-semibold text-primary">
                          View & order →
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-foreground/5 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground-muted">
                  <span className="inline-flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-2.5 flex items-end gap-2 shrink-0 bg-background"
          >
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                className={cn(
                  "h-9 w-9 rounded-full grid place-items-center shrink-0 transition-colors",
                  listening ? "bg-red-500 text-white animate-pulse" : "hover:bg-foreground/5 text-foreground-muted",
                )}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask River anything…"
              className="flex-1 resize-none bg-foreground/5 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-foreground-muted max-h-28"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Minimized pill */}
      {open && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-background border border-border shadow-lg px-3.5 py-2 hover:bg-foreground/5"
          aria-label="Reopen River AI"
        >
          <div className="relative h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
            R
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
          </div>
          <span className="text-sm font-medium">River AI</span>
        </button>
      )}
    </>
  );
}
