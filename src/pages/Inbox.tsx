import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageSquare, Pencil, MoreHorizontal, Paperclip,
  ArrowUp, Flag, UserX, User, Star, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { CustomOfferComposer } from "@/components/marketplace/CustomOfferComposer";
import { CustomOfferCard } from "@/components/marketplace/CustomOfferCard";

// AppShell provides the header — Inbox fills the remaining height
const NAV_H = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface SharedOrder {
  id: string;
  order_number: string;
  status: string;
  price: number;
  project_title: string | null;
  gigs: { title: string } | null;
}

interface RelatedGig {
  id: string; title: string; thumbnail_url: string | null;
  starting_price: number; average_rating: number;
}

interface ProfileExtras {
  member_since: string | null;
  average_rating: number | null;
  total_reviews: number;
  languages: string[] | null;
  last_seen: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name?: string | null, username?: string | null) {
  return (name?.[0] ?? username?.[0] ?? "?").toUpperCase();
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtListTs(d: string) {
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtDateLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  active: "#60a5fa", delivered: "#fbbf24", revision_requested: "#fb923c",
  completed: "#4ade80", cancelled: "#f87171", refunded: "#f87171",
};

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  url, name, username, size = 40,
}: { url?: string | null; name?: string | null; username?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#1a1a1a", color: "#888", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.35), fontWeight: 700, overflow: "hidden",
    }}>
      {url && !broken
        ? <img src={url} alt="" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name, username)}
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function RightPanel({
  conv, currentUserId,
}: { conv: Conv; currentUserId: string }) {
  const nav = useNavigate();
  const other = conv.other!;
  const [extras, setExtras] = useState<ProfileExtras | null>(null);
  const [gigs, setGigs] = useState<RelatedGig[]>([]);
  const [orders, setOrders] = useState<SharedOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: own }] = await Promise.all([
        supabase.from("profiles")
          .select("member_since, average_rating, total_reviews, languages, last_seen")
          .eq("id", other.id).maybeSingle(),
        supabase.from("gigs")
          .select("id, title, thumbnail_url, starting_price, average_rating")
          .eq("seller_id", other.id).eq("status", "active")
          .order("average_rating", { ascending: false }).limit(3),
      ]);
      if (cancelled) return;
      setExtras((p as any) ?? null);
      setGigs((own ?? []) as any);

      const { data: ord } = await supabase.from("orders")
        .select("id, order_number, status, price, project_title, gigs:gig_id(title)")
        .or(`and(buyer_id.eq.${currentUserId},seller_id.eq.${other.id}),and(buyer_id.eq.${other.id},seller_id.eq.${currentUserId})`)
        .order("created_at", { ascending: false }).limit(5);
      if (!cancelled) setOrders((ord ?? []) as any);
    })();
    return () => { cancelled = true; };
  }, [other.id, currentUserId]);

  const name = other.full_name || other.username || "User";
  const lastSeen = other.is_online
    ? "Active now"
    : other.last_seen_at
      ? `Last seen ${new Date(other.last_seen_at).toLocaleString()}`
      : extras?.last_seen
        ? `Last seen ${new Date(extras.last_seen).toLocaleString()}`
        : "";

  const profileHref = other.username ? `/u/${other.username}` : `/seller/${other.id}`;

  return (
    <aside style={{
      background: "#111111", borderLeft: "0.5px solid #1e1e1e",
      overflowY: "auto", height: "100%", padding: "20px 16px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      {/* User info */}
      <div style={{ paddingBottom: 20, borderBottom: "0.5px solid #1e1e1e", marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 16 }}>
          <Avatar url={other.avatar_url} name={other.full_name} username={other.username} size={60} />
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{name}</div>
          {other.username && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>@{other.username}</div>}
          {lastSeen && (
            <div style={{ fontSize: 11, color: other.is_online ? "#10B981" : "#555", marginTop: 4 }}>{lastSeen}</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {extras?.member_since && (
            <InfoRow label="Member since" value={new Date(extras.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })} />
          )}
          {(extras?.total_reviews ?? 0) > 0 && (
            <InfoRow
              label="Rating"
              value={`★ ${Number(extras!.average_rating ?? 0).toFixed(1)} (${extras!.total_reviews})`}
            />
          )}
          {(extras?.languages ?? []).length > 0 && (
            <InfoRow label="Language" value={(extras!.languages as string[])[0]} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <button
            onClick={() => nav(profileHref)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "9px 12px", borderRadius: 8,
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#cccccc", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Briefcase size={13} color="#888" /> View Profile
          </button>
        </div>
      </div>

      {/* Shared orders */}
      <div style={{ paddingBottom: 20, borderBottom: "0.5px solid #1e1e1e", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Shared Orders
        </div>
        {orders.length === 0 ? (
          <div style={{ fontSize: 12, color: "#555" }}>No shared orders yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.map((o) => {
              const title = o.gigs?.title ?? o.project_title ?? "Project";
              const color = STATUS_COLOR[o.status] ?? "#888";
              return (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  style={{
                    display: "block", textDecoration: "none",
                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                    borderRadius: 8, padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e0e0e0", marginBottom: 4, lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>${o.price}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Related services */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Services
        </div>
        {gigs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#555" }}>No services listed.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gigs.map((g) => (
              <Link
                key={g.id}
                to={`/gig/${g.id}`}
                style={{
                  display: "flex", gap: 10, textDecoration: "none",
                  background: "#1a1a1a", border: "1px solid #2a2a2a",
                  borderRadius: 8, overflow: "hidden",
                }}
              >
                <div style={{ width: 56, height: 42, flexShrink: 0, background: "#222" }}>
                  {g.thumbnail_url && (
                    <img src={g.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "6px 8px 6px 0" }}>
                  <div style={{ fontSize: 11, color: "#cccccc", lineHeight: 1.3, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: "#F59E0B" }}>
                      ★ {Number(g.average_rating || 0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginLeft: "auto" }}>
                      ${g.starting_price}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#cccccc", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type FilterTab = "all" | "unread" | "orders";

export default function Inbox() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [convs, setConvs] = useState<Conv[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [hoverIcon, setHoverIcon] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Lock html/body scroll for this page only
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = prev;
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const active = useMemo(() => convs.find((c) => c.id === conversationId) ?? null, [convs, conversationId]);

  // ── Data loading ──

  const loadConvs = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("conversations").select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      const list = (data ?? []) as Conv[];
      const otherIds = Array.from(new Set(list.map((c) => (c.participant_one === user.id ? c.participant_two : c.participant_one))));
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, username, avatar_url, is_online, last_seen_at").in("id", otherIds);
        const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
        list.forEach((c) => {
          const oid = c.participant_one === user.id ? c.participant_two : c.participant_one;
          c.other = byId[oid];
        });
        const { data: unread } = await supabase
          .from("messages").select("conversation_id")
          .eq("recipient_id", user.id).eq("is_read", false)
          .in("conversation_id", list.map((c) => c.id));
        const counts: Record<string, number> = {};
        (unread ?? []).forEach((m: any) => { counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1; });
        list.forEach((c) => { c.unread_count = counts[c.id] ?? 0; });
      }
      setConvs(list);
    } catch (e) { console.error("loadConvs failed", e); }
    finally { setLoading(false); }
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
  useEffect(() => { if (conversationId) loadMessages(conversationId); /* eslint-disable-next-line */ }, [conversationId]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("inbox-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Msg;
        if (m.conversation_id === conversationId) {
          setMessages((prev) => [...prev, m]);
          if (m.recipient_id === user.id) supabase.from("messages").update({ is_read: true }).eq("id", m.id);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        }
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [conversationId, user?.id]);

  // ── Send ──

  const send = async () => {
    if (!draft.trim() || !active || !user) return;
    const recipient = active.participant_one === user.id ? active.participant_two : active.participant_one;
    const text = draft;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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

  // ── Textarea auto-resize ──

  const onTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // ── Report / block ──

  const submitReport = async () => {
    if (!user || !active?.other?.id) return;
    setReportBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: "user", target_id: active.other.id,
      reason: "User report", description: reportText,
    });
    setReportBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted.");
    setReportOpen(false); setReportText("");
  };

  const blockUser = async () => {
    if (!user || !active?.other?.id) return;
    setBlockBusy(true);
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: active.other.id });
    setBlockBusy(false);
    if (error) return toast.error(error.message);
    toast.success("User blocked.");
    setBlockOpen(false);
  };

  // ── Filtered conversations ──

  const filteredConvs = useMemo(() => {
    let list = convs;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) =>
      (c.other?.full_name ?? "").toLowerCase().includes(q) ||
      (c.other?.username ?? "").toLowerCase().includes(q) ||
      (c.last_message_preview ?? "").toLowerCase().includes(q)
    );
    if (filterTab === "unread") list = list.filter((c) => (c.unread_count ?? 0) > 0);
    if (filterTab === "orders") list = list.filter((c) => !!c.order_id);
    return list;
  }, [convs, search, filterTab]);

  // ── Grouped messages ──

  const grouped = useMemo(() => {
    const groups: { label: string; items: Msg[] }[] = [];
    let currentKey = "";
    messages.forEach((m) => {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== currentKey) { groups.push({ label: fmtDateLabel(d), items: [m] }); currentKey = key; }
      else groups[groups.length - 1].items.push(m);
    });
    return groups;
  }, [messages]);

  // ── Shared styles ──

  const tabPill = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? "#16A34A" : "transparent",
    color: active ? "#fff" : "#888",
    border: active ? "none" : "1px solid transparent",
    cursor: "pointer",
  });

  return (
    <AppShell>
      <div style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: active ? "320px 1fr 300px" : "320px 1fr",
        overflow: "hidden",
        background: "#0a0a0a",
      }}>

        {/* ── LEFT PANEL ── */}
        <aside style={{
          height: "100%", overflowY: "auto",
          background: "#111111", borderRight: "0.5px solid #1e1e1e",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ padding: "18px 16px 12px", borderBottom: "0.5px solid #1e1e1e", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>Messages</h2>
              <button
                type="button"
                style={{ background: "transparent", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
              >
                <Pencil size={15} />
              </button>
            </div>
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              style={{
                width: "100%", background: "#1a1a1a", border: "1px solid #1e1e1e",
                borderRadius: 999, padding: "8px 14px", fontSize: 12.5,
                color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 10,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#333"; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#1e1e1e"; }}
            />
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "unread", "orders"] as FilterTab[]).map((t) => (
                <button key={t} onClick={() => setFilterTab(t)} style={tabPill(filterTab === t)}>
                  {t === "all" ? "All" : t === "unread" ? "Unread" : "Active Orders"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loading && <div style={{ padding: "16px", fontSize: 12, color: "#888" }}>Loading…</div>}

            {!loading && filteredConvs.length === 0 && (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <MessageSquare size={24} color="#888" strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 6 }}>No messages yet</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.6 }}>
                  When you contact an expert or receive an offer, your messages will appear here.
                </div>
                <Link to="/services" style={{
                  display: "inline-block", background: "#16A34A", color: "#fff",
                  borderRadius: 999, padding: "9px 18px", fontSize: 12, fontWeight: 600, textDecoration: "none",
                }}>
                  Find an Expert
                </Link>
              </div>
            )}

            {filteredConvs.map((c) => {
              const isActive = conversationId === c.id;
              const online = !!c.other?.is_online;
              const unread = (c.unread_count ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => nav(`/inbox/${c.id}`)}
                  onMouseEnter={() => setHoverRow(c.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: isActive ? "#1a1a1a" : hoverRow === c.id ? "#161616" : "#111111",
                    borderLeft: `3px solid ${isActive ? "#16A34A" : "transparent"}`,
                    padding: "12px 14px 12px 13px",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar url={c.other?.avatar_url} name={c.other?.full_name} username={c.other?.username} size={42} />
                    {online && (
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 9, height: 9, background: "#10B981",
                        borderRadius: "50%", border: "2px solid #111111",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: unread ? 700 : 600, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.other?.full_name ?? c.other?.username ?? "User"}
                      </span>
                      <span style={{ fontSize: 11, color: unread ? "#16A34A" : "#555", flexShrink: 0, fontWeight: unread ? 600 : 400 }}>
                        {fmtListTs(c.last_message_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: unread ? "#cccccc" : "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread ? 500 : 400 }}>
                        {c.last_message_preview ?? "—"}
                      </span>
                      {unread && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                          background: "#16A34A", color: "#fff", borderRadius: 999,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 4px", flexShrink: 0, marginLeft: 6,
                        }}>
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── CENTER PANEL ── */}
        <section style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>

          {!active ? (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <MessageSquare size={32} color="#555" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#888", marginBottom: 8 }}>Select a conversation</div>
              <div style={{ fontSize: 14, color: "#555" }}>Choose a conversation from the left to start messaging</div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header style={{
                height: 64, flexShrink: 0, background: "#111111",
                borderBottom: "0.5px solid #1e1e1e",
                padding: "0 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxSizing: "border-box",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar url={active.other?.avatar_url} name={active.other?.full_name} username={active.other?.username} size={38} />
                    {active.other?.is_online && (
                      <div style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, background: "#10B981", borderRadius: "50%", border: "2px solid #111111" }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {active.other?.full_name ?? active.other?.username ?? "User"}
                    </div>
                    <div style={{ fontSize: 11, color: active.other?.is_online ? "#10B981" : "#555" }}>
                      {active.other?.is_online ? "Online" : active.other?.last_seen_at ? `Last seen ${new Date(active.other.last_seen_at).toLocaleString()}` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {user && active.other?.id && (
                    <CustomOfferComposer
                      conversationId={active.id}
                      sellerId={user.id}
                      buyerId={active.participant_one === user.id ? active.participant_two : active.participant_one}
                      trigger={
                        <button type="button" style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#16A34A", color: "#fff", border: "none",
                          borderRadius: 999, padding: "7px 14px", fontSize: 12.5,
                          fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        }}>
                          <Paperclip size={13} /> Send Custom Offer
                        </button>
                      }
                    />
                  )}

                  {/* 3-dots menu */}
                  <div ref={menuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      style={{
                        background: menuOpen ? "#1a1a1a" : "transparent", border: "none",
                        width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: hoverIcon === "more" ? "#fff" : "#888",
                      }}
                      onMouseEnter={() => setHoverIcon("more")}
                      onMouseLeave={() => setHoverIcon(null)}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {menuOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 8px)", right: 0,
                        background: "#111111", border: "1px solid #1e1e1e",
                        borderRadius: 10, padding: "5px 0", minWidth: 170, zIndex: 100,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      }}>
                        <MenuBtn icon={<User size={13} color="#888" />} label="View Profile" onClick={() => { setMenuOpen(false); const t = active.other?.username ?? active.other?.id; if (t) nav(`/u/${t}`); }} />
                        <MenuBtn icon={<Flag size={13} color="#888" />} label="Report" onClick={() => { setMenuOpen(false); setReportOpen(true); }} />
                        <div style={{ height: 1, background: "#1e1e1e", margin: "3px 0" }} />
                        <MenuBtn icon={<UserX size={13} color="#ef4444" />} label="Block User" onClick={() => { setMenuOpen(false); setBlockOpen(true); }} danger />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minHeight: 0 }}>
                {grouped.map((g, gi) => (
                  <div key={gi}>
                    <div style={{ textAlign: "center", margin: "16px 0" }}>
                      <span style={{
                        display: "inline-block", fontSize: 11, color: "#888",
                        background: "#111", border: "1px solid #1e1e1e",
                        padding: "3px 12px", borderRadius: 999,
                      }}>
                        {g.label}
                      </span>
                    </div>
                    {g.items.map((m) => {
                      const mine = m.sender_id === user?.id;

                      if (m.custom_offer_id) {
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 14 }}>
                            <CustomOfferCard offerId={m.custom_offer_id} />
                          </div>
                        );
                      }

                      if (m.message_type === "pitch") {
                        const priceDollars = m.pitch_price != null ? (m.pitch_price / 100).toFixed(0) : null;
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 14 }}>
                            <div style={{
                              background: "#111111", border: "1px solid #1e1e1e",
                              borderRadius: 14, padding: 16, maxWidth: "65%", position: "relative", overflow: "hidden",
                            }}>
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#16A34A,#15803d)" }} />
                              <div style={{ fontSize: 10, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8, marginTop: 4 }}>Proposal</div>
                              <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.55, whiteSpace: "pre-line" }}>{m.content}</div>
                              <hr style={{ border: "none", borderTop: "1px solid #1e1e1e", margin: "12px 0" }} />
                              {priceDollars && <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ fontSize: 12, color: "#888" }}>Price: </span><span style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>${priceDollars}</span></div>}
                              {m.pitch_delivery_days != null && <div style={{ fontSize: 12, color: "#888" }}>Delivery: <span style={{ color: "#fff", fontWeight: 600 }}>{m.pitch_delivery_days} days</span></div>}
                              {!mine && (
                                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                  <button onClick={async () => {
                                    const { data, error } = await supabase.rpc("create_escrow_order", { _source: "pitch", _source_id: m.id });
                                    if (error || !data) { toast.error(error?.message || "Could not start checkout"); return; }
                                    nav(`/checkout/${data}`);
                                  }} style={{ background: "#16A34A", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Accept</button>
                                  <button onClick={() => textareaRef.current?.focus()} style={{ background: "#1a1a1a", color: "#888", border: "1px solid #333", padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Decline</button>
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>{fmtTime(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10, gap: 8, alignItems: "flex-end" }}>
                          {!mine && <Avatar url={active.other?.avatar_url} name={active.other?.full_name} username={active.other?.username} size={28} />}
                          <div style={{ maxWidth: "65%" }}>
                            {!mine && (
                              <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{active.other?.full_name ?? active.other?.username}</div>
                            )}
                            <div style={{
                              background: mine ? "#222222" : "#1a1a1a",
                              color: "#ffffff",
                              borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                              padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
                              whiteSpace: "pre-line", wordBreak: "break-word",
                            }}>
                              {m.content}
                            </div>
                            <div style={{ fontSize: 11, color: "#444", marginTop: 3, textAlign: mine ? "right" : "left" }}>
                              {fmtTime(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Input bar */}
              <footer style={{
                flexShrink: 0, background: "#111111",
                borderTop: "0.5px solid #1e1e1e",
                padding: "12px 16px",
                display: "flex", alignItems: "flex-end", gap: 10,
              }}>
                <button
                  type="button"
                  style={{ background: "transparent", border: "none", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888", flexShrink: 0 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
                >
                  <Paperclip size={17} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={onTextareaInput}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Write a message..."
                  rows={1}
                  style={{
                    flex: 1, background: "#0a0a0a",
                    border: "none", borderRadius: 12,
                    padding: "10px 16px", fontSize: 14, color: "#ffffff",
                    outline: "none", resize: "none",
                    lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim()}
                  style={{
                    background: draft.trim() ? "#16A34A" : "#1a1a1a",
                    border: "none", borderRadius: "50%",
                    width: 40, height: 40, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: draft.trim() ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  <ArrowUp size={18} color={draft.trim() ? "#fff" : "#555"} />
                </button>
              </footer>
            </>
          )}
        </section>

        {/* ── RIGHT PANEL ── */}
        {active && active.other && user && (
          <RightPanel conv={active} currentUserId={user.id} />
        )}
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}>
          <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Report User</h2>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 18px" }}>Tell us what's going on. We'll review within 24 hours.</p>
            <textarea value={reportText} onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe the issue…" rows={4}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setReportOpen(false)} style={{ flex: 1, background: "#1a1a1a", color: "#888", border: "1px solid #333", borderRadius: 999, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitReport} disabled={reportBusy || !reportText.trim()}
                style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: reportBusy || !reportText.trim() ? "not-allowed" : "pointer", opacity: reportBusy || !reportText.trim() ? 0.5 : 1 }}>
                {reportBusy ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block dialog */}
      {blockOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setBlockOpen(false); }}>
          <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28, width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <UserX size={22} color="#ef4444" />
            </div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Block this user?</h2>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>They won't be able to message you. You can unblock them from your settings.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBlockOpen(false)} style={{ flex: 1, background: "#1a1a1a", color: "#888", border: "1px solid #333", borderRadius: 999, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={blockUser} disabled={blockBusy} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: blockBusy ? "not-allowed" : "pointer", opacity: blockBusy ? 0.6 : 1 }}>
                {blockBusy ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Menu button helper ─────────────────────────────────────────────────────────

function MenuBtn({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", textAlign: "left", background: hov ? "#1a1a1a" : "transparent",
        border: "none", padding: "9px 14px", fontSize: 13.5,
        color: danger ? "#ef4444" : "#ffffff", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 9,
      }}
    >
      {icon} {label}
    </button>
  );
}
