import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShoppingBag, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function Admin() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ users: 0, gigs: 0, orders: 0, gmv: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  const load = async () => {
    const [u, g, o, gmv, uList, oList, wList, dList] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("gigs").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("price").eq("status", "completed"),
      supabase.from("profiles").select("id, full_name, username, email, role, created_at").order("created_at", { ascending: false }).limit(25),
      supabase.from("orders").select("id, order_number, status, price, created_at, buyer:buyer_id(username), seller:seller_id(username)").order("created_at", { ascending: false }).limit(25),
      supabase.from("withdrawals").select("id, amount, status, created_at, seller:seller_id(username, full_name)").order("created_at", { ascending: false }).limit(25),
      supabase.from("disputes").select("id, status, reason, created_at, order_id").order("created_at", { ascending: false }).limit(25),
    ]);
    setStats({
      users: u.count ?? 0, gigs: g.count ?? 0, orders: o.count ?? 0,
      gmv: (gmv.data ?? []).reduce((s: number, r: any) => s + r.price, 0),
    });
    setUsers(uList.data ?? []); setOrders(oList.data ?? []);
    setWithdrawals(wList.data ?? []); setDisputes(dList.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateWithdrawal = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("withdrawals").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`); load();
  };

  if (profile && profile.role !== "admin") {
    return <AppShell><div className="text-sm">Admin access required.</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-foreground-muted mt-1">Platform overview and operations.</p>
        </header>

        <div className="grid sm:grid-cols-4 gap-4">
          <Stat icon={Users} label="Users" value={stats.users.toString()} />
          <Stat icon={ShoppingBag} label="Gigs" value={stats.gigs.toString()} />
          <Stat icon={Wallet} label="Orders" value={stats.orders.toString()} />
          <Stat icon={Wallet} label="GMV" value={dollars(stats.gmv)} />
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Table headers={["Name", "Email", "Role", "Joined"]}>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.full_name ?? u.username ?? "—"}</td>
                  <td className="p-3 text-foreground-muted">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3 text-foreground-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="orders">
            <Table headers={["Order", "Buyer", "Seller", "Amount", "Status", "Date"]}>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">{o.buyer?.username ?? "—"}</td>
                  <td className="p-3">{o.seller?.username ?? "—"}</td>
                  <td className="p-3 font-medium">{dollars(o.price)}</td>
                  <td className="p-3 capitalize">{o.status.replace(/_/g, " ")}</td>
                  <td className="p-3 text-foreground-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Table headers={["Seller", "Amount", "Status", "Requested", "Actions"]}>
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3">{w.seller?.full_name ?? w.seller?.username ?? "—"}</td>
                  <td className="p-3 font-medium">{dollars(w.amount)}</td>
                  <td className="p-3 capitalize">{w.status}</td>
                  <td className="p-3 text-foreground-muted">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1.5">
                    {w.status === "requested" && (
                      <Button size="sm" variant="outline" onClick={() => updateWithdrawal(w.id, "processing")}>Process</Button>
                    )}
                    {(w.status === "requested" || w.status === "processing") && (
                      <>
                        <Button size="sm" onClick={() => updateWithdrawal(w.id, "paid")}>Mark paid</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateWithdrawal(w.id, "failed")}>Fail</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="disputes">
            <Table headers={["Order", "Reason", "Status", "Opened"]}>
              {disputes.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-foreground-muted">No disputes.</td></tr>}
              {disputes.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{d.order_id.slice(0, 8)}</td>
                  <td className="p-3 max-w-md truncate">{d.reason}</td>
                  <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded-full capitalize",
                    d.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{d.status}</span></td>
                  <td className="p-3 text-foreground-muted">{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>
        </Tabs>
      </div>
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
