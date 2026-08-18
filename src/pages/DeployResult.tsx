import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  Loader2, Send, Phone, PhoneOff, Mic,
  MessageSquare, Globe, Building2, Clock,
  ArrowRight, Play,
} from "lucide-react";

const N8N_CHAT_URL = "https://n8n-wqps.srv1912599.hstgr.cloud/webhook/chat";
const MSG_CAP = 15;

const CASE_STUDIES = [
  { title: "Outbound FX", desc: "AI cold-calling agent books 3x more meetings", tag: "Voice AI" },
  { title: "Dental Lab Direct", desc: "24/7 AI receptionist handles 400+ calls/mo", tag: "Receptionist" },
  { title: "Credit Repair Cloud", desc: "Chat agent qualifies leads while team sleeps", tag: "Chat AI" },
];

interface DeployConfig {
  id: string;
  url: string;
  business_name: string | null;
  niche: string | null;
  services: string[];
  hours: string | null;
  phones: string[];
  faq: Array<{ q: string; a: string }>;
  brand_colors: string[];
  logo: string | null;
  status: string;
}

interface ChatMessage { role: "user" | "assistant"; content: string }

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

export default function DeployResult() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<DeployConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [sessionId] = useState(() => "deploy-" + Math.random().toString(36).slice(2, 10));
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("deploy_configs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          const c: DeployConfig = {
            ...data,
            services: (data.services as string[]) || [],
            phones: (data.phones as string[]) || [],
            faq: (data.faq as Array<{ q: string; a: string }>) || [],
            brand_colors: (data.brand_colors as string[]) || [],
          };
          setConfig(c);
          setMessages([{
            role: "assistant",
            content: `Hi! I'm ${c.business_name || "your"} AI receptionist. I can answer questions about our services, schedule appointments, and help with inquiries. How can I help you today?`,
          }]);
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => () => { if (callTimerRef.current) clearInterval(callTimerRef.current); }, []);

  const getClientIp = useCallback(async (): Promise<string> => {
    try { const r = await fetch("https://api.ipify.org?format=json"); return (await r.json()).ip; }
    catch { return "0.0.0.0"; }
  }, []);

  const sendChat = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading || msgCount >= MSG_CAP || !config) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const ip = await getClientIp();
      await supabase.from("deploy_chats").insert({ deploy_config_id: config.id, ip_address: ip, role: "user", content: trimmed });

      const res = await fetch(N8N_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed, sessionId, chatInput: trimmed,
          businessContext: { name: config.business_name, niche: config.niche, services: config.services, hours: config.hours, faq: config.faq },
        }),
      });
      const raw = await res.text();
      const reply = parseApiResponse(raw) || "Sorry, I couldn't process that.";

      await supabase.from("deploy_chats").insert({ deploy_config_id: config.id, ip_address: ip, role: "assistant", content: reply });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setMsgCount((c) => c + 1);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, msgCount, config, sessionId, getClientIp]);

  function toggleCall() {
    if (callActive) {
      setCallActive(false);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    } else {
      setCallActive(true);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
  }

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#050505]"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  if (!config) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505]">
      <p className="text-white/40">Demo not found.</p>
      <Link to="/deploy" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">Create a new demo</Link>
    </div>
  );

  const bizName = config.business_name || "Your Business";
  const capReached = msgCount >= MSG_CAP;

  return (
    <>
      <SEO title={`${bizName} AI Receptionist — Katexs`} />
      <div className="min-h-screen bg-[#050505]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[15px] font-semibold text-white/60 hover:text-white">Katexs</Link>
            <span className="text-white/10">/</span>
            <span className="text-[14px] font-medium text-white">{bizName}</span>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" /> Live
            </span>
          </div>
          <Link
            to={`/deploy/${id}/hire`}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
          >
            Hire this agent <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8">
          {/* Joana intro video placeholder */}
          <div className="mx-auto mb-12 max-w-2xl">
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                  <Play className="h-6 w-6 text-white/30" />
                </div>
                <p className="text-[13px] text-white/25">Intro video — coming soon</p>
              </div>
            </div>
          </div>

          {/* Business card */}
          <div className="mx-auto mb-12 max-w-xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-start gap-4">
              {config.logo ? (
                <img src={config.logo} alt={bizName} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Building2 className="h-6 w-6 text-white/30" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-[18px] font-semibold text-white">{bizName}</h2>
                {config.niche && <p className="mt-0.5 text-[13px] text-white/30">{config.niche}</p>}
                {config.url && (
                  <a href={config.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-[12px] text-white/20 hover:text-white/40">
                    <Globe className="h-3 w-3" />{config.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                )}
              </div>
            </div>

            {config.services.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {config.services.map((s, i) => (
                  <span key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40">
                    {typeof s === "string" ? s : String(s)}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4">
              {config.hours && (
                <span className="flex items-center gap-1.5 text-[12px] text-white/25">
                  <Clock className="h-3.5 w-3.5 text-white/15" />{config.hours}
                </span>
              )}
              {config.phones.map((p, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[12px] text-white/25">
                  <Phone className="h-3.5 w-3.5 text-white/15" />{typeof p === "string" ? p : String(p)}
                </span>
              ))}
            </div>
          </div>

          {/* Demo sections side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chat */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0f] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/70">Chat with your receptionist</p>
                  <p className="text-[10px] text-white/25">{MSG_CAP - msgCount} messages remaining</p>
                </div>
              </div>

              <div ref={chatScrollRef} className="flex h-80 flex-col gap-2.5 overflow-y-auto p-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user" ? "rounded-br-md bg-white text-black" : "rounded-bl-md border border-white/[0.06] bg-white/[0.03] text-white/70"
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
                {capReached && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <p className="text-[12px] text-white/30">Message limit reached</p>
                    <Link to={`/deploy/${id}/hire`} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-black">
                      Deploy full agent <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }} className="border-t border-white/[0.06] p-3">
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] py-1 pl-3.5 pr-1.5">
                  <input
                    type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder={capReached ? "Limit reached" : "Ask anything..."}
                    disabled={capReached || chatLoading}
                    className="flex-1 border-0 bg-transparent py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none disabled:opacity-40"
                  />
                  <button type="submit" disabled={!chatInput.trim() || chatLoading || capReached} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black disabled:opacity-20">
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </form>
            </div>

            {/* Voice */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0a0a0f] p-8">
              <div className={`relative mb-6 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500 ${
                callActive ? "bg-green-500/10 ring-2 ring-green-500/30" : "bg-white/[0.04] ring-1 ring-white/[0.06]"
              }`}>
                {callActive && <div className="absolute inset-0 animate-ping rounded-full bg-green-500/10" />}
                {callActive ? <Mic className="h-8 w-8 text-green-400" /> : <Phone className="h-8 w-8 text-white/25" />}
              </div>

              <p className="mb-2 text-[15px] font-medium text-white/60">
                {callActive ? "Connected" : "Call your receptionist"}
              </p>

              {callActive && (
                <p className="mb-3 font-mono text-2xl font-medium text-white">{fmtDur(callDuration)}</p>
              )}

              <p className="mb-6 max-w-xs text-center text-[12px] leading-relaxed text-white/25">
                {callActive
                  ? `Speaking with ${bizName}'s AI receptionist`
                  : "Start a voice call to test the AI receptionist. It can answer questions, book appointments, and qualify leads."
                }
              </p>

              <button onClick={toggleCall} className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold transition-all active:scale-[0.97] ${
                callActive ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-white text-black hover:bg-white/90"
              }`}>
                {callActive ? <><PhoneOff className="h-4 w-4" /> End call</> : <><Phone className="h-4 w-4" /> Start voice call</>}
              </button>

              <p className="mt-4 text-[10px] text-white/10">Powered by Vapi</p>
            </div>
          </div>

          {/* Case studies */}
          <section className="mt-16">
            <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/20">
              More success stories
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {CASE_STUDIES.map((cs) => (
                <div key={cs.title} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all hover:border-white/[0.1]">
                  <div className="relative flex aspect-video items-center justify-center bg-white/[0.02]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] transition-transform group-hover:scale-110">
                      <Play className="h-5 w-5 text-white/30" />
                    </div>
                    <span className="absolute right-3 top-3 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/25">{cs.tag}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-[14px] font-medium text-white/60">{cs.title}</p>
                    <p className="mt-1 text-[12px] text-white/20">{cs.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="mt-16 pb-16 text-center">
            <Link
              to={`/deploy/${id}/hire`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[14px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
            >
              Deploy this agent for your business <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
