import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  gigId?: string;
  sellerId?: string;
}

interface Row {
  rating: number;
  communication_rating: number | null;
  service_rating: number | null;
  recommend_rating: number | null;
}

export function RatingBreakdown({ gigId, sellerId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("reviews")
        .select("rating, communication_rating, service_rating, recommend_rating")
        .eq("reviewer_role", "buyer")
        .eq("is_public", true);
      if (gigId) q = q.eq("gig_id", gigId);
      if (sellerId) q = q.eq("seller_id", sellerId);
      const { data } = await q;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [gigId, sellerId]);

  if (loading) return null;
  if (rows.length === 0) return null;

  const total = rows.length;
  const avg = rows.reduce((s, r) => s + r.rating, 0) / total;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rows.filter((r) => r.rating === star).length,
  }));
  const subAvg = (key: keyof Row) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const comm = subAvg("communication_rating");
  const serv = subAvg("service_rating");
  const reco = subAvg("recommend_rating");

  return (
    <div className="border border-border rounded-lg p-5 grid gap-6 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex flex-col items-center justify-center min-w-[120px]">
        <div className="text-4xl font-bold">{avg.toFixed(1)}</div>
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn("h-4 w-4", n <= Math.round(avg) ? "fill-warning text-warning" : "text-foreground-subtle")}
            />
          ))}
        </div>
        <div className="text-xs text-foreground-muted mt-1">{total} review{total === 1 ? "" : "s"}</div>
      </div>

      <div className="space-y-1.5 min-w-[180px]">
        {dist.map(({ star, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-foreground-muted">{star}★</span>
              <div className="flex-1 h-2 rounded-full bg-background-elevated overflow-hidden">
                <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-foreground-muted">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 text-sm min-w-[180px]">
        {[
          { label: "Communication", v: comm },
          { label: "Service as described", v: serv },
          { label: "Would recommend", v: reco },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3">
            <span className="text-foreground-muted">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.v == null ? "—" : s.v.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
