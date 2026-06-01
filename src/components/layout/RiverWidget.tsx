import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, Send, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ExpertCard {
  id: string;
  slug?: string;
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
  error?: boolean;
}

const WELCOME = "Hi! I'm River 👋 Tell me what you need and I'll find the perfect expert for you.";
const SUGGESTIONS = [
  "Find a voice AI expert",
  "Build me a chatbot",
  "Automate my workflow",
];

const STORAGE_KEY = "river_chat_history";
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const stripTokens = (s: string) =>
  s.replace(/\n?\[EXPERT_CARD:\s*[0-9a-f-]{8,}\s*\]\n?/gi, "\n").replace(/\n{3,}/g, "\n\n").trim();

export default function RiverWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastSendAt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted chat history on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch { /* ignore invalid json */ }
  }, []);

  // Persist chat history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* ignore quota errors */ }
  }, [messages]);

  // Mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Esc + outside click to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // mousedown fires before button click handlers when starting a new selection elsewhere
    setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || loading) return;
    // 500ms debounce against rapid sends
    const now = Date.now();
    if (now - lastSendAt.current < 500) return;
    lastSendAt.current = now;

    if (!user) {
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setInput("");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const updateLast = (mutate: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const arr = [...prev];
        const i = arr.length - 1;
        if (i >= 0 && arr[i].role === "assistant") arr[i] = mutate(arr[i]);
        return arr;
      });
    };
    const failLast = (msg: string) => {
      updateLast(() => ({ role: "assistant", content: msg, error: true }));
      setLoading(false);
    };

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort("timeout"), 10_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { failLast("Please sign in to chat with River."); clearTimeout(timeout); return; }

      const resp = await fetch(FN_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (resp.status === 401) { failLast("Please sign in to chat with River."); clearTimeout(timeout); return; }
      if (resp.status === 429) { failLast("You're sending messages too fast. Please wait a moment."); clearTimeout(timeout); return; }
      if (!resp.ok || !resp.body) { failLast("I'm taking a quick break. Please try again in a moment."); clearTimeout(timeout); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let cards: ExpertCard[] = [];
      let firstByte = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!firstByte) { firstByte = true; clearTimeout(timeout); }
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (typeof evt.delta === "string") {
              acc += evt.delta;
              const display = stripTokens(acc);
              updateLast((m) => ({ ...m, content: display }));
            } else if (evt.done) {
              if (Array.isArray(evt.cards)) cards = evt.cards;
            }
          } catch { /* ignore partial */ }
        }
      }
      updateLast((m) => ({ ...m, content: stripTokens(acc) || "…", cards }));
    } catch (e: any) {
      if (e?.name === "AbortError" || ctrl.signal.aborted) {
        failLast("River is taking too long. Please try again.");
      } else {
        failLast("Connection lost. Check your internet and try again.");
      }
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setLoading(false);
    }
  }, [loading, messages, user]);

  // Cleanup pending request on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask River"
          className="group fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-[#0a0a0a] text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
          style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 }}
        >
          <span className="text-lg leading-none">R</span>
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0a0a0a]" />
          </span>
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-[#0a0a0a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Ask River
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "fixed z-[60] bg-white border border-[#EBEBEB] shadow-2xl flex flex-col overflow-hidden",
            isMobile
              ? "inset-0 rounded-none"
              : "bottom-6 right-6 w-[380px] h-[520px] rounded-2xl",
          )}
          role="dialog"
          aria-label="River AI chat"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[#EBEBEB] shrink-0 bg-white">
            <div className="relative h-9 w-9 rounded-full bg-[#0a0a0a] text-white grid place-items-center text-sm font-bold">
              R
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              </span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[#0a0a0a] flex items-center gap-1.5">
                River
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              </div>
              <div className="text-[11px] text-neutral-500">AI Assistant</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ml-auto h-8 w-8 rounded-full hover:bg-[#F7F7F7] grid place-items-center text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4 bg-white">
              <div className="h-12 w-12 rounded-full bg-[#0a0a0a] text-white grid place-items-center text-lg font-bold">R</div>
              <div>
                <div className="text-base font-semibold text-[#0a0a0a]">Please sign in to chat with River</div>
                <div className="text-sm text-neutral-500 mt-1">River helps you find the perfect AI expert in seconds.</div>
              </div>
              <Link
                to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#F7F7F7] px-3.5 py-2.5 text-sm text-[#0a0a0a]">
                        {WELCOME}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#EBEBEB] hover:bg-[#F7F7F7] text-[#0a0a0a] transition-colors"
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
                            ? "bg-[#0a0a0a] text-white rounded-tr-sm"
                            : cn("bg-[#F7F7F7] text-[#0a0a0a] rounded-tl-sm", m.error && "text-red-600"),
                        )}
                      >
                        {m.content || (m.role === "assistant" && loading && i === messages.length - 1 ? (
                          <span className="inline-flex gap-1 items-center text-neutral-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "240ms" }} />
                          </span>
                        ) : null)}
                      </div>
                    </div>

                    {m.role === "assistant" && m.cards && m.cards.length > 0 && (
                      <div className="space-y-2">
                        {m.cards.map((c) => (
                          <Link
                            key={c.id}
                            to={`/gig/${c.slug || c.id}`}
                            onClick={() => setOpen(false)}
                            className="block rounded-xl border border-[#EBEBEB] bg-white hover:border-[#16A34A]/40 hover:shadow-sm transition p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-[#0a0a0a] truncate">{c.title}</div>
                                <div className="text-xs text-neutral-500 mt-0.5 truncate">by {c.seller_name}</div>
                                {c.reviews > 0 && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                                    <Star className="h-3 w-3 fill-current text-amber-500" />
                                    <span className="font-medium text-[#0a0a0a]">{c.rating.toFixed(1)}</span>
                                    <span>({c.reviews})</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[10px] uppercase tracking-wide text-neutral-500">From</div>
                                <div className="text-sm font-bold text-[#0a0a0a]">${c.price}</div>
                              </div>
                            </div>
                            <div className="mt-2 inline-flex items-center text-xs font-semibold text-[#16A34A]">
                              View Gig →
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Composer */}
              <form
                onSubmit={onSubmit}
                className="border-t border-[#EBEBEB] p-2.5 flex items-end gap-2 shrink-0 bg-white"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder="Ask River anything…"
                  className="flex-1 resize-none bg-[#F7F7F7] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] outline-none placeholder:text-neutral-400 max-h-28"
                />
                <button
                  type="submit"
                  disabled={input.trim().length < 3 || loading}
                  className="h-9 w-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center disabled:opacity-40 shrink-0 hover:bg-[#15803d] transition-colors"
                  aria-label="Send"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
