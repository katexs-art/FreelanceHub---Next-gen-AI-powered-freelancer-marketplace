import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GigCard, type GigCardData } from "@/components/marketplace/GigCard";
import { Eyebrow, HairlineDivider } from "@/components/ui/mono";

interface OrderRow {
  id: string; order_number: string; status: string; price: number; created_at: string;
  gigs: { title: string; thumbnail_url: string | null } | null;
}

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [saved, setSaved] = useState<GigCardData[]>([]);
  const [recs, setRecs] = useState<GigCardData[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, spent: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ord } = await supabase.from("orders")
        .select("id, order_number, status, price, created_at, gigs:gig_id(title, thumbnail_url)")
        .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(8);
      const rows = (ord ?? []) as any as OrderRow[];
      setOrders(rows);

      const { data: all } = await supabase.from("orders")
        .select("status, price").eq("buyer_id", user.id);
      const a = (all ?? []) as Array<{ status: string; price: number }>;
      setStats({
        active: a.filter((o) => !["completed","cancelled","refunded"].includes(o.status)).length,
        completed: a.filter((o) => o.status === "completed").length,
        spent: a.filter((o) => o.status === "completed").reduce((s, o) => s + (o.price ?? 0), 0),
      });

      const { data: sg } = await supabase.from("saved_gigs")
        .select("gigs:gig_id(id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id)")
        .eq("user_id", user.id).limit(4);
      const sgGigs = ((sg ?? []) as any[]).map((r) => r.gigs).filter(Boolean);
      const ids = [...new Set(sgGigs.map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setSaved(sgGigs.map((g: any) => ({ ...g, seller: byId.get(g.seller_id) ?? null })));

      const { data: rec } = await supabase.from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .eq("status", "active").order("total_orders", { ascending: false }).limit(4);
      const rIds = [...new Set((rec ?? []).map((g) => g.seller_id))];
      const { data: rs } = rIds.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", rIds)
        : { data: [] as any };
      const rById = new Map((rs ?? []).map((s: any) => [s.id, s]));
      setRecs(((rec ?? []) as any).map((g: any) => ({ ...g, seller: rById.get(g.seller_id) ?? null })));
    })();
  }, [user?.id]);

  return (
    <AppShell>
      <div className="max-w-6xl space-y-10">
        <div>
          <Eyebrow>Buyer</Eyebrow>
          <h1 className="display-md mt-2">Welcome back</h1>
        </div>

        <div className="grid grid-cols-3 border-hairline divide-x divide-white/[0.08]">
          <div className="p-6">
            <Eyebrow>Active</Eyebrow>
            <div className="mt-2 font-mono tabular-nums text-3xl">{stats.active}</div>
          </div>
          <div className="p-6">
            <Eyebrow>Completed</Eyebrow>
            <div className="mt-2 font-mono tabular-nums text-3xl">{stats.completed}</div>
          </div>
          <div className="p-6">
            <Eyebrow>Lifetime spend</Eyebrow>
            <div className="mt-2 font-mono tabular-nums text-3xl">${stats.spent}</div>
          </div>
        </div>

        <section>
          <div className="flex items-end justify-between mb-4">
            <Eyebrow>Recent orders</Eyebrow>
            <Link to="/buyer/orders" className="text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted hover:text-foreground">View all</Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-foreground-muted">No orders yet. <Link to="/explore" className="underline">Find a gig</Link>.</p>
          ) : (
            <ul className="border-hairline divide-y divide-white/[0.08]">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="w-12 h-12 bg-background-elevated overflow-hidden shrink-0 border-hairline">
                      {o.gigs?.thumbnail_url && <img src={o.gigs.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted">{o.order_number}</div>
                      <div className="text-sm truncate">{o.gigs?.title ?? "—"}</div>
                    </div>
                    <span className="mono-tag">{o.status.replace(/_/g," ")}</span>
                    <div className="font-mono text-sm tabular">${o.price}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {saved.length > 0 && (
          <section>
            <Eyebrow className="mb-4">Saved</Eyebrow>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {saved.map((g) => <GigCard key={g.id} gig={g} />)}
            </div>
          </section>
        )}

        <section>
          <Eyebrow className="mb-4">Recommended</Eyebrow>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recs.map((g) => <GigCard key={g.id} gig={g} />)}
          </div>
        </section>

        <HairlineDivider />
      </div>
    </AppShell>
  );
}
