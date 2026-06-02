import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { GigCard, GigCardData, GigCardSkeleton } from "@/components/marketplace/GigCard";
import { RiverCommandBar } from "@/components/services/RiverCommandBar";

type Sort = "newest" | "top_rated" | "price_low" | "price_high";

type GigRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
  total_reviews: number;
  category: string | null;
  created_at: string;
  seller_id: string;
  gig_packages: { delivery_days: number }[] | null;
};

type SellerInfo = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

const QUICK_CHIPS = [
  "Voice AI",
  "Chatbot Dev",
  "AI Automation",
  "Prompt Engineering",
  "GoHighLevel",
  "AI Content",
  "AI Agents",
  "Custom AI",
];

export default function Services() {
  const { data: categories } = useCategories();
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>("");
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gigs")
        .select(
          "id,title,thumbnail_url,starting_price,average_rating,total_reviews,category,created_at,seller_id,gig_packages(delivery_days)"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) console.error("Failed to load services", error);
      const rows = (data ?? []) as unknown as GigRow[];
      setGigs(rows);
      const ids = Array.from(new Set(rows.map((r) => r.seller_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", ids);
        const map: Record<string, SellerInfo> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p; });
        setSellers(map);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = gigs;
    if (cat) {
      const needle = cat.toLowerCase();
      list = list.filter((g) =>
        (g.category ?? "").toLowerCase().includes(needle) ||
        g.title.toLowerCase().includes(needle)
      );
    }
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "top_rated") sorted.sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
    if (sort === "price_low") sorted.sort((a, b) => a.starting_price - b.starting_price);
    if (sort === "price_high") sorted.sort((a, b) => b.starting_price - a.starting_price);
    return sorted;
  }, [gigs, cat, sort]);

  const toCard = (g: GigRow): GigCardData => {
    const minDelivery = g.gig_packages?.length
      ? Math.min(...g.gig_packages.map((p) => p.delivery_days))
      : null;
    const s = sellers[g.seller_id];
    return {
      id: g.id,
      title: g.title,
      thumbnail_url: g.thumbnail_url,
      starting_price: g.starting_price,
      average_rating: Number(g.average_rating ?? 0),
      total_reviews: g.total_reviews,
      delivery_days: Number.isFinite(minDelivery as number) ? (minDelivery as number) : null,
      seller: s ? { username: s.username, full_name: s.full_name, avatar_url: s.avatar_url } : null,
    };
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f9f9f9" }}>
      <SEO title="Find AI Experts — Katexs" description="Hire verified AI experts in minutes. Intelligence — not noise." />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container-page pt-10 pb-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Find the perfect AI expert. Hire in minutes.
            </h1>
            <p className="mt-3 text-base md:text-lg text-foreground-muted">
              intelligence — not noise.
            </p>
            <div className="mt-6">
              <RiverCommandBar />
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(cat === c ? "" : c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                    cat === c
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-foreground hover:border-foreground/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filters + Grid */}
        <section className="container-page pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
            <aside className="bg-background border border-border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
              <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-muted mb-3">
                Category
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="cat"
                    checked={cat === ""}
                    onChange={() => setCat("")}
                    className="accent-primary"
                  />
                  <span>All categories</span>
                </label>
                {categories.filter((c) => !c.parent_id).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="cat"
                      checked={cat === c.slug}
                      onChange={() => setCat(c.slug)}
                      className="accent-primary"
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </aside>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {loading ? "Loading…" : `${filtered.length} service${filtered.length === 1 ? "" : "s"}`}
                </h2>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-9 rounded-md bg-background border border-border px-3 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="top_rated">Top Rated</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background p-16 text-center">
                  <h3 className="font-semibold">No services match these filters</h3>
                  <p className="text-sm text-foreground-muted mt-1">
                    Try clearing filters or ask River above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((g) => <GigCard key={g.id} gig={toCard(g)} />)}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
