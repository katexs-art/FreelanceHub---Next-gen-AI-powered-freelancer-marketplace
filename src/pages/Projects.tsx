import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { GigCard, GigCardData, GigCardSkeleton } from "@/components/marketplace/GigCard";

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

export default function Projects() {
  const { data: categories } = useCategories();
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
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
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(needle));
    }
    if (cat) list = list.filter((g) => g.category === cat);
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "top_rated") sorted.sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
    if (sort === "price_low") sorted.sort((a, b) => a.starting_price - b.starting_price);
    if (sort === "price_high") sorted.sort((a, b) => b.starting_price - a.starting_price);
    return sorted;
  }, [gigs, q, cat, sort]);

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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Browse Services</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Discover services offered by approved Experts on Katexs.
          </p>
        </div>

        <div className="mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services by keyword…"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCat("")}
              className={`px-3 py-1.5 rounded-full text-xs border ${cat === "" ? "border-foreground bg-background-subtle" : "border-border"}`}
            >
              All
            </button>
            {categories.filter((c) => !c.parent_id).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`px-3 py-1.5 rounded-full text-xs border ${cat === c.slug ? "border-foreground bg-background-subtle" : "border-border"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-[4px] bg-background border border-border px-3 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="top_rated">Top Rated</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-16 text-center">
            <h3 className="font-semibold">No services available yet</h3>
            <p className="text-sm text-foreground-muted mt-1">
              Check back soon — new services are added every day.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((g) => <GigCard key={g.id} gig={toCard(g)} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
