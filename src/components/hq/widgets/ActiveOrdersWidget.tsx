import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Order { id: string; order_number: string; project_title: string | null; status: string; delivery_deadline: string | null; }

export function ActiveOrdersWidget() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const isSeller = profile?.role === "seller" || profile?.role === "admin";
    const col = isSeller ? "seller_id" : "buyer_id";
    supabase
      .from("orders")
      .select("id, order_number, project_title, status, delivery_deadline")
      .eq(col, user.id)
      .in("status", ["in_progress", "delivered"])
      .order("delivery_deadline", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [user?.id, profile?.role]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (orders.length === 0) return <p className="text-sm text-foreground-muted">No active orders.</p>;
  return (
    <ul className="space-y-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link to={`/orders/${o.id}`} className="flex items-center justify-between text-sm hover:text-primary">
            <span className="font-medium truncate">{o.project_title || o.order_number}</span>
            <span className="text-xs text-foreground-muted ml-3 shrink-0">{o.status.replace("_", " ")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
