import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Proj { id: string; title: string; budget_min: number | null; budget_max: number | null; bid_count: number; }

export function OpenProjectsWidget() {
  const [items, setItems] = useState<Proj[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("project_posts").select("id, title, budget_min, budget_max, bid_count").eq("status", "open").order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { setItems((data ?? []) as Proj[]); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-foreground-muted">No open projects right now.</p>;
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link to={`/projects/${p.id}`} className="flex items-center justify-between text-sm hover:text-primary">
            <span className="font-medium truncate">{p.title}</span>
            <span className="text-xs text-foreground-muted ml-3 shrink-0 tabular-nums">
              {p.budget_min && p.budget_max ? `$${p.budget_min}–$${p.budget_max}` : "—"} · {p.bid_count} bids
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
