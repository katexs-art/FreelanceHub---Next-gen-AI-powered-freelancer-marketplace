import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getRecentlyViewed, getRecentCategories } from "@/lib/recentlyViewed";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";

export function ExpertsYouMightNeed() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<GigCardData[] | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const cats = new Set<string>(getRecentCategories());

      const viewed = getRecentlyViewed();
      if (viewed.length) {
        const { data } = await supabase.from("gigs").select("category").in("id", viewed);
        for (const g of (data ?? []) as Array<{ category: string | null }>) {
          if (g.category) cats.add(g.category);
        }
      }
      if (user) {
        const { data: orderRows } = await supabase
          .from("orders")
          .select("gigs:gig_id ( category )")
          .eq("buyer_id", user.id)
          .limit(20);
        for (const row of (orderRows ?? []) as any[]) {
          if (row?.gigs?.category) cats.add(row.gigs.category as string);
        }
      }

      const sel =
        "id, title, thumbnail_url, starting_price, average_rating, total_reviews, seller_id";

      let q = supabase
        .from("gigs")
        .select(sel)
        .eq("status", "active")
        .order("average_rating", { ascending: false })
        .order("total_reviews", { ascending: false })
        .limit(12);

      const catList = Array.from(cats);
      if (catList.length) q = q.in("category", catList);

      let { data } = await q;
      if (!data || data.length < 4) {
        const fb = await supabase
          .from("gigs")
          .select(sel)
          .eq("status", "active")
          .order("average_rating", { ascending: false })
          .order("total_reviews", { ascending: false })
          .limit(12);
        data = fb.data ?? [];
      }

      const sellerIds = Array.from(new Set((data ?? []).map((g: any) => g.seller_id))) as string[];
      const { data: sellers } = sellerIds.length
        ? await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", sellerIds)
        : { data: [] as any[] };
      const byId = new Map(((sellers ?? []) as any[]).map((s) => [s.id, s]));
      const enriched = (data ?? []).map((g: any) => ({ ...g, seller: byId.get(g.seller_id) ?? null }));
      if (active) setGigs(enriched as unknown as GigCardData[]);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Experts you might need next</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {gigs == null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="snap-start shrink-0 w-[280px]">
                <GigCardSkeleton />
              </div>
            ))
          : gigs.map((g) => (
              <div key={g.id} className="snap-start shrink-0 w-[280px]">
                <GigCard gig={g} />
              </div>
            ))}
      </div>
    </section>
  );
}
