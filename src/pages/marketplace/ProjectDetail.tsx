import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { C, FONT, MONO } from "@/lib/marketplace/theme";

type Project = {
  id: string;
  client_id: string;
  expert_id: string;
  service_id: string | null;
  description: string | null;
  price: number;
  platform_fee: number;
  expert_payout: number;
  status: string;
  created_at: string;
};

type Message = {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  in_progress: "In progress",
  delivered: "Delivered — awaiting approval",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    void load();

    const ch = supabase
      .channel(`project-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_messages", filter: `project_id=eq.${id}` },
        (p) => setMessages((m) => [...m, p.new as Message]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${id}` },
        (p) => setProject(p.new as Project))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function load() {
    const { data: p } = await supabase.from("projects" as any).select("*").eq("id", id).maybeSingle();
    setProject(p as any);
    const { data: m } = await supabase
      .from("project_messages" as any)
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });
    setMessages((m ?? []) as any);
  }

  async function send() {
    if (!input.trim() || !user || !id) return;
    const content = input.trim();
    setInput("");
    await supabase.from("project_messages" as any).insert({ project_id: id, sender_id: user.id, content });
  }

  async function action(name: "deliver" | "approve" | "cancel") {
    if (!id) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("project-action", {
        body: { project_id: id, action: name },
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !project) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
        <MarketplaceNav />
        <div style={{ padding: "5rem", textAlign: "center", color: C.gray }}>Loading project…</div>
      </div>
    );
  }

  const isClient = user?.id === project.client_id;
  const isExpert = user?.id === project.expert_id;
  const canDeliver = isExpert && project.status === "in_progress";
  const canApprove = isClient && project.status === "delivered";
  const canCancel = isClient && project.status === "in_progress";

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 0, minHeight: "calc(100vh - 64px)" }}>
        {/* Messages */}
        <section style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}` }}>
          <header style={{ padding: "1.2rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "0.7rem", color: C.gray, fontFamily: MONO }}>PROJECT</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{project.description || "Untitled project"}</div>
            <div style={{ marginTop: 6, fontSize: "0.75rem", fontFamily: MONO, color: C.neon }}>{STATUS_LABEL[project.status] ?? project.status}</div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: C.gray, fontSize: "0.85rem", textAlign: "center", marginTop: "4rem" }}>
                No messages yet. Say hi to kick things off.
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "70%", padding: "0.7rem 1rem", borderRadius: 12,
                    background: mine ? C.neon : C.card, color: mine ? C.black : C.white,
                    border: mine ? "none" : `1px solid ${C.border}`,
                    fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap",
                  }}>{m.content}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…"
              style={{ flex: 1, background: C.card, color: C.white, border: `1px solid ${C.border}`, borderRadius: 999, padding: "0.7rem 1rem", outline: "none", fontFamily: FONT }} />
            <button type="submit" disabled={!input.trim()} style={{
              background: C.neon, color: C.black, border: "none", borderRadius: 999,
              padding: "0.7rem 1.2rem", fontWeight: 600, cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5,
            }}>Send</button>
          </form>
        </section>

        {/* Sidebar */}
        <aside style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", background: C.card }}>
            <div style={{ fontSize: "0.7rem", color: C.gray, fontFamily: MONO }}>AMOUNT</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 600 }}>${project.price}</div>
            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: "0.8rem", color: C.gray }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Platform fee</span><span>${project.platform_fee}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Expert payout</span><span>${project.expert_payout}</span></div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {canDeliver && <button onClick={() => action("deliver")} disabled={busy} style={pillNeon}>Mark as delivered</button>}
            {canApprove && <button onClick={() => action("approve")} disabled={busy} style={pillNeon}>Approve & release</button>}
            {canCancel && <button onClick={() => action("cancel")} disabled={busy} style={pillOutline}>Cancel project</button>}
          </div>

          <Link to={profile?.role === "expert" ? "/dashboard/expert" : "/dashboard/client"}
            style={{ color: C.gray, fontSize: "0.8rem", textDecoration: "none" }}>← Back to dashboard</Link>
        </aside>
      </div>
    </div>
  );
}

const pillNeon: React.CSSProperties = {
  background: C.neon, color: C.black, border: "none", borderRadius: 999,
  padding: "0.8rem 1rem", fontWeight: 600, cursor: "pointer",
};
const pillOutline: React.CSSProperties = {
  background: "transparent", color: C.white, border: `1px solid ${C.border2}`, borderRadius: 999,
  padding: "0.8rem 1rem", fontWeight: 500, cursor: "pointer",
};
