import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoryMegaNav } from "@/components/layout/CategoryMegaNav";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { GigCard, type GigCardData } from "@/components/marketplace/GigCard";
import { EmptyCategoryState } from "@/components/marketplace/EmptyCategoryState";
import { riverScoreText, RiverNewPill } from "@/lib/riverScore";

const CATEGORIES = [
  { label: "Build with AI", slug: "build-with-ai" },
  { label: "Sound and Speak with AI", slug: "sound-and-speak-with-ai" },
  { label: "Create with AI", slug: "create-with-ai" },
  { label: "Grow with AI", slug: "grow-with-ai" },
  { label: "Run with AI", slug: "run-with-ai" },
  { label: "Understand AI", slug: "understand-ai" },
  { label: "Write with AI", slug: "write-with-ai" },
  { label: "Learn AI", slug: "learn-ai" },
];

type Seller = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  river_score: number | null;
  seller_skills: string[] | null;
  startingPrice: number | null;
  minDelivery: number | null;
};

type Activity = {
  id: string;
  type: "review" | "order" | "join";
  text: string;
  who: string;
  when: string;
  accent: "green" | "blue" | "yellow";
};

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Services() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [gigsLoaded, setGigsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,river_score,seller_skills")
        .eq("seller_status", "approved")
        .is("suspended_at", null)
        .order("river_score", { ascending: false, nullsFirst: false })
        .limit(9);
      const ids = (profs ?? []).map((p: any) => p.id);
      const priceById = new Map<string, number>();
      const daysById = new Map<string, number>();
      if (ids.length) {
        const { data: gs } = await supabase
          .from("gigs")
          .select("id,seller_id,starting_price")
          .in("seller_id", ids)
          .eq("status", "active");
        const gigIds = (gs ?? []).map((g: any) => g.id);
        (gs ?? []).forEach((g: any) => {
          const cur = priceById.get(g.seller_id);
          if (cur === undefined || g.starting_price < cur) priceById.set(g.seller_id, g.starting_price);
        });
        if (gigIds.length) {
          const { data: pkgs } = await supabase
            .from("gig_packages")
            .select("gig_id,delivery_days")
            .in("gig_id", gigIds);
          const sellerByGig = new Map((gs ?? []).map((g: any) => [g.id, g.seller_id]));
          (pkgs ?? []).forEach((p: any) => {
            const sid = sellerByGig.get(p.gig_id);
            if (!sid) return;
            const cur = daysById.get(sid);
            if (cur === undefined || p.delivery_days < cur) daysById.set(sid, p.delivery_days);
          });
        }
      }
      setSellers(
        (profs ?? []).map((p: any) => ({
          ...p,
          startingPrice: priceById.get(p.id) ?? null,
          minDelivery: daysById.get(p.id) ?? null,
        })),
      );
    })();

    (async () => {
      const { data } = await supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .eq("status", "active")
        .order("total_orders", { ascending: false })
        .limit(12);
      const ids = [...new Set((data ?? []).map((g: any) => g.seller_id))];
      const { data: ss } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((ss ?? []).map((s: any) => [s.id, s]));
      setGigs((data ?? []).map((g: any) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[]);
      setGigsLoaded(true);
    })();

    (async () => {
      const items: Activity[] = [];
      const { data: revs } = await supabase
        .from("reviews")
        .select("id,rating,created_at,reviewer:profiles!reviews_reviewer_id_fkey(username,full_name)")
        .order("created_at", { ascending: false })
        .limit(4);
      (revs ?? []).forEach((r: any) => {
        const name = r.reviewer?.full_name || r.reviewer?.username || "A partner";
        items.push({
          id: r.id,
          type: "review",
          text: `left a ${r.rating}★ review`,
          who: name,
          when: ago(r.created_at),
          accent: "green",
        });
      });
      const { data: ords } = await supabase
        .from("orders")
        .select("id,created_at,buyer:profiles!orders_buyer_id_fkey(username,full_name)")
        .order("created_at", { ascending: false })
        .limit(4);
      (ords ?? []).forEach((o: any) => {
        const name = o.buyer?.full_name || o.buyer?.username || "A partner";
        items.push({ id: o.id, type: "order", text: "placed a new project", who: name, when: ago(o.created_at), accent: "blue" });
      });
      const { data: joined } = await supabase
        .from("profiles")
        .select("id,username,full_name,member_since")
        .eq("seller_status", "approved")
        .order("member_since", { ascending: false })
        .limit(3);
      (joined ?? []).forEach((p: any) => {
        items.push({
          id: p.id,
          type: "join",
          text: "joined as a verified expert",
          who: p.full_name || p.username || "New expert",
          when: p.member_since ? ago(p.member_since) : "recently",
          accent: "yellow",
        });
      });
      setActivity(items.slice(0, 8));
    })();
  }, []);

  const picksLabels = [
    { label: "Top Pick", color: "#fbbf24" },
    { label: "Best Value", color: "#10b981" },
    { label: "Fastest Delivery", color: "#3b82f6" },
  ];
  const picks = sellers.slice(0, 3);
  const featured = sellers[0];
  const intel = sellers.slice(0, 6);

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      <SEO title="Services — Discover AI Experts | KATEXS" description="A precision marketplace where talent and intent meet through intelligence." />
      <SiteHeader variant="transparent" />
      <CategoryMegaNav />

      <style>{`
        .svc-cat:hover { border-color: #fff !important; color: #fff !important; }
        .svc-pick { transition: background 0.2s ease, transform 0.2s ease; }
        .svc-pick:hover { background: #111 !important; transform: translateY(-2px); }
        .svc-intel { transition: border-color 0.2s ease; }
        .svc-intel:hover { border-color: #2a2a2a !important; }
        .svc-intel:hover .svc-pitch { background: #fff !important; color: #000 !important; }
        .svc-pulse { animation: svcpulse 2s ease-in-out infinite; }
        @keyframes svcpulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @media (max-width: 900px) {
          .svc-grid-3 { grid-template-columns: 1fr !important; }
          .svc-grid-2 { grid-template-columns: 1fr !important; }
          .svc-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .svc-activity-split { flex-direction: column !important; }
          .svc-h1 { font-size: 40px !important; }
          .svc-section { padding: 56px 20px !important; }
        }
      `}</style>

      {/* HERO */}
      <section className="svc-section" style={{ padding: "140px 80px 80px", textAlign: "center" }}>
        <h1 className="svc-h1" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em", maxWidth: 880, margin: "0 auto 20px" }}>
          The freelance market,<br />rebuilt from first principles
        </h1>
        <p style={{ fontSize: 18, color: "#cccccc", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.6 }}>
          A precision marketplace where talent and intent meet through intelligence — not noise.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/services?q=${encodeURIComponent(q.trim())}`); }}
          style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}
        >
          <div style={{ position: "absolute", top: -22, left: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="svc-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: "#10b981" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 600 }}>
              Powered by River AI
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 999, padding: 6, paddingLeft: 24 }}>
            <Search size={16} color="#666" style={{ marginRight: 12, flexShrink: 0 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Describe the expert you need…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 15, padding: "12px 0" }}
            />
            <button type="submit" style={{ background: "#fff", color: "#000", border: "none", borderRadius: 999, padding: "12px 26px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Find My Expert
            </button>
          </div>
        </form>
      </section>

      {/* CATEGORY PILLS */}
      <section style={{ padding: "0 80px 80px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 1000, margin: "0 auto" }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="svc-cat"
              style={{
                padding: "9px 18px", borderRadius: 999, border: "1px solid #1f1f1f",
                background: "rgba(255,255,255,0.02)", color: "#cccccc",
                fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.2s ease",
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* RIVER'S PICKS */}
      <section className="svc-section" style={{ padding: "80px", borderTop: "1px solid #111", borderBottom: "1px solid #111" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>River's Picks</h2>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          </div>
          <div className="svc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {picks.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ background: "#0a0a0a", height: 240, borderTop: "3px solid #222" }} />
                ))
              : picks.map((s, i) => {
                  const meta = picksLabels[i];
                  return (
                    <Link
                      key={s.id}
                      to={`/u/${s.username ?? s.id}`}
                      className="svc-pick"
                      style={{
                        background: "#0a0a0a", borderTop: `3px solid ${meta.color}`,
                        padding: 28, display: "flex", flexDirection: "column", textDecoration: "none", color: "#fff",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 18 }}>
                        {meta.label}
                      </span>
                      <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
                        {s.full_name || s.username || "Expert"}
                      </h3>
                      <p style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.5, margin: "0 0 24px", minHeight: 42, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {s.bio || "Specialist on Katexs."}
                      </p>
                      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #181818" }}>
                        <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#aaaaaa" }}>
                          {i === 0 ? (riverScoreText(s.river_score, { digits: 1 }) ? `River ${riverScoreText(s.river_score, { digits: 1 })}` : "New") :
                           i === 1 ? (s.startingPrice != null ? `From $${s.startingPrice}` : "Best rate") :
                           (s.minDelivery ? `${s.minDelivery}d avg` : "Rapid")}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", borderBottom: "1px solid #555", paddingBottom: 2 }}>
                          View Profile →
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      </section>

      {/* LIVE ACTIVITY */}
      <section className="svc-section" style={{ padding: "80px" }}>
        <div className="svc-activity-split" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 65%" }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaaaaa", margin: "0 0 24px" }}>
              Featured this week
            </h2>
            {featured ? (
              <Link to={`/u/${featured.username ?? featured.id}`} style={{ display: "block", textDecoration: "none", color: "#fff" }}>
                <div style={{ background: "#0a0a0a", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "row", minHeight: 320 }}>
                  <div style={{ width: "42%", background: "#111", position: "relative", flexShrink: 0 }}>
                    {featured.avatar_url ? (
                      <img src={featured.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 600, color: "#333" }}>
                        {(featured.full_name || featured.username || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 36, display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
                    <span style={{ alignSelf: "flex-start", padding: "3px 8px", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 3, marginBottom: 18 }}>
                      ELITE PARTNER
                    </span>
                    <h3 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 10px" }}>
                      {featured.full_name || featured.username || "Top Expert"}
                    </h3>
                    <p style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.6, margin: "0 0 24px" }}>
                      {featured.bio || "A top-ranked AI specialist on Katexs."}
                    </p>
                    <div style={{ display: "inline-block", alignSelf: "flex-start", background: "#fff", color: "#000", padding: "12px 24px", fontSize: 13, fontWeight: 700 }}>
                      View Profile
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ background: "#0a0a0a", borderRadius: 16, height: 320 }} />
            )}
          </div>

          <div style={{ flex: "1 1 35%", minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaaaaa", margin: 0 }}>
                Live activity feed
              </h2>
              <span className="svc-pulse" style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981" }} />
            </div>
            <div style={{ background: "#0a0a0a", border: "1px solid #111", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 18, maxHeight: 380, overflowY: "auto" }}>
              {activity.length === 0 ? (
                <div style={{ fontSize: 12, color: "#888" }}>Listening for activity…</div>
              ) : activity.map((a) => {
                const c = a.accent === "green" ? "#10b981" : a.accent === "blue" ? "#3b82f6" : "#fbbf24";
                return (
                  <div key={a.id + a.type} style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 2, background: c, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {a.when}
                      </div>
                      <div style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.4 }}>
                        <span style={{ color: "#fff", fontWeight: 600 }}>{a.who}</span> {a.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE CARDS */}
      <section className="svc-section" style={{ padding: "100px 80px", background: "#0a0a0a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Intelligence Verified</h2>
              <p style={{ fontSize: 14, color: "#cccccc", margin: 0 }}>Top-ranked experts by River Score.</p>
            </div>
            <Link to="/services" style={{ fontSize: 12, color: "#888", textDecoration: "none", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
              Browse all experts →
            </Link>
          </div>
          <div className="svc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {(intel.length ? intel : Array.from({ length: 6 })).map((s: any, i: number) => (
              <div
                key={s?.id ?? i}
                className="svc-intel"
                style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                    {s?.avatar_url ? (
                      <img src={s.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#252525", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s?.full_name || s?.username || "Expert"}
                      </div>
                      <div style={{ fontSize: 13, color: "#aaaaaa", marginTop: 2 }}>
                        {(s?.seller_skills ?? [])[0] || "AI Specialist"}
                      </div>
                    </div>
                  </div>
                  <button aria-label="Save" style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", padding: 0 }}>
                    <Bookmark size={16} />
                  </button>
                </div>
                <div style={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#aaaaaa", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    River Score
                  </span>
                  {(() => {
                    const txt = riverScoreText(s?.river_score, { digits: 2 });
                    return txt ? (
                      <span style={{ fontSize: 22, fontWeight: 600, color: "#fff", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
                        {txt}
                      </span>
                    ) : (
                      <RiverNewPill surface="dark" />
                    );
                  })()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24, minHeight: 22 }}>
                  {((s?.seller_skills ?? []) as string[]).slice(0, 3).map((sk) => (
                    <span key={sk} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #333", background: "#252525", color: "#cccccc", borderRadius: 999 }}>
                      {sk}
                    </span>
                  ))}
                </div>
                <Link
                  to={s ? `/u/${s.username ?? s.id}` : "#"}
                  className="svc-pitch"
                  style={{
                    marginTop: "auto", textAlign: "center", background: "#fff",
                    color: "#000", padding: "10px 18px", fontSize: 12, fontWeight: 600,
                    textDecoration: "none", borderRadius: 999, border: "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  See Profile
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING GIGS */}
      <section className="svc-section" style={{ padding: "100px 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>Trending Services</h2>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
            <Link to="/explore" style={{ fontSize: 12, color: "#aaaaaa", textDecoration: "none" }}>View all →</Link>
          </div>
          {!gigsLoaded ? (
            <div className="svc-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: "#0a0a0a", aspectRatio: "4/3", borderRadius: 8 }} />
              ))}
            </div>
          ) : gigs.length === 0 ? (
            <EmptyCategoryState surface="dark" />
          ) : (
            <div className="svc-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
