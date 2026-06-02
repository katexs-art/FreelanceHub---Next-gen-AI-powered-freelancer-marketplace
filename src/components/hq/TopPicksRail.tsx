import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getRecentlyViewed, getRecentCategories } from "@/lib/recentlyViewed";
import { Button } from "@/components/ui/button";

type Expert = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  primary_category: string | null;
  average_rating: number | null;
};

export function TopPicksRail() {
  const { user } = useAuth();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const cats = new Set<string>(getRecentCategories());

      const gigIds = getRecentlyViewed();
      if (gigIds.length) {
        const { data } = await supabase.from("gigs").select("category").in("id", gigIds);
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

      const list = Array.from(cats);
      let q = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, primary_category, average_rating")
        .eq("seller_status", "approved")
        .order("river_score", { ascending: false, nullsFirst: false })
        .limit(12);
      if (list.length) q = q.in("primary_category", list);

      let { data: rows } = await q;
      if ((rows ?? []).length < 3) {
        const fb = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, primary_category, average_rating")
          .eq("seller_status", "approved")
          .order("river_score", { ascending: false, nullsFirst: false })
          .limit(12);
        rows = fb.data ?? [];
      }
      if (active) setExperts((rows ?? []) as Expert[]);
    })();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (experts.length <= 3) return;
    const t = setInterval(() => setOffset((o) => (o + 3) % experts.length), 30_000);
    return () => clearInterval(t);
  }, [experts.length]);

  const visible = useMemo(() => {
    if (!experts.length) return [];
    const out: Expert[] = [];
    for (let i = 0; i < 3; i++) out.push(experts[(offset + i) % experts.length]);
    return out;
  }, [experts, offset]);

  if (!experts.length) return null;

  return (
    <aside className="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-24 self-start">
      <div className="text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted mb-3">
        Top Picks For You
      </div>
      <div className="space-y-3">
        {visible.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-3 transition-opacity">
            <div className="flex items-center gap-2.5">
              {e.avatar_url ? (
                <img src={e.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                  {(e.full_name ?? e.username ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{e.full_name ?? e.username}</div>
                {e.primary_category && (
                  <div className="text-[11px] text-foreground-muted truncate">{e.primary_category}</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-xs inline-flex items-center gap-1 text-foreground-muted">
                <Star className="h-3 w-3 fill-current text-warning" />
                {e.average_rating ? Number(e.average_rating).toFixed(1) : "New"}
              </span>
              {e.username && (
                <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                  <Link to={`/u/${e.username}`}>View</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
