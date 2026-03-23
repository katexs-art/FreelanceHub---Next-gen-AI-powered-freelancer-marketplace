import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, MessageSquare, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { riverCall } from "@/services/river";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ChatMsg { role: "user" | "assistant"; content: string; }

export function ChatTester() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [businessName, setBusinessName] = useState("Your Business");
  const [agentName, setAgentName] = useState("AI Assistant");
  const [primaryColor, setPrimaryColor] = useState("#020203");
  const [accentColor, setAccentColor] = useState("#4ade80");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi there! How can I help you today?");
  const [knowledge, setKnowledge] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config, business_name").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.business_name) setBusinessName(data.business_name);
      const cc = (data?.river_config as any)?.chat_config;
      if (cc) {
        setAgentName(cc.agent_name || "AI Assistant");
        setPrimaryColor(cc.primary_color || "#020203");
        setAccentColor(cc.accent_color || "#4ade80");
        setWelcomeMessage((cc.welcome_message || welcomeMessage).replace("{business_name}", data?.business_name || "Your Business"));
        setKnowledge(cc.knowledge_base || "");
      }
    });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const response = await riverCall({
        fn: "chat",
        messages: updated.map((m) => ({ role: m.role, content: m.content })),
        context: {
          businessName,
          industry: "service business",
          isGreeting: false,
          conversationHistory: knowledge ? `Business knowledge: ${knowledge}` : undefined,
        },
      });
      setMessages([...updated, { role: "assistant", content: response }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "I'm having trouble responding right now. Please try again." }]);
    }
    setLoading(false);
  };

  const reset = () => { setMessages([]); setInput(""); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Live chat preview</h3>
          <p className="text-[12px] text-foreground-secondary">This is exactly what your website visitors will see</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-3 h-3 mr-1" /> Reset</Button>
      </div>

      {/* Website Simulator */}
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: "520px" }}>
        {/* Fake website background */}
        <div className="absolute inset-0 bg-[#f0f0f0]">
          <div className="h-10 bg-[#e0e0e0] flex items-center px-4">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-[11px] text-[#999] ml-4">yourwebsite.com</span>
          </div>
          <div className="h-[120px] bg-[#d0d0d0] mx-6 mt-6 rounded-lg flex items-center justify-center">
            <span className="text-[#aaa] text-[14px]">Your Website</span>
          </div>
          <div className="flex gap-4 mx-6 mt-4">
            <div className="flex-1 h-24 bg-[#d8d8d8] rounded-lg" />
            <div className="flex-1 h-24 bg-[#d8d8d8] rounded-lg" />
          </div>
        </div>

        {/* Chat Widget */}
        {!widgetOpen ? (
          <button
            onClick={() => setWidgetOpen(true)}
            className="absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            style={{ background: primaryColor }}
          >
            <MessageSquare className="w-6 h-6" style={{ color: "#fff" }} />
          </button>
        ) : (
          <div className="absolute bottom-4 right-4 w-[320px] rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: "440px" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ background: primaryColor }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[12px] font-semibold">
                  {agentName[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#fff" }}>{agentName}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Online</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setWidgetOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10">
                  <Minus className="w-3.5 h-3.5 text-white/70" />
                </button>
                <button onClick={() => setWidgetOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10">
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
              {/* Welcome message */}
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: primaryColor }}>
                  {agentName[0]}
                </div>
                <div className="bg-[#f0f0f0] rounded-tr-xl rounded-br-xl rounded-bl-xl px-3 py-2 max-w-[230px]">
                  <p className="text-[13px] text-[#1a1a1a] leading-relaxed">{welcomeMessage}</p>
                </div>
              </div>

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "gap-2"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: primaryColor }}>
                      {agentName[0]}
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 max-w-[230px] ${
                      msg.role === "user"
                        ? "rounded-tl-xl rounded-bl-xl rounded-br-xl"
                        : "rounded-tr-xl rounded-br-xl rounded-bl-xl bg-[#f0f0f0]"
                    }`}
                    style={msg.role === "user" ? { background: accentColor, color: "#fff" } : {}}
                  >
                    <p className={`text-[13px] leading-relaxed ${msg.role === "assistant" ? "text-[#1a1a1a]" : ""}`}>{msg.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: primaryColor }}>
                    {agentName[0]}
                  </div>
                  <div className="bg-[#f0f0f0] rounded-tr-xl rounded-br-xl rounded-bl-xl px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#999] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-[#e0e0e0] bg-white shrink-0">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-[#f5f5f5] rounded-full px-4 py-2 text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#999]"
                  placeholder={`Message ${agentName}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{ background: primaryColor }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
