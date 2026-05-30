import { useEffect, useMemo, useState, Fragment } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, ShoppingBag, Wallet, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VerificationsQueue } from "@/pages/admin/sections/VerificationsQueue";
import { ReportsQueue } from "@/pages/admin/sections/ReportsQueue";
import { SellerApprovalsQueue } from "@/pages/admin/sections/SellerApprovalsQueue";

const dollars = (c: number) => `$${((c ?? 0) / 100).toFixed(2)}`;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

type BuyerAgg = { placed: number; spent: number };
type SellerAgg = { completed: number; cancelled: number; earnings: number };

export default function Admin() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ users: 0, gigs: 0, orders: 0, gmv: 0 });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [buyerAggs, setBuyerAggs] = useState<Record<string, BuyerAgg>>({});
  const [sellerAggs, setSellerAggs] = useState<Record<string, SellerAgg>>({});
  const [sellerAccts, setSellerAccts] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  const [notifyUser, setNotifyUser] = useState<{ id: string; name: string } | null>(null);
  const [rejectSeller, setRejectSeller] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    const [u, g, o, gmv, buyersRes, sellersRes, oList, wList, dList, allOrders, acctsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("gigs").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("price").eq("status", "completed"),
      supabase.from("profiles")
        .select("id, full_name, username, email, avatar_url, suspended_at, created_at, last_seen, role")
        .eq("role", "client").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles")
        .select("id, full_name, username, email, avatar_url, suspended_at, created_at, last_seen, role, seller_status, river_score, rejection_reason")
        .eq("role", "seller").order("created_at", { ascending: false }).limit(200),
      supabase.from("orders").select("id, order_number, status, price, created_at, buyer:buyer_id(username), seller:seller_id(username)").order("created_at", { ascending: false }).limit(25),
      supabase.from("withdrawals").select("id, amount, status, created_at, method, failure_reason, seller_id, seller:seller_id(username, full_name)").order("created_at", { ascending: false }).limit(25),
      supabase.from("disputes").select("id, status, reason, created_at, order_id, order:order_id(escrow_status, status)").order("created_at", { ascending: false }).limit(25),
      supabase.from("orders").select("buyer_id, seller_id, status, price, seller_earnings"),
      supabase.from("seller_accounts").select("seller_id, lifetime_earnings, available_balance, pending_balance, payouts_enabled, onboarding_complete"),
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
    const { error } = await supabase.from("profiles").update({ seller_status: "approved", rejection_reason: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Seller approved"); load();
  };
  const submitReject = async (reason: string) => {
    if (!rejectSeller) return;
    const { error } = await supabase.from("profiles").update({ seller_status: "rejected", rejection_reason: reason }).eq("id", rejectSeller.id);
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

  return (
    <AppShell>
      <div className="max-w-6xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-foreground-muted mt-1">Platform overview and operations.</p>
          </div>
          <a href="/admin/river-ops" className="text-sm font-mono uppercase tracking-[0.14em] border-hairline rounded px-3 py-2 hover:bg-white/[0.03] transition-colors">
            River Ops →
          </a>
        </header>

        <div className="grid sm:grid-cols-4 gap-4">
          <Stat icon={Users} label="Users" value={stats.users.toString()} />
          <Stat icon={ShoppingBag} label="Gigs" value={stats.gigs.toString()} />
          <Stat icon={Wallet} label="Orders" value={stats.orders.toString()} />
          <Stat icon={Wallet} label="GMV" value={dollars(stats.gmv)} />
        </div>

        <Tabs defaultValue="buyers">
          <TabsList>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="seller_approvals">Seller Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="buyers">
            <BuyersTable
              rows={buyers}
              aggs={buyerAggs}
              onNotify={(u) => setNotifyUser({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
              onSuspend={(u) => suspendUser(u.id, u.full_name ?? u.username ?? u.email)}
              onBan={(u) => banUser(u.id, u.full_name ?? u.username ?? u.email)}
            />
          </TabsContent>

          <TabsContent value="sellers">
            <SellersTable
              rows={sellers}
              aggs={sellerAggs}
              accts={sellerAccts}
              onNotify={(u) => setNotifyUser({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
              onSuspend={(u) => suspendUser(u.id, u.full_name ?? u.username ?? u.email)}
              onBan={(u) => banUser(u.id, u.full_name ?? u.username ?? u.email)}
              onApprove={(u) => approveSeller(u.id)}
              onReject={(u) => setRejectSeller({ id: u.id, name: u.full_name ?? u.username ?? u.email })}
            />
          </TabsContent>

          <TabsContent value="orders">
            <Table headers={["Order", "Buyer", "Seller", "Amount", "Status", "Date"]}>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">{o.buyer?.username ?? "—"}</td>
                  <td className="p-3">{o.seller?.username ?? "—"}</td>
                  <td className="p-3 font-medium">{dollars(o.price)}</td>
                  <td className="p-3 capitalize">
                    <span className="inline-flex items-center gap-2">
                      {o.status.replace(/_/g, " ")}
                      {o.status === "disputed" && <FundsLockedBadge />}
                    </span>
                  </td>
                  <td className="p-3 text-foreground-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Table headers={["Seller", "Method", "Amount", "Status", "Requested", "Actions"]}>
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3">{w.seller?.full_name ?? w.seller?.username ?? "—"}</td>
                  <td className="p-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-background-elevated capitalize">
                      {w.method?.replace("_", " ") ?? "—"}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{dollars(w.amount)}</td>
                  <td className="p-3 capitalize" title={w.failure_reason ?? ""}>{w.status}</td>
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
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="disputes">
            <Table headers={["Order", "Reason", "Status", "Funds", "Opened", "Actions"]}>
              {disputes.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-foreground-muted">No disputes.</td></tr>}
              {disputes.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{d.order_id.slice(0, 8)}</td>
                  <td className="p-3 max-w-md truncate">{d.reason}</td>
                  <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded-full capitalize",
                    d.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{d.status}</span></td>
                  <td className="p-3">
                    {d.order?.escrow_status === "held" ? <FundsLockedBadge /> : <span className="text-xs text-foreground-muted">—</span>}
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
          </TabsContent>

          <TabsContent value="verifications"><VerificationsQueue /></TabsContent>
          <TabsContent value="reports"><ReportsQueue /></TabsContent>
          <TabsContent value="seller_approvals"><SellerApprovalsQueue /></TabsContent>
        </Tabs>
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

function FundsLockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
      <Lock className="h-3 w-3" /> Funds Locked
    </span>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-background border border-border rounded-xl overflow-hidden">
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

function StatusDot({ suspended }: { suspended?: string | null }) {
  return suspended ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suspended</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Active</span>
  );
}

function viewProfileHref(u: any) {
  return u.username ? `/u/${u.username}` : `/`;
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
    <div className="mt-4 bg-background border border-border rounded-xl overflow-hidden">
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
                  <td className="p-3"><StatusDot suspended={u.suspended_at} /></td>
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
                  <td className="p-2 capitalize">{o.status.replace(/_/g, " ")}</td>
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
  rows, aggs, accts, onNotify, onSuspend, onBan, onApprove, onReject,
}: {
  rows: any[]; aggs: Record<string, SellerAgg>; accts: Record<string, any>;
  onNotify: (u: any) => void; onSuspend: (u: any) => void; onBan: (u: any) => void;
  onApprove: (u: any) => void; onReject: (u: any) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const headers = ["", "", "Name", "Email", "Seller", "River", "Member Since", "Completed", "Earned", "Completion", "Last Active", "Actions"];
  return (
    <div className="mt-4 bg-background border border-border rounded-xl overflow-x-auto">
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
            return (
              <Fragment key={u.id}>
                <tr className="border-t border-border cursor-pointer hover:bg-background-elevated/50" onClick={() => setExpanded(isOpen ? null : u.id)}>
                  <td className="p-3 w-6">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                  <td className="p-3"><Avatar url={u.avatar_url} name={u.full_name ?? u.username} /></td>
                  <td className="p-3">{u.full_name ?? u.username ?? "—"}{u.suspended_at && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Suspended</span>}</td>
                  <td className="p-3 text-foreground-muted">{u.email}</td>
                  <td className="p-3"><SellerStatusBadge status={sellerStatus} /></td>
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
                      <SellerDetail sellerId={u.id} account={acct} />
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

function SellerStatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved" ? "bg-success/10 text-success" :
    status === "pending" ? "bg-warning/10 text-warning" :
    status === "rejected" ? "bg-destructive/10 text-destructive" :
    "bg-background-elevated text-foreground-muted";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", tone)}>{status}</span>;
}

function SellerDetail({ sellerId, account }: { sellerId: string; account?: any }) {
  const [app, setApp] = useState<any>(null);
  const [gigs, setGigs] = useState<any[] | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [txs, setTxs] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const [appRes, g, o, r, t] = await Promise.all([
        supabase.from("seller_applications").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("gigs").select("id, title, status, starting_price, total_orders, average_rating").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("orders").select("id, order_number, price, status, created_at, buyer:buyer_id(username)").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("reviews").select("id, rating, review_text, created_at, reviewer_role").eq("seller_id", sellerId).eq("reviewer_role", "buyer").order("created_at", { ascending: false }).limit(20),
        supabase.from("transactions").select("id, type, amount, status, created_at").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20),
      ]);
      setApp(appRes.data ?? null);
      setGigs(g.data ?? []);
      setOrders(o.data ?? []);
      setReviews(r.data ?? []);
      setTxs(t.data ?? []);
    })();
  }, [sellerId]);

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-4 gap-3 text-xs">
        <MiniStat label="Available" value={dollars(account?.available_balance ?? 0)} />
        <MiniStat label="Pending" value={dollars(account?.pending_balance ?? 0)} />
        <MiniStat label="Lifetime" value={dollars(account?.lifetime_earnings ?? 0)} />
        <MiniStat label="Payouts" value={account?.payouts_enabled ? "Enabled" : "Off"} />
      </div>

      <Section title="Application">
        {!app ? <Empty>No application on file.</Empty> : (
          <div className="text-xs space-y-2">
            <div><span className="text-foreground-muted">Status:</span> {app.status}</div>
            <div><span className="text-foreground-muted">Category:</span> {app.primary_category}{app.secondary_category ? ` · ${app.secondary_category}` : ""}</div>
            <div><span className="text-foreground-muted">Location:</span> {app.location} · {app.language}</div>
            <div><span className="text-foreground-muted">Skills:</span> {(app.skills ?? []).join(", ") || "—"}</div>
            <div className="text-foreground-muted">Bio</div>
            <div className="whitespace-pre-wrap">{app.bio}</div>
            <div className="text-foreground-muted">Experience</div>
            <div className="whitespace-pre-wrap">{app.experience_description}</div>
            {Array.isArray(app.portfolio_urls) && app.portfolio_urls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {app.portfolio_urls.map((u: string, i: number) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="underline">Link {i + 1}</a>
                ))}
              </div>
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
              <td className="p-2 capitalize">{o.status.replace(/_/g, " ")}</td>
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
