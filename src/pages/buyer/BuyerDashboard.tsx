import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OrderRow {
  id: string; order_number: string; status: string; price: number; created_at: string;
  gigs: { title: string; thumbnail_url: string | null } | null;
}

interface RecGig {
  id: string; title: string; thumbnail_url: string | null; starting_price: number;
  average_rating: number | null; total_reviews: number | null; seller_id: string;
  seller?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function statusColor(status: string) {
  if (status === "completed") return { bg: "#052E16", color: "#4ADE80" };
  if (status === "cancelled" || status === "refunded") return { bg: "#3A0A0A", color: "#F87171" };
  if (status === "pending_acceptance") return { bg: "#2E1065", color: "#A78BFA" };
  return { bg: "#1E3A5F", color: "#60A5FA" };
}

function activityDot(status: string) {
  if (status === "completed") return "#16A34A";
  if (status === "pending_acceptance") return "#7C3AED";
  if (status === "cancelled" || status === "refunded") return "#F59E0B";
  return "#2563EB";
}

export default function BuyerDashboard() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [recs, setRecs] = useState<RecGig[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, spent: 0, openProposals: 0 });
  const [aiText, setAiText] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ord } = await supabase.from("orders")
        .select("id, order_number, status, price, created_at, gigs:gig_id(title, thumbnail_url)")
        .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(8);
      const rows = (ord ?? []) as any as OrderRow[];
      setOrders(rows);

      const { data: all } = await supabase.from("orders")
        .select("status, price").eq("buyer_id", user.id);
      const a = (all ?? []) as Array<{ status: string; price: number }>;
      setStats({
        active: a.filter((o) => !["completed","cancelled","refunded"].includes(o.status)).length,
        completed: a.filter((o) => o.status === "completed").length,
        spent: a.filter((o) => o.status === "completed").reduce((s, o) => s + (o.price ?? 0), 0),
        openProposals: a.filter((o) => o.status === "pending_acceptance").length,
      });

      // recommendations (kept logic, simplified)
      const { data: orderedGigs } = await supabase.from("orders")
        .select("gig_id, gigs:gig_id(category)").eq("buyer_id", user.id);
      const catSet = new Set<string>();
      const excludeGigIds = new Set<string>();
      ((orderedGigs ?? []) as any[]).forEach((o) => {
        if (o.gigs?.category) catSet.add(o.gigs.category);
        if (o.gig_id) excludeGigIds.add(o.gig_id);
      });
      const cats = [...catSet];
      let q = supabase.from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,category")
        .eq("status", "active");
      if (cats.length > 0) q = q.in("category", cats);
      const { data: recRaw } = await q.order("average_rating", { ascending: false }).limit(8);
      let rec = ((recRaw ?? []) as any[]).filter((g) => !excludeGigIds.has(g.id));
      if (rec.length < 2) {
        const { data: pop } = await supabase.from("gigs")
          .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,category")
          .eq("status", "active").order("total_orders", { ascending: false }).limit(8);
        const seen = new Set(rec.map((g) => g.id));
        ((pop ?? []) as any[]).forEach((g) => {
          if (!seen.has(g.id) && rec.length < 2) { rec.push(g); seen.add(g.id); }
        });
      }
      rec = rec.slice(0, 2);
      const ids = [...new Set(rec.map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setRecs(rec.map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })));
    })();
  }, [user?.id]);

  const firstName = (profile?.full_name ?? profile?.email ?? "Partner").split(/[ @]/)[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const handleRiverSubmit = () => {
    if (!aiText.trim()) return;
    nav(`/explore?q=${encodeURIComponent(aiText.trim())}`);
  };

  return (
    <AppShell>
      <style>{`
        .bd-btn-ghost:hover { border-color: #FFFFFF !important; color: #FFFFFF !important; }
        .bd-play-card:hover { border-color: #333 !important; }
        .bd-quick-row:hover { border-color: #333 !important; background: #111 !important; }
        .bd-river-btn:hover { background: #6D28D9 !important; }
        .bd-textarea:focus { border-color: #7C3AED !important; outline: none; }
        .bd-textarea::placeholder { color: #333; }
        .bd-link-muted:hover { color: #FFF !important; }
        .bd-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
      <div style={{ background: "#0A0A0A", margin: "-2.5rem", minHeight: "calc(100vh - 3.5rem)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
          {/* Welcome header */}
          <div style={{
            background: "#111111", border: "1px solid #1E1E1E", borderRadius: 16,
            padding: "28px 32px", marginBottom: 24, display: "flex",
            justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#555", marginBottom: 6 }}>
                PARTNER HQ
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 500, color: "#FFFFFF", margin: 0 }}>
                Welcome back {firstName}
              </h1>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{today}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/post-job" style={{
                background: "#FFFFFF", color: "#0A0A0A", border: "none", borderRadius: 999,
                padding: "10px 22px", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>Post a Project</Link>
              <Link to="/explore" className="bd-btn-ghost" style={{
                background: "transparent", border: "1px solid #333", color: "#AAAAAA",
                borderRadius: 999, padding: "10px 22px", fontSize: 13, textDecoration: "none",
                transition: "all 0.2s",
              }}>Find an Expert</Link>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard borderColor="#1E3A5F" dotColor="#2563EB" labelColor="#2563EB"
              label="Active Projects" value={stats.active}
              pillBg="#1E3A5F" pillColor="#60A5FA" pillText="In progress" />
            <StatCard borderColor="#052E16" dotColor="#16A34A" labelColor="#16A34A"
              label="Completed" value={stats.completed}
              pillBg="#052E16" pillColor="#4ADE80" pillText="All time" />
            <StatCard borderColor="#2E1065" dotColor="#7C3AED" labelColor="#7C3AED"
              label="Open Proposals" value={stats.openProposals}
              pillBg="#2E1065" pillColor="#A78BFA" pillText="Awaiting review" />
            <StatCard borderColor="#1A1A1A" dotColor="#FFFFFF" labelColor="#AAAAAA"
              label="Lifetime Spend" value={`$${stats.spent}`}
              pillBg="#1A1A1A" pillColor="#666" pillText="Total invested" />
          </div>

          {/* Two column */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Left column */}
            <div style={{ flex: "1 1 63%", minWidth: 320, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Recent Projects */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", margin: 0 }}>Recent Projects</h2>
                  <Link to="/buyer/orders" className="bd-link-muted" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>
                    View all →
                  </Link>
                </div>
                {orders.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <div style={{
                      width: 52, height: 52, background: "#1A1A1A", color: "#333",
                      fontSize: 22, borderRadius: "50%", margin: "0 auto 14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>+</div>
                    <div style={{ fontSize: 15, color: "#666", marginBottom: 6 }}>No projects yet</div>
                    <div style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>
                      Post your first project and Experts will submit Proposals within hours
                    </div>
                    <Link to="/post-job" style={{
                      background: "#FFFFFF", color: "#0A0A0A", border: "none", borderRadius: 999,
                      padding: "10px 24px", fontSize: 13, fontWeight: 600, textDecoration: "none",
                      display: "inline-block",
                    }}>Post a Project</Link>
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {orders.map((o) => {
                      const sc = statusColor(o.status);
                      return (
                        <li key={o.id}>
                          <Link to={`/orders/${o.id}`} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "14px 0", borderBottom: "1px solid #1A1A1A",
                            textDecoration: "none",
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {o.gigs?.title ?? "—"}
                              </div>
                              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{o.order_number}</div>
                            </div>
                            <span style={{
                              background: sc.bg, color: sc.color, borderRadius: 999,
                              padding: "2px 10px", fontSize: 11,
                            }}>{o.status.replace(/_/g, " ")}</span>
                            <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 600, minWidth: 60, textAlign: "right" }}>
                              ${o.price}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Recommended Plays */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", margin: 0 }}>Recommended Plays</h2>
                  <Link to="/explore" className="bd-link-muted" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>
                    Browse all →
                  </Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {recs.map((g) => (
                    <Link key={g.id} to={`/gigs/${g.id}`} className="bd-play-card" style={{
                      background: "#1A1A1A", border: "1px solid #222", borderRadius: 12,
                      overflow: "hidden", textDecoration: "none", transition: "border-color 0.2s",
                    }}>
                      <div style={{ height: 110, background: "#0A0A0A", overflow: "hidden" }}>
                        {g.thumbnail_url && (
                          <img src={g.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 10, textTransform: "uppercase", color: "#AAAAAA", fontWeight: 600, marginBottom: 4 }}>
                          {g.seller?.full_name ?? g.seller?.username ?? "Expert"}
                        </div>
                        <div className="bd-clamp2" style={{ fontSize: 12, color: "#CCCCCC", lineHeight: 1.4, marginBottom: 8, minHeight: 34 }}>
                          {g.title}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#F59E0B", fontSize: 11 }}>
                            ★ {(g.average_rating ?? 0).toFixed(1)} ({g.total_reviews ?? 0})
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>${g.starting_price}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ flex: "1 1 37%", minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* River AI */}
              <div style={{
                background: "linear-gradient(135deg, #0D0D1A, #0A0A0A)",
                border: "1px solid #2E1065", borderRadius: 16, padding: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, background: "#7C3AED", borderRadius: "50%", display: "inline-block", marginRight: 6 }} />
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "#7C3AED", letterSpacing: "0.14em" }}>RIVER AI</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#FFFFFF", marginBottom: 6 }}>What do you need?</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>Tell River — get matched instantly</div>
                <textarea
                  className="bd-textarea"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Describe what you need done..."
                  style={{
                    background: "#0A0A0A", border: "1px solid #222", borderRadius: 12,
                    padding: "12px 16px", color: "#FFFFFF", fontSize: 13, width: "100%",
                    resize: "none", height: 80, fontFamily: "inherit",
                  }}
                />
                <button onClick={handleRiverSubmit} className="bd-river-btn" style={{
                  background: "#7C3AED", color: "#FFFFFF", border: "none", borderRadius: 999,
                  width: "100%", height: 40, fontSize: 13, fontWeight: 600, marginTop: 12,
                  cursor: "pointer", transition: "background 0.2s",
                }}>Find My Expert →</button>
              </div>

              {/* Quick Actions */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "#FFFFFF", marginBottom: 14, marginTop: 0 }}>Quick actions</h3>
                <QuickRow to="/post-job" icon="+" bg="#1E3A5F" color="#60A5FA" label="Post a Project" />
                <QuickRow to="/services" icon="◎" bg="#052E16" color="#4ADE80" label="Browse Experts" />
                <QuickRow to="/projects" icon="❑" bg="#2E1065" color="#A78BFA" label="View Proposals" />
                <QuickRow to="/inbox" icon="✉" bg="#1A1200" color="#FCD34D" label="Messages" last />
              </div>

              {/* Activity */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "#FFFFFF", marginBottom: 14, marginTop: 0 }}>Recent activity</h3>
                {orders.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#444", textAlign: "center", padding: 20 }}>No activity yet</div>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {orders.slice(0, 6).map((o, i) => (
                      <li key={o.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                        borderBottom: i < Math.min(orders.length, 6) - 1 ? "1px solid #141414" : "none",
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: activityDot(o.status), flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, color: "#888", lineHeight: 1.4, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {o.gigs?.title ?? o.order_number} — {o.status.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>{timeAgo(o.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ borderColor, dotColor, labelColor, label, value, pillBg, pillColor, pillText }: {
  borderColor: string; dotColor: string; labelColor: string; label: string;
  value: number | string; pillBg: string; pillColor: string; pillText: string;
}) {
  return (
    <div style={{
      background: "#111111", border: `1px solid ${borderColor}`,
      borderRadius: 16, padding: 22,
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, background: dotColor, borderRadius: "50%", display: "inline-block", marginRight: 6 }} />
        <span style={{ fontSize: 11, textTransform: "uppercase", color: labelColor, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 42, fontWeight: 600, color: "#FFFFFF", marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      <div style={{
        display: "inline-block", background: pillBg, color: pillColor,
        borderRadius: 999, padding: "2px 10px", fontSize: 11, marginTop: 8,
      }}>{pillText}</div>
    </div>
  );
}

function QuickRow({ to, icon, bg, color, label, last }: {
  to: string; icon: string; bg: string; color: string; label: string; last?: boolean;
}) {
  return (
    <Link to={to} className="bd-quick-row" style={{
      background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
      marginBottom: last ? 0 : 8, textDecoration: "none", transition: "all 0.2s",
    }}>
      <span style={{
        width: 28, height: 28, background: bg, color, borderRadius: "50%",
        fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#CCCCCC", flex: 1 }}>{label}</span>
      <span style={{ color: "#444" }}>→</span>
    </Link>
  );
}
