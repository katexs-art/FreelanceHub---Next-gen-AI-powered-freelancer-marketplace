import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { C, FONT, MONO, initialsOf } from "@/lib/marketplace/theme";

type Tab = "experts" | "projects" | "transactions";

type ExpertRow = {
  id: string; status: string; tier: string; specialty: string | null;
  bio: string | null; starting_price: number | null; created_at: string;
  profile?: { email: string; full_name: string | null } | null;
};

type ProjectRow = {
  id: string; status: string; price: number; platform_fee: number;
  expert_payout: number; created_at: string; title: string | null;
  description: string | null; client_id: string; expert_id: string;
  client?: { full_name: string | null; email: string } | null;
  expert?: { full_name: string | null; email: string } | null;
};

type TxRow = {
  id: string; amount: number; platform_fee: number; expert_payout: number;
  status: string; created_at: string; project_id: string;
};

export default function MarketplaceAdmin() {
  const { user, profile, loading } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("experts");
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    if (profile?.role !== "admin") { navigate("/"); return; }
    void loadAll();
  }, [loading, user, profile, navigate]);

  async function loadAll() {
    const [eRes, pRes, tRes] = await Promise.all([
      supabase.from("experts" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("projects" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("transactions" as any).select("*").order("created_at", { ascending: false }),
    ]);
    const expertRows = (eRes.data ?? []) as any[];
    const projectRows = (pRes.data ?? []) as any[];
    const ids = new Set<string>();
    expertRows.forEach((e) => ids.add(e.id));
    projectRows.forEach((p) => { ids.add(p.client_id); ids.add(p.expert_id); });
    const { data: profiles } = await supabase
      .from("profiles" as any).select("id,email,full_name").in("id", Array.from(ids));
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    setExperts(expertRows.map((e) => ({ ...e, profile: pmap.get(e.id) ?? null })));
    setProjects(projectRows.map((p) => ({
      ...p, client: pmap.get(p.client_id) ?? null, expert: pmap.get(p.expert_id) ?? null,
    })));
    setTxs((tRes.data ?? []) as any);
  }

  async function setExpertStatus(id: string, status: "active" | "rejected" | "pending") {
    setBusyId(id);
    try {
      const expert = experts.find((e) => e.id === id);
      const { error } = await supabase.from("experts" as any).update({ status }).eq("id", id);
      if (error) throw error;
      setExperts((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      if (status === "active" && expert?.profile?.email) {
        await supabase.functions.invoke("send-marketplace-email", {
          body: { template: "expert_approved", to: expert.profile.email, data: {} },
        });
      }
    } catch (e: any) {
      alert(e.message || "Failed");
    } finally { setBusyId(null); }
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: C.black, color: C.gray, padding: "5rem", textAlign: "center", fontFamily: FONT }}>Loading…</div>;
  }

  const stats = {
    pendingExperts: experts.filter((e) => e.status === "pending").length,
    activeExperts: experts.filter((e) => e.status === "active").length,
    activeProjects: projects.filter((p) => ["in_progress", "delivered"].includes(p.status)).length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    grossRevenue: txs.reduce((s, t) => s + (t.amount || 0), 0),
    platformRevenue: txs.reduce((s, t) => s + (t.platform_fee || 0), 0),
  };

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: C.gray, letterSpacing: "0.1em" }}>MARKETPLACE / ADMIN</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0", letterSpacing: "-0.02em" }}>Operations</h1>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Pending experts", value: stats.pendingExperts, accent: stats.pendingExperts > 0 },
            { label: "Active experts", value: stats.activeExperts },
            { label: "Active projects", value: stats.activeProjects },
            { label: "Completed", value: stats.completedProjects },
            { label: "Gross revenue", value: `$${stats.grossRevenue.toLocaleString()}` },
            { label: "Platform fees", value: `$${stats.platformRevenue.toLocaleString()}`, accent: true },
          ].map((s, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem", background: C.card }}>
              <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: C.gray, letterSpacing: "0.08em" }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 600, marginTop: 6, color: s.accent ? C.neon : C.white }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {([
            ["experts", `Experts (${experts.length})`],
            ["projects", `Projects (${projects.length})`],
            ["transactions", `Transactions (${txs.length})`],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "transparent", border: "none", color: tab === t ? C.white : C.gray,
              padding: "0.7rem 1rem", cursor: "pointer", fontFamily: FONT, fontSize: "0.9rem",
              borderBottom: `2px solid ${tab === t ? C.neon : "transparent"}`, marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Experts */}
        {tab === "experts" && (
          <div style={{ display: "grid", gap: 12 }}>
            {experts.length === 0 && <Empty label="No experts yet" />}
            {experts.map((e) => (
              <div key={e.id} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={avatarStyle}>{initialsOf(e.profile?.full_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{e.profile?.full_name || "Unnamed"}</div>
                    <div style={{ fontSize: "0.8rem", color: C.gray, fontFamily: MONO }}>{e.profile?.email}</div>
                    <div style={{ fontSize: "0.8rem", color: C.gray, marginTop: 4 }}>
                      {e.specialty || "—"} • Tier: {e.tier} • From ${e.starting_price ?? 0}
                    </div>
                  </div>
                  <StatusPill status={e.status} />
                  <div style={{ display: "flex", gap: 6 }}>
                    {e.status === "pending" && (
                      <>
                        <button disabled={busyId === e.id} onClick={() => setExpertStatus(e.id, "active")} style={btnNeon}>Approve</button>
                        <button disabled={busyId === e.id} onClick={() => setExpertStatus(e.id, "rejected")} style={btnOutline}>Reject</button>
                      </>
                    )}
                    {e.status === "active" && (
                      <button disabled={busyId === e.id} onClick={() => setExpertStatus(e.id, "pending")} style={btnOutline}>Suspend</button>
                    )}
                    {e.status === "rejected" && (
                      <button disabled={busyId === e.id} onClick={() => setExpertStatus(e.id, "pending")} style={btnOutline}>Re-review</button>
                    )}
                  </div>
                </div>
                {e.bio && <div style={{ fontSize: "0.85rem", color: C.gray, marginTop: 12, lineHeight: 1.5 }}>{e.bio}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {tab === "projects" && (
          <div style={{ display: "grid", gap: 12 }}>
            {projects.length === 0 && <Empty label="No projects yet" />}
            {projects.map((p) => (
              <Link key={p.id} to={`/project/${p.id}`} style={{ ...cardStyle, textDecoration: "none", color: C.white }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.title || p.description || "Untitled project"}</div>
                    <div style={{ fontSize: "0.8rem", color: C.gray, marginTop: 4 }}>
                      <span style={{ fontFamily: MONO }}>{p.client?.full_name || p.client?.email}</span>
                      <span style={{ margin: "0 8px" }}>→</span>
                      <span style={{ fontFamily: MONO }}>{p.expert?.full_name || p.expert?.email}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600 }}>${p.price}</div>
                    <div style={{ fontSize: "0.7rem", color: C.gray, fontFamily: MONO }}>fee ${p.platform_fee}</div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Transactions */}
        {tab === "transactions" && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {txs.length === 0 && <Empty label="No transactions yet" />}
            {txs.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.card, fontFamily: MONO, fontSize: "0.7rem", color: C.gray, letterSpacing: "0.08em" }}>
                    <th style={th}>DATE</th>
                    <th style={th}>PROJECT</th>
                    <th style={{ ...th, textAlign: "right" }}>AMOUNT</th>
                    <th style={{ ...th, textAlign: "right" }}>FEE</th>
                    <th style={{ ...th, textAlign: "right" }}>PAYOUT</th>
                    <th style={th}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={td}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ ...td, fontFamily: MONO, fontSize: "0.75rem" }}>
                        <Link to={`/project/${t.project_id}`} style={{ color: C.white, textDecoration: "none" }}>
                          {t.project_id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>${t.amount}</td>
                      <td style={{ ...td, textAlign: "right", color: C.neon }}>${t.platform_fee}</td>
                      <td style={{ ...td, textAlign: "right", color: C.gray }}>${t.expert_payout}</td>
                      <td style={td}><StatusPill status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: "3rem", textAlign: "center", color: C.gray, border: `1px solid ${C.border}`, borderRadius: 12, background: C.card }}>{label}</div>;
}

function StatusPill({ status }: { status: string }) {
  const color =
    ["active", "completed", "released"].includes(status) ? C.neon :
    ["delivered", "in_progress", "held"].includes(status) ? "#fbbf24" :
    ["rejected", "cancelled", "refunded"].includes(status) ? "#f87171" :
    C.gray;
  return (
    <span style={{
      fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.08em",
      padding: "4px 10px", border: `1px solid ${color}40`, color, borderRadius: 999,
      background: `${color}10`, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

const cardStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.2rem",
  background: C.card, display: "block",
};
const avatarStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%", background: C.border2,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 600, fontSize: "0.8rem", color: C.white, flexShrink: 0,
};
const btnNeon: React.CSSProperties = {
  background: C.neon, color: C.black, border: "none", borderRadius: 999,
  padding: "0.5rem 1rem", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
};
const btnOutline: React.CSSProperties = {
  background: "transparent", color: C.white, border: `1px solid ${C.border2}`,
  borderRadius: 999, padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer",
};
const th: React.CSSProperties = { padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500 };
const td: React.CSSProperties = { padding: "0.8rem 1rem", fontSize: "0.85rem" };
