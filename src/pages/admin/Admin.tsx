import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, ShoppingBag, Wallet, Lock, ChevronDown, ChevronRight,
  UserCircle2, Briefcase, AlertTriangle, DollarSign, BadgeCheck, Flag, Banknote,
  LayoutDashboard, Star, ShieldCheck, MessageSquare, Megaphone, Settings as SettingsIcon,
  Activity, ScrollText, Folder, Sparkles, BarChart3, Bot, RefreshCcw, Bell, Pin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VerificationsQueue } from "@/pages/admin/sections/VerificationsQueue";
import { ReportsQueue } from "@/pages/admin/sections/ReportsQueue";

const dollars = (c: number) => `$${((c ?? 0) / 100).toFixed(2)}`;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

type BuyerAgg = { placed: number; spent: number };
type SellerAgg = { completed: number; cancelled: number; earnings: number };

type NavKey =
  | "overview" | "buyers" | "sellers" | "verifications"
  | "orders" | "projects" | "gigs" | "disputes" | "reviews"
  | "revenue" | "escrow" | "payouts" | "refunds" | "withdrawals"
  | "river" | "river-analytics"
  | "categories" | "announcements" | "featured"
  | "notifications" | "settings" | "audit" | "health" | "reports";


/* ------------- Status badge ------------- */
type StatusVariant =
  | "pending" | "approved" | "active" | "suspended" | "banned" | "disputed"
  | "completed" | "in-progress" | "late" | "funds-locked" | "funds-released"
  | "seller" | "buyer";

function StatusBadge({ variant, label }: { variant: StatusVariant; label?: string }) {
  const text = label ?? variant.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const withLock = variant === "late" || variant === "funds-locked";
  return (
    <span className={`admin-status admin-status-${variant}`}>
      {withLock && <Lock className="h-3 w-3" />}
      {text}
    </span>
  );
}

function orderStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "completed": return "completed";
    case "disputed": return "disputed";
    case "cancelled": return "banned";
    case "active": return "active";
    case "pending": case "pending_payment": case "pending_requirements": return "pending";
    case "delivered": case "in_progress": case "in_revision": return "in-progress";
    case "late": return "late";
    default: return "in-progress";
  }
}

function genericStatusVariant(status: string): StatusVariant {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "approved" || s === "paid" || s === "completed" || s === "cleared" || s === "released") return "active";
  if (s === "pending" || s === "requested" || s === "processing" || s === "pending_approval" || s === "onboarding") return "pending";
  if (s === "in_progress" || s === "in-progress" || s === "open" || s === "delivered" || s === "in_revision") return "in-progress";
  if (s === "completed") return "completed";
  if (s === "disputed") return "disputed";
  if (s === "late" || s === "overdue") return "late";
  if (s === "suspended" || s === "paused") return "suspended";
  if (s === "banned" || s === "rejected" || s === "failed" || s === "cancelled" || s === "refunded") return "banned";
  return "in-progress";
}

function prettyStatus(s: string) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sellerStatusVariant(s: string): StatusVariant {
  if (s === "approved") return "approved";
  if (s === "pending_approval" || s === "pending" || s === "onboarding") return "pending";
  if (s === "suspended") return "suspended";
  if (s === "rejected" || s === "banned") return "banned";
  return "approved";
}

/* ------------- Real-time admin indicators ------------- */
type Indicators = {
  buyersToday: number; pendingSellers: number; pendingVerifications: number;
  activeOrders: number; lateOrders: number; openProjects: number; activeGigs: number;
  openDisputes: number; reviewsToday: number;
  escrowHeld: number; pendingPayouts: number; refundsWeek: number;
  riverSearchesToday: number; riverOpsUnread: number;
  activeCategories: number;
};

function startOfTodayIso() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); }
function weekAgoIso() { return new Date(Date.now() - 7*24*3600*1000).toISOString(); }

function useAdminIndicators(): Indicators {
  const [s, setS] = useState<Indicators>({
    buyersToday: 0, pendingSellers: 0, pendingVerifications: 0,
    activeOrders: 0, lateOrders: 0, openProjects: 0, activeGigs: 0,
    openDisputes: 0, reviewsToday: 0,
    escrowHeld: 0, pendingPayouts: 0, refundsWeek: 0,
    riverSearchesToday: 0, riverOpsUnread: 0, activeCategories: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const recount = async () => {
      const today = startOfTodayIso();
      const week = weekAgoIso();
      const nowIso = new Date().toISOString();
      const lastSeen = localStorage.getItem("river_ops_last_seen") ?? "1970-01-01";
      const [bt, ps, pv, ao, lo, op, ag, od, rt, eh, pp, rw, rs, ro, ac] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").gte("created_at", today),
        supabase.from("seller_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("seller_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["in_progress","delivered","revision_requested","pending_requirements"] as any),
        supabase.from("orders").select("id", { count: "exact", head: true }).lt("delivery_deadline", nowIso).not("status", "in", "(completed,cancelled,refunded)" as any),
        supabase.from("project_posts").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("gigs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("escrow_status", "held"),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "requested"),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("refunded_at", week),
        supabase.from("ai_search_sessions").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("river_ops_conversations").select("id", { count: "exact", head: true }).eq("role", "assistant").gt("created_at", lastSeen),
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      if (cancelled) return;
      setS({
        buyersToday: bt.count ?? 0, pendingSellers: ps.count ?? 0, pendingVerifications: pv.count ?? 0,
        activeOrders: ao.count ?? 0, lateOrders: lo.count ?? 0, openProjects: op.count ?? 0, activeGigs: ag.count ?? 0,
        openDisputes: od.count ?? 0, reviewsToday: rt.count ?? 0,
        escrowHeld: eh.count ?? 0, pendingPayouts: pp.count ?? 0, refundsWeek: rw.count ?? 0,
        riverSearchesToday: rs.count ?? 0, riverOpsUnread: ro.count ?? 0, activeCategories: ac.count ?? 0,
      });
    };
    recount();
    const tables = ["profiles","seller_applications","seller_verifications","orders","project_posts","gigs","disputes","reviews","withdrawals","ai_search_sessions","river_ops_conversations","categories"];
    const ch = supabase.channel("admin-indicators");
    tables.forEach((t) => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: t }, recount));
    ch.subscribe();
    const interval = setInterval(recount, 60_000);
    return () => { cancelled = true; supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  return s;
}

/* ------------- System health (60s) ------------- */
type Health = {
  supabase: { status: "connected"|"down"; latency_ms?: number };
  stripe: { status: "live"|"error"; mode?: "live"|"test" };
  anthropic: { status: "active"|"error" };
  email?: { status: "connected"|"error" };
  last_checked?: string;
} | null;

function useSystemHealth(): Health {
  const [h, setH] = useState<Health>(null);
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const { data } = await supabase.functions.invoke("system-health", { body: {} });
        if (!cancelled && data) setH({ ...data, last_checked: new Date().toISOString() });
      } catch { /* noop */ }
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return h;
}

/* ------------- Sidebar ------------- */
type Dot = "green" | "red" | "yellow" | "blue" | "orange" | null;
type Badge = { value: number; tone: "blue" | "grey" | "red" | "orange" | "yellow" } | null;
type NavItem = { key: NavKey; label: string; icon: any; dot?: Dot; badge?: Badge };

function AdminSidebar({ active, indicators, health }: { active: NavKey; indicators: Indicators; health: Health }) {
  const i = indicators;
  const sections: { label: string; items: NavItem[] }[] = [
    { label: "Overview", items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard, dot: health ? (health.supabase.status === "connected" && health.stripe.status === "live" && health.anthropic.status === "active" ? "green" : "red") : "green" },
    ]},
    { label: "People", items: [
      { key: "buyers", label: "Buyers", icon: UserCircle2, badge: i.buyersToday > 0 ? { value: i.buyersToday, tone: "blue" } : null },
      { key: "sellers", label: "Sellers", icon: Users, dot: i.pendingSellers > 0 ? "yellow" : null },
      { key: "verifications", label: "Verifications", icon: BadgeCheck, badge: i.pendingVerifications > 0 ? { value: i.pendingVerifications, tone: "yellow" } : null },
    ]},
    { label: "Marketplace", items: [
      { key: "orders", label: "Orders", icon: ShoppingBag, dot: i.activeOrders > 0 ? "blue" : null, badge: i.lateOrders > 0 ? { value: i.lateOrders, tone: "red" } : null },
      { key: "projects", label: "Projects and Bids", icon: Briefcase, badge: i.openProjects > 0 ? { value: i.openProjects, tone: "blue" } : null },
      { key: "gigs", label: "Gigs", icon: Folder, badge: { value: i.activeGigs, tone: "grey" } },
      { key: "disputes", label: "Disputes", icon: AlertTriangle, badge: i.openDisputes > 0 ? { value: i.openDisputes, tone: "red" } : null },
      { key: "reviews", label: "Reviews", icon: Star, badge: i.reviewsToday > 0 ? { value: i.reviewsToday, tone: "blue" } : null },
    ]},
    { label: "Money", items: [
      { key: "revenue", label: "Revenue", icon: DollarSign, dot: "green" },
      { key: "escrow", label: "Escrow", icon: Lock, badge: i.escrowHeld > 0 ? { value: i.escrowHeld, tone: "orange" } : null },
      { key: "payouts", label: "Payouts", icon: Banknote, badge: i.pendingPayouts > 0 ? { value: i.pendingPayouts, tone: "blue" } : null },
      { key: "refunds", label: "Refunds", icon: RefreshCcw, badge: i.refundsWeek > 0 ? { value: i.refundsWeek, tone: "grey" } : null },
    ]},
    { label: "River", items: [
      { key: "river", label: "River Controls", icon: Bot, dot: health ? (health.anthropic.status === "active" ? "green" : "red") : "green" },
      { key: "river-analytics", label: "River Analytics", icon: BarChart3, badge: { value: i.riverSearchesToday, tone: "grey" } },
      { key: "river-ops", label: "River Ops Chat", icon: Sparkles, badge: i.riverOpsUnread > 0 ? { value: i.riverOpsUnread, tone: "red" } : null } as any,
    ]},
    { label: "Content", items: [
      { key: "categories", label: "Categories", icon: Folder, badge: { value: i.activeCategories, tone: "grey" } },
      { key: "announcements", label: "Announcements", icon: Megaphone },
      { key: "featured", label: "Featured Sellers", icon: Pin },
    ]},
    { label: "System", items: [
      { key: "notifications", label: "Notifications", icon: Bell },
      { key: "settings", label: "Settings", icon: SettingsIcon },
      { key: "audit", label: "Audit Log", icon: ScrollText },
      { key: "health", label: "System Health", icon: Activity },
    ]},
  ];

  const linkBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    fontSize: 13, color: "#333",
    padding: "10px 16px", borderRadius: 8, marginBottom: 2,
    textDecoration: "none", transition: "background-color 120ms",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#bbb", padding: "8px 20px 4px",
  };

  return (
    <aside style={{
      width: 220, background: "#fff", borderRight: "1px solid #e5e5e5",
      position: "sticky", top: 0, alignSelf: "flex-start",
      height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      <div style={{ padding: "18px 20px 8px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: "-0.01em" }}>KATEXS</div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", marginTop: 2 }}>Admin Panel</div>
      </div>

      <nav style={{ flex: 1, padding: "4px 8px 12px", overflowY: "auto" }}>
        {sections.map((sec) => (
          <div key={sec.label}>
            <div style={labelStyle}>{sec.label}</div>
            {sec.items.map((it) => {
              const Icon = it.icon;
              const to = it.key === "overview" ? "/admin" : `/admin/${it.key}`;
              const isActive = active === it.key;
              return (
                <NavLink
                  key={it.key as string}
                  to={to}
                  end={it.key === "overview"}
                  style={({ isActive: a }) => ({
                    ...linkBase,
                    background: (a || isActive) ? "#000" : "transparent",
                    color: (a || isActive) ? "#fff" : "#333",
                  })}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.badge && <NavBadge tone={it.badge.tone} value={it.badge.value} active={isActive} />}
                  {it.dot && <NavDot color={it.dot} />}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <HealthStrip health={health} />
    </aside>
  );
}

function NavDot({ color }: { color: Exclude<Dot, null> }) {
  const c = { green: "#10b981", red: "#ef4444", yellow: "#eab308", blue: "#3b82f6", orange: "#f97316" }[color];
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: c, display: "inline-block" }} />;
}

function NavBadge({ tone, value, active }: { tone: "blue"|"grey"|"red"|"orange"|"yellow"; value: number; active: boolean }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    blue: { bg: "#dbeafe", fg: "#1e40af" },
    grey: { bg: "#f1f1f1", fg: "#555" },
    red: { bg: "#fee2e2", fg: "#991b1b" },
    orange: { bg: "#ffedd5", fg: "#9a3412" },
    yellow: { bg: "#fef3c7", fg: "#92400e" },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: active ? "rgba(255,255,255,0.16)" : t.bg,
      color: active ? "#fff" : t.fg,
      fontSize: 10, fontWeight: 600,
      padding: "2px 6px", borderRadius: 999, minWidth: 18, textAlign: "center",
    }}>{value}</span>
  );
}

function HealthStrip({ health }: { health: Health }) {
  const items = [
    { label: "Supabase", ok: !!health && health.supabase.status === "connected", okLabel: "Connected", badLabel: "Disconnected", warn: false },
    { label: "Stripe", ok: !!health && health.stripe.status === "live", okLabel: health?.stripe?.mode === "live" ? "Live" : "Test", badLabel: "Error", warn: health?.stripe?.mode !== "live" },
    { label: "Anthropic", ok: !!health && health.anthropic.status === "active", okLabel: "Active", badLabel: "Error", warn: false },
  ];
  return (
    <div style={{ borderTop: "1px solid #e5e5e5", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#666" }}>
          <span style={{
            width: 7, height: 7, borderRadius: 999,
            background: it.ok ? (it.warn ? "#eab308" : "#10b981") : "#ef4444",
          }} />
          <span style={{ fontWeight: 600 }}>{it.label}</span>
          <span style={{ color: "#999" }}>{it.ok ? it.okLabel : it.badLabel}</span>
        </div>
      ))}
    </div>
  );
}


/* ============================================================
   Admin page
   ============================================================ */
export default function Admin() {
  const { profile } = useAuth();
  const params = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const active = (params.section ?? "overview") as NavKey;
  const setActive = (k: NavKey) => navigate(k === "overview" ? "/admin" : `/admin/${k}`);
  const indicators = useAdminIndicators();
  const health = useSystemHealth();

  // (River Ops is a separate route /admin/river-ops; "last seen" updated there.)



  const [stats, setStats] = useState({ users: 0, gigs: 0, orders: 0, gmv: 0 });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [applications, setApplications] = useState<Record<string, any>>({});
  const [buyerAggs, setBuyerAggs] = useState<Record<string, BuyerAgg>>({});
  const [sellerAggs, setSellerAggs] = useState<Record<string, SellerAgg>>({});
  const [sellerAccts, setSellerAccts] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [revenueRows, setRevenueRows] = useState<any[]>([]);

  const [notifyUser, setNotifyUser] = useState<{ id: string; name: string } | null>(null);
  const [rejectSeller, setRejectSeller] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    const [u, g, o, gmv, buyersRes, sellersRes, oList, wList, dList, allOrders, acctsRes, appsRes, revRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("gigs").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("price").eq("status", "completed"),
      supabase.from("profiles")
        .select("id, full_name, username, email, avatar_url, suspended_at, created_at, last_seen, role")
        .eq("role", "client").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles")
        .select("id, full_name, username, email, avatar_url, suspended_at, created_at, last_seen, role, seller_status, river_score, rejection_reason, application_submitted_at")
        .eq("role", "seller").order("created_at", { ascending: false }).limit(300),
      supabase.from("orders").select("id, order_number, status, price, escrow_status, created_at, buyer:buyer_id(username), seller:seller_id(username)").order("created_at", { ascending: false }).limit(50),
      supabase.from("withdrawals").select("id, amount, status, created_at, method, failure_reason, seller_id, seller:seller_id(username, full_name)").order("created_at", { ascending: false }).limit(25),
      supabase.from("disputes").select("id, status, reason, created_at, order_id, order:order_id(escrow_status, status)").order("created_at", { ascending: false }).limit(25),
      supabase.from("orders").select("buyer_id, seller_id, status, price, seller_earnings"),
      supabase.from("seller_accounts").select("seller_id, lifetime_earnings, available_balance, pending_balance, payouts_enabled, onboarding_complete"),
      supabase.from("seller_applications").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("orders").select("platform_fee, completed_at").eq("status", "completed").not("completed_at", "is", null),
    ]);
    setStats({
      users: u.count ?? 0, gigs: g.count ?? 0, orders: o.count ?? 0,
      gmv: (gmv.data ?? []).reduce((s: number, r: any) => s + r.price, 0),
    });
    setBuyers(buyersRes.data ?? []);
    setSellers(sellersRes.data ?? []);
    setOrders(oList.data ?? []);
    setWithdrawals(wList.data ?? []);
    setDisputes(dList.data ?? []);
    setRevenueRows(revRes.data ?? []);

    const appMap: Record<string, any> = {};
    for (const a of (appsRes.data ?? []) as any[]) appMap[a.seller_id] = a;
    setApplications(appMap);

    const bAgg: Record<string, BuyerAgg> = {};
    const sAgg: Record<string, SellerAgg> = {};
    for (const row of (allOrders.data ?? []) as any[]) {
      if (row.buyer_id) {
        const a = (bAgg[row.buyer_id] ||= { placed: 0, spent: 0 });
        a.placed += 1;
        if (row.status === "completed") a.spent += row.price ?? 0;
      }
      if (row.seller_id) {
        const a = (sAgg[row.seller_id] ||= { completed: 0, cancelled: 0, earnings: 0 });
        if (row.status === "completed") { a.completed += 1; a.earnings += row.seller_earnings ?? 0; }
        if (row.status === "cancelled") a.cancelled += 1;
      }
    }
    setBuyerAggs(bAgg);
    setSellerAggs(sAgg);

    const acctMap: Record<string, any> = {};
    for (const a of (acctsRes.data ?? []) as any[]) acctMap[a.seller_id] = a;
    setSellerAccts(acctMap);
  };
  useEffect(() => { load(); }, []);

  const updateWithdrawal = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("withdrawals").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`); load();
  };

  const processStripePayout = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("stripe-payout", { body: { withdrawal_id: id } });
    if (error || data?.error) return toast.error(error?.message || data?.error || "Payout failed");
    toast.success(data?.manual ? `Send manually to ${data.paypal_email}` : "Payout sent via Stripe");
    load();
  };

  const refundOrder = async (orderId: string, disputeId?: string) => {
    const { data, error } = await supabase.functions.invoke("stripe-refund", { body: { order_id: orderId } });
    if (error || data?.error) return toast.error(error?.message || data?.error || "Refund failed");
    await supabase.from("orders").update({ escrow_status: "refunded" }).eq("id", orderId);
    if (disputeId) {
      await supabase.from("disputes").update({
        status: "resolved_refund", resolution_outcome: "refunded", resolved_at: new Date().toISOString(),
      }).eq("id", disputeId);
    }
    toast.success("Refund issued");
    load();
  };

  const releaseToSeller = async (orderId: string, disputeId: string) => {
    const nowIso = new Date().toISOString();
    const { error: oe } = await supabase.from("orders").update({
      status: "completed", completed_at: nowIso,
      escrow_status: "released", escrow_released_at: nowIso,
    }).eq("id", orderId);
    if (oe) return toast.error(oe.message);
    await supabase.from("transactions").update({ status: "cleared", clears_at: nowIso })
      .eq("order_id", orderId).eq("type", "seller_credit").eq("status", "pending");
    await supabase.from("disputes").update({
      status: "resolved_release", resolution_outcome: "released", resolved_at: nowIso,
    }).eq("id", disputeId);
    toast.success("Released to seller — transfer will be sent shortly");
    load();
  };

  const suspendUser = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}? They will lose access until reinstated.`)) return;
    const { error } = await supabase.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account suspended"); load();
  };
  const banUser = async (id: string, name: string) => {
    if (!confirm(`Ban ${name}? This blocks all access.`)) return;
    const { error } = await supabase.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account banned"); load();
  };
  const approveSeller = async (id: string) => {
    const { error } = await supabase.rpc("approve_seller", { _seller: id });
    if (error) return toast.error(error.message);
    toast.success("Seller approved"); load();
  };
  const submitReject = async (reason: string) => {
    if (!rejectSeller) return;
    const { error } = await supabase.rpc("reject_seller", { _seller: rejectSeller.id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Seller rejected"); setRejectSeller(null); load();
  };
  const submitNotification = async (title: string, body: string) => {
    if (!notifyUser) return;
    const { error } = await supabase.from("notifications").insert({
      user_id: notifyUser.id, type: "system", title, body,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Notification sent"); setNotifyUser(null);
  };

  if (profile && profile.role !== "admin") {
    return <AppShell><div className="text-sm">Admin access required.</div></AppShell>;
  }

  // Sort sellers: pending applications first
  const sortedSellers = useMemo(() => {
    const arr = [...sellers];
    arr.sort((a, b) => {
      const ap = a.seller_status === "pending_approval" ? 0 : 1;
      const bp = b.seller_status === "pending_approval" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [sellers]);

  return (
    <AppShell>
      <div className="flex items-stretch -mx-4 -my-4" style={{ minHeight: "calc(100vh - 64px)" }}>
        <AdminSidebar active={active} indicators={indicators} health={health} />

        <div className="flex-1 min-w-0 p-6 bg-background">
          <header className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{sectionTitle(active)}</h1>
              <p className="text-sm text-foreground-muted mt-1">{sectionSubtitle(active)}</p>
            </div>
            <a href="/admin/river-ops" className="text-sm font-mono uppercase tracking-[0.14em] border-hairline rounded px-3 py-2 hover:bg-white/[0.03] transition-colors">
              River Ops →
            </a>
          </header>

          {active === "overview" && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-4 gap-4">
                <Stat icon={Users} label="Users" value={stats.users.toString()} />
                <Stat icon={ShoppingBag} label="Gigs" value={stats.gigs.toString()} />
                <Stat icon={Wallet} label="Orders" value={stats.orders.toString()} />
                <Stat icon={Wallet} label="GMV" value={dollars(stats.gmv)} />
              </div>
              <OverviewPanel indicators={indicators} health={health} />
            </div>
          )}

          {active === "buyers" && (
            <BuyersTable
              rows={buyers}
              aggs={buyerAggs}
              onNotify={(u) => setNotifyUser({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
              onSuspend={(u) => suspendUser(u.id, u.full_name ?? u.username ?? u.email)}
              onBan={(u) => banUser(u.id, u.full_name ?? u.username ?? u.email)}
            />
          )}

          {active === "sellers" && (
            <SellersTable
              rows={sortedSellers}
              applications={applications}
              aggs={sellerAggs}
              accts={sellerAccts}
              onNotify={(u) => setNotifyUser({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
              onSuspend={(u) => suspendUser(u.id, u.full_name ?? u.username ?? u.email)}
              onBan={(u) => banUser(u.id, u.full_name ?? u.username ?? u.email)}
              onApprove={(u) => approveSeller(u.id)}
              onReject={(u) => setRejectSeller({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
            />
          )}

          {active === "orders" && (
            <Table headers={["Order", "Buyer", "Seller", "Amount", "Status", "Funds", "Date"]}>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">{o.buyer?.username ?? "—"}</td>
                  <td className="p-3">{o.seller?.username ?? "—"}</td>
                  <td className="p-3 font-medium">{dollars(o.price)}</td>
                  <td className="p-3"><StatusBadge variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} /></td>
                  <td className="p-3">
                    {o.status === "disputed" || o.escrow_status === "held"
                      ? <StatusBadge variant="funds-locked" label="Funds Locked" />
                      : o.escrow_status === "released"
                        ? <StatusBadge variant="funds-released" label="Funds Released" />
                        : <span className="text-xs text-foreground-muted">—</span>}
                  </td>
                  <td className="p-3 text-foreground-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </Table>
          )}

          {active === "revenue" && <RevenuePanel rows={revenueRows} />}

          {active === "withdrawals" && (
            <Table headers={["Seller", "Method", "Amount", "Status", "Requested", "Actions"]}>
              {withdrawals.map((w) => {
                const v: StatusVariant = w.status === "paid" ? "completed" : w.status === "failed" ? "banned" : "in-progress";
                return (
                  <tr key={w.id} className="border-t border-border">
                    <td className="p-3">{w.seller?.full_name ?? w.seller?.username ?? "—"}</td>
                    <td className="p-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-background-elevated capitalize">
                        {w.method?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{dollars(w.amount)}</td>
                    <td className="p-3" title={w.failure_reason ?? ""}><StatusBadge variant={v} label={w.status.charAt(0).toUpperCase() + w.status.slice(1)} /></td>
                    <td className="p-3 text-foreground-muted">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="p-3 flex gap-1.5">
                      {(w.status === "requested" || w.status === "processing") && (
                        <Button size="sm" onClick={() => processStripePayout(w.id)}>Pay out</Button>
                      )}
                      {(w.status === "requested" || w.status === "processing") && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateWithdrawal(w.id, "paid")}>Mark paid</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateWithdrawal(w.id, "failed")}>Fail</Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          {active === "disputes" && (
            <Table headers={["Order", "Reason", "Status", "Funds", "Opened", "Actions"]}>
              {disputes.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-foreground-muted">No disputes.</td></tr>}
              {disputes.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{d.order_id.slice(0, 8)}</td>
                  <td className="p-3 max-w-md truncate">{d.reason}</td>
                  <td className="p-3">
                    {d.status === "open"
                      ? <StatusBadge variant="disputed" label="Open" />
                      : <StatusBadge variant="completed" label={d.status.replace(/_/g, " ")} />}
                  </td>
                  <td className="p-3">
                    {d.order?.escrow_status === "held"
                      ? <StatusBadge variant="funds-locked" label="Funds Locked" />
                      : <span className="text-xs text-foreground-muted">—</span>}
                  </td>
                  <td className="p-3 text-foreground-muted">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1.5">
                    {d.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => refundOrder(d.order_id, d.id)}>Refund buyer</Button>
                        <Button size="sm" variant="ghost" onClick={() => releaseToSeller(d.order_id, d.id)}>Release to seller</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}

          {active === "verifications" && <VerificationsQueue />}
          {active === "reports" && <ReportsQueue />}

          {active === "escrow" && <EscrowPanel />}
          {active === "payouts" && <PayoutsPanel />}
          {active === "refunds" && <RefundsPanel />}
          {active === "reviews" && <ReviewsPanel />}
          {active === "gigs" && <GigsPanel />}
          {active === "projects" && <ProjectsPanel />}
          {active === "featured" && <FeaturedSellersPanel />}
          {active === "announcements" && <AnnouncementsPanel />}
          {active === "river" && <RiverControlsPanel health={health} />}
          {active === "river-analytics" && <RiverAnalyticsPanel />}
          {active === "categories" && <CategoriesPanel />}
          {active === "notifications" && <NotificationsComposerPanel />}
          {active === "settings" && <SettingsPanel />}
          {active === "audit" && <AuditLogPanel />}
          {active === "health" && <SystemHealthPanel health={health} />}
        </div>
      </div>


      <SendNotificationDialog
        target={notifyUser}
        onClose={() => setNotifyUser(null)}
        onSubmit={submitNotification}
      />
      <RejectSellerDialog
        target={rejectSeller}
        onClose={() => setRejectSeller(null)}
        onSubmit={submitReject}
      />
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs text-foreground-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-background-elevated text-xs text-foreground-muted">
          <tr>{headers.map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return url ? (
    <img src={url} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="h-8 w-8 rounded-full bg-background-elevated flex items-center justify-center text-xs text-foreground-muted">{initial}</div>
  );
}

function viewProfileHref(u: any) {
  return u.username ? `/u/${u.username}` : `/`;
}

/* ---------------- Revenue ---------------- */
function RevenuePanel({ rows }: { rows: any[] }) {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let total = 0, today = 0, month = 0;
  for (const r of rows) {
    const fee = r.platform_fee ?? 0;
    total += fee;
    const dt = r.completed_at ? new Date(r.completed_at) : null;
    if (dt && dt >= startOfDay) today += fee;
    if (dt && dt >= startOfMonth) month += fee;
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={DollarSign} label="Revenue today" value={dollars(today)} />
        <Stat icon={DollarSign} label="Revenue this month" value={dollars(month)} />
        <Stat icon={DollarSign} label="Lifetime revenue" value={dollars(total)} />
      </div>
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="text-xs text-foreground-muted">Revenue = platform fees collected on completed orders.</div>
      </div>
    </div>
  );
}

/* ---------------- Buyers ---------------- */

function BuyersTable({
  rows, aggs, onNotify, onSuspend, onBan,
}: {
  rows: any[]; aggs: Record<string, BuyerAgg>;
  onNotify: (u: any) => void; onSuspend: (u: any) => void; onBan: (u: any) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const headers = ["", "", "Name", "Email", "Status", "Member Since", "Orders", "Spent", "Last Active", "Actions"];
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-background-elevated text-xs text-foreground-muted">
          <tr>{headers.map((h, i) => <th key={i} className="text-left p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} className="p-6 text-center text-sm text-foreground-muted">No buyers.</td></tr>}
          {rows.map((u) => {
            const a = aggs[u.id] ?? { placed: 0, spent: 0 };
            const isOpen = expanded === u.id;
            return (
              <Fragment key={u.id}>
                <tr className="border-t border-border cursor-pointer hover:bg-background-elevated/50" onClick={() => setExpanded(isOpen ? null : u.id)}>
                  <td className="p-3 w-6">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                  <td className="p-3"><Avatar url={u.avatar_url} name={u.full_name ?? u.username} /></td>
                  <td className="p-3">{u.full_name ?? u.username ?? "—"}</td>
                  <td className="p-3 text-foreground-muted">{u.email}</td>
                  <td className="p-3">{u.suspended_at ? <StatusBadge variant="suspended" /> : <StatusBadge variant="approved" label="Active" />}</td>
                  <td className="p-3 text-foreground-muted">{fmtDate(u.created_at)}</td>
                  <td className="p-3 font-medium">{a.placed}</td>
                  <td className="p-3 font-medium">{dollars(a.spent)}</td>
                  <td className="p-3 text-foreground-muted">{fmtDateTime(u.last_seen)}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button size="sm" variant="ghost" asChild><a href={viewProfileHref(u)} target="_blank" rel="noreferrer">View</a></Button>
                      <Button size="sm" variant="ghost" onClick={() => onNotify(u)}>Notify</Button>
                      <Button size="sm" variant="ghost" onClick={() => onSuspend(u)}>Suspend</Button>
                      <Button size="sm" variant="destructive" onClick={() => onBan(u)}>Ban</Button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-border bg-background-elevated/30">
                    <td colSpan={headers.length} className="p-0">
                      <BuyerDetail buyerId={u.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BuyerDetail({ buyerId }: { buyerId: string }) {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [msgCount, setMsgCount] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [o, m, r, s] = await Promise.all([
        supabase.from("orders").select("id, order_number, price, status, created_at, seller:seller_id(username)").eq("buyer_id", buyerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", buyerId),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("buyer_id", buyerId).eq("reviewer_role", "buyer"),
        supabase.from("saved_gigs").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
      ]);
      setOrders(o.data ?? []);
      setMsgCount(m.count ?? 0);
      setReviewCount(r.count ?? 0);
      setSavedCount(s.count ?? 0);
    })();
  }, [buyerId]);

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <MiniStat label="Messages Sent" value={msgCount?.toString() ?? "…"} />
        <MiniStat label="Reviews Left" value={reviewCount?.toString() ?? "…"} />
        <MiniStat label="Saved Gigs" value={savedCount?.toString() ?? "…"} />
      </div>
      <div>
        <div className="text-xs font-semibold mb-2 text-foreground-muted">Order History</div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-background-elevated text-foreground-muted">
              <tr><th className="text-left p-2">Order</th><th className="text-left p-2">Seller</th><th className="text-left p-2">Amount</th><th className="text-left p-2">Status</th><th className="text-left p-2">Date</th></tr>
            </thead>
            <tbody>
              {(orders ?? []).length === 0 && <tr><td colSpan={5} className="p-3 text-center text-foreground-muted">{orders === null ? "Loading…" : "No orders."}</td></tr>}
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-2 font-mono">{o.order_number}</td>
                  <td className="p-2">{o.seller?.username ?? "—"}</td>
                  <td className="p-2">{dollars(o.price)}</td>
                  <td className="p-2"><StatusBadge variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} /></td>
                  <td className="p-2 text-foreground-muted">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sellers ---------------- */

function SellersTable({
  rows, applications, aggs, accts, onNotify, onSuspend, onBan, onApprove, onReject,
}: {
  rows: any[]; applications: Record<string, any>; aggs: Record<string, SellerAgg>; accts: Record<string, any>;
  onNotify: (u: any) => void; onSuspend: (u: any) => void; onBan: (u: any) => void;
  onApprove: (u: any) => void; onReject: (u: any) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const headers = ["", "", "Name", "Email", "Status", "River", "Member Since", "Completed", "Earned", "Completion", "Last Active", "Actions"];
  return (
    <div className="bg-background border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[1100px]">
        <thead className="bg-background-elevated text-xs text-foreground-muted">
          <tr>{headers.map((h, i) => <th key={i} className="text-left p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} className="p-6 text-center text-sm text-foreground-muted">No sellers.</td></tr>}
          {rows.map((u) => {
            const a = aggs[u.id] ?? { completed: 0, cancelled: 0, earnings: 0 };
            const acct = accts[u.id];
            const earned = acct?.lifetime_earnings ?? a.earnings;
            const denom = a.completed + a.cancelled;
            const rate = denom === 0 ? null : Math.round((a.completed / denom) * 100);
            const isOpen = expanded === u.id;
            const sellerStatus = u.seller_status ?? "approved";
            const app = applications[u.id];
            const isPending = sellerStatus === "pending_approval";
            return (
              <Fragment key={u.id}>
                <tr className="border-t border-border cursor-pointer hover:bg-background-elevated/50" onClick={() => setExpanded(isOpen ? null : u.id)}>
                  <td className="p-3 w-6">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                  <td className="p-3"><Avatar url={u.avatar_url} name={u.full_name ?? u.username} /></td>
                  <td className="p-3">{u.full_name ?? u.username ?? "—"}{u.suspended_at && <span className="ml-2"><StatusBadge variant="suspended" /></span>}</td>
                  <td className="p-3 text-foreground-muted">{u.email}</td>
                  <td className="p-3"><StatusBadge variant={sellerStatusVariant(sellerStatus)} label={isPending ? "Pending" : sellerStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} /></td>
                  <td className="p-3 font-mono text-xs">{u.river_score ?? "—"}</td>
                  <td className="p-3 text-foreground-muted">{fmtDate(u.created_at)}</td>
                  <td className="p-3 font-medium">{a.completed}</td>
                  <td className="p-3 font-medium">{dollars(earned)}</td>
                  <td className="p-3">{rate === null ? "—" : `${rate}%`}</td>
                  <td className="p-3 text-foreground-muted">{fmtDateTime(u.last_seen)}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button size="sm" variant="ghost" asChild><a href={viewProfileHref(u)} target="_blank" rel="noreferrer">View</a></Button>
                      <Button size="sm" variant="ghost" asChild><a href={viewProfileHref(u)} target="_blank" rel="noreferrer">Gigs</a></Button>
                      {sellerStatus !== "approved" && <Button size="sm" onClick={() => onApprove(u)}>Approve</Button>}
                      {sellerStatus !== "rejected" && <Button size="sm" variant="outline" onClick={() => onReject(u)}>Reject</Button>}
                      <Button size="sm" variant="ghost" onClick={() => onNotify(u)}>Notify</Button>
                      <Button size="sm" variant="ghost" onClick={() => onSuspend(u)}>Suspend</Button>
                      <Button size="sm" variant="destructive" onClick={() => onBan(u)}>Ban</Button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-border bg-background-elevated/30">
                    <td colSpan={headers.length} className="p-0">
                      <SellerDetail
                        sellerId={u.id}
                        account={acct}
                        inlineApplication={app}
                        isPending={isPending}
                        onApprove={() => onApprove(u)}
                        onReject={() => onReject(u)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SellerDetail({
  sellerId, account, inlineApplication, isPending, onApprove, onReject,
}: { sellerId: string; account?: any; inlineApplication?: any; isPending: boolean; onApprove: () => void; onReject: () => void }) {
  const [app, setApp] = useState<any>(inlineApplication ?? null);
  const [gigs, setGigs] = useState<any[] | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [txs, setTxs] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const queries: any[] = [
        supabase.from("gigs").select("id, title, status, starting_price, total_orders, average_rating").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("orders").select("id, order_number, price, status, created_at, buyer:buyer_id(username)").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("reviews").select("id, rating, review_text, created_at, reviewer_role").eq("seller_id", sellerId).eq("reviewer_role", "buyer").order("created_at", { ascending: false }).limit(20),
        supabase.from("transactions").select("id, type, amount, status, created_at").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20),
      ];
      if (!inlineApplication) {
        queries.unshift(supabase.from("seller_applications").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(1).maybeSingle());
      }
      const results = await Promise.all(queries);
      let idx = 0;
      if (!inlineApplication) { setApp(results[idx++]?.data ?? null); }
      setGigs(results[idx++].data ?? []);
      setOrders(results[idx++].data ?? []);
      setReviews(results[idx++].data ?? []);
      setTxs(results[idx++].data ?? []);
    })();
  }, [sellerId, inlineApplication]);

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-4 gap-3 text-xs">
        <MiniStat label="Available" value={dollars(account?.available_balance ?? 0)} />
        <MiniStat label="Pending" value={dollars(account?.pending_balance ?? 0)} />
        <MiniStat label="Lifetime" value={dollars(account?.lifetime_earnings ?? 0)} />
        <MiniStat label="Payouts" value={account?.payouts_enabled ? "Enabled" : "Off"} />
      </div>

      <Section title={isPending ? "Pending Application — Review & Decide" : "Application"}>
        {!app ? <Empty>No application on file.</Empty> : (
          <div className="text-xs space-y-2 border border-border rounded-lg p-4 bg-background">
            <div className="flex items-center justify-between mb-2">
              <StatusBadge variant={app.status === "approved" ? "approved" : app.status === "rejected" ? "banned" : "pending"} label={app.status === "pending" ? "Pending Review" : app.status.replace(/\b\w/g, (c: string) => c.toUpperCase())} />
              {isPending && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={onApprove}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={onReject}>Reject</Button>
                </div>
              )}
            </div>
            <div><span className="text-foreground-muted">Submitted:</span> {fmtDateTime(app.created_at)}</div>
            <div><span className="text-foreground-muted">Category:</span> {app.primary_category}{app.secondary_category ? ` · ${app.secondary_category}` : ""}</div>
            <div><span className="text-foreground-muted">Location:</span> {app.location ?? "—"} · {app.language ?? "—"}</div>
            <div><span className="text-foreground-muted">Skills:</span> {(app.skills ?? []).join(", ") || "—"}</div>
            {app.bio && <><div className="text-foreground-muted mt-2">Bio</div><div className="whitespace-pre-wrap">{app.bio}</div></>}
            {app.experience_description && <><div className="text-foreground-muted mt-2">Experience</div><div className="whitespace-pre-wrap">{app.experience_description}</div></>}
            {Array.isArray(app.portfolio_urls) && app.portfolio_urls.length > 0 && (
              <>
                <div className="text-foreground-muted mt-2">Portfolio</div>
                <div className="flex gap-2 flex-wrap">
                  {app.portfolio_urls.map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="underline">Link {i + 1}</a>
                  ))}
                </div>
              </>
            )}
            {Array.isArray(app.packages) && app.packages.length > 0 && (
              <>
                <div className="text-foreground-muted mt-2">Packages</div>
                <pre className="whitespace-pre-wrap bg-background-elevated p-2 rounded text-[11px]">{JSON.stringify(app.packages, null, 2)}</pre>
              </>
            )}
          </div>
        )}
      </Section>

      <Section title="Gigs">
        <MiniTable headers={["Title", "Status", "Price", "Orders", "Rating"]}>
          {(gigs ?? []).length === 0 && <tr><td colSpan={5} className="p-3 text-center text-foreground-muted">{gigs === null ? "Loading…" : "No gigs."}</td></tr>}
          {(gigs ?? []).map((g) => (
            <tr key={g.id} className="border-t border-border">
              <td className="p-2">{g.title}</td>
              <td className="p-2 capitalize">{g.status}</td>
              <td className="p-2">{dollars(g.starting_price)}</td>
              <td className="p-2">{g.total_orders}</td>
              <td className="p-2">{Number(g.average_rating ?? 0).toFixed(1)}</td>
            </tr>
          ))}
        </MiniTable>
      </Section>

      <Section title="Orders">
        <MiniTable headers={["Order", "Buyer", "Amount", "Status", "Date"]}>
          {(orders ?? []).length === 0 && <tr><td colSpan={5} className="p-3 text-center text-foreground-muted">{orders === null ? "Loading…" : "No orders."}</td></tr>}
          {(orders ?? []).map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="p-2 font-mono">{o.order_number}</td>
              <td className="p-2">{o.buyer?.username ?? "—"}</td>
              <td className="p-2">{dollars(o.price)}</td>
              <td className="p-2"><StatusBadge variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} /></td>
              <td className="p-2 text-foreground-muted">{fmtDate(o.created_at)}</td>
            </tr>
          ))}
        </MiniTable>
      </Section>

      <Section title="Reviews">
        {(reviews ?? []).length === 0 ? <Empty>{reviews === null ? "Loading…" : "No reviews."}</Empty> : (
          <div className="space-y-2">
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="text-xs border border-border rounded-lg p-2">
                <div className="font-medium">★ {r.rating}</div>
                <div className="text-foreground-muted">{r.review_text}</div>
                <div className="text-[10px] text-foreground-muted mt-1">{fmtDate(r.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent Transactions">
        <MiniTable headers={["Type", "Amount", "Status", "Date"]}>
          {(txs ?? []).length === 0 && <tr><td colSpan={4} className="p-3 text-center text-foreground-muted">{txs === null ? "Loading…" : "No transactions."}</td></tr>}
          {(txs ?? []).map((t) => (
            <tr key={t.id} className="border-t border-border">
              <td className="p-2 capitalize">{t.type.replace(/_/g, " ")}</td>
              <td className="p-2">{dollars(t.amount)}</td>
              <td className="p-2 capitalize">{t.status}</td>
              <td className="p-2 text-foreground-muted">{fmtDate(t.created_at)}</td>
            </tr>
          ))}
        </MiniTable>
      </Section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="text-foreground-muted">{label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2 text-foreground-muted">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-foreground-muted p-3 border border-border rounded-lg">{children}</div>;
}

function MiniTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-background-elevated text-foreground-muted">
          <tr>{headers.map((h) => <th key={h} className="text-left p-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ---------------- Dialogs ---------------- */

function SendNotificationDialog({
  target, onClose, onSubmit,
}: { target: { id: string; name: string } | null; onClose: () => void; onSubmit: (title: string, body: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => { if (target) { setTitle(""); setBody(""); } }, [target]);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send notification to {target?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(title.trim(), body.trim())} disabled={!title.trim()}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectSellerDialog({
  target, onClose, onSubmit,
}: { target: { id: string; name: string } | null; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (target) setReason(""); }, [target]);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject {target?.name}</DialogTitle></DialogHeader>
        <Textarea placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => onSubmit(reason.trim())} disabled={!reason.trim()}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= Section titles ============= */
function sectionTitle(k: NavKey) {
  const m: Record<string, string> = {
    overview: "Overview", buyers: "Buyers", sellers: "Sellers", verifications: "Verifications",
    orders: "Orders", projects: "Projects and Bids", gigs: "Gigs", disputes: "Disputes", reviews: "Reviews",
    revenue: "Revenue", escrow: "Escrow", payouts: "Payouts", refunds: "Refunds", withdrawals: "Withdrawals",
    river: "River Controls", "river-analytics": "River Analytics",
    categories: "Categories", announcements: "Announcements", featured: "Featured Sellers",
    notifications: "Notifications", settings: "Settings", audit: "Audit Log", health: "System Health", reports: "Reports",
  };
  return m[k] ?? "Admin";
}
function sectionSubtitle(k: NavKey) {
  return ({
    overview: "Live snapshot of the platform.",
    audit: "Read-only record of every admin action.",
    health: "Live status of all platform systems.",
  } as Record<string,string>)[k] ?? "";
}

/* ============= Overview ============= */
function OverviewPanel({ indicators, health }: { indicators: Indicators; health: Health }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <MiniStat label="Pending sellers" value={String(indicators.pendingSellers)} />
        <MiniStat label="Open disputes" value={String(indicators.openDisputes)} />
        <MiniStat label="Active orders" value={String(indicators.activeOrders)} />
        <MiniStat label="Escrow held (orders)" value={String(indicators.escrowHeld)} />
        <MiniStat label="Pending payouts" value={String(indicators.pendingPayouts)} />
        <MiniStat label="River searches today" value={String(indicators.riverSearchesToday)} />
      </div>
      <div className="bg-background border border-border rounded-xl p-5 text-xs text-foreground-muted">
        System status: {health
          ? `Supabase ${health.supabase.status} · Stripe ${health.stripe.status} (${health.stripe.mode}) · Anthropic ${health.anthropic.status}`
          : "checking…"}
      </div>
    </div>
  );
}

/* ============= Escrow ============= */
function EscrowPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, price, platform_fee, status, escrow_status, created_at, auto_complete_at, delivered_at, buyer:buyer_id(username, full_name), seller:seller_id(username, full_name)")
      .eq("escrow_status", "held")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const total = rows.reduce((s, r) => s + (r.price ?? 0), 0);
  const releaseEarly = async (id: string) => {
    if (!confirm("Release these funds to the seller now?")) return;
    setBusy(id);
    const nowIso = new Date().toISOString();
    await supabase.from("orders").update({ status: "completed", completed_at: nowIso, escrow_status: "released", escrow_released_at: nowIso }).eq("id", id);
    setBusy(null); load();
  };
  const lockFunds = async (id: string) => {
    setBusy(id);
    await supabase.from("orders").update({ status: "disputed" }).eq("id", id);
    setBusy(null); load();
  };
  const exportCsv = () => {
    const csv = ["order_number,buyer,seller,price,platform_fee,status,created_at"]
      .concat(rows.map(r => [r.order_number, r.buyer?.username, r.seller?.username, r.price, r.platform_fee, r.status, r.created_at].join(",")))
      .join("\n");
    downloadCsv("escrow.csv", csv);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div className="text-xs uppercase tracking-wide" style={{ color: "#9a3412" }}>Total Funds in Escrow</div>
        <div className="text-3xl font-bold mt-1" style={{ color: "#9a3412" }}>{dollars(total)}</div>
        <div className="text-xs mt-1" style={{ color: "#9a3412" }}>{rows.length} orders held</div>
      </div>
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button></div>
      <Table headers={["Order","Buyer","Seller","Held","Fee","Status","Created","Actions"]}>
        {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-foreground-muted">No funds held in escrow.</td></tr>}
        {rows.map((r) => {
          const disputed = r.status === "disputed";
          const bg = disputed ? "#fef2f2" : "transparent";
          return (
            <tr key={r.id} className="border-t border-border" style={{ background: bg }}>
              <td className="p-3 font-mono text-xs">{r.order_number}</td>
              <td className="p-3">{r.buyer?.full_name ?? r.buyer?.username ?? "—"}</td>
              <td className="p-3">{r.seller?.full_name ?? r.seller?.username ?? "—"}</td>
              <td className="p-3 font-medium">{dollars(r.price)}</td>
              <td className="p-3">{dollars(r.platform_fee)}</td>
              <td className="p-3"><StatusBadge variant={disputed ? "disputed" : "in-progress"} label={disputed ? "Disputed" : r.status.replace(/_/g," ")} /></td>
              <td className="p-3 text-foreground-muted">{fmtDate(r.created_at)}</td>
              <td className="p-3 flex gap-1.5">
                <Button size="sm" variant="ghost" asChild><a href={`/orders/${r.id}`} target="_blank" rel="noreferrer">View</a></Button>
                <Button size="sm" variant="outline" disabled={busy===r.id} onClick={() => releaseEarly(r.id)}>Release Early</Button>
                {!disputed && <Button size="sm" variant="destructive" disabled={busy===r.id} onClick={() => lockFunds(r.id)}>Lock Funds</Button>}
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

/* ============= Payouts ============= */
function PayoutsPanel() {
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const load = async () => {
    const [p, h] = await Promise.all([
      supabase.from("withdrawals").select("*, seller:seller_id(username, full_name, river_score)").eq("status", "requested").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*, seller:seller_id(username, full_name)").in("status", ["paid","failed"] as any).order("paid_at", { ascending: false }).limit(100),
    ]);
    setPending(p.data ?? []); setHistory(h.data ?? []);
  };
  useEffect(() => { load(); }, []);
  const approve = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("stripe-payout", { body: { withdrawal_id: id } });
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed");
    toast.success("Payout sent"); load();
  };
  const bulkApprove = async () => {
    if (!confirm(`Approve ${pending.length} payouts?`)) return;
    for (const w of pending) await approve(w.id);
  };
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">Pending Payouts ({pending.length})</h3>
          {pending.length > 0 && <Button size="sm" onClick={bulkApprove}>Bulk Approve All</Button>}
        </div>
        <Table headers={["Seller","River","Amount","Orders","Stripe","Requested","Action"]}>
          {pending.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-foreground-muted">No pending payouts.</td></tr>}
          {pending.map((w) => (
            <tr key={w.id} className="border-t border-border">
              <td className="p-3">{w.seller?.full_name ?? w.seller?.username}</td>
              <td className="p-3 font-mono text-xs">{w.seller?.river_score ?? "—"}</td>
              <td className="p-3 font-medium">{dollars(w.amount)}</td>
              <td className="p-3">—</td>
              <td className="p-3"><span className="text-xs">{w.method ?? "—"}</span></td>
              <td className="p-3 text-foreground-muted">{fmtDate(w.created_at)}</td>
              <td className="p-3"><Button size="sm" onClick={() => approve(w.id)}>Approve Payout</Button></td>
            </tr>
          ))}
        </Table>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Payout History</h3>
        <Table headers={["Date","Seller","Amount","Transfer ID","Status"]}>
          {history.map((w) => (
            <tr key={w.id} className="border-t border-border">
              <td className="p-3 text-foreground-muted">{fmtDate(w.paid_at ?? w.created_at)}</td>
              <td className="p-3">{w.seller?.full_name ?? w.seller?.username}</td>
              <td className="p-3 font-medium">{dollars(w.amount)}</td>
              <td className="p-3 font-mono text-xs">{w.stripe_payout_id ?? "—"}</td>
              <td className="p-3"><StatusBadge variant={w.status === "paid" ? "completed" : "banned"} label={w.status} /></td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

/* ============= Refunds ============= */
function RefundsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const load = async () => {
    let q = supabase.from("orders").select("id, order_number, price, platform_fee, refund_id, refunded_at, buyer:buyer_id(username, full_name), seller:seller_id(username, full_name)").not("refunded_at", "is", null).order("refunded_at", { ascending: false }).limit(500);
    if (from) q = q.gte("refunded_at", from);
    if (to) q = q.lte("refunded_at", to);
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [from, to]);
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const monthTotal = rows.filter(r => r.refunded_at && new Date(r.refunded_at) >= start).reduce((s, r) => s + (r.price ?? 0), 0);
  const exportCsv = () => {
    const csv = ["date,order,buyer,seller,amount,refund_id"]
      .concat(rows.map(r => [r.refunded_at, r.order_number, r.buyer?.username, r.seller?.username, r.price, r.refund_id].join(","))).join("\n");
    downloadCsv("refunds.csv", csv);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
        <div className="text-xs uppercase tracking-wide" style={{ color: "#991b1b" }}>Refunds this month</div>
        <div className="text-3xl font-bold mt-1" style={{ color: "#991b1b" }}>{dollars(monthTotal)}</div>
      </div>
      <div className="flex gap-2 items-center">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <Table headers={["Date","Order","Buyer","Seller","Amount","Refund ID"]}>
        {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-foreground-muted">No refunds.</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="p-3 text-foreground-muted">{fmtDate(r.refunded_at)}</td>
            <td className="p-3 font-mono text-xs">{r.order_number}</td>
            <td className="p-3">{r.buyer?.username ?? "—"}</td>
            <td className="p-3">{r.seller?.username ?? "—"}</td>
            <td className="p-3 font-medium">{dollars(r.price)}</td>
            <td className="p-3 font-mono text-xs">{r.refund_id ?? "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/* ============= Reviews ============= */
function ReviewsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const load = async () => {
    let qy = supabase.from("reviews").select("id, rating, review_text, created_at, order_id, buyer:buyer_id(username, full_name), seller:seller_id(username, full_name)").order("created_at", { ascending: false }).limit(500);
    if (filter !== "all") qy = qy.eq("rating", Number(filter));
    const { data } = await qy;
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);
  const remove = async (id: string) => {
    if (!confirm("Remove this review? Both parties will be notified.")) return;
    await supabase.from("reviews").delete().eq("id", id);
    load();
  };
  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.buyer?.username ?? "").toLowerCase().includes(s) || (r.seller?.username ?? "").toLowerCase().includes(s);
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Search seller or buyer…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className="border border-border rounded px-2 text-sm bg-background" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all","5","4","3","2","1"].map(o => <option key={o} value={o}>{o === "all" ? "All ratings" : `${o} star`}</option>)}
        </select>
      </div>
      <Table headers={["Date","Buyer","Seller","Rating","Preview","Actions"]}>
        {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-foreground-muted">No reviews.</td></tr>}
        {filtered.map((r) => (
          <Fragment key={r.id}>
            <tr className="border-t border-border">
              <td className="p-3 text-foreground-muted">{fmtDate(r.created_at)}</td>
              <td className="p-3">{r.buyer?.username ?? "—"}</td>
              <td className="p-3">{r.seller?.username ?? "—"}</td>
              <td className="p-3">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
              <td className="p-3 max-w-md truncate">{r.review_text ?? "—"}</td>
              <td className="p-3 flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "View"}</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Remove</Button>
              </td>
            </tr>
            {open === r.id && (
              <tr className="border-t border-border bg-background-elevated/30">
                <td colSpan={6} className="p-4 text-sm whitespace-pre-wrap">{r.review_text}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </Table>
    </div>
  );
}

/* ============= Gigs ============= */
function GigsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const load = async () => {
    let qy = supabase.from("gigs").select("id, title, thumbnail_url, category, status, starting_price, total_orders, average_rating, created_at, seller:seller_id(username, full_name, river_score)").order("created_at", { ascending: false }).limit(500);
    if (status !== "all") qy = qy.eq("status", status as any);
    if (cat !== "all") qy = qy.eq("category", cat);
    const { data } = await qy;
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [cat, status]);
  const cats = Array.from(new Set(rows.map(r => r.category))).filter(Boolean);
  const filtered = rows.filter(r => !q.trim() || r.title?.toLowerCase().includes(q.toLowerCase()) || r.seller?.username?.toLowerCase().includes(q.toLowerCase()));
  const setGigStatus = async (id: string, s: string) => { await supabase.from("gigs").update({ status: s as any }).eq("id", id); load(); };
  const remove = async (id: string) => { if (!confirm("Delete gig?")) return; await supabase.from("gigs").delete().eq("id", id); load(); };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className="border rounded px-2 text-sm bg-background" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border rounded px-2 text-sm bg-background" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All status</option><option value="active">Active</option><option value="paused">Paused</option><option value="draft">Draft</option>
        </select>
      </div>
      <Table headers={["","Title","Seller","Category","Price","Orders","Rating","Status","Actions"]}>
        {filtered.map((g) => (
          <tr key={g.id} className="border-t border-border">
            <td className="p-2">{g.thumbnail_url ? <img src={g.thumbnail_url} alt="" className="h-10 w-14 object-cover rounded" /> : <div className="h-10 w-14 rounded bg-background-elevated" />}</td>
            <td className="p-3 max-w-xs truncate">{g.title}</td>
            <td className="p-3">{g.seller?.username} <span className="text-xs text-foreground-muted">· {g.seller?.river_score ?? "—"}</span></td>
            <td className="p-3 text-xs">{g.category}</td>
            <td className="p-3">{dollars(g.starting_price)}</td>
            <td className="p-3">{g.total_orders}</td>
            <td className="p-3">{Number(g.average_rating ?? 0).toFixed(1)}</td>
            <td className="p-3 capitalize">{g.status}</td>
            <td className="p-3 flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" asChild><a href={`/gig/${g.id}`} target="_blank" rel="noreferrer">View</a></Button>
              {g.status === "active"
                ? <Button size="sm" variant="outline" onClick={() => setGigStatus(g.id, "paused")}>Pause</Button>
                : <Button size="sm" variant="outline" onClick={() => setGigStatus(g.id, "active")}>Activate</Button>}
              <Button size="sm" variant="destructive" onClick={() => remove(g.id)}>Remove</Button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/* ============= Projects ============= */
function ProjectsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("project_posts").select("id, title, category, status, budget_min, budget_max, bid_count, created_at, buyer:buyer_id(username)").order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Table headers={["Title","Buyer","Category","Budget","Bids","Status","Posted"]}>
      {rows.map((p) => (
        <tr key={p.id} className="border-t border-border">
          <td className="p-3 max-w-xs truncate">{p.title}</td>
          <td className="p-3">{p.buyer?.username ?? "—"}</td>
          <td className="p-3 text-xs">{p.category ?? "—"}</td>
          <td className="p-3 text-xs">${(p.budget_min ?? 0)/100} – ${(p.budget_max ?? 0)/100}</td>
          <td className="p-3">{p.bid_count}</td>
          <td className="p-3 capitalize">{p.status}</td>
          <td className="p-3 text-foreground-muted">{fmtDate(p.created_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

/* ============= Featured Sellers ============= */
function FeaturedSellersPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("featured_sellers").select("id, position, seller_id").order("position");
    if (!data || data.length === 0) { setItems([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, primary_category, river_score").in("id", data.map((f: any) => f.seller_id));
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems(data.map((f: any) => ({ ...f, profile: map.get(f.seller_id) })));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    supabase.from("profiles").select("id, full_name, username, avatar_url, primary_category, river_score").eq("role", "seller").eq("seller_status", "approved").or(`username.ilike.%${search}%,full_name.ilike.%${search}%`).limit(8).then(({ data }) => setResults(data ?? []));
  }, [search]);
  const add = async (id: string) => {
    if (items.length >= 12) return toast.error("Max 12 featured sellers");
    if (items.some(i => i.seller_id === id)) return;
    await supabase.from("featured_sellers").insert({ seller_id: id, position: items.length } as any);
    setSearch(""); setResults([]); load();
  };
  const remove = async (id: string) => { await supabase.from("featured_sellers").delete().eq("id", id); load(); };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir; if (j < 0 || j >= items.length) return;
    const a = items[idx], b = items[j];
    await supabase.from("featured_sellers").update({ position: j }).eq("id", a.id);
    await supabase.from("featured_sellers").update({ position: idx }).eq("id", b.id);
    load();
  };
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Input placeholder="Search approved sellers to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg">
            {results.map((r) => (
              <button key={r.id} className="w-full text-left p-2 hover:bg-background-elevated text-sm" onClick={() => add(r.id)}>{r.full_name ?? r.username} <span className="text-foreground-muted text-xs">· {r.primary_category}</span></button>
            ))}
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {items.length === 0 && <div className="text-sm text-foreground-muted">No featured sellers yet.</div>}
        {items.map((it, i) => (
          <div key={it.id} className="border border-border rounded-lg p-3 flex items-center gap-3">
            <Avatar url={it.profile?.avatar_url} name={it.profile?.full_name} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{it.profile?.full_name ?? it.profile?.username}</div>
              <div className="text-xs text-foreground-muted truncate">{it.profile?.primary_category ?? "—"} · River {it.profile?.river_score ?? "—"}</div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
            </div>
            <Button size="sm" variant="destructive" onClick={() => remove(it.id)}>×</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============= Announcements ============= */
function AnnouncementsPanel() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [channel, setChannel] = useState("in_app");
  const [scheduledFor, setScheduledFor] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    const ins = await supabase.from("announcements").insert({
      title, body, audience, channel,
      scheduled_for: scheduledFor || null,
      created_by: profile?.id,
    } as any).select("id").single();
    if (ins.error || !ins.data) return toast.error(ins.error?.message ?? "Failed");
    if (!scheduledFor) {
      const { error } = await supabase.functions.invoke("announcement-send", { body: { announcement_id: ins.data.id } });
      if (error) return toast.error(error.message);
    }
    toast.success(scheduledFor ? "Scheduled" : "Sent");
    setTitle(""); setBody(""); setScheduledFor(""); load();
  };
  return (
    <div className="space-y-6">
      <div className="bg-background border border-border rounded-xl p-5 space-y-3">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 text-sm bg-background" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="all">All users</option>
            <option value="buyers">All buyers</option>
            <option value="sellers">All sellers</option>
          </select>
          <select className="border rounded px-2 text-sm bg-background" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="in_app">In-app only</option>
            <option value="in_app_email">In-app + Email</option>
          </select>
          <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-56" />
          <div className="flex-1" />
          <Button onClick={send}>{scheduledFor ? "Schedule" : "Send now"}</Button>
        </div>
      </div>
      <Table headers={["Title","Audience","Channel","Sent","Recipients"]}>
        {history.map((a) => (
          <tr key={a.id} className="border-t border-border">
            <td className="p-3">{a.title}</td>
            <td className="p-3 text-xs">{a.audience}</td>
            <td className="p-3 text-xs">{a.channel}</td>
            <td className="p-3 text-foreground-muted">{a.sent_at ? fmtDateTime(a.sent_at) : (a.scheduled_for ? `Scheduled ${fmtDateTime(a.scheduled_for)}` : "Draft")}</td>
            <td className="p-3">{a.recipient_count}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/* ============= River Controls ============= */
function RiverControlsPanel({ health }: { health: Health }) {
  return (
    <div className="space-y-4">
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="text-xs uppercase tracking-wide text-foreground-muted">River API status</div>
        <div className="text-lg font-semibold mt-1 flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: health?.anthropic.status === "active" ? "#10b981" : "#ef4444" }} />
          {health?.anthropic.status === "active" ? "Active" : "Error"}
        </div>
        <div className="text-xs text-foreground-muted mt-1">Last search: {health?.anthropic ? "see /admin/river-analytics" : "—"}</div>
      </div>
      <div className="text-xs text-foreground-muted">Use /admin/river-ops for the operations chat. Edit the system prompt in the river-public-match edge function.</div>
    </div>
  );
}

/* ============= River Analytics ============= */
function RiverAnalyticsPanel() {
  const [stats, setStats] = useState<any>({ total: 0, today: 0, week: 0, avg: 0 });
  const [top, setTop] = useState<any[]>([]);
  const [zero, setZero] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const today = startOfTodayIso();
      const week = weekAgoIso();
      const [all, td, wk] = await Promise.all([
        supabase.from("ai_search_sessions").select("id, query, result_gig_ids, clicked_gig_id").limit(2000),
        supabase.from("ai_search_sessions").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("ai_search_sessions").select("id", { count: "exact", head: true }).gte("created_at", week),
      ]);
      const data = all.data ?? [];
      const avg = data.length ? data.reduce((s, r: any) => s + (r.result_gig_ids?.length ?? 0), 0) / data.length : 0;
      setStats({ total: data.length, today: td.count ?? 0, week: wk.count ?? 0, avg: avg.toFixed(1) });

      const counts = new Map<string, { count: number; results: number; clicks: number }>();
      for (const r of data as any[]) {
        const k = (r.query ?? "").toLowerCase().trim(); if (!k) continue;
        const c = counts.get(k) ?? { count: 0, results: 0, clicks: 0 };
        c.count++; c.results += r.result_gig_ids?.length ?? 0; if (r.clicked_gig_id) c.clicks++;
        counts.set(k, c);
      }
      const arr = Array.from(counts.entries()).map(([q, v]) => ({ q, ...v, conv: v.count ? Math.round((v.clicks/v.count)*100) : 0, avgRes: v.count ? (v.results/v.count).toFixed(1) : "0" }));
      setTop(arr.sort((a,b) => b.count - a.count).slice(0, 50));
      setZero(arr.filter(a => a.results === 0).slice(0, 50));
    })();
  }, []);
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat icon={Sparkles} label="All time" value={String(stats.total)} />
        <Stat icon={Sparkles} label="Today" value={String(stats.today)} />
        <Stat icon={Sparkles} label="Last 7 days" value={String(stats.week)} />
        <Stat icon={Sparkles} label="Avg matches" value={String(stats.avg)} />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Top searches</h3>
        <Table headers={["Query","Count","Avg results","Conv %"]}>
          {top.map((r) => (
            <tr key={r.q} className="border-t border-border">
              <td className="p-3">{r.q}</td><td className="p-3">{r.count}</td><td className="p-3">{r.avgRes}</td><td className="p-3">{r.conv}%</td>
            </tr>
          ))}
        </Table>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Zero-result searches</h3>
        <Table headers={["Query","Count"]}>
          {zero.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-sm text-foreground-muted">None.</td></tr>}
          {zero.map((r) => (<tr key={r.q} className="border-t border-border"><td className="p-3">{r.q}</td><td className="p-3">{r.count}</td></tr>))}
        </Table>
      </div>
    </div>
  );
}

/* ============= Categories ============= */
function CategoriesPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("categories").select("*").order("sort_order").then(({ data }) => setRows(data ?? [])); }, []);
  return (
    <Table headers={["Name","Slug","Active","Sort"]}>
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="p-3">{c.name}</td><td className="p-3 font-mono text-xs">{c.slug}</td>
          <td className="p-3">{c.is_active ? "Yes" : "No"}</td><td className="p-3">{c.sort_order}</td>
        </tr>
      ))}
    </Table>
  );
}

/* ============= Notifications composer ============= */
function NotificationsComposerPanel() {
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const send = async () => {
    if (!title.trim()) return toast.error("Title required");
    const { data: users } = await supabase.from("profiles").select("id");
    if (!users) return;
    for (let i = 0; i < users.length; i += 500) {
      const slice = users.slice(i, i + 500).map((u: any) => ({ user_id: u.id, type: "system" as any, title, body }));
      await supabase.from("notifications").insert(slice as any);
    }
    toast.success(`Sent to ${users.length} users`); setTitle(""); setBody("");
  };
  return (
    <div className="bg-background border border-border rounded-xl p-5 max-w-2xl space-y-3">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
      <Button onClick={send}>Send to all users</Button>
    </div>
  );
}

/* ============= Settings ============= */
function SettingsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("platform_settings").select("*").order("key").then(({ data }) => setRows(data ?? [])); }, []);
  return (
    <Table headers={["Key","Value","Updated"]}>
      {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-sm text-foreground-muted">No platform settings configured.</td></tr>}
      {rows.map((s) => (<tr key={s.id} className="border-t border-border"><td className="p-3 font-mono text-xs">{s.key}</td><td className="p-3">{s.value}</td><td className="p-3 text-foreground-muted">{fmtDateTime(s.updated_at)}</td></tr>))}
    </Table>
  );
}

/* ============= Audit Log ============= */
function AuditLogPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500).then(({ data }) => setRows(data ?? [])); }, []);
  const filtered = rows.filter(r => !q.trim() || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const exportCsv = () => {
    const csv = ["timestamp,admin,action,target_type,target_id,description,ip"]
      .concat(filtered.map(r => [r.created_at, r.admin_name, r.action_type, r.target_type, r.target_id, JSON.stringify(r.description ?? ""), r.ip_address].join(",")))
      .join("\n");
    downloadCsv("audit_log.csv", csv);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" /><div className="flex-1" /><Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button></div>
      <Table headers={["Time","Admin","Action","Target","Description","IP"]}>
        {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-foreground-muted">No audit entries.</td></tr>}
        {filtered.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="p-3 text-foreground-muted text-xs">{fmtDateTime(r.created_at)}</td>
            <td className="p-3">{r.admin_name ?? "—"}</td>
            <td className="p-3 text-xs">{r.action_type}</td>
            <td className="p-3 text-xs">{r.target_type ?? "—"} {r.target_id ? `#${String(r.target_id).slice(0,8)}` : ""}</td>
            <td className="p-3 max-w-md truncate">{r.description ?? "—"}</td>
            <td className="p-3 font-mono text-xs">{r.ip_address ?? "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/* ============= System Health ============= */
function SystemHealthPanel({ health }: { health: Health }) {
  const [logs, setLogs] = useState<any[]>([]);
  const load = () => supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setLogs(data ?? []));
  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, []);
  const Card = ({ name, ok, lines }: { name: string; ok: boolean; lines: string[] }) => (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ width: 10, height: 10, borderRadius: 999, background: ok ? "#10b981" : "#ef4444" }} />
        <div className="font-semibold">{name}</div>
      </div>
      {lines.map((l, i) => <div key={i} className="text-xs text-foreground-muted">{l}</div>)}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-4">
        <Card name="Supabase" ok={health?.supabase.status === "connected"} lines={[health?.supabase.status === "connected" ? "Connected" : "Disconnected", `${health?.supabase.latency_ms ?? "—"} ms`, `Checked ${fmtDateTime(health?.last_checked)}`]} />
        <Card name="Stripe" ok={health?.stripe.status === "live"} lines={[`${health?.stripe.mode ?? "test"} mode`, "Webhook errors 24h: —"]} />
        <Card name="Anthropic" ok={health?.anthropic.status === "active"} lines={[health?.anthropic.status === "active" ? "Active" : "Error", "Errors 24h: 0"]} />
        <Card name="Email" ok={health?.email?.status === "connected"} lines={[health?.email?.status === "connected" ? "Connected" : "Not configured"]} />
      </div>
      <h3 className="text-sm font-semibold">Recent events</h3>
      <Table headers={["Time","Service","Event","Status"]}>
        {logs.map((l) => (
          <tr key={l.id} className="border-t border-border">
            <td className="p-3 text-xs text-foreground-muted">{fmtDateTime(l.created_at)}</td>
            <td className="p-3 text-xs">{l.event_type?.split(".")[0] ?? "—"}</td>
            <td className="p-3 text-xs">{l.event_type}</td>
            <td className="p-3"><span style={{ color: l.status === "success" ? "#10b981" : "#ef4444", fontSize: 11 }}>{l.status}</span></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
