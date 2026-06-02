import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { GigCard, type GigCardData } from "@/components/marketplace/GigCard";
import { EmptyCategoryState } from "@/components/marketplace/EmptyCategoryState";
import { riverScoreText, RiverNewPill } from "@/lib/riverScore";
import { RiverCommandBar } from "@/components/services/RiverCommandBar";


const CATEGORIES = [
  { label: "Voice AI", match: ["voice"] },
  { label: "Chatbot Development", match: ["chatbot"] },
  { label: "AI Automation", match: ["automation", "workflow"] },
  { label: "Prompt Engineering", match: ["prompt"] },
  { label: "AI Consulting", match: ["consult", "strategy"] },
  { label: "Custom AI Models", match: ["model", "fine-tun", "machine learning"] },
  { label: "AI Content", match: ["content", "writing", "copy"] },
  { label: "AI Integration", match: ["integration", "api"] },
  { label: "GoHighLevel", match: ["ghl", "gohighlevel", "highlevel"] },
  { label: "Digital Marketing", match: ["marketing", "seo", "ads", "social"] },
];

const PRICE_RANGES = [
  { label: "$0 – $50", min: 0, max: 50 },
  { label: "$50 – $200", min: 50, max: 200 },
  { label: "$200 – $500", min: 200, max: 500 },
  { label: "$500+", min: 500, max: null as number | null },
];
const DELIVERY_OPTS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
];
const RATING_OPTS = [
  { label: "4.5+", value: 4.5 },
  { label: "4.0+", value: 4.0 },
];
const LEVEL_OPTS = [
  { label: "Rising", min: 0, max: 4.4 },
  { label: "Top Rated", min: 4.5, max: 4.79 },
  { label: "Pro", min: 4.8, max: 5 },
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
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [gigsLoaded, setGigsLoaded] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [deliveryIdx, setDeliveryIdx] = useState<number | null>(null);
  const [ratingIdx, setRatingIdx] = useState<number | null>(null);
  const [levelIdx, setLevelIdx] = useState<number | null>(null);



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
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,category")
        .eq("status", "active")
        .order("total_orders", { ascending: false })
        .limit(48);
      const gigList = (data ?? []) as any[];
      const ids = [...new Set(gigList.map((g) => g.seller_id))];
      const gigIds = gigList.map((g) => g.id);
      const [{ data: ss }, { data: pkgs }] = await Promise.all([
        ids.length
          ? supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
          : Promise.resolve({ data: [] as any }),
        gigIds.length
          ? supabase.from("gig_packages").select("gig_id,delivery_days").in("gig_id", gigIds)
          : Promise.resolve({ data: [] as any }),
      ]);
      const byId = new Map((ss ?? []).map((s: any) => [s.id, s]));
      const minDelivery = new Map<string, number>();
      (pkgs ?? []).forEach((p: any) => {
        const cur = minDelivery.get(p.gig_id);
        if (cur === undefined || p.delivery_days < cur) minDelivery.set(p.gig_id, p.delivery_days);
      });
      setGigs(
        gigList.map((g) => ({
          ...g,
          seller: byId.get(g.seller_id) ?? null,
          delivery_days: minDelivery.get(g.id) ?? null,
        })) as GigCardData[],
      );
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

  const filteredGigs = gigs.filter((g: any) => {
    if (activeCat) {
      const cat = CATEGORIES.find((c) => c.label === activeCat);
      const hay = `${g.title ?? ""} ${g.category ?? ""}`.toLowerCase();
      if (cat && !cat.match.some((m) => hay.includes(m))) return false;
    }
    if (priceIdx !== null) {
      const r = PRICE_RANGES[priceIdx];
      if (g.starting_price < r.min) return false;
      if (r.max !== null && g.starting_price > r.max) return false;
    }
    if (deliveryIdx !== null) {
      const d = DELIVERY_OPTS[deliveryIdx];
      if (g.delivery_days == null || g.delivery_days > d.days) return false;
    }
    if (ratingIdx !== null) {
      if (Number(g.average_rating ?? 0) < RATING_OPTS[ratingIdx].value) return false;
    }
    if (levelIdx !== null) {
      const r = Number(g.average_rating ?? 0);
      const l = LEVEL_OPTS[levelIdx];
      if (r < l.min || r > l.max) return false;
    }
    return true;
  });


  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      <SEO title="Services — Discover AI Experts | KATEXS" description="A precision marketplace where talent and intent meet through intelligence." />
      <SiteHeader variant="transparent" />

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
          .svc-results-grid { grid-template-columns: 1fr !important; }
          .svc-results-grid > aside { position: static !important; }
          .svc-activity-split { flex-direction: column !important; }
          .svc-h1 { font-size: 40px !important; }
          .svc-section { padding: 56px 20px !important; }
        }
          .svc-activity-split { flex-direction: column !important; }
          .svc-h1 { font-size: 40px !important; }
          .svc-section { padding: 56px 20px !important; }
        }
      `}</style>

      {/* HERO */}
      <section className="svc-section" style={{ padding: "140px 80px 60px", textAlign: "center" }}>
        <h1 className="svc-h1" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em", maxWidth: 880, margin: "0 auto 20px" }}>
          Find the perfect AI expert.<br />Hire in minutes.
        </h1>
        <p style={{ fontSize: 18, color: "#cccccc", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.6 }}>
          A precision marketplace where talent and intent meet through intelligence — not noise.
        </p>
        <div style={{ maxWidth: 820, margin: "0 auto", position: "relative" }}>
          <RiverCommandBar />
        </div>
      </section>


      {/* RESULTS GRID + FILTERS */}
      <section className="svc-section svc-results" style={{ padding: "20px 80px 80px" }}>
        <div className="svc-results-grid" style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "260px 1fr", gap: 32 }}>
          <aside style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 16, padding: 22, alignSelf: "start", position: "sticky", top: 120 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 14px" }}>Filters</h3>

            <FilterGroup title="Category">
              {CATEGORIES.map((c) => (
                <FilterRow key={c.label} active={activeCat === c.label} onClick={() => setActiveCat(activeCat === c.label ? null : c.label)} label={c.label} />
              ))}
            </FilterGroup>

            <FilterGroup title="Price range">
              {PRICE_RANGES.map((p, i) => (
                <FilterRow key={p.label} active={priceIdx === i} onClick={() => setPriceIdx(priceIdx === i ? null : i)} label={p.label} />
              ))}
            </FilterGroup>

            <FilterGroup title="Delivery time">
              {DELIVERY_OPTS.map((d, i) => (
                <FilterRow key={d.label} active={deliveryIdx === i} onClick={() => setDeliveryIdx(deliveryIdx === i ? null : i)} label={`Up to ${d.label}`} />
              ))}
            </FilterGroup>

            <FilterGroup title="Rating">
              {RATING_OPTS.map((r, i) => (
                <FilterRow key={r.label} active={ratingIdx === i} onClick={() => setRatingIdx(ratingIdx === i ? null : i)} label={`${r.label} stars`} />
              ))}
            </FilterGroup>

            <FilterGroup title="Expert level" last>
              {LEVEL_OPTS.map((l, i) => (
                <FilterRow key={l.label} active={levelIdx === i} onClick={() => setLevelIdx(levelIdx === i ? null : i)} label={l.label} />
              ))}
            </FilterGroup>
          </aside>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#fff" }}>
                {gigsLoaded ? `${filteredGigs.length} expert${filteredGigs.length === 1 ? "" : "s"}` : "Loading…"}
                {activeCat && <span style={{ color: "#888", fontWeight: 400 }}> in {activeCat}</span>}
              </h2>
            </div>
            {!gigsLoaded ? (
              <div className="svc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ background: "#0a0a0a", aspectRatio: "4/3", borderRadius: 12 }} />
                ))}
              </div>
            ) : filteredGigs.length === 0 ? (
              <EmptyCategoryState surface="dark" />
            ) : (
              <div className="svc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {filteredGigs.map((g) => <GigCard key={g.id} gig={g} />)}
              </div>
            )}
          </div>
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
      <SiteFooter />
    </div>
  );
}

function FilterGroup({ title, last, children }: { title: string; last?: boolean; children: ReactNode }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 16, marginBottom: last ? 0 : 16, borderBottom: last ? "none" : "1px solid #161616" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function FilterRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", background: "transparent", border: "none", padding: "4px 0",
        color: active ? "#fff" : "#aaa", fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 4, border: "1px solid #2a2a2a",
        background: active ? "#fff" : "transparent", flexShrink: 0,
      }} />
      {label}
    </button>
  );
}

