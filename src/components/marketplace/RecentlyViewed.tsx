import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import { GigCard, type GigCardData } from "./GigCard";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [gigs, setGigs] = useState<GigCardData[]>([]);

  useEffect(() => {
    (async () => {
      const ids = getRecentlyViewed().filter((id) => id !== excludeId).slice(0, 4);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .in("id", ids)
        .eq("status", "active");
      const sellerIds = [...new Set((data ?? []).map((g) => g.seller_id))];
      const { data: sellers } = sellerIds.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", sellerIds)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      const sorted = ids
        .map((id) => (data ?? []).find((g) => g.id === id))
        .filter(Boolean)
        .map((g: any) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[];
      setGigs(sorted);
    })();
  }, [excludeId]);

  if (gigs.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold mb-6">Recently viewed</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
      </div>
    </section>
  );
}
