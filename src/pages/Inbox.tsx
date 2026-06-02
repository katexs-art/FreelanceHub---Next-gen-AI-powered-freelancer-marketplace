import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageSquare, Pencil, Video, MoreHorizontal, Paperclip, ArrowRight, ArrowLeft, Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { CustomOfferComposer } from "@/components/marketplace/CustomOfferComposer";
import { CustomOfferCard } from "@/components/marketplace/CustomOfferCard";
import { ConversationDetailsPanel } from "@/components/inbox/ConversationDetailsPanel";

interface Conv {
  id: string;
  participant_one: string;
  participant_two: string;
  gig_id: string | null;
  order_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count?: number;
  other?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_online?: boolean | null;
    last_seen_at?: string | null;
  };
}
interface Msg {
  id: string; conversation_id: string; sender_id: string; recipient_id: string;
  content: string | null; created_at: string; is_read: boolean;
  custom_offer_id: string | null;
  message_type?: string | null;
  pitch_price?: number | null;
  pitch_delivery_days?: number | null;
}

function initials(name?: string | null, username?: string | null) {
  return (name?.[0] ?? username?.[0] ?? "?").toUpperCase();
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatListTimestamp(d: string) {
  const date = new Date(d);
  const now = new Date();
  const same = date.toDateString() === now.toDateString();
  if (same) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function Inbox() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [hoverIcon, setHoverIcon] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => convs.find((c) => c.id === conversationId) ?? null, [convs, conversationId]);

  const loadConvs = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      const list = (data ?? []) as Conv[];
      const otherIds = Array.from(new Set(list.map((c) => (c.participant_one === user.id ? c.participant_two : c.participant_one))));
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, username, avatar_url, is_online").in("id", otherIds);
        const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
        list.forEach((c) => {
          const oid = c.participant_one === user.id ? c.participant_two : c.participant_one;
          c.other = byId[oid];
        });

        // Unread counts (per conversation, recipient = me, unread)
        const { data: unread } = await supabase
          .from("messages")
          .select("conversation_id")
          .eq("recipient_id", user.id)
          .eq("is_read", false)
          .in("conversation_id", list.map((c) => c.id));
        const counts: Record<string, number> = {};
        (unread ?? []).forEach((m: any) => {
          counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
        });
        list.forEach((c) => { c.unread_count = counts[c.id] ?? 0; });
      }
      setConvs(list);
    } catch (e) {
      console.error("Inbox loadConvs failed", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (cid: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", cid).order("created_at");
    setMessages((data ?? []) as Msg[]);
    if (user) {
      await supabase.from("messages").update({ is_read: true })
        .eq("conversation_id", cid).eq("recipient_id", user.id).eq("is_read", false);
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { loadConvs(); /* eslint-disable-next-line */ }, [user?.id]);
  useEffect(() => { if (conversationId) loadMessages(conversationId); }, [conversationId]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Msg;
        if (m.conversation_id === conversationId) {
          setMessages((prev) => [...prev, m]);
          if (m.recipient_id === user.id) {
            supabase.from("messages").update({ is_read: true }).eq("id", m.id);
          }
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        }
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, user?.id]);

  const send = async () => {
    if (!draft.trim() || !active || !user) return;
    const recipient = active.participant_one === user.id ? active.participant_two : active.participant_one;
    const text = draft;
    setDraft("");
    try {
      const { data: sess } = await supabase.auth.getUser();
      if (!sess?.user) throw new Error("Please sign in to send messages");
      const { error } = await supabase.from("messages").insert({
        conversation_id: active.id, sender_id: sess.user.id, recipient_id: recipient, content: text,
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send message");
      setDraft(text);
    }
  };

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => {
      const name = (c.other?.full_name ?? "").toLowerCase();
      const uname = (c.other?.username ?? "").toLowerCase();
      const prev = (c.last_message_preview ?? "").toLowerCase();
      return name.includes(q) || uname.includes(q) || prev.includes(q);
    });
  }, [convs, search]);

  // Group messages by day
  const grouped = useMemo(() => {
    const groups: { label: string; items: Msg[] }[] = [];
    let currentKey = "";
    messages.forEach((m) => {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== currentKey) {
        groups.push({ label: formatDateLabel(d), items: [m] });
        currentKey = key;
      } else {
        groups[groups.length - 1].items.push(m);
      }
    });
    return groups;
  }, [messages]);

  const iconBtn = (id: string, on = false) => ({
    background: "transparent",
    border: "none",
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    cursor: "pointer",
    color: hoverIcon === id || on ? "#0A0A0A" : "#888",
    transition: "color 0.15s",
  });

  return (
    <AppShell>
      <div
        style={{
          margin: "-2.5rem",
          height: "calc(100vh - 3.5rem)",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : active
            ? "320px 1fr 260px"
            : "320px 1fr",
          background: "#fff",
        }}
      >
        {/* COLUMN 2 — Conversation list (drawer on mobile, inline on desktop) */}
        {(() => {
        const listAside = (
        <aside
          style={{
            background: "#FFFFFF",
            borderRight: isMobile ? "none" : "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "20px 16px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>Messages</h2>
            <button
              type="button"
              aria-label="Compose"
              style={{
                background: hoverIcon === "compose" ? "#EEF2FF" : "transparent",
                border: "none",
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: hoverIcon === "compose" ? "#4F46E5" : "#64748B",
                transition: "all 0.15s",
              }}
              onMouseEnter={() => setHoverIcon("compose")}
              onMouseLeave={() => setHoverIcon(null)}
            >
              <Pencil size={16} />
            </button>
          </div>

          <div style={{ padding: "12px 16px" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search messages..."
              style={{
                width: "100%",
                background: searchFocused ? "#FFFFFF" : "#F1F5F9",
                border: `1px solid ${searchFocused ? "#4F46E5" : "transparent"}`,
                boxShadow: searchFocused ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
                borderRadius: 999,
                padding: "9px 16px",
                fontSize: 13,
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.15s",
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loading && (
              <div style={{ padding: 16, fontSize: 12, color: "#64748B" }}>Loading…</div>
            )}
            {!loading && filteredConvs.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div
                  style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "#EEF2FF", color: "#4F46E5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <MessageSquare size={28} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>
                  No conversations yet
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
                  Post a project or browse experts to get started.
                </div>
                <Link
                  to="/services"
                  style={{
                    display: "inline-block", background: "#4F46E5", color: "#fff",
                    borderRadius: 999, padding: "9px 20px", fontSize: 13,
                    fontWeight: 600, textDecoration: "none",
                  }}
                >
                  Find an Expert
                </Link>
              </div>
            )}
            {filteredConvs.map((c) => {
              const isActive = conversationId === c.id;
              const isHover = hoverRow === c.id;
              const online = !!c.other?.is_online;
              const unread = (c.unread_count ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => { nav(`/inbox/${c.id}`); if (isMobile) setListOpen(false); }}
                  onMouseEnter={() => setHoverRow(c.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: isActive ? "#EEF2FF" : isHover ? "#F8FAFC" : "#FFFFFF",
                    borderLeft: `3px solid ${isActive ? "#4F46E5" : "transparent"}`,
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background 0.12s",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "#EEF2FF",
                        color: "#4F46E5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        overflow: "hidden",
                      }}
                    >
                      {c.other?.avatar_url ? (
                        <img src={c.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        initials(c.other?.full_name, c.other?.username)
                      )}
                    </div>
                    {online && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          background: "#10B981",
                          borderRadius: "50%",
                          border: "2px solid #fff",
                          boxSizing: "content-box",
                          marginRight: -2,
                          marginBottom: -2,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: unread ? 700 : 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.other?.full_name ?? c.other?.username ?? "User"}
                    </div>
                    <div style={{ fontSize: 12.5, color: unread ? "#334155" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2, fontWeight: unread ? 500 : 400 }}>
                      {c.last_message_preview ?? "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: unread ? "#4F46E5" : "#94A3B8", fontWeight: unread ? 600 : 400 }}>{formatListTimestamp(c.last_message_at)}</span>
                    {unread && (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          background: "#4F46E5",
                          borderRadius: "50%",
                        }}
                        aria-label={`${c.unread_count} unread`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        );
        return isMobile ? (
          <Sheet open={listOpen} onOpenChange={setListOpen}>
            <SheetContent side="left" className="p-0 w-[88vw] max-w-[360px] sm:w-[360px]">
              {listAside}
            </SheetContent>
          </Sheet>
        ) : listAside;
        })()}


        {/* COLUMN 3 — Active conversation */}
        <section style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>

          {!active ? (
            <div
              style={{
                flex: 1,
                background: "#F8FAFC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: "50%",
                    background: "#EEF2FF",
                    color: "#4F46E5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <MessageSquare size={34} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Select a conversation</div>
                <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: isMobile ? 20 : 0 }}>
                  {isMobile ? "Open your messages to start chatting" : "Choose a conversation from the left to start messaging"}
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setListOpen(true)}
                    style={{
                      background: "#4F46E5", color: "#fff", border: "none",
                      borderRadius: 999, padding: "10px 20px", fontSize: 14,
                      fontWeight: 600, cursor: "pointer", display: "inline-flex",
                      alignItems: "center", gap: 8,
                    }}
                  >
                    <Menu size={16} /> Open messages
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header
                style={{
                  background: "#FFFFFF",
                  borderBottom: "1px solid #E2E8F0",
                  padding: isMobile ? "12px 14px" : "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 64,
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setListOpen(true)}
                      aria-label="Open conversations"
                      style={{ background: "transparent", border: "none", padding: 4, marginRight: 2, cursor: "pointer", color: "#0F172A" }}
                    >
                      <Menu size={20} />
                    </button>
                  )}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#EEF2FF",
                        color: "#4F46E5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        overflow: "hidden",
                      }}
                    >
                      {active.other?.avatar_url ? (
                        <img src={active.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        initials(active.other?.full_name, active.other?.username)
                      )}
                    </div>
                    {active.other?.is_online && (
                      <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, background: "#10B981", borderRadius: "50%", border: "2px solid #fff" }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>
                      {active.other?.full_name ?? active.other?.username ?? "User"}
                    </div>
                    <div style={{ fontSize: 12, color: active.other?.is_online ? "#10B981" : "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
                      {active.other?.is_online ? (
                        <>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                          Online
                        </>
                      ) : active.other?.last_seen_at ? (
                        `Last seen ${new Date(active.other.last_seen_at).toLocaleString()}`
                      ) : active.other?.username ? (
                        <Link to={`/u/${active.other.username}`} style={{ color: "#94A3B8", textDecoration: "none" }}>
                          @{active.other.username}
                        </Link>
                      ) : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {user && active.other?.id && (
                    <CustomOfferComposer
                      conversationId={active.id}
                      sellerId={user.id}
                      buyerId={active.participant_one === user.id ? active.participant_two : active.participant_one}
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Video call"
                    style={iconBtn("video")}
                    onMouseEnter={() => setHoverIcon("video")}
                    onMouseLeave={() => setHoverIcon(null)}
                  >
                    <Video size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="More options"
                    style={iconBtn("more")}
                    onMouseEnter={() => setHoverIcon("more")}
                    onMouseLeave={() => setHoverIcon(null)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </header>

              {/* Messages area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 24,
                  background: "#F8FAFC",
                  minHeight: 0,
                }}
              >
                {grouped.map((g, gi) => (
                  <div key={gi}>
                    <div style={{ textAlign: "center", margin: "16px 0" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 11,
                          color: "#64748B",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          padding: "3px 12px",
                          borderRadius: 999,
                          fontWeight: 500,
                        }}
                      >
                        {g.label}
                      </span>
                    </div>
                    {g.items.map((m) => {
                      const mine = m.sender_id === user?.id;

                      if (m.custom_offer_id) {
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 12 }}>
                            <CustomOfferCard offerId={m.custom_offer_id} />
                          </div>
                        );
                      }

                      if (m.message_type === "pitch") {
                        const priceDollars = m.pitch_price != null ? (m.pitch_price / 100).toFixed(0) : null;
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 12 }}>
                            <div
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderRadius: 16,
                                padding: 16,
                                maxWidth: "65%",
                                boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(79,70,229,0.12)",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#4F46E5,#7C3AED)" }} />
                              <div style={{ fontSize: 10, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8, marginTop: 4 }}>
                                Proposal
                              </div>
                              <div style={{ whiteSpace: "pre-line", fontSize: 14, color: "#0F172A", lineHeight: 1.55 }}>
                                {m.content}
                              </div>
                              <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "12px 0" }} />
                              {priceDollars && (
                                <div style={{ fontSize: 14, marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: "#64748B" }}>Proposed Price: </span>
                                  <span style={{ fontSize: 16, color: "#0F172A", fontWeight: 700 }}>${priceDollars}</span>
                                </div>
                              )}
                              {m.pitch_delivery_days != null && (
                                <div style={{ fontSize: 12, color: "#64748B" }}>
                                  Delivery Time: <span style={{ color: "#0F172A", fontWeight: 600 }}>{m.pitch_delivery_days} days</span>
                                </div>
                              )}
                              {!mine && (
                                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                  <button
                                    onClick={async () => {
                                      const { data, error } = await supabase.rpc("create_escrow_order", {
                                        _source: "pitch", _source_id: m.id,
                                      });
                                      if (error || !data) {
                                        toast.error(error?.message || "Could not start checkout");
                                        return;
                                      }
                                      nav(`/checkout/${data}`);
                                    }}
                                    style={{
                                      background: "#4F46E5", color: "#fff", border: "none",
                                      padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                                    }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => chatInputRef.current?.focus()}
                                    style={{
                                      background: "#fff", color: "#475569", border: "1px solid #E2E8F0",
                                      padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                                    }}
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>{formatTime(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 12, gap: 8, alignItems: "flex-end" }}>
                          {!mine && (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "#EEF2FF",
                                color: "#4F46E5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                                overflow: "hidden",
                              }}
                            >
                              {active.other?.avatar_url ? (
                                <img src={active.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                initials(active.other?.full_name, active.other?.username)
                              )}
                            </div>
                          )}
                          <div style={{ maxWidth: "65%" }}>
                            <div
                              style={{
                                background: mine ? "#4F46E5" : "#FFFFFF",
                                color: mine ? "#FFFFFF" : "#0F172A",
                                border: mine ? "none" : "1px solid #E2E8F0",
                                borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                padding: "10px 14px",
                                fontSize: 14,
                                lineHeight: 1.5,
                                whiteSpace: "pre-line",
                                wordBreak: "break-word",
                                boxShadow: mine ? "0 4px 12px -4px rgba(79,70,229,0.4)" : "0 1px 2px rgba(15,23,42,0.04)",
                              }}
                            >
                              {m.content}
                            </div>
                            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, textAlign: mine ? "right" : "left" }}>
                              {formatTime(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Chat input */}
              <footer
                style={{
                  background: "#FFFFFF",
                  borderTop: "1px solid #E2E8F0",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  aria-label="Attach"
                  style={{
                    background: hoverIcon === "attach" ? "#EEF2FF" : "transparent",
                    border: "none",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: hoverIcon === "attach" ? "#4F46E5" : "#64748B",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={() => setHoverIcon("attach")}
                  onMouseLeave={() => setHoverIcon(null)}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    background: inputFocused ? "#FFFFFF" : "#F1F5F9",
                    border: `1px solid ${inputFocused ? "#4F46E5" : "transparent"}`,
                    boxShadow: inputFocused ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
                    borderRadius: 999,
                    padding: "12px 20px",
                    fontSize: 14,
                    color: "#0F172A",
                    outline: "none",
                    transition: "all 0.15s",
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim()}
                  aria-label="Send"
                  style={{
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: draft.trim() ? "pointer" : "not-allowed",
                    opacity: draft.trim() ? 1 : 0.4,
                    transition: "all 0.2s",
                    flexShrink: 0,
                    boxShadow: draft.trim() ? "0 4px 12px -2px rgba(79,70,229,0.45)" : "none",
                  }}
                  onMouseEnter={(e) => { if (draft.trim()) (e.currentTarget as HTMLButtonElement).style.background = "#4338CA"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#4F46E5"; }}
                >
                  <ArrowRight size={18} />
                </button>
              </footer>
            </>
          )}
        </section>

        {!isMobile && active && active.other && user && (
          <ConversationDetailsPanel
            otherUser={active.other}
            conversationId={active.id}
            currentUserId={user.id}
          />
        )}
      </div>
    </AppShell>
  );
}
