import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  CheckCircle2, Loader2, Send, Phone, PhoneOff, Mic,
  MessageSquare, BarChart3, Users, Clock, Zap, ArrowRight,
  Globe, Building2, Briefcase, Star, Shield,
} from "lucide-react";

const N8N_CHAT_URL = "https://n8n-wqps.srv1912599.hstgr.cloud/webhook/chat";
const MSG_CAP = 15;

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const BUILD_STEPS = [
  { label: "Business profile loaded", icon: Building2 },
  { label: "Services & pricing mapped", icon: Briefcase },
  { label: "FAQ knowledge base built", icon: MessageSquare },
  { label: "Voice agent configured", icon: Mic },
  { label: "Chat agent deployed", icon: Zap },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseApiResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.response === "string") {
      return stripMarkdown(parsed.response);
    }
    if (parsed && typeof parsed.output === "string") {
      return stripMarkdown(parsed.output);
    }
  } catch {
    // not JSON
  }
  return stripMarkdown(raw);
}

export default function DeployResult() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<DeployConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"building" | "ready">("building");
  const [buildStep, setBuildStep] = useState(0);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [sessionId] = useState(() => "deploy-" + Math.random().toString(36).slice(2, 10));
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Tab state
  const [activeTab, setActiveTab] = useState<"chat" | "voice" | "dashboard">("chat");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("deploy_configs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({
            ...data,
            services: (data.services as string[]) || [],
            phones: (data.phones as string[]) || [],
            faq: (data.faq as Array<{ q: string; a: string }>) || [],
            brand_colors: (data.brand_colors as string[]) || [],
          });
        }
        setLoading(false);
      });
  }, [id]);

  // Build sequence animation
  useEffect(() => {
    if (!config || phase !== "building") return;
    const timer = setInterval(() => {
      setBuildStep((prev) => {
        if (prev >= BUILD_STEPS.length - 1) {
          clearInterval(timer);
          setTimeout(() => {
            setPhase("ready");
            setMessages([
              {
                role: "assistant",
                content: `Hi! I'm ${config.business_name || "your"} AI assistant. I can answer questions about our services, hours, pricing, and more. How can I help you today?`,
              },
            ]);
          }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [config, phase]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chatLoading]);

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  const getClientIp = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip;
    } catch {
      return "0.0.0.0";
    }
  }, []);

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatLoading || msgCount >= MSG_CAP || !config) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setChatInput("");
      setChatLoading(true);

      try {
        const ip = await getClientIp();

        // Save user message
        await supabase.from("deploy_chats").insert({
          deploy_config_id: config.id,
          ip_address: ip,
          role: "user",
          content: trimmed,
        });

        const res = await fetch(N8N_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            chatInput: trimmed,
            businessContext: {
              name: config.business_name,
              niche: config.niche,
              services: config.services,
              hours: config.hours,
              faq: config.faq,
            },
          }),
        });

        const raw = await res.text();
        const reply = parseApiResponse(raw) || "Sorry, I couldn't process that. Please try again.";

        // Save assistant message
        await supabase.from("deploy_chats").insert({
          deploy_config_id: config.id,
          ip_address: ip,
          role: "assistant",
          content: reply,
        });

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setMsgCount((c) => c + 1);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, msgCount, config, sessionId, getClientIp]
  );

  function toggleCall() {
    if (callActive) {
      setCallActive(false);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    } else {
      setCallActive(true);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] text-center">
        <p className="text-white/40">Demo not found.</p>
        <Link
          to="/deploy"
          className="text-sm text-white/60 underline underline-offset-4 hover:text-white"
        >
          Create a new demo
        </Link>
      </div>
    );
  }

  // Building phase
  if (phase === "building") {
    return (
      <>
        <SEO title={`Building ${config.business_name || "AI"} Agent — Katexs`} />
        <div className="flex min-h-screen items-center justify-center bg-[#050505]">
          <div className="mx-auto max-w-md px-5">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Building your AI agent
              </h2>
              <p className="mt-2 text-[13px] text-white/30">
                {config.business_name || config.url}
              </p>
            </div>

            <div className="space-y-3">
              {BUILD_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < buildStep;
                const active = i === buildStep;
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500 ${
                      done
                        ? "border-green-500/20 bg-green-500/[0.04]"
                        : active
                          ? "border-white/[0.1] bg-white/[0.03]"
                          : "border-white/[0.04] bg-transparent opacity-40"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${
                        done
                          ? "bg-green-500/15"
                          : active
                            ? "bg-white/[0.06]"
                            : "bg-white/[0.03]"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                      ) : (
                        <Icon className="h-4 w-4 text-white/20" />
                      )}
                    </div>
                    <span
                      className={`text-[13px] font-medium transition-colors duration-500 ${
                        done
                          ? "text-green-400"
                          : active
                            ? "text-white/80"
                            : "text-white/30"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Ready phase — full demo
  const capReached = msgCount >= MSG_CAP;
  const bizName = config.business_name || "Your Business";

  return (
    <>
      <SEO title={`${bizName} AI Agent — Katexs`} />
      <div className="flex h-screen flex-col overflow-hidden bg-[#050505]">
        {/* Header bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[15px] font-semibold tracking-tight text-white/60 hover:text-white">
              Katexs
            </Link>
            <span className="text-white/10">/</span>
            <span className="text-[14px] font-medium text-white">{bizName}</span>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              Live
            </span>
          </div>
          <button
            onClick={() => {
              // Stripe stub
              alert("Stripe checkout coming soon — price IDs will be added.");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
          >
            Hire this agent
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — business info */}
          <aside className="hidden w-72 shrink-0 border-r border-white/[0.06] lg:flex lg:flex-col">
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-6">
                {config.logo ? (
                  <img
                    src={config.logo}
                    alt={bizName}
                    className="mb-3 h-10 w-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                    <Building2 className="h-5 w-5 text-white/40" />
                  </div>
                )}
                <h2 className="text-[15px] font-semibold text-white">{bizName}</h2>
                {config.niche && (
                  <p className="mt-0.5 text-[12px] text-white/30">{config.niche}</p>
                )}
                {config.url && (
                  <a
                    href={config.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-[11px] text-white/20 hover:text-white/40"
                  >
                    <Globe className="h-3 w-3" />
                    {config.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                )}
              </div>

              {config.services.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/25">
                    Services
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {config.services.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/50"
                      >
                        {typeof s === "string" ? s : String(s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {config.hours && (
                <div className="mb-5">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/25">
                    Hours
                  </p>
                  <div className="flex items-center gap-1.5 text-[12px] text-white/40">
                    <Clock className="h-3.5 w-3.5 text-white/20" />
                    {config.hours}
                  </div>
                </div>
              )}

              {config.phones.length > 0 && (
                <div className="mb-5">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/25">
                    Contact
                  </p>
                  {config.phones.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[12px] text-white/40"
                    >
                      <Phone className="h-3.5 w-3.5 text-white/20" />
                      {typeof p === "string" ? p : String(p)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Center — tabs + content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-white/[0.06]">
              {(
                [
                  { key: "chat" as const, label: "Chat", icon: MessageSquare },
                  { key: "voice" as const, label: "Voice", icon: Phone },
                  { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-white text-white"
                      : "border-transparent text-white/30 hover:text-white/50"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" && (
                <div className="flex h-full flex-col">
                  {/* Messages */}
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                  >
                    <div className="mx-auto max-w-2xl space-y-3">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          style={{
                            animation: `fadeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                          }}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                              msg.role === "user"
                                ? "rounded-br-md bg-white text-black"
                                : "rounded-bl-md border border-white/[0.06] bg-white/[0.03] text-white/80"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                            <span className="typing-dot" />
                            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                          </div>
                        </div>
                      )}

                      {capReached && (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                          <p className="text-[13px] text-white/40">
                            You've reached the {MSG_CAP}-message demo limit.
                          </p>
                          <button
                            onClick={() =>
                              alert("Stripe checkout coming soon — price IDs will be added.")
                            }
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/90"
                          >
                            Deploy full agent
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 sm:px-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendChat(chatInput);
                      }}
                      className="mx-auto max-w-2xl"
                    >
                      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-4 pr-1.5 transition-all focus-within:border-white/[0.15]">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendChat(chatInput);
                            }
                          }}
                          placeholder={capReached ? "Message limit reached" : "Ask anything..."}
                          disabled={capReached || chatLoading}
                          className="flex-1 border-0 bg-transparent py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none disabled:opacity-40"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || chatLoading || capReached}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-white/90 disabled:opacity-20"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-white/15">
                        {MSG_CAP - msgCount} messages remaining
                      </p>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "voice" && (
                <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
                  <div
                    className={`relative flex h-28 w-28 items-center justify-center rounded-full transition-all duration-500 ${
                      callActive
                        ? "bg-green-500/10 ring-2 ring-green-500/30"
                        : "bg-white/[0.04] ring-1 ring-white/[0.06]"
                    }`}
                  >
                    {callActive && (
                      <div className="absolute inset-0 animate-ping rounded-full bg-green-500/10" />
                    )}
                    {callActive ? (
                      <Mic className="h-10 w-10 text-green-400" />
                    ) : (
                      <Phone className="h-10 w-10 text-white/30" />
                    )}
                  </div>

                  {callActive && (
                    <div className="text-center">
                      <p className="font-mono text-2xl font-medium text-white">
                        {formatDuration(callDuration)}
                      </p>
                      <p className="mt-1 text-[12px] text-green-400">Connected</p>
                    </div>
                  )}

                  <p className="max-w-sm text-center text-[13px] leading-relaxed text-white/30">
                    {callActive
                      ? `Speak with ${bizName}'s AI voice agent — powered by Vapi.`
                      : `Start a voice call with ${bizName}'s AI agent. It can answer questions, book appointments, and handle inquiries — just like a real receptionist.`}
                  </p>

                  <button
                    onClick={toggleCall}
                    className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold transition-all active:scale-[0.97] ${
                      callActive
                        ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    {callActive ? (
                      <>
                        <PhoneOff className="h-4 w-4" />
                        End call
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4" />
                        Start voice call
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-white/15">
                    Powered by Vapi · Uses your microphone
                  </p>
                </div>
              )}

              {activeTab === "dashboard" && (
                <div className="h-full overflow-y-auto p-5 sm:p-6">
                  <div className="mx-auto max-w-4xl">
                    <div className="mb-6">
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/25">
                        Agent OS Preview
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {bizName} Dashboard
                      </h3>
                    </div>

                    {/* Stats row */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Conversations", value: "1,247", icon: MessageSquare, change: "+12%" },
                        { label: "Calls Handled", value: "389", icon: Phone, change: "+8%" },
                        { label: "Leads Captured", value: "156", icon: Users, change: "+23%" },
                        { label: "Avg Response", value: "1.2s", icon: Clock, change: "-15%" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <stat.icon className="h-4 w-4 text-white/20" />
                            <span
                              className={`text-[11px] font-medium ${
                                stat.change.startsWith("+")
                                  ? "text-green-400"
                                  : "text-blue-400"
                              }`}
                            >
                              {stat.change}
                            </span>
                          </div>
                          <p className="text-xl font-semibold text-white">{stat.value}</p>
                          <p className="mt-0.5 text-[11px] text-white/25">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent conversations mock */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="border-b border-white/[0.06] px-4 py-3">
                        <p className="text-[13px] font-medium text-white/60">
                          Recent Conversations
                        </p>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {[
                          { name: "Sarah M.", msg: "Asked about pricing for premium plan", time: "2m ago", status: "Resolved" },
                          { name: "James R.", msg: "Booked appointment for Tuesday 3pm", time: "8m ago", status: "Converted" },
                          { name: "Alex K.", msg: "Inquiry about service availability", time: "15m ago", status: "Follow-up" },
                          { name: "Maria L.", msg: "Requested callback from sales team", time: "32m ago", status: "Escalated" },
                        ].map((conv) => (
                          <div
                            key={conv.name}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-medium text-white/40">
                                {conv.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-white/70">
                                  {conv.name}
                                </p>
                                <p className="text-[11px] text-white/25">{conv.msg}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  conv.status === "Converted"
                                    ? "bg-green-500/10 text-green-400"
                                    : conv.status === "Resolved"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : conv.status === "Escalated"
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-white/[0.06] text-white/30"
                                }`}
                              >
                                {conv.status}
                              </span>
                              <p className="mt-0.5 text-[10px] text-white/15">{conv.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                        <Star className="h-5 w-5 text-white/40" />
                      </div>
                      <h4 className="text-[15px] font-semibold text-white">
                        This is what your AI agent can do
                      </h4>
                      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/30">
                        Deploy it on your website in minutes. Handle support, capture leads, and book
                        appointments — 24/7, on autopilot.
                      </p>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                          onClick={() =>
                            alert("Stripe checkout coming soon — price IDs will be added.")
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
                        >
                          Hire this agent
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          to="/pricing"
                          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-white/50 transition-all hover:bg-white/[0.06] hover:text-white/70"
                        >
                          See pricing
                        </Link>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/15">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          SOC 2 compliant
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          99.9% uptime
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .typing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
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
