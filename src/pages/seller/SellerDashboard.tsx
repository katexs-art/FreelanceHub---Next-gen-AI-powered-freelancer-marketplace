import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Package, ShoppingBag, Star, TrendingUp } from "lucide-react";

interface Stats {
  active_gigs: number;
  active_orders: number;
  total_earnings: number;
  avg_rating: number;
}

export default function SellerDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ active_gigs: 0, active_orders: 0, total_earnings: 0, avg_rating: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [gigs, orders] = await Promise.all([
        supabase.from("gigs").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", user.id).in("status", ["in_progress","delivered","revision_requested"] as any),
      ]);
      setStats({
        active_gigs: gigs.count ?? 0,
        active_orders: orders.count ?? 0,
        total_earnings: 0,
        avg_rating: 0,
      });
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { icon: Package, label: "Active gigs", value: stats.active_gigs },
    { icon: ShoppingBag, label: "Active orders", value: stats.active_orders },
    { icon: TrendingUp, label: "Earnings", value: `$${stats.total_earnings}` },
    { icon: Star, label: "Avg rating", value: stats.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
            <p className="text-foreground-muted mt-1">Here's an overview of your gigs and orders.</p>
          </div>
          <Link to="/seller/gigs/new"><Button><Plus className="h-4 w-4" /> Create a gig</Button></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-5 rounded-xl border border-border bg-background">
              <Icon className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-2xl font-bold tracking-tight">{loading ? "—" : value}</div>
              <div className="text-xs text-foreground-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        {!loading && stats.active_gigs === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
            <Package className="h-8 w-8 mx-auto text-foreground-subtle mb-3" />
            <h3 className="font-semibold">No gigs yet</h3>
            <p className="text-sm text-foreground-muted mt-1 mb-5">Create your first gig and start receiving orders.</p>
            <Link to="/seller/gigs/new"><Button>Create your first gig</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
