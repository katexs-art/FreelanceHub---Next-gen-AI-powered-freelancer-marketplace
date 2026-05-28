import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

type SortKey = "best" | "newest" | "price_asc" | "price_desc" | "rating";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const sort = (params.get("sort") as SortKey) ?? "best";
  const minPrice = params.get("min");
  const maxPrice = params.get("max");
  const minRating = params.get("rating");
  const maxDelivery = params.get("delivery");

  const [input, setInput] = useState(q);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [promoted, setPromoted] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,created_at,total_orders")
        .eq("status", "active");

      if (q) query = query.textSearch("search_vector", q, { type: "websearch", config: "english" });
      if (minPrice) query = query.gte("starting_price", parseInt(minPrice, 10));
      if (maxPrice) query = query.lte("starting_price", parseInt(maxPrice, 10));
      if (minRating) query = query.gte("average_rating", parseFloat(minRating));

      if (sort === "newest") query = query.order("created_at", { ascending: false });
      else if (sort === "price_asc") query = query.order("starting_price", { ascending: true });
      else if (sort === "price_desc") query = query.order("starting_price", { ascending: false });
      else if (sort === "rating") query = query.order("average_rating", { ascending: false });
      else query = query.order("total_orders", { ascending: false });

      const { data } = await query.limit(36);
      const ids = [...new Set((data ?? []).map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      const mapped = (data ?? []).map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[];

      // Promoted: active promotions, exclude already-shown ids
      const { data: proms } = await supabase.from("gig_promotions")
        .select("id, gig_id, gigs:gig_id(id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id)")
        .eq("status", "active").gt("ends_at", new Date().toISOString()).limit(3);
      const pRows = (proms ?? [])
        .filter((p: any) => p.gigs)
        .map((p: any) => ({ ...p.gigs, promotion_id: p.id, seller: byId.get(p.gigs.seller_id) ?? null }));
      const shownIds = new Set(pRows.map((g: any) => g.id));
      setPromoted(pRows);
      setGigs(mapped.filter((g) => !shownIds.has(g.id)));
      setLoading(false);
    })();
  }, [q, sort, minPrice, maxPrice, minRating, maxDelivery]);

  const updateParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title={q ? `${q} — Search` : "Search services"} description="Find AI-native freelancers across design, writing, dev, marketing and more." />
      <SiteHeader />
      <main className="flex-1 container py-10">
        <form onSubmit={(e) => { e.preventDefault(); updateParam("q", input); }}
          className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder='Try "logo design"' className="pl-11 h-12 rounded-full" />
          </div>
          <Button type="submit" size="lg">Search</Button>
        </form>

        <div className="mt-8 flex gap-8">
          <aside className="w-56 shrink-0 hidden md:block space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-sm">Budget</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Min $" value={minPrice ?? ""}
                  onChange={(e) => updateParam("min", e.target.value)} />
                <Input type="number" placeholder="Max $" value={maxPrice ?? ""}
                  onChange={(e) => updateParam("max", e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm">Minimum rating</h3>
              <div className="flex flex-col gap-1.5">
                {[4.5, 4, 3].map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="rating" checked={minRating === String(r)}
                      onChange={() => updateParam("rating", String(r))} />
                    {r}★ & up
                  </label>
                ))}
                {minRating && (
                  <button onClick={() => updateParam("rating", "")} className="text-xs text-foreground-muted hover:text-foreground mt-1 text-left">Clear</button>
                )}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-foreground-muted">
                {loading ? "Searching…" : `${gigs.length} result${gigs.length === 1 ? "" : "s"}${q ? ` for "${q}"` : ""}`}
              </p>
              <select value={sort} onChange={(e) => updateParam("sort", e.target.value)}
                className="h-9 px-3 rounded-full border border-input bg-background text-sm">
                <option value="best">Best selling</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)
                : (promoted.length === 0 && gigs.length === 0)
                  ? <p className="col-span-full text-foreground-muted">No gigs match those filters.</p>
                  : <>
                      {promoted.map((g) => <GigCard key={`p-${g.id}`} gig={g} promoted />)}
                      {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
                    </>}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
