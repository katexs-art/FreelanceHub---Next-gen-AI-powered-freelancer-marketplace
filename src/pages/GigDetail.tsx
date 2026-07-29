import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Star, Clock, RefreshCw, Check, Heart, MessageSquare, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { expertLevel, FiverCard, FiverCardData } from "@/components/marketplace/FiverCard";
import { RatingBreakdown } from "@/components/marketplace/RatingBreakdown";
import { ReviewsList } from "@/components/marketplace/ReviewsList";
import { ReportDialog } from "@/components/marketplace/ReportDialog";
import { VerifiedBadge } from "@/components/marketplace/VerifiedBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

type PkgType = "basic" | "standard" | "premium";

interface Gig {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  gallery_urls: string[];
  thumbnail_url: string | null;
  starting_price: number;
  total_orders: number;
  total_reviews: number;
  average_rating: number;
  seller_id: string;
}
interface Pkg {
  id: string;
  package_type: PkgType;
  title: string;
  description: string | null;
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[];
}
interface Seller {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  member_since: string;
  is_online: boolean;
  response_rate: number | null;
  response_time_minutes: number | null;
  total_reviews?: number;
  seller_skills?: string[] | null;
  languages?: string[] | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatResponseTime(minutes: number | null): string | null {
  if (minutes == null) return null;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) === 1 ? "" : "s"}`;
  return `${Math.round(minutes / (60 * 24))} day${Math.round(minutes / (60 * 24)) === 1 ? "" : "s"}`;
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  "Top Rated": { bg: "#7C3AED", color: "#fff" },
  "Level 2":   { bg: "#16A34A", color: "#fff" },
  "Level 1":   { bg: "#0EA5E9", color: "#fff" },
};

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const s = LEVEL_STYLE[level] ?? { bg: "#333", color: "#fff" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {level}
    </span>
  );
}

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = name[0]?.toUpperCase() ?? "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#1a1a1a", color: "#888",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, overflow: "hidden",
    }}>
      {src && !broken
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setBroken(true)} />
        : initial}
    </div>
  );
}

// ── Tab system ────────────────────────────────────────────────────────────────

type Tab = "overview" | "about" | "reviews";

// ── Package panel ─────────────────────────────────────────────────────────────

interface PkgPanelProps {
  packages: Pkg[];
  gig: Gig;
  selectedTier: PkgType;
  onSelectTier: (t: PkgType) => void;
  isSaved: boolean;
  onToggleSave: () => void;
  onContact: () => void;
}

function PackagePanel({ packages, gig, selectedTier, onSelectTier, isSaved, onToggleSave, onContact }: PkgPanelProps) {
  const nav = useNavigate();
  const selected = packages.find((p) => p.package_type === selectedTier) ?? packages[0];

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 4px", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "#fff" : "#888", background: "transparent", border: "none",
    borderBottom: `2px solid ${active ? "#16A34A" : "transparent"}`,
    cursor: "pointer", textTransform: "capitalize", transition: "color 0.15s, border-color 0.15s",
  });

  const handleContinue = async () => {
    if (!selected) return;
    const { data: sess } = await supabase.auth.getUser();
    if (!sess?.user) {
      toast.error("Please sign in to continue");
      return nav(`/login?redirect=/gig/${gig.id}`);
    }
    toast.loading("Preparing your project…", { id: "co" });
    try {
      const { data, error } = await supabase.rpc("create_gig_order", {
        _package_id: selected.id,
        _extra_ids: [],
      });
      toast.dismiss("co");
      if (error) throw error;
      if (!data) throw new Error("Could not create project");
      nav(`/checkout/${data}`);
    } catch (e: any) {
      toast.dismiss("co");
      toast.error(e?.message ?? "Could not create project. Please try again.");
    }
  };

  return (
    <div style={{
      background: "#111111", border: "1px solid #1e1e1e",
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Package tabs */}
      {packages.length > 1 && (
        <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e" }}>
          {packages.map((p) => (
            <button key={p.package_type} onClick={() => onSelectTier(p.package_type)} style={tabStyle(selectedTier === p.package_type)}>
              {p.package_type}
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div style={{ padding: "20px 20px 20px" }}>
          {/* Name + price */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>{selected.title}</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>${selected.price}</span>
          </div>

          {/* Description */}
          {selected.description && (
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>{selected.description}</p>
          )}

          {/* Delivery + revisions */}
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#cccccc" }}>
              <Clock size={14} color="#888" />
              <span><strong>{selected.delivery_days}</strong> day{selected.delivery_days === 1 ? "" : "s"} delivery</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#cccccc" }}>
              <RefreshCw size={14} color="#888" />
              <span><strong>{selected.revisions === 0 ? "No" : selected.revisions}</strong> revision{selected.revisions === 1 ? "" : "s"}</span>
            </div>
          </div>

          {/* Features */}
          {selected.features.length > 0 && (
            <ul style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {selected.features.map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#cccccc" }}>
                  <Check size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 15,
              border: "none", cursor: "pointer", marginBottom: 10,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#15803d"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#16A34A"; }}
          >
            Continue (${selected.price})
          </button>

          {/* Contact + Save row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={onContact}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 0", borderRadius: 8,
                background: "transparent", border: "1px solid #2a2a2a",
                color: "#cccccc", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#555"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
            >
              <MessageSquare size={14} /> Contact Expert
            </button>
            <button
              onClick={onToggleSave}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 0", borderRadius: 8,
                background: "transparent", border: `1px solid ${isSaved ? "#ef4444" : "#2a2a2a"}`,
                color: isSaved ? "#ef4444" : "#cccccc", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              <Heart size={14} style={{ fill: isSaved ? "#ef4444" : "none", color: isSaved ? "#ef4444" : "currentColor" }} />
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 24, fontSize: 13, color: "#888" }}>No packages configured yet.</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GigDetail() {
  const { slug: gigId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState<Gig | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [selectedTier, setSelectedTier] = useState<PkgType>("basic");
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [related, setRelated] = useState<FiverCardData[]>([]);

  useEffect(() => {
    if (!gigId) return;
    (async () => {
      const { data: g } = await supabase.from("gigs").select("*").eq("id", gigId).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGig(g as Gig);
      trackRecentlyViewed(g.id);
      supabase.from("gigs").update({ impressions: (g.impressions ?? 0) + 1 }).eq("id", g.id);

      const [{ data: pkgs }, { data: sel }] = await Promise.all([
        supabase.from("gig_packages").select("*").eq("gig_id", g.id),
        supabase.from("profiles").select("*").eq("id", g.seller_id).maybeSingle(),
      ]);
      const order: PkgType[] = ["basic", "standard", "premium"];
      setPackages(((pkgs ?? []) as Pkg[]).sort((a, b) => order.indexOf(a.package_type) - order.indexOf(b.package_type)));
      setSeller(sel as Seller);
      setLoading(false);

      // related gigs
      if (g.category) {
        const { data: rel } = await supabase
          .from("gigs")
          .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,profiles:seller_id(id,username,full_name,avatar_url,total_reviews)")
          .eq("status", "active")
          .ilike("category", `%${g.category}%`)
          .neq("id", g.id)
          .order("average_rating", { ascending: false })
          .limit(4);
        setRelated((rel ?? []).map((r: any) => ({
          id: r.id, title: r.title, thumbnail_url: r.thumbnail_url,
          starting_price: r.starting_price, average_rating: r.average_rating ?? 0,
          total_reviews: r.total_reviews ?? 0, seller: r.profiles ?? null,
        })));
      }

      if (user) {
        const { data: saved } = await supabase.from("saved_gigs")
          .select("id").eq("user_id", user.id).eq("gig_id", g.id).maybeSingle();
        setIsSaved(!!saved);
      }
    })();
  }, [gigId, user]);

  const toggleSave = async () => {
    if (!gig) return;
    const { data: { user: authed } } = await supabase.auth.getUser();
    if (!authed) return nav("/login");
    try {
      if (isSaved) {
        const { error } = await supabase.from("saved_gigs").delete().eq("user_id", authed.id).eq("gig_id", gig.id);
        if (error) throw error;
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        const { error } = await supabase.from("saved_gigs").insert({ user_id: authed.id, gig_id: gig.id });
        if (error) throw error;
        setIsSaved(true);
        toast.success("Saved");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not update saved");
    }
  };

  const contactSeller = async () => {
    if (!user) return nav("/login");
    if (!seller || !gig) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _other: seller.id, _gig_id: gig.id, _order_id: null,
    });
    if (error) return toast.error(error.message);
    nav(`/inbox/${data}`);
  };

  // Loading state
  if (loading) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#888", fontSize: 14 }}>Loading…</span>
        </div>
        <SiteFooter />
      </>
    );
  }

  // Not found
  if (!gig) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>Service not found</h1>
          <Link to="/services" style={{ color: "#16A34A", fontSize: 14 }}>Browse services</Link>
        </div>
        <SiteFooter />
      </>
    );
  }

  const images = [gig.thumbnail_url, ...(gig.gallery_urls ?? [])].filter(Boolean) as string[];
  const sellerName = seller?.full_name ?? seller?.username ?? "Expert";
  const sellerReviews = seller?.total_reviews ?? gig.total_reviews;
  const level = seller ? expertLevel(sellerReviews, gig.average_rating) : null;
  const respTime = formatResponseTime(seller?.response_time_minutes ?? null);
  const catDisplay = (gig.category ?? "").replace(/-/g, " ");

  const tabBtn = (t: Tab, label: string): React.CSSProperties => ({
    padding: "12px 20px", fontSize: 14, fontWeight: tab === t ? 700 : 500,
    color: tab === t ? "#ffffff" : "#888", background: "transparent", border: "none",
    borderBottom: `2px solid ${tab === t ? "#16A34A" : "transparent"}`,
    cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s",
  });

  return (
    <>
      <SEO
        title={gig.title}
        description={(gig.description ?? "").slice(0, 155) || `${gig.title} — starting at $${gig.starting_price}`}
        type="product"
        image={gig.thumbnail_url ?? undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: gig.title,
          description: gig.description,
          image: gig.thumbnail_url,
          offers: { "@type": "Offer", price: gig.starting_price, priceCurrency: "USD", availability: "https://schema.org/InStock" },
          aggregateRating: gig.total_reviews > 0 ? {
            "@type": "AggregateRating", ratingValue: Number(gig.average_rating), reviewCount: gig.total_reviews,
          } : undefined,
        }}
      />
      <SiteHeader />

      <div style={{ background: "#0a0a0a", minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>

          {/* Breadcrumb */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888", marginBottom: 20, flexWrap: "wrap" }}>
            <Link to="/" style={{ color: "#888", textDecoration: "none" }} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}>WeGrow</Link>
            <ChevronRight size={12} />
            <Link to={`/services?category=${encodeURIComponent(catDisplay)}`} style={{ color: "#888", textDecoration: "none", textTransform: "capitalize" }} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}>{catDisplay}</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#cccccc" }}>{gig.title.length > 50 ? gig.title.slice(0, 50) + "…" : gig.title}</span>
          </nav>

          {/* Two-column layout */}
          <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>

            {/* LEFT COLUMN */}
            <div style={{ flex: "0 0 65%", minWidth: 0, maxWidth: "65%" }}>

              {/* Title */}
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", margin: "0 0 16px", lineHeight: 1.3 }}>
                {gig.title}
              </h1>

              {/* Expert info row */}
              {seller && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  <Link to={`/u/${seller.username ?? seller.id}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                    <Avatar src={seller.avatar_url} name={sellerName} size={36} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{sellerName}</span>
                  </Link>
                  {level && <LevelBadge level={level} />}
                  <VerifiedBadge sellerId={seller.id} />
                  {gig.total_reviews > 0 && (
                    <>
                      <span style={{ color: "#2a2a2a" }}>·</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Star size={13} style={{ fill: "#F59E0B", color: "#F59E0B" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{Number(gig.average_rating).toFixed(1)}</span>
                        <span style={{ fontSize: 12, color: "#888" }}>({gig.total_reviews})</span>
                      </div>
                    </>
                  )}
                  {respTime && (
                    <>
                      <span style={{ color: "#2a2a2a" }}>·</span>
                      <span style={{ fontSize: 12, color: "#888" }}>Avg. response: {respTime}</span>
                    </>
                  )}
                  {seller.is_online && (
                    <>
                      <span style={{ color: "#2a2a2a" }}>·</span>
                      <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>● Online</span>
                    </>
                  )}
                </div>
              )}

              {/* Image gallery */}
              <div style={{ marginBottom: 32 }}>
                <div style={{
                  aspectRatio: "16/9", borderRadius: 12, overflow: "hidden",
                  background: "#1a1a1a", marginBottom: 10,
                }}>
                  {images[activeImg] ? (
                    <img src={images[activeImg]} alt={gig.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>No image</div>
                  )}
                </div>
                {images.length > 1 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {images.slice(0, 4).map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: 80, height: 54, borderRadius: 8, overflow: "hidden",
                          border: `2px solid ${i === activeImg ? "#16A34A" : "transparent"}`,
                          padding: 0, cursor: "pointer", background: "#1a1a1a",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: "1px solid #1e1e1e", marginBottom: 28, display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
                <button onClick={() => setTab("overview")} style={tabBtn("overview", "Overview")}>Overview</button>
                <button onClick={() => setTab("about")} style={tabBtn("about", "About Expert")}>About Expert</button>
                <button onClick={() => setTab("reviews")} style={tabBtn("reviews", `Reviews${gig.total_reviews > 0 ? ` (${gig.total_reviews})` : ""}`)}>
                  Reviews{gig.total_reviews > 0 ? ` (${gig.total_reviews})` : ""}
                </button>
              </div>

              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 14 }}>About This Gig</h2>
                  <p style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 24 }}>
                    {gig.description || "The expert hasn't added a description yet."}
                  </p>
                  {(gig.tags ?? []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {gig.tags.map((t) => (
                        <Link
                          key={t}
                          to={`/services?q=${encodeURIComponent(t)}`}
                          style={{
                            fontSize: 12, padding: "4px 12px", borderRadius: 999,
                            border: "1px solid #2a2a2a", color: "#888", textDecoration: "none",
                            transition: "border-color 0.15s, color 0.15s",
                          }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#555"; el.style.color = "#fff"; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#2a2a2a"; el.style.color = "#888"; }}
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABOUT EXPERT TAB */}
              {tab === "about" && seller && (
                <div>
                  {/* Expert header card */}
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24, background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
                    <Link to={`/u/${seller.username ?? seller.id}`}>
                      <Avatar src={seller.avatar_url} name={sellerName} size={64} />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <Link to={`/u/${seller.username ?? seller.id}`} style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", textDecoration: "none" }}>{sellerName}</Link>
                        {level && <LevelBadge level={level} />}
                        <VerifiedBadge sellerId={seller.id} />
                      </div>
                      {gig.total_reviews > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                          <Star size={13} style={{ fill: "#F59E0B", color: "#F59E0B" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{Number(gig.average_rating).toFixed(1)}</span>
                          <span style={{ fontSize: 12, color: "#888" }}>({gig.total_reviews} reviews)</span>
                        </div>
                      )}
                      <button
                        onClick={contactSeller}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                          padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a2a",
                          background: "transparent", color: "#cccccc", cursor: "pointer",
                        }}
                      >
                        <MessageSquare size={13} /> Contact Me
                      </button>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "#1e1e1e", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
                    {[
                      { label: "Member since", value: seller.member_since ? new Date(seller.member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—" },
                      { label: "Avg. response", value: respTime ?? "—" },
                      { label: "Response rate", value: seller.response_rate != null ? `${Number(seller.response_rate).toFixed(0)}%` : "—" },
                      { label: "Orders completed", value: gig.total_orders?.toString() ?? "0" },
                    ].map((s) => (
                      <div key={s.label} style={{ background: "#111111", padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bio */}
                  {seller.bio && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>About</h3>
                      <p style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{seller.bio}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {(seller.seller_skills ?? []).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Skills</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(seller.seller_skills as string[]).map((sk) => (
                          <span key={sk} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid #2a2a2a", color: "#888" }}>{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {(seller.languages ?? []).length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Languages</h3>
                      <p style={{ fontSize: 13, color: "#cccccc" }}>{(seller.languages as string[]).join(", ")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEWS TAB */}
              {tab === "reviews" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                      Reviews {gig.total_reviews > 0 && <span style={{ fontWeight: 400, color: "#888" }}>({gig.total_reviews})</span>}
                    </h2>
                    <ReportDialog targetType="gig" targetId={gig.id} label="Report service" />
                  </div>
                  {gig.total_reviews > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <RatingBreakdown gigId={gig.id} />
                    </div>
                  )}
                  <ReviewsList gigId={gig.id} />
                </div>
              )}

            </div>

            {/* RIGHT COLUMN — sticky */}
            <div style={{ flex: "0 0 35%", maxWidth: "35%", position: "sticky", top: 128, alignSelf: "flex-start" }}>
              {packages.length > 0 ? (
                <PackagePanel
                  packages={packages}
                  gig={gig}
                  selectedTier={selectedTier}
                  onSelectTier={setSelectedTier}
                  isSaved={isSaved}
                  onToggleSave={toggleSave}
                  onContact={contactSeller}
                />
              ) : (
                /* Fallback: single price as Basic */
                <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>Basic</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>${gig.starting_price}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const { data: sess } = await supabase.auth.getUser();
                      if (!sess?.user) { toast.error("Please sign in"); return nav(`/login?redirect=/gig/${gig.id}`); }
                      toast.info("Contact the expert to proceed.");
                      contactSeller();
                    }}
                    style={{
                      width: "100%", padding: "12px 0", borderRadius: 8,
                      background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 15,
                      border: "none", cursor: "pointer", marginBottom: 10,
                    }}
                  >
                    Continue (${gig.starting_price})
                  </button>
                  <button
                    onClick={contactSeller}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 0", borderRadius: 8,
                      background: "transparent", border: "1px solid #2a2a2a",
                      color: "#cccccc", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <MessageSquare size={14} /> Contact Expert
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Related gigs */}
          {related.length > 0 && (
            <div style={{ marginTop: 64 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 20 }}>Related Services</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {related.map((g) => <FiverCard key={g.id} gig={g} />)}
              </div>
            </div>
          )}

        </div>
      </div>

      <SiteFooter />
    </>
  );
}
