import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  price: number;
  created_at: string;
  delivery_deadline: string | null;
  gigs: { title: string; thumbnail_url: string | null } | null;
  buyer: { full_name: string | null; username: string | null } | null;
  seller: { full_name: string | null; username: string | null } | null;
}

const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-muted text-foreground-muted",
  pending_requirements: "bg-warning/10 text-warning",
  active: "bg-primary/10 text-primary",
  delivered: "bg-info/10 text-info",
  revision_requested: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-foreground-muted",
  disputed: "bg-destructive/10 text-destructive",
};

export default function OrdersList({ as }: { as: "buyer" | "seller" }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const col = as === "buyer" ? "buyer_id" : "seller_id";
      const { data } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, price, created_at, delivery_deadline,
          gigs:gig_id (title, thumbnail_url),
          buyer:buyer_id (full_name, username),
          seller:seller_id (full_name, username)
        `)
        .eq(col, user.id)
        .order("created_at", { ascending: false });
      setOrders((data as any) ?? []);
      setLoading(false);
    })();
  }, [user, as]);

  const title = as === "buyer" ? "My projects" : "Active projects";
  const counterpartKey = as === "buyer" ? "seller" : "buyer";

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      {loading ? (
        <div className="text-foreground-muted text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-foreground-muted">
          No orders yet.
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background-elevated text-xs text-foreground-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">{as === "buyer" ? "Expert" : "Partner"}</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const cp = (o as any)[counterpartKey];
                return (
                  <tr key={o.id} className="border-t border-border hover:bg-background-elevated/50">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${o.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-background-elevated overflow-hidden shrink-0">
                          {o.gigs?.thumbnail_url && <img src={o.gigs.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{o.gigs?.title ?? "Service"}</div>
                          <div className="text-xs text-foreground-muted">{o.order_number}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">{cp?.full_name ?? cp?.username ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_TONE[o.status] ?? "bg-muted"}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${o.price}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
