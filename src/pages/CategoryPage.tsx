import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { supabase } from "@/integrations/supabase/client";

export default function CategoryPage() {
  const { slug } = useParams();
  const [name, setName] = useState("");
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const [{ data: cat }, { data: gigsRes }] = await Promise.all([
        supabase.from("categories").select("name").eq("slug", slug).maybeSingle(),
        supabase.from("gigs").select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
          .eq("status", "active").eq("category", slug).order("total_orders", { ascending: false }).limit(36),
      ]);
      setName(cat?.name ?? slug);
      const ids = [...new Set((gigsRes ?? []).map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setGigs((gigsRes ?? []).map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[]);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-10">
        <nav className="text-sm text-foreground-muted mb-2">
          <Link to="/explore" className="hover:text-foreground">Explore</Link> <span className="mx-1">/</span> <span>{name}</span>
        </nav>
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="text-foreground-muted mt-1">Discover services in {name}.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)
            : gigs.length === 0
              ? <p className="col-span-full text-foreground-muted">No active gigs in this category yet.</p>
              : gigs.map((g) => <GigCard key={g.id} gig={g} />)}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
