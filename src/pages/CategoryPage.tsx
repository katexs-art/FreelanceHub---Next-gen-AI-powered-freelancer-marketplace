import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { EmptyCategoryState } from "@/components/marketplace/EmptyCategoryState";
import { supabase } from "@/integrations/supabase/client";

type Cat = { id: string; name: string; slug: string; parent_id: string | null };

export default function CategoryPage() {
  const { slug } = useParams();
  const [cat, setCat] = useState<Cat | null>(null);
  const [parent, setParent] = useState<Cat | null>(null);
  const [children, setChildren] = useState<Cat[]>([]);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: current } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id")
        .eq("slug", slug)
        .maybeSingle();
      setCat(current ?? null);

      let kids: Cat[] = [];
      let parentCat: Cat | null = null;
      if (current) {
        if (!current.parent_id) {
          const { data: c } = await supabase
            .from("categories")
            .select("id,name,slug,parent_id")
            .eq("parent_id", current.id)
            .eq("is_active", true)
            .order("sort_order");
          kids = (c ?? []) as Cat[];
        } else {
          const { data: p } = await supabase
            .from("categories")
            .select("id,name,slug,parent_id")
            .eq("id", current.parent_id)
            .maybeSingle();
          parentCat = (p ?? null) as Cat | null;
        }
      }
      setChildren(kids);
      setParent(parentCat);

      const filterSlugs = current
        ? (kids.length ? [current.slug, ...kids.map((k) => k.slug)] : [current.slug])
        : [slug];

      const { data: gigsRes } = await supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .eq("status", "active")
        .in("category", filterSlugs)
        .order("total_orders", { ascending: false })
        .limit(48);

      const ids = [...new Set((gigsRes ?? []).map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setGigs((gigsRes ?? []).map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[]);
      setLoading(false);
    })();
  }, [slug]);

  const title = cat?.name ?? slug;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-10">
        <nav className="text-sm text-foreground-muted mb-2">
          <Link to="/explore" className="hover:text-foreground">Explore</Link>
          <span className="mx-1">/</span>
          {parent && (
            <>
              <Link to={`/category/${parent.slug}`} className="hover:text-foreground">{parent.name}</Link>
              <span className="mx-1">/</span>
            </>
          )}
          <span>{title}</span>
        </nav>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-foreground-muted mt-1">Discover services in {title}.</p>

        {children.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {children.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                className="px-4 py-2 rounded-full border border-border-strong hover:border-primary hover:text-primary text-sm transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)}
          </div>
        ) : gigs.length === 0 ? (
          <EmptyCategoryState surface="light" />
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
