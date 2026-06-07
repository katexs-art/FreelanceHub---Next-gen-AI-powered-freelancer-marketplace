import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Grid2X2, List, Star, ChevronLeft, ChevronRight, X, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { FiverCard, FiverCardSkeleton, FiverCardData } from "@/components/marketplace/FiverCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const CAT_PILLS = [
  { label: "All", slug: "" },
  { label: "GoHighLevel", slug: "gohighlevel" },
  { label: "Voice AI", slug: "voice-ai" },
  { label: "Chat AI", slug: "chat-ai" },
  { label: "AI Automation", slug: "ai-automation" },
  { label: "LLM & AI", slug: "llm-ai" },
  { label: "AI Content", slug: "ai-content" },
  { label: "AI Build Stack", slug: "ai-build-stack" },
  { label: "AI Strategy", slug: "ai-strategy" },
];

const SIDEBAR_CATS = [
  "GoHighLevel",
  "Voice AI",
  "Chat AI",
  "AI Automation",
  "LLM & AI",
  "AI Content",
  "AI Build Stack",
  "AI Strategy",
];

const DELIVERY_OPTS = [
  { label: "Any", value: "" },
  { label: "Up to 24 hrs", value: "1" },
  { label: "Up to 3 days", value: "3" },
  { label: "Up to 7 days", value: "7" },
];

const RATING_OPTS = [
  { label: "Any", value: "" },
  { label: "4★ & up", value: "4" },
  { label: "4.5★ & up", value: "4.5" },
  { label: "5★ only", value: "5" },
];

const LOCATION_OPTS = ["US", "UK", "Canada", "Australia", "Global"];

const SORT_OPTS = [
  { label: "Recommended", value: "recommended" },
  { label: "Best Selling", value: "best_selling" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  cats: string[];
  onCatsChange: (v: string[]) => void;
  minPrice: string;
  maxPrice: string;
  onMinPrice: (v: string) => void;
  onMaxPrice: (v: string) => void;
  delivery: string;
  onDelivery: (v: string) => void;
  rating: string;
  onRating: (v: string) => void;
  locations: string[];
  onLocations: (v: string[]) => void;
  onApply: () => void;
  onClearAll: () => void;
}

function Sidebar({
  cats, onCatsChange, minPrice, maxPrice, onMinPrice, onMaxPrice,
  delivery, onDelivery, rating, onRating, locations, onLocations,
  onApply, onClearAll,
}: SidebarProps) {
  const toggleCat = (c: string) =>
    onCatsChange(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c]);
  const toggleLoc = (l: string) =>
    onLocations(locations.includes(l) ? locations.filter((x) => x !== l) : [...locations, l]);

  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 10,
    paddingBottom: 8, borderBottom: "1px solid #1e1e1e",
  };
  const label: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#cccccc", cursor: "pointer", marginBottom: 8 };
  const inp: React.CSSProperties = {
    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6,
    color: "#ffffff", fontSize: 13, padding: "6px 10px", width: "100%", outline: "none",
  };

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: "#111111", border: "1px solid #1e1e1e",
      borderRadius: 12, padding: 20,
      position: "sticky", top: 128, alignSelf: "flex-start",
      maxHeight: "calc(100vh - 148px)", overflowY: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Filter By</span>
        <button
          onClick={onClearAll}
          style={{ fontSize: 12, color: "#16A34A", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Clear All
        </button>
      </div>

      {/* Category */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>Category</div>
        {SIDEBAR_CATS.map((c) => (
          <label key={c} style={label}>
            <input
              type="checkbox"
              checked={cats.includes(c)}
              onChange={() => toggleCat(c)}
              style={{ accentColor: "#16A34A", width: 14, height: 14 }}
            />
            {c}
          </label>
        ))}
      </div>

      {/* Budget */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>Budget</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number" placeholder="Min $" value={minPrice}
            onChange={(e) => onMinPrice(e.target.value)}
            style={{ ...inp, width: "50%" }}
          />
          <input
            type="number" placeholder="Max $" value={maxPrice}
            onChange={(e) => onMaxPrice(e.target.value)}
            style={{ ...inp, width: "50%" }}
          />
        </div>
      </div>

      {/* Delivery */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>Delivery Time</div>
        {DELIVERY_OPTS.map((d) => (
          <label key={d.value} style={label}>
            <input
              type="radio" name="delivery" value={d.value}
              checked={delivery === d.value}
              onChange={() => onDelivery(d.value)}
              style={{ accentColor: "#16A34A", width: 14, height: 14 }}
            />
            {d.label}
          </label>
        ))}
      </div>

      {/* Rating */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>Expert Rating</div>
        {RATING_OPTS.map((r) => (
          <label key={r.value} style={label}>
            <input
              type="radio" name="rating" value={r.value}
              checked={rating === r.value}
              onChange={() => onRating(r.value)}
              style={{ accentColor: "#16A34A", width: 14, height: 14 }}
            />
            {r.label}
          </label>
        ))}
      </div>

      {/* Location */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionTitle}>Location</div>
        {LOCATION_OPTS.map((l) => (
          <label key={l} style={label}>
            <input
              type="checkbox"
              checked={locations.includes(l)}
              onChange={() => toggleLoc(l)}
              style={{ accentColor: "#16A34A", width: 14, height: 14 }}
            />
            {l}
          </label>
        ))}
      </div>

      <button
        onClick={onApply}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 8,
          background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 14,
          border: "none", cursor: "pointer",
        }}
      >
        Apply Filters
      </button>
    </aside>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────

function ListCard({ gig }: { gig: FiverCardData }) {
  const sellerName = gig.seller?.full_name ?? gig.seller?.username ?? "Expert";
  const initial = sellerName[0]?.toUpperCase() ?? "E";
  return (
    <Link
      to={`/gig/${gig.id}`}
      style={{
        display: "flex", gap: 16, background: "#111111",
        border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden",
        textDecoration: "none", padding: 0,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#1a1a1a"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#111111"; }}
    >
      <div style={{ width: 200, flexShrink: 0, background: "#1a1a1a", aspectRatio: "16/10" }}>
        {gig.thumbnail_url ? (
          <img src={gig.thumbnail_url} alt={gig.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#555" }}>No image</div>
        )}
      </div>
      <div style={{ flex: 1, padding: "14px 16px 14px 0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "#1a1a1a", color: "#888",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: "hidden",
            }}>
              {gig.seller?.avatar_url ? (
                <img src={gig.seller.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : initial}
            </div>
            <span style={{ fontSize: 12, color: "#888" }}>{sellerName}</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0", margin: "0 0 8px", lineHeight: 1.4 }}>{gig.title}</p>
          {gig.total_reviews > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={11} style={{ fill: "#F59E0B", color: "#F59E0B" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>{Number(gig.average_rating).toFixed(1)}</span>
              <span style={{ fontSize: 11, color: "#888" }}>({gig.total_reviews})</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          Starting from <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>${gig.starting_price}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Services() {
  const [params, setParams] = useSearchParams();

  // URL-driven state
  const qParam = params.get("q") ?? "";
  const catParam = params.get("category") ?? "";

  // Local filter state (applied on button click or pill click)
  const [searchInput, setSearchInput] = useState(qParam);
  const [activeCats, setActiveCats] = useState<string[]>(() => catParam ? [catParam] : []);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [delivery, setDelivery] = useState("");
  const [rating, setRating] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [sort, setSort] = useState("recommended");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Applied filters (triggers fetch)
  const [applied, setApplied] = useState({
    q: qParam, cats: catParam ? [catParam] : [] as string[],
    min: "", max: "", delivery: "", rating: "", locations: [] as string[],
    sort: "recommended", page: 1,
  });

  // Results
  const [gigs, setGigs] = useState<FiverCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setApplied((prev) => ({ ...prev, q: v, page: 1 }));
    }, 300);
  };

  // Sync URL category param → activeCats when URL changes
  useEffect(() => {
    if (catParam) {
      const match = SIDEBAR_CATS.find((c) => c.toLowerCase().replace(/\s+/g, "-") === catParam.toLowerCase() || c.toLowerCase().includes(catParam.toLowerCase()));
      if (match) {
        setActiveCats([match]);
        setApplied((prev) => ({ ...prev, cats: [match], page: 1 }));
      } else {
        setActiveCats([catParam]);
        setApplied((prev) => ({ ...prev, cats: [catParam], page: 1 }));
      }
    }
  }, [catParam]);

  // Sync URL q param
  useEffect(() => {
    setSearchInput(qParam);
    setApplied((prev) => ({ ...prev, q: qParam, page: 1 }));
  }, [qParam]);

  const applyFilters = useCallback(() => {
    setApplied({ q: searchInput, cats: activeCats, min: minPrice, max: maxPrice, delivery, rating, locations, sort, page: 1 });
    setPage(1);
  }, [searchInput, activeCats, minPrice, maxPrice, delivery, rating, locations, sort]);

  const clearAll = () => {
    setActiveCats([]); setMinPrice(""); setMaxPrice(""); setDelivery(""); setRating(""); setLocations([]); setSort("recommended");
    setSearchInput(""); setPage(1);
    setApplied({ q: "", cats: [], min: "", max: "", delivery: "", rating: "", locations: [], sort: "recommended", page: 1 });
    setParams(new URLSearchParams());
  };

  const pickCatPill = (slug: string) => {
    const match = slug ? SIDEBAR_CATS.find((c) => c.toLowerCase().replace(/[\s&]+/g, "-").includes(slug) || slug.includes(c.toLowerCase().replace(/[\s&]+/g, "-"))) : undefined;
    const cats = match ? [match] : slug ? [slug] : [];
    setActiveCats(cats);
    setApplied((prev) => ({ ...prev, cats, page: 1 }));
    setPage(1);
  };

  const goPage = (p: number) => {
    setPage(p);
    setApplied((prev) => ({ ...prev, page: p }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = (applied.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,category,seller_id,created_at,total_orders,profiles:seller_id(id,username,full_name,avatar_url,total_reviews)", { count: "exact" })
        .eq("status", "active")
        .range(from, to);

      // Text search
      if (applied.q) {
        q = q.or(`title.ilike.%${applied.q}%,category.ilike.%${applied.q}%`);
      }

      // Category
      if (applied.cats.length) {
        const orParts = applied.cats.map((c) => `category.ilike.%${c}%`).join(",");
        q = q.or(orParts);
      }

      // Price
      if (applied.min) q = q.gte("starting_price", parseInt(applied.min));
      if (applied.max) q = q.lte("starting_price", parseInt(applied.max));

      // Rating
      if (applied.rating) {
        const r = parseFloat(applied.rating);
        if (applied.rating === "5") q = q.gte("average_rating", 4.95);
        else q = q.gte("average_rating", r);
      }

      // Sort
      if (applied.sort === "newest") q = q.order("created_at", { ascending: false });
      else if (applied.sort === "price_asc") q = q.order("starting_price", { ascending: true });
      else if (applied.sort === "price_desc") q = q.order("starting_price", { ascending: false });
      else if (applied.sort === "best_selling") q = q.order("total_orders", { ascending: false });
      else q = q.order("average_rating", { ascending: false }); // recommended

      const { data, count, error } = await q;
      if (error) console.error(error);

      const rows: FiverCardData[] = (data ?? []).map((g: any) => ({
        id: g.id, title: g.title, thumbnail_url: g.thumbnail_url,
        starting_price: g.starting_price,
        average_rating: g.average_rating ?? 0, total_reviews: g.total_reviews ?? 0,
        seller: g.profiles ?? null,
      }));

      // Client-side location filter (no location column on gigs, only on profiles)
      // profiles already joined — filter if needed
      // (location filtering skipped server-side since it's on profiles, not gigs)

      setGigs(rows);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [applied]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activePillSlug = applied.cats.length === 1
    ? CAT_PILLS.find((p) => p.label === applied.cats[0] || applied.cats[0]?.toLowerCase().includes(p.slug))?.slug ?? ""
    : applied.cats.length === 0 ? "" : "__multi__";

  const iconBtn = (active: boolean): React.CSSProperties => ({
    background: active ? "#1e1e1e" : "transparent",
    border: "1px solid " + (active ? "#333" : "transparent"),
    borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: active ? "#fff" : "#888",
    display: "flex", alignItems: "center",
  });

  return (
    <>
      <SEO title="Find AI Experts — KATEXS" description="Browse top-rated AI experts. GoHighLevel, Voice AI, Automation, LLM, and more." />
      <SiteHeader />

      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>

        {/* Category pills */}
        <div style={{ background: "#111111", borderBottom: "1px solid #1e1e1e", overflowX: "auto", scrollbarWidth: "none" }}>
          <style>{`.kx-svc-pills::-webkit-scrollbar{display:none}`}</style>
          <div className="kx-svc-pills" style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto", padding: "0 24px", overflowX: "auto", scrollbarWidth: "none" }}>
            {CAT_PILLS.map((p) => {
              const isActive = p.slug === "" ? activePillSlug === "" : activePillSlug === p.slug || (applied.cats.length === 1 && applied.cats[0] === p.label);
              return (
                <button
                  key={p.slug}
                  onClick={() => pickCatPill(p.slug)}
                  style={{
                    flexShrink: 0, padding: "12px 16px", fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#ffffff" : "#888",
                    background: "transparent", border: "none",
                    borderBottom: `2px solid ${isActive ? "#16A34A" : "transparent"}`,
                    cursor: "pointer", whiteSpace: "nowrap",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page body */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 80px" }}>

          {/* Search bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ position: "relative", maxWidth: 640 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} />
              <input
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="What service are you looking for today?"
                style={{
                  width: "100%", padding: "11px 14px 11px 40px",
                  background: "#111111", border: "1px solid #2a2a2a",
                  borderRadius: 8, color: "#ffffff", fontSize: 14, outline: "none",
                }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#16A34A"; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#2a2a2a"; }}
              />
              {searchInput && (
                <button
                  onClick={() => onSearchChange("")}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileSidebar(true)}
            style={{
              display: "none", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "#111111", border: "1px solid #1e1e1e", borderRadius: 8,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              marginBottom: 16,
            }}
            className="kx-mobile-filter-btn"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
          <style>{`@media(max-width:768px){.kx-mobile-filter-btn{display:flex!important}}`}</style>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

            {/* Sidebar desktop */}
            <div className="kx-sidebar-desktop">
              <Sidebar
                cats={activeCats} onCatsChange={setActiveCats}
                minPrice={minPrice} maxPrice={maxPrice}
                onMinPrice={setMinPrice} onMaxPrice={setMaxPrice}
                delivery={delivery} onDelivery={setDelivery}
                rating={rating} onRating={setRating}
                locations={locations} onLocations={setLocations}
                onApply={applyFilters} onClearAll={clearAll}
              />
            </div>
            <style>{`
              @media(max-width:768px){.kx-sidebar-desktop{display:none}}
            `}</style>

            {/* Mobile sidebar overlay */}
            {mobileSidebar && (
              <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
                <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileSidebar(false)} />
                <div style={{ width: 300, background: "#0a0a0a", overflowY: "auto", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button onClick={() => setMobileSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={20} /></button>
                  </div>
                  <Sidebar
                    cats={activeCats} onCatsChange={setActiveCats}
                    minPrice={minPrice} maxPrice={maxPrice}
                    onMinPrice={setMinPrice} onMaxPrice={setMaxPrice}
                    delivery={delivery} onDelivery={setDelivery}
                    rating={rating} onRating={setRating}
                    locations={locations} onLocations={setLocations}
                    onApply={() => { applyFilters(); setMobileSidebar(false); }}
                    onClearAll={() => { clearAll(); setMobileSidebar(false); }}
                  />
                </div>
              </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 14, color: "#888" }}>
                  {loading ? "Loading…" : <><span style={{ fontWeight: 700, color: "#fff" }}>{total.toLocaleString()}</span> services available</>}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setApplied((prev) => ({ ...prev, sort: e.target.value, page: 1 })); setPage(1); }}
                    style={{
                      background: "#111111", border: "1px solid #2a2a2a", borderRadius: 6,
                      color: "#fff", fontSize: 13, padding: "6px 10px", outline: "none", cursor: "pointer",
                    }}
                  >
                    {SORT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setView("grid")} style={iconBtn(view === "grid")} aria-label="Grid view"><Grid2X2 size={16} /></button>
                    <button onClick={() => setView("list")} style={iconBtn(view === "list")} aria-label="List view"><List size={16} /></button>
                  </div>
                </div>
              </div>

              {/* Grid / List */}
              {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => <FiverCardSkeleton key={i} />)}
                </div>
              ) : gigs.length === 0 ? (
                <div style={{ background: "#111111", border: "1px dashed #2a2a2a", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No services match these filters</p>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Try clearing your filters or searching something else.</p>
                  <button onClick={clearAll} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear All Filters</button>
                </div>
              ) : view === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                  {gigs.map((g) => <FiverCard key={g.id} gig={g} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {gigs.map((g) => <ListCard key={g.id} gig={g} />)}
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 40 }}>
                  <button
                    onClick={() => goPage(page - 1)}
                    disabled={page <= 1}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
                      background: page <= 1 ? "#111" : "#1a1a1a",
                      border: "1px solid #2a2a2a", borderRadius: 8,
                      color: page <= 1 ? "#555" : "#fff", fontSize: 13, cursor: page <= 1 ? "default" : "pointer",
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let p = i + 1;
                    if (totalPages > 7) {
                      const mid = Math.min(Math.max(page, 4), totalPages - 3);
                      const pages = [1, 2, mid - 1, mid, mid + 1, totalPages - 1, totalPages].filter((x, idx, arr) => x >= 1 && x <= totalPages && arr.indexOf(x) === idx).sort((a, b) => a - b);
                      p = pages[i] ?? -1;
                      if (p < 0) return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => goPage(p)}
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: page === p ? "#16A34A" : "#111111",
                          border: `1px solid ${page === p ? "#16A34A" : "#2a2a2a"}`,
                          color: page === p ? "#fff" : "#888",
                          fontSize: 13, fontWeight: page === p ? 700 : 400,
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goPage(page + 1)}
                    disabled={page >= totalPages}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
                      background: page >= totalPages ? "#111" : "#1a1a1a",
                      border: "1px solid #2a2a2a", borderRadius: 8,
                      color: page >= totalPages ? "#555" : "#fff", fontSize: 13,
                      cursor: page >= totalPages ? "default" : "pointer",
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
