import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Package, ShoppingBag, Star, TrendingUp, Eye } from "lucide-react";
import { SellerLevelBadge } from "@/components/marketplace/SellerLevelBadge";
import { computeSellerLevel } from "@/lib/sellerLevel";

interface Stats {
  active_gigs: number;
  active_orders: number;
  total_earnings: number;
  total_orders: number;
  avg_rating: number;
  total_reviews: number;
  impressions: number;
  clicks: number;
  orders_last_30d: number;
}

export default function SellerDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    active_gigs: 0, active_orders: 0, total_earnings: 0, total_orders: 0,
    avg_rating: 0, total_reviews: 0, impressions: 0, clicks: 0, orders_last_30d: 0,
  });
  const [trend, setTrend] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [gigs, activeOrders, allGigs, account, recentOrders] = await Promise.all([
        supabase.from("gigs").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", user.id).in("status", ["in_progress","delivered","revision_requested","active"] as any),
        supabase.from("gigs").select("total_orders,total_reviews,average_rating,impressions,clicks").eq("seller_id", user.id),
        supabase.from("seller_accounts").select("lifetime_earnings,available_balance,pending_balance").eq("seller_id", user.id).maybeSingle(),
        supabase.from("orders").select("created_at").eq("seller_id", user.id).gte("created_at", since30).order("created_at"),
      ]);

      const ag = (allGigs.data ?? []) as any[];
      const totalOrders = ag.reduce((s, g) => s + (g.total_orders ?? 0), 0);
      const totalReviews = ag.reduce((s, g) => s + (g.total_reviews ?? 0), 0);
      const weighted = ag.reduce((s, g) => s + Number(g.average_rating ?? 0) * (g.total_reviews ?? 0), 0);
      const avgRating = totalReviews > 0 ? weighted / totalReviews : 0;
      const impressions = ag.reduce((s, g) => s + (g.impressions ?? 0), 0);
      const clicks = ag.reduce((s, g) => s + (g.clicks ?? 0), 0);

      // Build last 30 day trend buckets
      const buckets = new Array(30).fill(0);
      const startMs = Date.now() - 30 * 86400000;
      ((recentOrders.data ?? []) as any[]).forEach((o) => {
        const idx = Math.floor((new Date(o.created_at).getTime() - startMs) / 86400000);
        if (idx >= 0 && idx < 30) buckets[idx]++;
      });

      setStats({
        active_gigs: gigs.count ?? 0,
        active_orders: activeOrders.count ?? 0,
        total_earnings: Math.round(((account.data as any)?.lifetime_earnings ?? 0) / 100),
        total_orders: totalOrders,
        avg_rating: avgRating,
        total_reviews: totalReviews,
        impressions,
        clicks,
        orders_last_30d: (recentOrders.data ?? []).length,
      });
      setTrend(buckets);
      setLoading(false);
    })();
  }, [user]);

  const conversion = useMemo(() => {
    if (!stats.impressions) return 0;
    return Math.round((stats.clicks / stats.impressions) * 100);
  }, [stats]);

  const level = computeSellerLevel({ orders: stats.total_orders, rating: stats.avg_rating, reviews: stats.total_reviews });
  const maxBucket = Math.max(1, ...trend);

  const cards = [
    { icon: Package, label: "Active gigs", value: stats.active_gigs },
    { icon: ShoppingBag, label: "Active orders", value: stats.active_orders },
    { icon: TrendingUp, label: "Lifetime earnings", value: `$${stats.total_earnings}` },
    { icon: Star, label: "Avg rating", value: stats.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
  ];

  if (profile?.seller_status === "onboarding") return <Navigate to="/seller-onboarding" replace />;
  const pending = profile?.seller_status === "pending_approval";
  const rejected = profile?.seller_status === "rejected";

  return (
    <AppShell>
      <div className="max-w-5xl">
        {pending && (
          <div className="mb-6 rounded-xl border border-border bg-background-elevated p-4 text-sm">
            Your application is under review. We will notify you within 24 hours.
          </div>
        )}
        {rejected && (
          <div className="mb-6 rounded-xl border border-border bg-background-elevated p-4 text-sm">
            Your application was not approved.{profile?.rejection_reason ? ` Reason: ${profile.rejection_reason}` : ""}{" "}
            <Link to="/seller-onboarding" className="underline">Update and resubmit</Link>.
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
              {!loading && <SellerLevelBadge orders={stats.total_orders} rating={stats.avg_rating} reviews={stats.total_reviews} />}
            </div>
            <p className="text-foreground-muted mt-1 text-sm">Your level: <span className="text-foreground font-medium">{level.label}</span> · Next: {nextLevelHint(level.level)}</p>
          </div>
          {!pending && !rejected && (
            <Link to="/seller/gigs/new"><Button><Plus className="h-4 w-4" /> Create a gig</Button></Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-5 rounded-xl border border-border bg-background">
              <Icon className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-2xl font-bold tracking-tight">{loading ? "—" : value}</div>
              <div className="text-xs text-foreground-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl border border-border bg-background">
            <Eye className="h-5 w-5 text-foreground-muted mb-3" />
            <div className="text-2xl font-bold">{stats.impressions.toLocaleString()}</div>
            <div className="text-xs text-foreground-muted mt-1">Impressions</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-background">
            <div className="text-2xl font-bold">{stats.clicks.toLocaleString()}</div>
            <div className="text-xs text-foreground-muted mt-1">Clicks</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-background">
            <div className="text-2xl font-bold">{conversion}%</div>
            <div className="text-xs text-foreground-muted mt-1">Click-through rate</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-background mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Orders — last 30 days</h2>
            <span className="text-xs text-foreground-muted">{stats.orders_last_30d} total</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {trend.map((v, i) => (
              <div key={i} className="flex-1 bg-foreground/10 rounded-sm relative" style={{ height: `${(v / maxBucket) * 100}%`, minHeight: "2px" }}>
                {v > 0 && <div className="absolute inset-0 bg-foreground/40 rounded-sm" />}
              </div>
            ))}
          </div>
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

function nextLevelHint(level: string): string {
  if (level === "new") return "10 orders, 4.5★, 5 reviews → Level 1";
  if (level === "level_1") return "50 orders, 4.7★, 25 reviews → Level 2";
  if (level === "level_2") return "100 orders, 4.8★, 50 reviews → Top Rated";
  return "Maintain quality to stay Top Rated";
}
