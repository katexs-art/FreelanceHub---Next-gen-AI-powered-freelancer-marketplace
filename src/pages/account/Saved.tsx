import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Saved() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: saved } = await supabase.from("saved_gigs")
        .select("gig_id").eq("user_id", user.id).order("created_at", { ascending: false });
      const ids = (saved ?? []).map((s: any) => s.gig_id);
      if (ids.length === 0) { setGigs([]); setLoading(false); return; }
      const { data: g } = await supabase.from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .in("id", ids).eq("status", "active");
      const sellerIds = [...new Set((g ?? []).map((x: any) => x.seller_id))];
      const { data: sellers } = sellerIds.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", sellerIds)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setGigs((g ?? []).map((x: any) => ({ ...x, seller: byId.get(x.seller_id) ?? null })));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <AppShell>
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold">Saved gigs</h1>
        <p className="text-sm text-foreground-muted mt-1">Gigs you've hearted for later.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)
            : gigs.length === 0
              ? <p className="text-foreground-muted col-span-full text-sm">Nothing saved yet.</p>
              : gigs.map((g) => <GigCard key={g.id} gig={g} />)}
        </div>
      </div>
    </AppShell>
  );
}
