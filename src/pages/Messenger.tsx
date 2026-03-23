import { useState, useRef, useEffect } from "react";
import {
  Hash, Search, Send, Paperclip, Smile, Plus, Pencil, Pin, Copy, Trash2, MessageSquare,
  Users, Settings, X, Bold, Italic, Code, Link, List, ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessenger } from "@/hooks/useMessenger";
import { useAuth } from "@/hooks/useAuth";

/* ── Helpers ── */
function timeStr(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function dateLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (date.toDateString() === y.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
function formatContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-[hsl(240,5%,8.5%)] rounded px-1 py-0.5 text-[13px] text-accent-green font-mono">$1</code>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-[#85B7EB] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
}

const QUICK_EMOJIS = ["👍", "✅", "🔥", "❤️", "😂", "🎉"];

const MOCK_MEMBERS = [
  { id: "1", name: "Marcus Rivera", role: "Owner", online: true },
  { id: "2", name: "Sarah Chen", role: "Support", online: true },
  { id: "3", name: "James Lee", role: "Sales", online: false },
  { id: "4", name: "River AI", role: "AI Agent", online: true, isRiver: true },
];

const MOCK_MESSAGES: Record<string, { sender: string; senderId: string; content: string; type: string; time: string }[]> = {
  "general": [
    { sender: "River AI", senderId: "river", content: "Good morning team! 3 new leads came in overnight from Facebook Ads. I've already sent SMS callbacks to all 3 — 2 have responded. Check #sales for details.", type: "river_alert", time: "2026-03-23T08:00:00Z" },
    { sender: "Marcus Rivera", senderId: "marcus", content: "Great work River! Let's make sure we follow up on the third one by noon.", type: "text", time: "2026-03-23T08:15:00Z" },
    { sender: "Sarah Chen", senderId: "sarah", content: "I'll handle it. Already on it 🔥", type: "text", time: "2026-03-23T08:17:00Z" },
  ],
  "support": [
    { sender: "Sarah Chen", senderId: "sarah", content: "New ticket from Tony Kim — his workflow automation stopped running after the update. Looking into it now.", type: "text", time: "2026-03-23T09:00:00Z" },
    { sender: "Marcus Rivera", senderId: "marcus", content: "Was this the missed call text-back workflow? Check if Twilio is still connected.", type: "text", time: "2026-03-23T09:05:00Z" },
    { sender: "Sarah Chen", senderId: "sarah", content: "Found it — his Twilio token expired. Walked him through reconnecting. All good now ✅", type: "text", time: "2026-03-23T09:30:00Z" },
  ],
  "sales": [
    { sender: "James Lee", senderId: "james", content: "Just closed the Johnson deal — $4,200! They signed up for the Growth plan.", type: "text", time: "2026-03-23T10:00:00Z" },
    { sender: "River AI", senderId: "river", content: "Confirmed: Johnson Plumbing deal marked as **Won** — $4,200. Total pipeline won this week: **$12,800**. Great momentum! 📈", type: "river_alert", time: "2026-03-23T10:01:00Z" },
    { sender: "Marcus Rivera", senderId: "marcus", content: "Let's go! 🎉 James, can you onboard them this afternoon?", type: "text", time: "2026-03-23T10:05:00Z" },
  ],
  "river-alerts": [
    { sender: "River AI", senderId: "river", content: "🔔 **New lead** from Facebook Ads: Amy Lee (+16025550177). I'm calling now.", type: "river_alert", time: "2026-03-23T07:30:00Z" },
    { sender: "River AI", senderId: "river", content: "📞 **Missed call** from +16025550199. I sent a text-back within 60 seconds. Waiting for response.", type: "river_alert", time: "2026-03-23T08:45:00Z" },
    { sender: "River AI", senderId: "river", content: "✅ **Deal won**: James just closed $4,200 with Johnson Plumbing. Total won this month: **$12,800**.", type: "river_alert", time: "2026-03-23T10:01:00Z" },
    { sender: "River AI", senderId: "river", content: "⚡ **Workflow completed**: Missed call sequence completed for 3 contacts. 2 replied. 1 booked.", type: "river_alert", time: "2026-03-23T11:00:00Z" },
  ],
  "integrations": [
    { sender: "River AI", senderId: "river", content: "Twilio webhook received: Inbound SMS from +16025550100 — \"Yes, I'd like to book for Thursday\"", type: "river_alert", time: "2026-03-23T09:15:00Z" },
    { sender: "River AI", senderId: "river", content: "Stripe webhook: Payment of **$297** received from Tony Kim (Growth plan renewal).", type: "river_alert", time: "2026-03-23T10:30:00Z" },
  ],
  "files": [
    { sender: "Marcus Rivera", senderId: "marcus", content: "Uploaded the Q1 sales report. Check it out team.", type: "text", time: "2026-03-23T09:00:00Z" },
    { sender: "Sarah Chen", senderId: "sarah", content: "Here's the updated onboarding checklist for new clients 📋", type: "text", time: "2026-03-23T11:00:00Z" },
  ],
};

/* ── Main Component ── */
const Messenger = () => {
  const { user } = useAuth();
  const { channels, messages: dbMessages, activeChannelId, setActiveChannelId, sendMessage } = useMessenger();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const channelName = activeChannel?.name || "general";

  const displayMessages = MOCK_MESSAGES[channelName] || [];
  const allMessages = dbMessages.length > 0
    ? dbMessages.map(m => ({ sender: m.sender_id === user?.id ? "You" : "Team", senderId: m.sender_id, content: m.content, type: m.message_type, time: m.created_at, id: m.id }))
    : displayMessages.map((m, i) => ({ ...m, id: `mock-${i}` }));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [allMessages.length, activeChannelId]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* Column 1 — Channel List */}
      <div className="w-[260px] border-r border-border flex flex-col bg-background-secondary flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">Katexs Support</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <span className="text-[11px] text-accent-green">Online</span>
              </div>
            </div>
            <button className="w-7 h-7 rounded-md bg-background-elevated border border-border flex items-center justify-center text-foreground-secondary hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
            <Input className="pl-8 h-8 text-[12px] bg-background-elevated" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Channels */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Channels</span>
              <button className="text-foreground-secondary hover:text-foreground"><Plus className="w-3 h-3" /></button>
            </div>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  activeChannelId === ch.id ? "bg-background-elevated text-foreground" : "text-foreground-secondary hover:text-[#c8c7c2]"
                }`}>
                {ch.type === "river" ? (
                  <div className="w-4 h-4 rounded-full bg-[hsl(var(--accent-purple))] flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <Hash className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                )}
                <span className="text-[13px] truncate">{ch.name}</span>
              </button>
            ))}
          </div>

          {/* Direct Messages */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Direct Messages</span>
              <button className="text-foreground-secondary hover:text-foreground"><Plus className="w-3 h-3" /></button>
            </div>
            {MOCK_MEMBERS.filter(m => !m.isRiver).map(m => (
              <button key={m.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-foreground-secondary hover:text-[#c8c7c2] text-left">
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[9px] font-medium text-foreground-secondary">
                    {initials(m.name)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background-secondary ${m.online ? "bg-accent-green" : "bg-foreground-muted"}`} />
                </div>
                <span className="text-[12px] truncate">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column 2 — Conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-background">
          <div className="flex items-center gap-2">
            {activeChannel?.type === "river" ? (
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--accent-purple))] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            ) : (
              <Hash className="w-4 h-4 text-foreground-secondary" />
            )}
            <span className="text-[15px] font-semibold text-foreground">{channelName}</span>
            {activeChannel?.description && (
              <span className="text-[12px] text-foreground-secondary ml-2 hidden md:inline">— {activeChannel.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="text-foreground-secondary hover:text-foreground p-1.5"><Search className="w-4 h-4" /></button>
            <button className="text-foreground-secondary hover:text-foreground p-1.5 flex items-center gap-1">
              <Users className="w-4 h-4" /><span className="text-[11px]">{MOCK_MEMBERS.length}</span>
            </button>
            <button className="text-foreground-secondary hover:text-foreground p-1.5"><Pin className="w-4 h-4" /></button>
            <button onClick={() => setShowInfo(!showInfo)} className={`p-1.5 ${showInfo ? "text-foreground" : "text-foreground-secondary hover:text-foreground"}`}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-background-elevated border border-border flex items-center justify-center mb-4">
                <Hash className="w-7 h-7 text-foreground-muted" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1">#{channelName}</h3>
              <p className="text-[12px] text-foreground-secondary max-w-[300px]">
                {channelName === "river-alerts"
                  ? "River will post here automatically when things happen in your business."
                  : `Be the first to send a message in #${channelName}`}
              </p>
            </div>
          ) : (
            allMessages.map((msg, i) => {
              const prev = i > 0 ? allMessages[i - 1] : null;
              const showDate = !prev || dateLabel(prev.time) !== dateLabel(msg.time);
              const isGrouped = prev && !showDate && prev.senderId === msg.senderId &&
                (new Date(msg.time).getTime() - new Date(prev.time).getTime()) < 300000;
              const isRiver = msg.type === "river_alert" || msg.senderId === "river";

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-background-elevated border border-border rounded-full text-[10px] text-foreground-secondary">
                        {dateLabel(msg.time)}
                      </span>
                    </div>
                  )}
                  <div className="group relative py-0.5 px-2 -mx-2 rounded-md hover:bg-background-card/50"
                    onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                    {!isGrouped ? (
                      <div className="flex gap-3 pt-2">
                        {isRiver ? (
                          <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent-purple)/0.15)] border border-[hsl(var(--accent-purple)/0.3)] flex items-center justify-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[hsl(var(--accent-purple))]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[11px] font-medium text-foreground-secondary flex-shrink-0">
                            {initials(msg.sender)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[13px] font-medium ${isRiver ? "text-[#AFA9EC]" : "text-foreground"}`}>{msg.sender}</span>
                            <span className="text-[11px] text-foreground-secondary">{timeStr(msg.time)}</span>
                          </div>
                          <div className={`mt-0.5 ${isRiver ? "bg-[hsl(var(--accent-purple)/0.06)] border-l-2 border-l-[hsl(var(--accent-purple))] rounded-r-lg px-3 py-2" : ""}`}>
                            <p className="text-[14px] text-[#c8c7c2] leading-relaxed whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-11">
                        <div className={`${isRiver ? "bg-[hsl(var(--accent-purple)/0.06)] border-l-2 border-l-[hsl(var(--accent-purple))] rounded-r-lg px-3 py-2" : ""}`}>
                          <p className="text-[14px] text-[#c8c7c2] leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                        </div>
                      </div>
                    )}

                    {hoveredMsg === msg.id && (
                      <div className="absolute right-2 -top-3 flex items-center gap-0.5 bg-background-card border border-border rounded-md p-0.5 z-10">
                        {QUICK_EMOJIS.slice(0, 3).map(e => (
                          <button key={e} className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-[14px]">{e}</button>
                        ))}
                        <div className="w-px h-5 bg-border mx-0.5" />
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-foreground-secondary"><MessageSquare className="w-3.5 h-3.5" /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-foreground-secondary"><Pin className="w-3.5 h-3.5" /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-foreground-secondary"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-[hsl(240,12%,3%)] p-3">
          {showToolbar && (
            <div className="flex items-center gap-1 mb-2 bg-background-elevated border border-border rounded-lg px-2 py-1">
              {[Bold, Italic, Code, Link, List, ListOrdered].map((Icon, i) => (
                <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-card text-foreground-secondary hover:text-foreground">
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onFocus={() => setShowToolbar(true)} onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            className="w-full bg-background-elevated border border-border rounded-[10px] px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-foreground-secondary resize-none min-h-[44px] max-h-[200px] focus:outline-none focus:border-[hsl(var(--ring))]"
            rows={1}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-secondary hover:text-foreground hover:bg-background-elevated"><Paperclip className="w-4 h-4" /></button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-secondary hover:text-foreground hover:bg-background-elevated"><Smile className="w-4 h-4" /></button>
              <button className="flex items-center gap-1.5 px-2 h-8 rounded-md text-[11px] font-medium text-[#AFA9EC] hover:bg-[hsl(var(--accent-purple)/0.08)]">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent-purple))]" />Ask River
              </button>
            </div>
            <Button size="sm" className="h-8 w-8 p-0" onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column 3 — Info Panel */}
      {showInfo && (
        <div className="w-[260px] border-l border-border flex flex-col bg-background-secondary flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-foreground">
                {activeChannel?.type === "river" ? "River Alerts" : `#${channelName}`}
              </h3>
              <button onClick={() => setShowInfo(false)} className="text-foreground-secondary hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-foreground-secondary mt-1">{activeChannel?.description}</p>
          </div>

          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Members — {MOCK_MEMBERS.length}</span>
              <button className="text-[11px] text-foreground-secondary hover:text-foreground">Add</button>
            </div>
            <div className="space-y-2">
              {MOCK_MEMBERS.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="relative">
                    {m.isRiver ? (
                      <div className="w-7 h-7 rounded-full bg-[hsl(var(--accent-purple)/0.15)] border border-[hsl(var(--accent-purple)/0.3)] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--accent-purple))]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[10px] font-medium text-foreground-secondary">
                        {initials(m.name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background-secondary ${m.online ? "bg-accent-green" : "bg-foreground-muted"}`} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-medium ${m.isRiver ? "text-[#AFA9EC]" : "text-foreground"}`}>{m.name}</p>
                    <p className="text-[10px] text-foreground-secondary">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Pinned Messages</span>
            <p className="text-[11px] text-foreground-secondary mt-2">No pinned messages yet</p>
          </div>

          <div className="p-4 border-b border-border">
            <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Shared Files</span>
            <p className="text-[11px] text-foreground-secondary mt-2">No files shared yet</p>
          </div>

          <div className="p-4">
            <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em] font-medium">Notifications</span>
            <div className="mt-2 space-y-1">
              {["All messages", "Mentions only", "Nothing"].map((opt, i) => (
                <label key={opt} className="flex items-center gap-2 text-[12px] text-foreground-secondary cursor-pointer">
                  <input type="radio" name="notif" defaultChecked={i === 0} className="accent-[hsl(var(--accent-green))]" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messenger;
