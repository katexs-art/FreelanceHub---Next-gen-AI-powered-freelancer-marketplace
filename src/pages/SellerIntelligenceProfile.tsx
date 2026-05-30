import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProfileReviewsSection } from "@/components/marketplace/ProfileReviewsSection";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check, X } from "lucide-react";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  languages: string[] | null;
  member_since: string;
  is_online: boolean;
  last_seen: string | null;
  response_time_minutes: number | null;
  river_score: number | null;
  average_rating: number | null;
  total_reviews: number;
}

interface GigRow {
  id: string;
  title: string;
  tags: string[] | null;
  gallery_urls: string[] | null;
  thumbnail_url: string | null;
  starting_price: number;
  total_orders: number;
  category: string | null;
}

interface PackageRow {
  id: string;
  gig_id: string;
  package_type: "basic" | "standard" | "premium";
  title: string | null;
  description: string | null;
  price: number;
  delivery_days: number;
  features: string[] | null;
}

function hoursAgo(iso: string | null): string {
  if (!iso) return "Active recently";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Active today";
  if (h < 24) return `Active ${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Active 1 day ago";
  return `Active ${d} days ago`;
}

function levelFromScore(score: number | null): "Rising" | "Pro" | "Elite" {
  const s = score ?? 0;
  if (s >= 86) return "Elite";
  if (s >= 61) return "Pro";
  return "Rising";
}

function responseLabel(min: number | null): string {
  if (min == null) return "Responds in 24h";
  if (min < 60) return `Responds in ${Math.max(1, Math.round(min))}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `Responds in ${h}h`;
  return `Responds in ${Math.round(h / 24)}d`;
}

export default function SellerIntelligenceProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Profile | null>(null);
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    completionRate: 0,
    avgDeliveryDays: 0,
    repeatBuyerRate: 0,
  });
  const [alsoViewed, setAlsoViewed] = useState<Profile[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const byUsername = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      const profile = (byUsername.data as any) ?? (await supabase.from("profiles").select("*").eq("id", username).maybeSingle()).data;
      if (!profile) { setLoading(false); return; }
      setSeller(profile as Profile);

      const [{ data: gigData }, { data: orderData }] = await Promise.all([
        supabase.from("gigs")
          .select("id,title,tags,gallery_urls,thumbnail_url,starting_price,total_orders,category")
          .eq("seller_id", profile.id).eq("status", "active"),
        supabase.from("orders")
          .select("id,buyer_id,status,created_at,delivered_at")
          .eq("seller_id", profile.id),
      ]);
      const gigList = (gigData ?? []) as GigRow[];
      setGigs(gigList);

      if (gigList.length) {
        const { data: pkgs } = await supabase.from("gig_packages")
          .select("id,gig_id,package_type,title,description,price,delivery_days,features")
          .in("gig_id", gigList.map(g => g.id));
        setPackages((pkgs ?? []) as PackageRow[]);
      }

      const orders = (orderData ?? []) as any[];
      const completed = orders.filter(o => o.status === "completed");
      const totalCompleted = completed.length;
      const completionRate = orders.length ? Math.round((completed.length / orders.length) * 100) : 100;
      const deliveryDays = completed
        .filter(o => o.delivered_at)
        .map(o => (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 86_400_000);
      const avgDeliveryDays = deliveryDays.length ? Math.max(1, Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length)) : 0;
      const buyerCounts = new Map<string, number>();
      completed.forEach(o => buyerCounts.set(o.buyer_id, (buyerCounts.get(o.buyer_id) ?? 0) + 1));
      const uniqueBuyers = buyerCounts.size;
      const repeats = Array.from(buyerCounts.values()).filter(n => n > 1).length;
      const repeatBuyerRate = uniqueBuyers ? Math.round((repeats / uniqueBuyers) * 100) : 0;
      setStats({ totalCompleted, completionRate, avgDeliveryDays, repeatBuyerRate });

      // Also viewed: 3 other top sellers in same category
      const cat = gigList[0]?.category;
      if (cat) {
        const { data: otherGigs } = await supabase.from("gigs")
          .select("seller_id,profiles:seller_id(*)")
          .eq("category", cat).eq("status", "active").neq("seller_id", profile.id).limit(20);
        const seen = new Set<string>();
        const recs: Profile[] = [];
        for (const row of (otherGigs ?? []) as any[]) {
          if (seen.has(row.seller_id) || !row.profiles) continue;
          seen.add(row.seller_id);
          recs.push(row.profiles as Profile);
          if (recs.length >= 3) break;
        }
        setAlsoViewed(recs);
      }
      setLoading(false);
    })();
  }, [username]);

  const name = seller?.full_name ?? seller?.username ?? "Seller";
  const firstName = name.split(" ")[0];

  // Aggregate tags from gigs → verified skills
  const skillTags = useMemo(() => {
    const set = new Set<string>();
    gigs.forEach(g => (g.tags ?? []).forEach(t => t && set.add(t)));
    return Array.from(set);
  }, [gigs]);

  const tools = useMemo(() => {
    // Use gig categories as "tools/areas"
    const set = new Set<string>();
    gigs.forEach(g => g.category && set.add(g.category));
    return Array.from(set);
  }, [gigs]);

  // Pick top gig (most orders) and derive 3 packages
  const topGig = useMemo(() => {
    if (!gigs.length) return null;
    return [...gigs].sort((a, b) => (b.total_orders ?? 0) - (a.total_orders ?? 0))[0];
  }, [gigs]);

  const topPackages = useMemo(() => {
    if (!topGig) return [] as PackageRow[];
    const types: ("basic" | "standard" | "premium")[] = ["basic", "standard", "premium"];
    return types
      .map(t => packages.find(p => p.gig_id === topGig.id && p.package_type === t))
      .filter(Boolean) as PackageRow[];
  }, [packages, topGig]);

  const portfolioImages = useMemo(() => {
    const out: { gigId: string; url: string; title: string }[] = [];
    gigs.forEach(g => (g.gallery_urls ?? []).forEach(u => u && out.push({ gigId: g.id, url: u, title: g.title })));
    if (out.length === 0) {
      gigs.forEach(g => g.thumbnail_url && out.push({ gigId: g.id, url: g.thumbnail_url, title: g.title }));
    }
    return out.slice(0, 9);
  }, [gigs]);

  const startingPrice = useMemo(() => {
    if (!gigs.length) return 0;
    return Math.min(...gigs.map(g => g.starting_price ?? 0).filter(n => n > 0));
  }, [gigs]);

  const startingDelivery = useMemo(() => {
    if (!packages.length) return 0;
    return Math.min(...packages.map(p => p.delivery_days ?? 0).filter(n => n > 0));
  }, [packages]);

  // River summary
  const riverSummary = useMemo(() => {
    if (!seller) return "";
    const topSkill = skillTags[0] ?? tools[0] ?? "their craft";
    const praise = (seller.average_rating ?? 0) >= 4.5 ? "fast turnaround and crystal-clear communication"
                 : (seller.average_rating ?? 0) >= 4 ? "quality work and reliability"
                 : "consistent delivery";
    const repeat = stats.repeatBuyerRate;
    const topPct = Math.max(5, 100 - Math.round((seller.river_score ?? 50)));
    return `This seller specializes in ${topSkill}. Buyers consistently praise their ${praise}. They have a ${repeat}% repeat buyer rate which places them in the top ${topPct}% of sellers in this category.`;
  }, [seller, skillTags, tools, stats.repeatBuyerRate]);

  const isOnlineActive = seller?.is_online || (seller?.last_seen && Date.now() - new Date(seller.last_seen).getTime() < 86_400_000);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-10 text-foreground-muted">Loading…</main>
        <SiteFooter />
      </div>
    );
  }
  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Seller not found</h1>
          <Link to="/explore" className="text-primary mt-2 inline-block">Browse sellers</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const onMessage = async () => {
    const { data } = await supabase.rpc("get_or_create_conversation", { _other: seller.id });
    if (data) navigate(`/inbox/${data}`);
  };
  const onViewPackages = () => {
    if (topGig) navigate(`/gig/${topGig.id}`);
  };
  const onOrderNow = (pkg: PackageRow) => {
    navigate(`/gig/${pkg.gig_id}?pkg=${pkg.package_type}`);
  };

  const memberSince = `Member since ${new Date(seller.member_since).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  const lastActive = isOnlineActive ? (seller.is_online ? "Active now" : hoursAgo(seller.last_seen)) : hoursAgo(seller.last_seen);

  const ActionButtons = (
    <div className="flex flex-col gap-2 w-full">
      <button onClick={onMessage}
        className="w-full bg-black text-white font-semibold flex items-center justify-center"
        style={{ borderRadius: 999, height: 48, fontSize: 15 }}>
        Message {firstName}
      </button>
      <button onClick={onViewPackages}
        className="w-full bg-white text-black font-semibold flex items-center justify-center border border-black"
        style={{ borderRadius: 999, height: 48, fontSize: 15 }}>
        View Packages
      </button>
      <p style={{ fontSize: 12, color: "#999" }} className="text-center">
        Safe payments. 3-day review window. Funds held in escrow.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title={`${name} — Profile`} description={(seller.bio ?? `Hire ${name} on Katexs.`).slice(0, 155)} />
      <SiteHeader />
      <main className="flex-1 container py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Main column */}
          <div className="space-y-8">
            {/* HEADER */}
            <section>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative shrink-0">
                  <div className="rounded-full overflow-hidden bg-muted flex items-center justify-center font-semibold"
                    style={{ width: 80, height: 80, fontSize: 28 }}>
                    {seller.avatar_url
                      ? <img src={seller.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : <span>{name[0]?.toUpperCase()}</span>}
                  </div>
                  {isOnlineActive && (
                    <span className="absolute bottom-1 right-1 block rounded-full border-2 border-white"
                      style={{ width: 14, height: 14, background: "#22c55e" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 style={{ fontSize: 24, fontWeight: 700 }}>{name}</h1>
                  <p style={{ fontSize: 15, color: "#555" }} className="mt-1">
                    {skillTags[0] ? `${skillTags[0]} specialist` : (tools[0] ? `${tools[0]} expert` : "Independent professional")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center"
                      style={{ background: "#000", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      River Score: {Math.round(seller.river_score ?? 0)}
                    </span>
                    <span className="inline-flex items-center"
                      style={{ background: "#f5f5f5", color: "#333", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {levelFromScore(seller.river_score)}
                    </span>
                    <span className="inline-flex items-center"
                      style={{ background: "#f5f5f5", color: "#333", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {responseLabel(seller.response_time_minutes)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm" style={{ color: "#666" }}>
                    {stats.totalCompleted} orders completed · {memberSince} · {lastActive}
                  </div>
                </div>
                <div className="w-full md:w-[260px] shrink-0">{ActionButtons}</div>
              </div>
            </section>

            {/* RIVER SAYS */}
            <section style={{ borderLeft: "3px solid #000", paddingLeft: 16 }}>
              <div style={{ fontSize: 11, color: "#999", letterSpacing: "0.1em", textTransform: "uppercase" }}>River says</div>
              <p className="mt-2" style={{ fontSize: 15, lineHeight: 1.6 }}>{riverSummary}</p>
            </section>

            {/* SKILLS */}
            <section className="space-y-4">
              <div>
                <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>Verified Skills</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillTags.length === 0
                    ? <span className="text-sm" style={{ color: "#999" }}>No skills listed yet.</span>
                    : skillTags.map(t => (
                      <span key={t} style={{ background: "#000", color: "#fff", fontSize: 10, padding: "8px 14px", borderRadius: 999 }}>{t}</span>
                    ))}
                </div>
              </div>
              {(seller.languages ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>Languages</div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(seller.languages ?? []).map(l => (
                      <span key={l} style={{ background: "#f5f5f5", color: "#333", fontSize: 10, padding: "8px 14px", borderRadius: 999 }}>{l}</span>
                    ))}
                  </div>
                </div>
              )}
              {tools.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tools</div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tools.map(t => (
                      <span key={t} style={{ background: "#f5f5f5", color: "#333", fontSize: 10, padding: "8px 14px", borderRadius: 999 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* PACKAGES */}
            {topPackages.length > 0 && (
              <section>
                <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }} className="mb-3">Packages</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topPackages.map(pkg => (
                    <div key={pkg.id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}
                      className="flex flex-col">
                      <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>{pkg.package_type}</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }} className="mt-2">${pkg.price}</div>
                      {pkg.description && <p className="mt-2 text-sm" style={{ color: "#555" }}>{pkg.description}</p>}
                      <ul className="mt-4 space-y-2 flex-1">
                        {(pkg.features ?? []).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 mt-0.5 shrink-0" /> <span>{f}</span>
                          </li>
                        ))}
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 mt-0.5 shrink-0" /> <span>{pkg.delivery_days}-day delivery</span>
                        </li>
                      </ul>
                      <button onClick={() => onOrderNow(pkg)}
                        className="mt-5 bg-black text-white font-semibold flex items-center justify-center"
                        style={{ borderRadius: 999, height: 44, fontSize: 14 }}>
                        Order Now
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PORTFOLIO */}
            <section>
              <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }} className="mb-3">Portfolio</div>
              {portfolioImages.length === 0 ? (
                <div className="text-sm" style={{ color: "#999", padding: "24px 0" }}>
                  This seller has not added portfolio samples yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portfolioImages.map((p, i) => (
                    <button key={i} onClick={() => setLightbox(p.url)}
                      className="block overflow-hidden rounded-lg bg-muted aspect-square">
                      <img src={p.url} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* STATS BAR */}
            <section className="grid grid-cols-2 md:grid-cols-4 border-y" style={{ borderColor: "#e5e5e5" }}>
              <div className="p-5 text-center md:border-r" style={{ borderColor: "#e5e5e5" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{(seller.average_rating ?? 0).toFixed(1)}</div>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-4 w-4" fill={i <= Math.round(seller.average_rating ?? 0) ? "#000" : "none"} stroke="#000" />
                  ))}
                </div>
                <div className="text-xs mt-1" style={{ color: "#999" }}>{seller.total_reviews} reviews</div>
              </div>
              <div className="p-5 text-center md:border-r" style={{ borderColor: "#e5e5e5" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.completionRate}%</div>
                <div className="text-xs mt-1" style={{ color: "#999" }}>Order completion</div>
              </div>
              <div className="p-5 text-center md:border-r" style={{ borderColor: "#e5e5e5" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.avgDeliveryDays || "—"}</div>
                <div className="text-xs mt-1" style={{ color: "#999" }}>days avg delivery</div>
              </div>
              <div className="p-5 text-center">
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.repeatBuyerRate}%</div>
                <div className="text-xs mt-1" style={{ color: "#999" }}>Repeat buyers</div>
              </div>
            </section>

            {/* REVIEWS */}
            <section>
              <ProfileReviewsSection sellerId={seller.id} />
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5 border rounded-xl p-5" style={{ borderColor: "#e5e5e5" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>From ${startingPrice || "—"}</div>
                {startingDelivery > 0 && (
                  <div className="text-sm mt-1" style={{ color: "#555" }}>Delivers in {startingDelivery} days</div>
                )}
              </div>
              {ActionButtons}
              {alsoViewed.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: "#e5e5e5" }}>
                  <div style={{ fontSize: 11, color: "#999", letterSpacing: "0.1em", textTransform: "uppercase" }} className="mb-3">Also viewed</div>
                  <div className="space-y-3">
                    {alsoViewed.map(s => (
                      <Link key={s.id} to={`/seller/${s.username ?? s.id}`}
                        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                          {s.avatar_url
                            ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                            : (s.full_name ?? s.username ?? "S")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{s.full_name ?? s.username}</div>
                          <div className="text-xs truncate" style={{ color: "#999" }}>River Score {Math.round(s.river_score ?? 0)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white">
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-[90vw] object-contain" />
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
