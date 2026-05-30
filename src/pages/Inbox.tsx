import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CustomOfferComposer } from "@/components/marketplace/CustomOfferComposer";
import { CustomOfferCard } from "@/components/marketplace/CustomOfferCard";

interface Conv {
  id: string;
  participant_one: string;
  participant_two: string;
  gig_id: string | null;
  order_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  other?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
}
interface Msg {
  id: string; conversation_id: string; sender_id: string; recipient_id: string;
  content: string | null; created_at: string; is_read: boolean;
  custom_offer_id: string | null;
  message_type?: string | null;
  pitch_price?: number | null;
  pitch_delivery_days?: number | null;
}

export default function Inbox() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => convs.find((c) => c.id === conversationId) ?? null, [convs, conversationId]);

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    const list = (data ?? []) as Conv[];
    const otherIds = Array.from(new Set(list.map((c) => (c.participant_one === user.id ? c.participant_two : c.participant_one))));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, username, avatar_url").in("id", otherIds);
      const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((c) => {
        const oid = c.participant_one === user.id ? c.participant_two : c.participant_one;
        c.other = byId[oid];
      });
    }
    setConvs(list);
    setLoading(false);
  };

  const loadMessages = async (cid: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", cid).order("created_at");
    setMessages((data ?? []) as Msg[]);
    // mark read
    if (user) {
      await supabase.from("messages").update({ is_read: true })
        .eq("conversation_id", cid).eq("recipient_id", user.id).eq("is_read", false);
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { loadConvs(); /* eslint-disable-next-line */ }, [user?.id]);
  useEffect(() => { if (conversationId) loadMessages(conversationId); }, [conversationId]);

  // Realtime
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
    const { error } = await supabase.from("messages").insert({
      conversation_id: active.id, sender_id: user.id, recipient_id: recipient, content: text,
    });
    if (error) { toast.error(error.message); setDraft(text); }
  };

  return (
    <AppShell>
      <div className="grid grid-cols-[300px_1fr] gap-0 h-[calc(100vh-9rem)] bg-background border border-border rounded-xl overflow-hidden">
        {/* List */}
        <aside className="border-r border-border overflow-y-auto">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">Messages</div>
          {loading && <div className="p-4 text-xs text-foreground-muted">Loading…</div>}
          {!loading && convs.length === 0 && (
            <div className="p-6 text-center text-xs text-foreground-muted">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
              No conversations yet.
            </div>
          )}
          {convs.map((c) => (
            <button key={c.id} onClick={() => nav(`/inbox/${c.id}`)}
              className={cn("w-full text-left px-4 py-3 border-b border-border/60 hover:bg-background-elevated",
                conversationId === c.id && "bg-primary/5")}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                  {(c.other?.full_name?.[0] ?? c.other?.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.other?.full_name ?? c.other?.username ?? "User"}</span>
                    <span className="text-[10px] text-foreground-muted shrink-0">
                      {new Date(c.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-foreground-muted truncate">{c.last_message_preview ?? "—"}</div>
                </div>
              </div>
            </button>
          ))}
        </aside>

        {/* Thread */}
        <section className="flex flex-col min-w-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-foreground-muted">
              Select a conversation
            </div>
          ) : (
            <>
              <header className="px-5 py-3 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {(active.other?.full_name?.[0] ?? active.other?.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{active.other?.full_name ?? active.other?.username}</div>
                  {active.other?.username && (
                    <Link to={`/u/${active.other.username}`} className="text-xs text-foreground-muted hover:text-foreground">
                      @{active.other.username}
                    </Link>
                  )}
                </div>
                {user && active.other?.id && (
                  <CustomOfferComposer
                    conversationId={active.id}
                    sellerId={user.id}
                    buyerId={active.participant_one === user.id ? active.participant_two : active.participant_one}
                  />
                )}
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  if (m.custom_offer_id) {
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <CustomOfferCard offerId={m.custom_offer_id} />
                      </div>
                    );
                  }
                  if (m.message_type === "pitch") {
                    const priceDollars = m.pitch_price != null ? (m.pitch_price / 100).toFixed(0) : null;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div style={{
                          background: "#fff", borderLeft: "3px solid #000",
                          padding: 16, borderRadius: 8, maxWidth: "70%",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #eee", borderLeftWidth: 3,
                        }}>
                          <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
                            Pitch
                          </div>
                          <div style={{ whiteSpace: "pre-line", fontSize: 14, color: "#111", lineHeight: 1.5 }}>
                            {m.content}
                          </div>
                          <hr style={{ borderColor: "#eee", borderTop: "1px solid #eee", borderBottom: "none", margin: "12px 0" }} />
                          {priceDollars && (
                            <div style={{ fontSize: 14, marginBottom: 4 }}>
                              <span style={{ color: "#666" }}>Proposed Price: </span>
                              <span style={{ color: "#15803d", fontWeight: 700 }}>${priceDollars}</span>
                            </div>
                          )}
                          {m.pitch_delivery_days != null && (
                            <div style={{ fontSize: 14, color: "#111" }}>
                              <span style={{ color: "#666" }}>Delivery Time: </span>
                              <span style={{ fontWeight: 600 }}>{m.pitch_delivery_days} days</span>
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
                                    alert(error?.message || "Could not start checkout");
                                    return;
                                  }
                                  nav(`/checkout/${data}`);
                                }}
                                style={{
                                  background: "#000", color: "#fff", border: "none",
                                  padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                                }}
                              >
                                Accept & Place Order
                              </button>
                              <button
                                onClick={() => {
                                  const el = document.querySelector<HTMLInputElement>('input[placeholder="Write a message…"]');
                                  el?.focus();
                                }}
                                style={{
                                  background: "#fff", color: "#000", border: "1px solid #000",
                                  padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                }}
                              >
                                Reply
                              </button>
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: "#999", marginTop: 8 }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-background-elevated text-foreground")}>
                        <div className="whitespace-pre-line">{m.content}</div>
                        <div className={cn("text-[10px] mt-1 opacity-70")}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <footer className="border-t border-border p-3 flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Write a message…"
                />
                <Button onClick={send} disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </footer>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
