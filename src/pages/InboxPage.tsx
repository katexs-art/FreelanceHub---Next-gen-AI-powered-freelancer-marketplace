import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Paperclip, Smile, Send, Phone, Play, Pencil, Check, X, ChevronDown } from "lucide-react";

// ── Types ──
type Channel = "sms" | "email" | "chat" | "facebook" | "instagram";
type ChannelFilter = "all" | Channel | "calls";

interface MockMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  channel: Channel;
  read: boolean;
  created_at: string;
  isRiver?: boolean;
  isCall?: boolean;
  callDuration?: string;
  callType?: "inbound" | "missed";
  answeredByRiver?: boolean;
}

interface MockConversation {
  id: string;
  contactName: string;
  contactInitials: string;
  channel: Channel;
  phone?: string;
  email?: string;
  source?: string;
  status: string;
  createdAt: string;
  messages: MockMessage[];
  unread: number;
  riverHandled: boolean;
  deals: { name: string; value: string; stage: string }[];
  activities: { type: string; description: string; time: string }[];
  notes: string[];
}

// ── Mock Data ──
const CURRENT_USER_ID = "current-user";
const TODAY = new Date().toISOString().split("T")[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split("T")[0];

const mockConversations: MockConversation[] = [
  {
    id: "conv-1",
    contactName: "James Miller",
    contactInitials: "JM",
    channel: "sms",
    phone: "+1 (555) 234-8901",
    email: "james.miller@email.com",
    source: "Google Ads",
    status: "hot",
    createdAt: "2026-03-15",
    unread: 2,
    riverHandled: false,
    deals: [{ name: "Kitchen remodel", value: "$8,500", stage: "hot" }],
    activities: [
      { type: "sms", description: "Sent follow-up SMS", time: "2h ago" },
      { type: "call", description: "Inbound call — 4m 22s", time: "5h ago" },
    ],
    notes: ["Wants quote by Friday. Prefers morning appointments."],
    messages: [
      { id: "m1", sender_id: "james", receiver_id: CURRENT_USER_ID, content: "Hey, I saw your ad for kitchen remodeling. Do you service the downtown area?", channel: "sms", read: true, created_at: `${YESTERDAY}T14:30:00Z` },
      { id: "m2", sender_id: CURRENT_USER_ID, receiver_id: "james", content: "Hi James! Yes we do — we cover the entire metro area. Would you like a free estimate?", channel: "sms", read: true, created_at: `${YESTERDAY}T14:35:00Z` },
      { id: "m3", sender_id: "james", receiver_id: CURRENT_USER_ID, content: "That would be great. I'm available Thursday or Friday morning.", channel: "sms", read: true, created_at: `${YESTERDAY}T15:10:00Z` },
      { id: "m4", sender_id: CURRENT_USER_ID, receiver_id: "james", content: "Perfect — I'll have my team reach out to confirm a time. What's the best number to call?", channel: "sms", read: true, created_at: `${YESTERDAY}T15:15:00Z` },
      { id: "m5", sender_id: "james", receiver_id: CURRENT_USER_ID, content: "This number works. Also — do you do countertops too?", channel: "sms", read: false, created_at: `${TODAY}T09:12:00Z` },
      { id: "m6", sender_id: "james", receiver_id: CURRENT_USER_ID, content: "Looking at quartz or marble", channel: "sms", read: false, created_at: `${TODAY}T09:13:00Z` },
    ],
  },
  {
    id: "conv-2",
    contactName: "Unknown Caller",
    contactInitials: "?",
    channel: "sms",
    phone: "+1 (555) 000-1234",
    status: "new",
    createdAt: "2026-03-23",
    unread: 1,
    riverHandled: true,
    deals: [],
    activities: [
      { type: "call", description: "Missed call — River sent SMS callback", time: "1h ago" },
    ],
    notes: [],
    messages: [
      { id: "m7", sender_id: "unknown", receiver_id: CURRENT_USER_ID, content: "", channel: "sms", read: true, created_at: `${TODAY}T08:00:00Z`, isCall: true, callType: "missed", callDuration: "0:00", answeredByRiver: false },
      { id: "m8", sender_id: CURRENT_USER_ID, receiver_id: "unknown", content: "Hi! Sorry we missed your call. We're a local service business and would love to help. When's a good time to call you back?", channel: "sms", read: true, created_at: `${TODAY}T08:01:00Z`, isRiver: true },
      { id: "m9", sender_id: "unknown", receiver_id: CURRENT_USER_ID, content: "Can you call me around 2pm today?", channel: "sms", read: false, created_at: `${TODAY}T08:15:00Z` },
    ],
  },
  {
    id: "conv-3",
    contactName: "Sarah Rhodes",
    contactInitials: "SR",
    channel: "chat",
    email: "sarah.rhodes@gmail.com",
    source: "Website",
    status: "warm",
    createdAt: "2026-03-20",
    unread: 0,
    riverHandled: true,
    deals: [{ name: "Bathroom renovation", value: "$5,200", stage: "new" }],
    activities: [
      { type: "chat", description: "Website chat — River handled", time: "3h ago" },
    ],
    notes: ["Interested in bathroom renovation. Budget around $5k."],
    messages: [
      { id: "m10", sender_id: "sarah", receiver_id: CURRENT_USER_ID, content: "Hi, I'm looking for someone to renovate my bathroom. Do you offer free consultations?", channel: "chat", read: true, created_at: `${TODAY}T07:00:00Z` },
      { id: "m11", sender_id: CURRENT_USER_ID, receiver_id: "sarah", content: "Hi Sarah! Yes, we offer free in-home consultations. I can get you booked this week — what day works best for you?", channel: "chat", read: true, created_at: `${TODAY}T07:01:00Z`, isRiver: true },
      { id: "m12", sender_id: "sarah", receiver_id: CURRENT_USER_ID, content: "Wednesday afternoon would be perfect!", channel: "chat", read: true, created_at: `${TODAY}T07:05:00Z` },
      { id: "m13", sender_id: CURRENT_USER_ID, receiver_id: "sarah", content: "Done! I've booked you for Wednesday at 2:00 PM. You'll get a confirmation text shortly. Looking forward to it!", channel: "chat", read: true, created_at: `${TODAY}T07:06:00Z`, isRiver: true },
    ],
  },
  {
    id: "conv-4",
    contactName: "Mike Johnson",
    contactInitials: "MJ",
    channel: "facebook",
    source: "Facebook",
    status: "new",
    createdAt: "2026-03-22",
    unread: 1,
    riverHandled: false,
    deals: [],
    activities: [
      { type: "chat", description: "Facebook DM received", time: "4h ago" },
    ],
    notes: [],
    messages: [
      { id: "m14", sender_id: "mike", receiver_id: CURRENT_USER_ID, content: "Yo, saw your work on my neighbor's deck. That looks amazing. How much for something similar?", channel: "facebook", read: true, created_at: `${TODAY}T06:30:00Z` },
      { id: "m15", sender_id: CURRENT_USER_ID, receiver_id: "mike", content: "Thanks Mike! Deck projects usually range from $3k-$8k depending on size and materials. Want me to come take a look?", channel: "facebook", read: true, created_at: `${TODAY}T06:45:00Z` },
      { id: "m16", sender_id: "mike", receiver_id: CURRENT_USER_ID, content: "Yeah for sure. I'm free this weekend if that works", channel: "facebook", read: false, created_at: `${TODAY}T10:20:00Z` },
    ],
  },
  {
    id: "conv-5",
    contactName: "Tony Kim",
    contactInitials: "TK",
    channel: "email",
    email: "tony.kim@company.com",
    source: "Referral",
    status: "booked",
    createdAt: "2026-03-18",
    unread: 0,
    riverHandled: false,
    deals: [{ name: "Office buildout", value: "$22,000", stage: "booked" }],
    activities: [
      { type: "email", description: "Sent contract via email", time: "1d ago" },
      { type: "note", description: "Contract signed. Start date April 1.", time: "6h ago" },
    ],
    notes: ["Contract signed. Start date April 1.", "Referred by David Chen."],
    messages: [
      { id: "m17", sender_id: "tony", receiver_id: CURRENT_USER_ID, content: "Hi, David Chen referred me. We need an office buildout for our new space — about 2000 sq ft. Can you handle that?", channel: "email", read: true, created_at: `${YESTERDAY}T10:00:00Z` },
      { id: "m18", sender_id: CURRENT_USER_ID, receiver_id: "tony", content: "Hi Tony — absolutely. We specialize in commercial buildouts. I'll send over a proposal today. What's your timeline?", channel: "email", read: true, created_at: `${YESTERDAY}T11:00:00Z` },
      { id: "m19", sender_id: "tony", receiver_id: CURRENT_USER_ID, content: "We'd like to start by April 1st. Budget is around $20-25k. Attached are the floor plans.", channel: "email", read: true, created_at: `${YESTERDAY}T13:00:00Z` },
      { id: "m20", sender_id: CURRENT_USER_ID, receiver_id: "tony", content: "Perfect timeline. I've reviewed the plans — we can do this for $22k. Sending the contract now.", channel: "email", read: true, created_at: `${YESTERDAY}T16:00:00Z` },
    ],
  },
  {
    id: "conv-6",
    contactName: "Amy Lee",
    contactInitials: "AL",
    channel: "instagram",
    source: "Instagram",
    status: "warm",
    createdAt: "2026-03-21",
    unread: 1,
    riverHandled: true,
    deals: [],
    activities: [
      { type: "chat", description: "Instagram DM — River replied", time: "30m ago" },
    ],
    notes: [],
    messages: [
      { id: "m21", sender_id: "amy", receiver_id: CURRENT_USER_ID, content: "Love your before/after posts! Do you do interior painting too?", channel: "instagram", read: true, created_at: `${TODAY}T10:00:00Z` },
      { id: "m22", sender_id: CURRENT_USER_ID, receiver_id: "amy", content: "Thank you Amy! Yes, interior painting is one of our most popular services. We use premium low-VOC paints. Would you like a free color consultation?", channel: "instagram", read: true, created_at: `${TODAY}T10:01:00Z`, isRiver: true },
      { id: "m23", sender_id: "amy", receiver_id: CURRENT_USER_ID, content: "That would be amazing! I have a 3-bedroom apartment. What's the usual price range?", channel: "instagram", read: false, created_at: `${TODAY}T11:30:00Z` },
    ],
  },
];

// ── Channel helpers ──
const channelConfig: Record<Channel, { label: string; color: string; bg: string }> = {
  sms: { label: "S", color: "hsl(var(--accent-green))", bg: "hsla(var(--accent-green), 0.12)" },
  email: { label: "E", color: "hsl(var(--foreground-secondary))", bg: "hsla(var(--foreground-secondary), 0.12)" },
  chat: { label: "W", color: "hsl(var(--accent-purple))", bg: "hsla(var(--accent-purple), 0.12)" },
  facebook: { label: "F", color: "#4a90d9", bg: "rgba(74,144,217,0.12)" },
  instagram: { label: "I", color: "#e1306c", bg: "rgba(225,48,108,0.12)" },
};

const statusColors: Record<string, string> = {
  hot: "bg-accent-green/20 text-accent-green",
  booked: "bg-blue-500/20 text-blue-400",
  won: "bg-accent-green/20 text-accent-green",
  cold: "bg-foreground-muted/20 text-foreground-secondary",
  lost: "bg-destructive/20 text-destructive",
  new: "bg-primary/10 text-foreground",
  warm: "bg-amber-500/20 text-amber-400",
};

const stageColors: Record<string, string> = {
  new: "bg-primary/10 text-foreground",
  hot: "bg-accent-green/20 text-accent-green",
  booked: "bg-blue-500/20 text-blue-400",
  won: "bg-accent-green/20 text-accent-green",
  lost: "bg-destructive/20 text-destructive",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "1d";
  return `${diffDays}d`;
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d === today) return "Today";
  if (d === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Component ──
const InboxPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendChannel, setSendChannel] = useState<Channel>("sms");
  const [riverAutoRespond, setRiverAutoRespond] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [riverAssistLoading, setRiverAssistLoading] = useState(false);
  const [riverSuggestion, setRiverSuggestion] = useState<string | null>(null);
  const [riverInsights, setRiverInsights] = useState<Record<string, string>>({});
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(() => {
    let filtered = mockConversations;
    if (filter !== "all") {
      if (filter === "calls") {
        filtered = filtered.filter((c) => c.messages.some((m) => m.isCall));
      } else {
        filtered = filtered.filter((c) => c.channel === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) => c.contactName.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [filter, search]);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [selectedId, conversations]);

  const totalUnread = useMemo(() => mockConversations.reduce((s, c) => s + c.unread, 0), []);

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockConversations.length, calls: 0 };
    for (const c of mockConversations) {
      counts[c.channel] = (counts[c.channel] || 0) + 1;
      if (c.messages.some((m) => m.isCall)) counts.calls++;
    }
    return counts;
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !selected) return;
    toast({ title: "Message sent", description: `Sent via ${sendChannel.toUpperCase()} to ${selected.contactName}` });
    setMessageText("");
    setRiverSuggestion(null);
  }, [messageText, selected, sendChannel]);

  const handleRiverAssist = useCallback(async () => {
    if (!selected) return;
    setRiverAssistLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("river-chat", {
        body: {
          message: `Based on this conversation with ${selected.contactName}, suggest a professional reply. Last messages: ${selected.messages.slice(-3).map((m) => `${m.sender_id === CURRENT_USER_ID ? "Me" : selected.contactName}: ${m.content}`).join(" | ")}. Write ONLY the reply text, nothing else.`,
          userName: "Business Owner",
          businessName: "My Business",
          industry: "Home Services",
        },
      });
      if (error) throw error;
      setRiverSuggestion(data?.reply || "I'd be happy to help with that. Let me check and get back to you shortly.");
    } catch {
      setRiverSuggestion("Thanks for reaching out! I'd love to help. Let me look into this and get back to you shortly.");
    } finally {
      setRiverAssistLoading(false);
    }
  }, [selected]);

  const loadRiverInsight = useCallback(async (conv: MockConversation) => {
    if (riverInsights[conv.id]) return;
    try {
      const { data } = await supabase.functions.invoke("river-chat", {
        body: {
          message: `Contact: ${conv.contactName}, status: ${conv.status}, channel: ${conv.channel}. Activities: ${conv.activities.map((a) => a.description).join(", ")}. What is their likelihood to convert and what should the business owner do next? 2 sentences max.`,
          userName: "Owner",
          businessName: "Business",
          industry: "Services",
        },
      });
      setRiverInsights((prev) => ({ ...prev, [conv.id]: data?.reply || "This contact shows moderate engagement. Follow up within 24 hours to maintain momentum." }));
    } catch {
      setRiverInsights((prev) => ({ ...prev, [conv.id]: "This contact shows moderate engagement. Follow up within 24 hours to maintain momentum." }));
    }
  }, [riverInsights]);

  useEffect(() => {
    if (selected) loadRiverInsight(selected);
  }, [selected, loadRiverInsight]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("inbox-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        toast({ title: "New message", description: "A new message just arrived." });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filterTabs: { key: ChannelFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sms", label: "SMS" },
    { key: "calls", label: "Calls" },
    { key: "chat", label: "Chat" },
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "email", label: "Email" },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Column 1 — Conversation List */}
      <div className="w-[320px] min-w-[320px] border-r border-border flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold text-foreground">Inbox</span>
            {totalUnread > 0 && (
              <span className="bg-accent-green/20 text-accent-green text-[10px] font-medium px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Channel filters */}
        <div className="px-4 flex gap-0.5 overflow-x-auto scrollbar-none pb-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-2.5 py-1.5 text-[11px] font-medium transition-colors rounded-sm ${
                filter === tab.key
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
              {(channelCounts[tab.key] ?? 0) > 0 && (
                <span className="ml-1 text-foreground-muted">{channelCounts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-secondary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="h-9 pl-8 text-[12px] bg-background-elevated border-border"
            />
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isActive = conv.id === selectedId;
            const cfg = channelConfig[conv.channel];
            return (
              <button
                key={conv.id}
                onClick={() => { setSelectedId(conv.id); setSendChannel(conv.channel); }}
                className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b border-border/50 ${
                  isActive ? "bg-background-card border-l-2 border-l-foreground" : "hover:bg-background-card/50 border-l-2 border-l-transparent"
                }`}
              >
                {/* Unread dot */}
                <div className="flex flex-col items-center pt-1.5 w-2 shrink-0">
                  {conv.unread > 0 && <div className="w-[6px] h-[6px] rounded-full bg-accent-green" />}
                </div>
                {/* Channel icon */}
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-medium truncate ${conv.unread > 0 ? "text-foreground" : "text-foreground/70"}`}>
                      {conv.contactName}
                    </span>
                    <span className="text-[10px] text-foreground-secondary shrink-0 ml-2">
                      {formatTime(lastMsg.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-foreground-secondary truncate">
                      {lastMsg.isCall ? (lastMsg.callType === "missed" ? "Missed call" : "Inbound call") : lastMsg.content}
                    </span>
                    {conv.riverHandled && (
                      <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">
                        River
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Column 2 — Active Conversation */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Top bar */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: channelConfig[selected.channel].bg, color: channelConfig[selected.channel].color }}
              >
                {channelConfig[selected.channel].label}
              </div>
              <span className="text-[14px] font-semibold text-foreground">{selected.contactName}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[selected.status]}`}>
                {selected.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRiverAutoRespond(!riverAutoRespond)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  riverAutoRespond ? "bg-accent-purple/15 text-accent-purple" : "bg-background-elevated text-foreground-secondary"
                }`}
              >
                River auto-respond: {riverAutoRespond ? "ON" : "OFF"}
              </button>
              <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2">
                <Check className="h-3 w-3 mr-1" /> Mark resolved
              </Button>
              <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2 text-accent-purple border-accent-purple/20">
                Assign to River
              </Button>
            </div>
          </div>

          {/* Message thread */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="flex flex-col gap-1 max-w-[720px] mx-auto">
              {selected.messages.map((msg, i) => {
                const prevMsg = selected.messages[i - 1];
                const showDate = !prevMsg || getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);
                const isOutgoing = msg.sender_id === CURRENT_USER_ID;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-[10px] text-foreground-muted">{getDateLabel(msg.created_at)}</span>
                      </div>
                    )}

                    {msg.isCall ? (
                      <div className="my-2 mx-auto w-fit bg-background-card border border-border rounded-[10px] p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-background-elevated flex items-center justify-center">
                          <Phone className="h-3.5 w-3.5 text-foreground-secondary" />
                        </div>
                        <div>
                          <span className="text-[12px] font-medium text-foreground">
                            {msg.callType === "missed" ? "Missed call" : "Inbound call"}
                          </span>
                          <span className="text-[10px] text-foreground-secondary ml-2">{msg.callDuration}</span>
                          {msg.answeredByRiver && (
                            <span className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">
                              Answered by River
                            </span>
                          )}
                          {msg.callType === "missed" && (
                            <span className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                              Missed
                            </span>
                          )}
                        </div>
                        <button className="w-7 h-7 rounded-full bg-background-elevated flex items-center justify-center ml-2">
                          <Play className="h-3 w-3 text-foreground-secondary" />
                        </button>
                      </div>
                    ) : (
                      <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-1`}>
                        <div className="max-w-[70%]">
                          {msg.isRiver && (
                            <span className="text-[10px] text-accent-purple font-medium ml-1 mb-0.5 block">River</span>
                          )}
                          <div
                            className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
                              msg.isRiver
                                ? "bg-accent-purple/[0.08] border border-accent-purple/20 rounded-[0_10px_10px_10px] text-foreground/80"
                                : isOutgoing
                                ? "bg-background-elevated border border-border rounded-[10px_0_10px_10px] text-foreground/80"
                                : "bg-background-card border border-border rounded-[0_10px_10px_10px] text-foreground/80"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-foreground-secondary mt-0.5 block px-1">
                            {formatTimestamp(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>
          </ScrollArea>

          {/* River suggestion */}
          {riverSuggestion && (
            <div className="mx-4 mb-2 bg-accent-purple/[0.06] border border-accent-purple/15 rounded-[10px] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-purple" />
                <span className="text-[10px] font-medium text-accent-purple">River suggestion</span>
              </div>
              <p className="text-[12px] text-foreground/80 mb-2">{riverSuggestion}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-3"
                  onClick={() => { setMessageText(riverSuggestion); setRiverSuggestion(null); }}
                >
                  Use this
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-3"
                  onClick={() => setRiverSuggestion(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-border bg-background-secondary p-4">
            {/* Channel selector */}
            <div className="relative mb-2 w-fit">
              <button
                onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background-elevated border border-border text-[11px] text-foreground-secondary"
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ background: channelConfig[sendChannel].bg, color: channelConfig[sendChannel].color }}
                >
                  {channelConfig[sendChannel].label}
                </span>
                {sendChannel.toUpperCase()}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showChannelDropdown && (
                <div className="absolute bottom-full left-0 mb-1 bg-background-card border border-border rounded-md py-1 z-10 min-w-[120px]">
                  {(Object.keys(channelConfig) as Channel[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => { setSendChannel(ch); setShowChannelDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-foreground-secondary hover:bg-background-elevated flex items-center gap-2"
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                        style={{ background: channelConfig[ch].bg, color: channelConfig[ch].color }}
                      >
                        {channelConfig[ch].label}
                      </span>
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[60px] resize-none bg-background-elevated border-border text-foreground placeholder:text-foreground-secondary text-[13px] rounded-[10px] mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-background-elevated text-foreground-secondary">
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-background-elevated text-foreground-secondary">
                  <Smile className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleRiverAssist}
                  disabled={riverAssistLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-accent-purple bg-accent-purple/[0.08] hover:bg-accent-purple/[0.15] transition-colors disabled:opacity-50"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  {riverAssistLoading ? "Thinking..." : "Ask River to write this"}
                </button>
              </div>
              <Button size="sm" className="h-8 px-4 text-[12px]" onClick={handleSend} disabled={!messageText.trim()}>
                <Send className="h-3 w-3 mr-1" /> Send
              </Button>
            </div>
            {/* Channel notices */}
            {sendChannel === "sms" && (
              <p className="text-[10px] text-foreground-muted mt-2">Connect Twilio in Settings to send SMS</p>
            )}
            {sendChannel === "email" && (
              <p className="text-[10px] text-foreground-muted mt-2">Connect SendGrid in Settings to send email</p>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="text-[72px] font-bold text-background-elevated select-none mb-4">K</div>
          <p className="text-[14px] text-foreground-secondary mb-2">Select a conversation to start</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-[11px] text-foreground-secondary">River is monitoring all channels</span>
          </div>
        </div>
      )}

      {/* Column 3 — Contact Details */}
      {selected && (
        <div className="w-[280px] min-w-[280px] border-l border-border bg-background flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Contact header */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-11 h-11 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[14px] font-semibold text-foreground mb-2">
                  {selected.contactInitials}
                </div>
                <span className="text-[15px] font-semibold text-foreground">{selected.contactName}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1 ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
                <button className="mt-2 text-foreground-secondary hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>

              {/* Contact Info */}
              <div className="mb-5">
                <span className="text-label uppercase tracking-[0.1em] text-foreground-secondary block mb-2">Contact Info</span>
                <div className="space-y-2">
                  {selected.phone && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-foreground-secondary">Phone</span>
                      <a href={`tel:${selected.phone}`} className="text-foreground hover:underline">{selected.phone}</a>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-foreground-secondary">Email</span>
                      <a href={`mailto:${selected.email}`} className="text-foreground hover:underline truncate ml-2">{selected.email}</a>
                    </div>
                  )}
                  {selected.source && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-foreground-secondary">Source</span>
                      <span className="text-foreground">{selected.source}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[12px]">
                    <span className="text-foreground-secondary">Created</span>
                    <span className="text-foreground">{new Date(selected.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Deals */}
              <div className="mb-5">
                <span className="text-label uppercase tracking-[0.1em] text-foreground-secondary block mb-2">Active Deals</span>
                {selected.deals.length > 0 ? (
                  <div className="space-y-2">
                    {selected.deals.map((deal, i) => (
                      <div key={i} className="bg-background-elevated rounded-md p-2.5 border border-border">
                        <div className="text-[12px] font-medium text-foreground">{deal.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-foreground-secondary">{deal.value}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full capitalize ${stageColors[deal.stage]}`}>
                            {deal.stage}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-foreground-secondary">No active deals</p>
                )}
                <button className="text-[11px] text-foreground-secondary hover:text-foreground mt-2 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> New deal
                </button>
              </div>

              {/* Activity */}
              <div className="mb-5">
                <span className="text-label uppercase tracking-[0.1em] text-foreground-secondary block mb-2">Activity</span>
                <div className="space-y-2.5">
                  {selected.activities.map((act, i) => {
                    const dotColor = act.type === "call" ? "bg-blue-400" : act.type === "chat" ? "bg-accent-purple" : act.type === "sms" ? "bg-accent-green" : "bg-foreground-muted";
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-foreground/80 truncate">{act.description}</p>
                          <p className="text-[10px] text-foreground-secondary">{act.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <span className="text-label uppercase tracking-[0.1em] text-foreground-secondary block mb-2">Notes</span>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[50px] resize-none text-[11px] bg-background-elevated border-border mb-2"
                />
                {selected.notes.map((n, i) => (
                  <div key={i} className="bg-background-elevated rounded-md p-2 mb-1.5 border border-border">
                    <p className="text-[11px] text-foreground/70">{n}</p>
                  </div>
                ))}
              </div>

              {/* River Insights */}
              <div className="bg-accent-purple/[0.04] border border-accent-purple/10 rounded-[10px] p-3">
                <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-accent-purple block mb-2">River Insights</span>
                <p className="text-[11px] text-foreground/70 mb-3">
                  {riverInsights[selected.id] || "Loading River's assessment..."}
                </p>
                <div>
                  <span className="text-[10px] text-foreground-secondary block mb-1">Conversion likelihood</span>
                  <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full transition-all"
                      style={{
                        width: selected.status === "booked" ? "85%" : selected.status === "hot" ? "70%" : selected.status === "warm" ? "50%" : "30%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
