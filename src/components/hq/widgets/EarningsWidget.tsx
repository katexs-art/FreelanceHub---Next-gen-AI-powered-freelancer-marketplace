import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatUSD } from "@/lib/money";

export function EarningsWidget() {
  const { user } = useAuth();
  const [a, setA] = useState({ available: 0, pending: 0, lifetime: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("seller_accounts").select("available_balance, pending_balance, lifetime_earnings").eq("seller_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setA({ available: data.available_balance ?? 0, pending: data.pending_balance ?? 0, lifetime: data.lifetime_earnings ?? 0 });
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  const fmt = (n: number) => formatUSD(n);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Available" value={fmt(a.available)} />
        <Stat label="Pending" value={fmt(a.pending)} />
        <Stat label="Lifetime" value={fmt(a.lifetime)} />
      </div>
      <Link to="/seller/earnings" className="text-xs text-primary hover:underline">View earnings →</Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background-subtle p-3">
      <div className="text-[10px] uppercase tracking-wider text-foreground-muted font-mono">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
