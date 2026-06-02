import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Gig { id: string; title: string; impressions: number; total_orders: number; status: string; }

export function MyGigsWidget() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("gigs").select("id, title, impressions, total_orders, status").eq("seller_id", user.id).eq("status", "active").order("total_orders", { ascending: false }).limit(4)
      .then(({ data }) => { setGigs((data ?? []) as Gig[]); setLoading(false); });
  }, [user?.id]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (gigs.length === 0) return <p className="text-sm text-foreground-muted">No active gigs. <Link to="/seller/gigs/new" className="text-primary hover:underline">Create one →</Link></p>;
  return (
    <ul className="space-y-2">
      {gigs.map((g) => (
        <li key={g.id}>
          <Link to={`/seller/gigs/${g.id}/edit`} className="flex items-center justify-between text-sm hover:text-primary">
            <span className="font-medium truncate">{g.title}</span>
            <span className="text-xs text-foreground-muted ml-3 shrink-0 tabular-nums">{g.impressions} views · {g.total_orders} orders</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
