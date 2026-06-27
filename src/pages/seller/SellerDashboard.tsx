import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Package, ShoppingBag, Star, TrendingUp, Eye, Wallet,
  MessageSquare, Edit, ExternalLink, Clock, CheckCircle2, Activity, UserCog,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SellerLevelBadge } from "@/components/marketplace/SellerLevelBadge";
import { computeSellerLevel } from "@/lib/sellerLevel";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  active_gigs: number;
  active_orders: number;
  total_earnings: number;
  total_orders: number;
  completed_orders: number;
  on_time_orders: number;
  avg_rating: number;
  total_reviews: number;
  impressions: number;
  clicks: number;
  orders_last_30d: number;
}

interface ActiveOrder {
  id: string;
  project_title: string | null;
  price: number;
  status: string;
  delivery_deadline: string | null;
  buyer_id: string;
  buyer_name: string | null;
  buyer_avatar: string | null;
  conversation_id?: string;
}

interface GigRow {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  impressions: number;
  total_orders: number;
  average_rating: number;
  total_reviews: number;
}

const ACTIVE_STATUSES = ["in_progress", "delivered", "revision_requested", "active"] as const;

function statusBadgeClass(status: string) {
  switch (status) {
    case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
    case "delivered": return "bg-amber-50 text-amber-700 border-amber-200";
    case "revision_requested": return "bg-orange-50 text-orange-700 border-orange-200";
    case "completed": return "bg-green-50 text-green-700 border-green-200";
    case "pending_payment": return "bg-gray-50 text-gray-700 border-gray-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SellerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<Stats>({
    active_gigs: 0, active_orders: 0, total_earnings: 0, total_orders: 0,
    completed_orders: 0, on_time_orders: 0,
    avg_rating: 0, total_reviews: 0, impressions: 0, clicks: 0, orders_last_30d: 0,
  });
  const [trend, setTrend] = useState<number[]>([]);
  const [earningsTrend, setEarningsTrend] = useState<number[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<{
    charges_enabled: boolean;
    onboarding_complete: boolean;
    available_balance: number;
    pending_balance: number;
    lifetime_earnings: number;
  } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    setIsOnline(!!profile?.is_online);
  }, [profile?.is_online]);

  const load = async () => {
    if (!user) return;
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      gigsCount, activeOrdersList, allGigs, account, recentOrders,
      completedOrders, gigsList,
    ] = await Promise.all([
      supabase.from("gigs").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "active"),
      supabase
        .from("orders")
        .select("id, project_title, price, status, delivery_deadline, buyer_id")
        .eq("seller_id", user.id)
        .in("status", ACTIVE_STATUSES as any)
        .order("delivery_deadline", { ascending: true, nullsFirst: false })
        .limit(10),
      supabase.from("gigs").select("total_orders,total_reviews,average_rating,impressions,clicks").eq("seller_id", user.id),
      supabase.from("seller_accounts").select("lifetime_earnings,available_balance,pending_balance,charges_enabled,onboarding_complete").eq("seller_id", user.id).maybeSingle(),
      supabase.from("orders").select("created_at, seller_earnings").eq("seller_id", user.id).gte("created_at", since30).order("created_at"),
      supabase.from("orders").select("delivered_at, delivery_deadline, status").eq("seller_id", user.id).eq("status", "completed"),
      supabase.from("gigs").select("id,title,thumbnail_url,status,impressions,total_orders,average_rating,total_reviews").eq("seller_id", user.id).order("created_at", { ascending: false }),
    ]);

    const ag = (allGigs.data ?? []) as any[];
    const totalOrders = ag.reduce((s, g) => s + (g.total_orders ?? 0), 0);
    const totalReviews = ag.reduce((s, g) => s + (g.total_reviews ?? 0), 0);
    const weighted = ag.reduce((s, g) => s + Number(g.average_rating ?? 0) * (g.total_reviews ?? 0), 0);
    const avgRating = totalReviews > 0 ? weighted / totalReviews : 0;
    const impressions = ag.reduce((s, g) => s + (g.impressions ?? 0), 0);
    const clicks = ag.reduce((s, g) => s + (g.clicks ?? 0), 0);

    const buckets = new Array(30).fill(0);
    const earnings = new Array(30).fill(0);
    const startMs = Date.now() - 30 * 86400000;
    ((recentOrders.data ?? []) as any[]).forEach((o) => {
      const idx = Math.floor((new Date(o.created_at).getTime() - startMs) / 86400000);
      if (idx >= 0 && idx < 30) {
        buckets[idx]++;
        earnings[idx] += (o.seller_earnings ?? 0);
      }
    });

    const cOrders = (completedOrders.data ?? []) as any[];
    const onTime = cOrders.filter(o => !o.delivery_deadline || !o.delivered_at || new Date(o.delivered_at) <= new Date(o.delivery_deadline)).length;

    // Hydrate buyers
    const orders = (activeOrdersList.data ?? []) as any[];
    const buyerIds = Array.from(new Set(orders.map(o => o.buyer_id)));
    let buyerMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (buyerIds.length) {
      const { data: bp } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", buyerIds);
      (bp ?? []).forEach((p: any) => buyerMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }

    setActiveOrders(orders.map(o => ({
      id: o.id,
      project_title: o.project_title,
      price: o.price,
      status: o.status,
      delivery_deadline: o.delivery_deadline,
      buyer_id: o.buyer_id,
      buyer_name: buyerMap.get(o.buyer_id)?.full_name ?? "Buyer",
      buyer_avatar: buyerMap.get(o.buyer_id)?.avatar_url ?? null,
    })));

    setGigs((gigsList.data ?? []) as GigRow[]);

    setStats({
      active_gigs: gigsCount.count ?? 0,
      active_orders: activeOrdersList.count ?? orders.length,
      total_earnings: Math.round(((account.data as any)?.lifetime_earnings ?? 0) / 100),
      total_orders: totalOrders,
      completed_orders: cOrders.length,
      on_time_orders: onTime,
      avg_rating: avgRating,
      total_reviews: totalReviews,
      impressions,
      clicks,
      orders_last_30d: (recentOrders.data ?? []).length,
    });
    setTrend(buckets);
    setEarningsTrend(earnings);
    setPayouts({
      charges_enabled: !!(account.data as any)?.charges_enabled,
      onboarding_complete: !!(account.data as any)?.onboarding_complete,
      available_balance: Math.round(((account.data as any)?.available_balance ?? 0) / 100),
      pending_balance: Math.round(((account.data as any)?.pending_balance ?? 0) / 100),
      lifetime_earnings: Math.round(((account.data as any)?.lifetime_earnings ?? 0) / 100),
    });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Stripe Connect removed — payment integration coming soon

  const connectPayouts = async () => {
    setConnecting(true);
    try {
      toast("Payment integration coming soon");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setConnecting(false);
    }
  };

  const toggleOnline = async (next: boolean) => {
    if (!user) return;
    setIsOnline(next);
    const { error } = await supabase.from("profiles").update({ is_online: next, last_seen: new Date().toISOString() }).eq("id", user.id);
    if (error) {
      setIsOnline(!next);
      toast.error("Could not update status");
    } else {
      toast.success(next ? "You're online — accepting orders" : "You're offline");
    }
  };

  const toggleGigStatus = async (gig: GigRow) => {
    const next = gig.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("gigs").update({ status: next as any }).eq("id", gig.id);
    if (error) return toast.error("Could not update service");
    setGigs(gs => gs.map(g => g.id === gig.id ? { ...g, status: next } : g));
    toast.success(`Service ${next === "active" ? "activated" : "paused"}`);
  };

  const messageBuyer = async (buyerId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: buyerId });
    if (error || !data) return toast.error("Could not open conversation");
    navigate(`/inbox/${data}`);
  };

  const conversion = useMemo(() => {
    if (!stats.impressions) return 0;
    return Math.round((stats.clicks / stats.impressions) * 100);
  }, [stats]);

  const completionRate = useMemo(() => {
    const total = stats.completed_orders + stats.active_orders;
    if (!total) return 0;
    return Math.round((stats.completed_orders / total) * 100);
  }, [stats]);

  const onTimeRate = useMemo(() => {
    if (!stats.completed_orders) return 0;
    return Math.round((stats.on_time_orders / stats.completed_orders) * 100);
  }, [stats]);

  const level = computeSellerLevel({ orders: stats.total_orders, rating: stats.avg_rating, reviews: stats.total_reviews });
  const maxBucket = Math.max(1, ...earningsTrend, ...trend);
  const maxEarn = Math.max(1, ...earningsTrend);

  if (profile?.seller_status === "onboarding") return <Navigate to="/seller-onboarding" replace />;
  const pending = profile?.seller_status === "pending_approval";
  const rejected = profile?.seller_status === "rejected";
  const approved = profile?.seller_status === "approved";

  useEffect(() => {
    if (!user || !approved) return;
    const key = `katexs:seller-approved-toast:${user.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast.success("You are approved — start selling on Katexs now.");
  }, [user, approved]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const headerStats = [
    { icon: ShoppingBag, label: "Active orders", value: stats.active_orders },
    { icon: TrendingUp, label: "Total earnings", value: `$${stats.total_earnings}` },
    { icon: Star, label: "Avg rating", value: stats.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
    { icon: Activity, label: "Response rate", value: profile?.response_rate != null ? `${profile.response_rate}%` : "—" },
  ];

  return (
    <>
      <SiteHeader showCategories={false} />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {pending && (
          <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-900 p-4 text-sm">
            Your expert application is under review. We will notify you within 24 hours.
          </div>
        )}
        {rejected && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 text-red-900 p-4 text-sm">
            Your application was not approved.{profile?.rejection_reason ? ` ${profile.rejection_reason}` : ""}{" "}
            <Link to="/seller-onboarding" className="underline">Update and resubmit</Link>.
          </div>
        )}
        {approved && payouts && (!payouts.charges_enabled || !payouts.onboarding_complete) && (
          <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-900 p-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Add your payout account to start receiving payments</span>
            <Button onClick={connectPayouts} disabled={connecting} className="bg-black text-white hover:bg-black/90">
              Set Up Payouts
            </Button>
          </div>
        )}

        {/* Welcome header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back{firstName ? `, ${firstName}` : ""}.
              </h1>
              {!loading && <SellerLevelBadge orders={stats.total_orders} rating={stats.avg_rating} reviews={stats.total_reviews} />}
            </div>
            <p className="text-foreground-muted mt-1 text-sm">{today} · Your level: <span className="text-foreground font-medium">{level.label}</span></p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border px-4 py-2 bg-background">
            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-sm font-medium">{isOnline ? "Online · accepting orders" : "Offline"}</span>
            <Switch checked={isOnline} onCheckedChange={toggleOnline} aria-label="Toggle online" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {headerStats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-4 md:p-5 rounded-xl border border-border bg-background">
              <Icon className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-xl md:text-2xl font-bold tracking-tight">{loading ? "—" : value}</div>
              <div className="text-xs text-foreground-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link to="/seller/gigs/new"><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create New Project</Button></Link>
          <Link to="/inbox"><Button size="sm" variant="outline"><MessageSquare className="h-4 w-4 mr-1" /> View Messages</Button></Link>
          <Link to="/seller/earnings"><Button size="sm" variant="outline"><Wallet className="h-4 w-4 mr-1" /> Withdraw Earnings</Button></Link>
          <Link to="/settings/profile"><Button size="sm" variant="outline"><UserCog className="h-4 w-4 mr-1" /> Edit Profile</Button></Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Active orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Active orders</h2>
              <Link to="/orders" className="text-sm text-foreground-muted hover:text-foreground">View all</Link>
            </div>
            {activeOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No active orders"
                message="Share your profile to get started."
                action={profile?.username ? { label: "View my profile", to: `/u/${profile.username}` } : { label: "Create a service", to: "/seller/gigs/new" }}
              />
            ) : (
              <div className="space-y-3">
                {activeOrders.map(o => {
                  const hoursLeft = o.delivery_deadline
                    ? (new Date(o.delivery_deadline).getTime() - Date.now()) / 3600000
                    : null;
                  const urgent = hoursLeft !== null && hoursLeft < 24 && hoursLeft > -9999;
                  return (
                    <div key={o.id} className="p-4 rounded-xl border border-border bg-background">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {o.buyer_avatar ? (
                            <img src={o.buyer_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-foreground/10 grid place-items-center text-sm font-semibold">
                              {initials(o.buyer_name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{o.project_title ?? "Custom project"}</div>
                            <div className="text-xs text-foreground-muted mt-0.5">
                              {o.buyer_name} · ${o.price}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={statusBadgeClass(o.status)}>
                            {o.status.replace(/_/g, " ")}
                          </Badge>
                          {o.delivery_deadline && (
                            <span className={`inline-flex items-center gap-1 text-xs ${urgent ? "text-red-600 font-semibold" : "text-foreground-muted"}`}>
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(o.delivery_deadline), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Link to={`/orders/${o.id}`}>
                          <Button size="sm">Deliver Work</Button>
                        </Link>
                        <Button size="sm" variant="outline" onClick={() => messageBuyer(o.buyer_id)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message Buyer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Earnings */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Earnings</h2>
            <div className="p-5 rounded-xl border border-border bg-background space-y-4">
              <div>
                <div className="text-xs text-foreground-muted">Total earnings</div>
                <div className="text-2xl font-bold">${payouts?.lifetime_earnings ?? 0}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-foreground-muted">Pending</div>
                  <div className="text-lg font-semibold">${payouts?.pending_balance ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-foreground-muted">Available</div>
                  <div className="text-lg font-semibold text-green-700">${payouts?.available_balance ?? 0}</div>
                </div>
              </div>
              {payouts?.charges_enabled ? (
                <Link to="/seller/earnings" className="block">
                  <Button className="w-full"><Wallet className="h-4 w-4 mr-1" /> Withdraw to Bank</Button>
                </Link>
              ) : (
                <Button className="w-full" onClick={connectPayouts} disabled={connecting}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Set up payouts
                </Button>
              )}
              {/* Earnings chart */}
              <div>
                <div className="text-xs text-foreground-muted mb-2">Last 30 days</div>
                <div className="flex items-end gap-0.5 h-16">
                  {earningsTrend.map((v, i) => (
                    <div key={i} className="flex-1 bg-foreground/10 rounded-sm" style={{ height: `${(v / maxEarn) * 100}%`, minHeight: "2px" }}>
                      {v > 0 && <div className="h-full w-full bg-green-500/60 rounded-sm" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gig management */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your services</h2>
            <Link to="/seller/gigs/new"><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Create New Project</Button></Link>
          </div>
          {gigs.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No services yet"
              message="Create your first service and start receiving projects."
              action={{ label: "Create a service", to: "/seller/gigs/new" }}
            />
          ) : (
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-medium text-foreground-muted border-b border-border">
                <div className="col-span-5">Service</div>
                <div className="col-span-1 text-right">Views</div>
                <div className="col-span-1 text-right">Orders</div>
                <div className="col-span-2 text-right">Rating</div>
                <div className="col-span-3 text-right">Status</div>
              </div>
              {gigs.map(g => (
                <div key={g.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-center border-b border-border last:border-0">
                  <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                    {g.thumbnail_url ? (
                      <img src={g.thumbnail_url} alt="" className="h-12 w-16 rounded-md object-cover" />
                    ) : (
                      <div className="h-12 w-16 rounded-md bg-foreground/10 grid place-items-center text-foreground-muted"><Package className="h-4 w-4" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{g.title}</div>
                      <div className="text-xs text-foreground-muted truncate md:hidden">
                        {g.impressions} views · {g.total_orders} orders · {g.average_rating ? `${Number(g.average_rating).toFixed(1)}★` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block md:col-span-1 text-right text-sm">{g.impressions}</div>
                  <div className="hidden md:block md:col-span-1 text-right text-sm">{g.total_orders}</div>
                  <div className="hidden md:block md:col-span-2 text-right text-sm">
                    {g.average_rating ? `${Number(g.average_rating).toFixed(1)}★ (${g.total_reviews})` : "—"}
                  </div>
                  <div className="md:col-span-3 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={g.status === "active"} onCheckedChange={() => toggleGigStatus(g)} />
                      <span className="text-xs text-foreground-muted capitalize">{g.status}</span>
                    </div>
                    <Link to={`/gig/${g.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link>
                    <Link to={`/seller/gigs/${g.id}/edit`}><Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Performance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 md:p-5 rounded-xl border border-border bg-background">
              <CheckCircle2 className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-xl md:text-2xl font-bold">{completionRate}%</div>
              <div className="text-xs text-foreground-muted mt-1">Completion rate</div>
            </div>
            <div className="p-4 md:p-5 rounded-xl border border-border bg-background">
              <Clock className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-xl md:text-2xl font-bold">{onTimeRate}%</div>
              <div className="text-xs text-foreground-muted mt-1">On-time delivery</div>
            </div>
            <div className="p-4 md:p-5 rounded-xl border border-border bg-background">
              <Activity className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-xl md:text-2xl font-bold">
                {profile?.response_time_minutes != null ? formatResponseTime(profile.response_time_minutes) : "—"}
              </div>
              <div className="text-xs text-foreground-muted mt-1">Response time</div>
            </div>
            <div className="p-4 md:p-5 rounded-xl border border-border bg-background">
              <Eye className="h-5 w-5 text-foreground-muted mb-3" />
              <div className="text-xl md:text-2xl font-bold">{stats.impressions.toLocaleString()}</div>
              <div className="text-xs text-foreground-muted mt-1">Profile views</div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
      </div>
    </>
  );
}

function formatResponseTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
