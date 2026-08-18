import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, ArrowRight, Loader2, MessageSquare, Phone, Play,
  Calendar, Send,
} from "lucide-react";

const N8N_CHAT_URL = "https://n8n-wqps.srv1912599.hstgr.cloud/webhook/chat";

const CASE_STUDIES = [
  { title: "Outbound FX", desc: "AI cold-calling agent books 3x more meetings", tag: "Voice AI" },
  { title: "Dental Lab Direct", desc: "24/7 AI receptionist handles 400+ calls/mo", tag: "Receptionist" },
  { title: "Credit Repair Cloud", desc: "Chat agent qualifies leads while team sleeps", tag: "Chat AI" },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1").replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "").replace(/^\d+\.\s+/gm, "")
    .replace(/\\n/g, " ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseApiResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.response === "string") return stripMarkdown(parsed.response);
    if (parsed && typeof parsed.output === "string") return stripMarkdown(parsed.output);
  } catch { /* not JSON */ }
  return stripMarkdown(raw);
}

interface ChatMsg { role: "user" | "assistant"; content: string }

export default function Deploy() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inline chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm Katexs AI. Ask me anything about AI receptionists, automations, or how we can help your business." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => "demo-" + Math.random().toString(36).slice(2, 10));
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMsgs, chatLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    try {
      const normalizedUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-deploy-config",
        { body: { url: normalizedUrl } }
      );
      if (fnError) throw fnError;
      navigate(`/deploy/building?id=${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const sendChat = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;
    setChatMsgs((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(N8N_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId, chatInput: trimmed }),
      });
      const raw = await res.text();
      const reply = parseApiResponse(raw) || "Sorry, I couldn't process that.";
      setChatMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, sessionId]);

  return (
    <>
      <SEO title="AI Receptionist Demo — Katexs" description="See your AI receptionist in 60 seconds. Paste your website URL and watch it come to life." />

      <div className="min-h-screen bg-[#050505]">
        {/* Grid + glow background */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(59,130,246,0.04),transparent)]" />
        </div>

        {/* Logo */}
        <header className="relative z-10 flex items-center justify-center py-8">
          <span className="text-[20px] font-semibold tracking-tight text-white">Katexs</span>
        </header>

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-8 text-center sm:px-8">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            No signup · No credit card · 60 seconds
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl" style={{ textWrap: "balance" } as React.CSSProperties}>
            See your AI receptionist{" "}
            <span className="text-white/40">in 60 seconds</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/40">
            Paste your website URL. We'll scan it, train an AI receptionist on your business, and let you test it — live chat and voice — right here.
          </p>

          {/* URL input */}
          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5 transition-all focus-within:border-white/[0.15] focus-within:bg-white/[0.05]">
              <Globe className="ml-3 h-5 w-5 shrink-0 text-white/20" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                className="flex-1 border-0 bg-transparent px-2 py-3.5 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97] disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Build my demo <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </form>

          {/* Or try it now */}
          <div className="mt-10">
            <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.15em] text-white/20">
              Or try it now
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setChatOpen(true); setVoiceActive(false); }}
                className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-medium transition-all ${
                  chatOpen && !voiceActive
                    ? "border-white/20 bg-white/[0.08] text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat with AI
              </button>
              <button
                onClick={() => { setVoiceActive(true); setChatOpen(false); }}
                className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-medium transition-all ${
                  voiceActive
                    ? "border-white/20 bg-white/[0.08] text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60"
                }`}
              >
                <Phone className="h-4 w-4" />
                Talk to AI
              </button>
            </div>
          </div>

          {/* Inline chat widget */}
          {chatOpen && !voiceActive && (
            <div className="mx-auto mt-6 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0f] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-[13px] font-medium text-white/60">Katexs AI</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-green-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                    Online
                  </span>
                </div>

                <div ref={chatScrollRef} className="flex max-h-64 flex-col gap-2.5 overflow-y-auto p-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                  {chatMsgs.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-br-md bg-white text-black"
                          : "rounded-bl-md border border-white/[0.06] bg-white/[0.03] text-white/70"
                      }`}>{msg.content}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                        <span className="typing-dot" /><span className="typing-dot" style={{ animationDelay: "0.15s" }} /><span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }} className="border-t border-white/[0.06] p-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] py-1 pl-3.5 pr-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="flex-1 border-0 bg-transparent py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none"
                    />
                    <button type="submit" disabled={!chatInput.trim() || chatLoading} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black disabled:opacity-20">
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Inline voice widget */}
          {voiceActive && (
            <div className="mx-auto mt-6 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0f] p-8 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <Phone className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-[14px] font-medium text-white/60">Voice Demo</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/25">
                  Start a voice call with our AI receptionist. It handles questions, books appointments, and qualifies leads.
                </p>
                <button
                  onClick={() => alert("Vapi voice call — SDK will be wired in next iteration.")}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
                >
                  <Phone className="h-4 w-4" />
                  Start voice call
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Case study videos */}
        <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20">
          <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/20">
            See it in action
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {CASE_STUDIES.map((cs) => (
              <div key={cs.title} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all hover:border-white/[0.1] hover:bg-white/[0.03]">
                <div className="relative flex aspect-video items-center justify-center bg-white/[0.02]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 text-white/40" />
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/30">
                    {cs.tag}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[14px] font-medium text-white/70">{cs.title}</p>
                  <p className="mt-1 text-[12px] text-white/25">{cs.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="relative z-10 border-t border-white/[0.06] py-12">
          <div className="mx-auto max-w-lg px-5 text-center">
            <p className="text-[15px] font-medium text-white/60">Not sure if AI is right for your business?</p>
            <a
              href="https://calendly.com/katexs"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[13px] font-medium text-white/50 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white/70"
            >
              <Calendar className="h-4 w-4" />
              Book a free AI audit
            </a>
            <p className="mt-4 text-[11px] text-white/15">
              Katexs · AI that works for your business
            </p>
          </div>
        </footer>
      </div>

      <style>{`
        .typing-dot {
          display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.3);
          animation: typingBounce 1.4s ease-in-out infinite;
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); background: rgba(255,255,255,0.15); }
          30% { transform: translateY(-6px); background: rgba(59,130,246,0.6); }
        }
      `}</style>
    </>
  );
}
