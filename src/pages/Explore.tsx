import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { RecentlyViewed } from "@/components/marketplace/RecentlyViewed";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";

export default function Explore() {
  const { data: categories } = useCategories();
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .eq("status", "active")
        .order("total_orders", { ascending: false })
        .limit(24);
      const ids = [...new Set((data ?? []).map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setGigs((data ?? []).map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold">Explore services</h1>
        <p className="text-foreground-muted mt-1">Browse all categories or discover trending gigs.</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {categories.filter((c) => !c.parent_id).map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`}
              className="px-4 py-2 rounded-full border border-border-strong hover:border-primary hover:text-primary text-sm transition-colors">
              {c.name}
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-12 mb-6">Trending right now</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)
            : gigs.length === 0
              ? <p className="text-foreground-muted col-span-full">No gigs published yet.</p>
              : gigs.map((g) => <GigCard key={g.id} gig={g} />)}
        </div>

        <RecentlyViewed />
      </main>
      <SiteFooter />
    </div>
  );
}
