import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string; rating: number; review_text: string | null; created_at: string; reply: string | null;
  buyer: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export function ReviewsList({ gigId, sellerId }: { gigId?: string; sellerId?: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase.from("reviews")
        .select("id, rating, review_text, created_at, reply, buyer:buyer_id (full_name, username, avatar_url)")
        .eq("reviewer_role", "buyer").eq("is_public", true).order("created_at", { ascending: false }).limit(20);
      if (gigId) q = q.eq("gig_id", gigId);
      if (sellerId) q = q.eq("seller_id", sellerId);
      const { data } = await q;
      setItems((data ?? []) as any);
      setLoading(false);
    })();
  }, [gigId, sellerId]);

  if (loading) return <div className="text-sm text-foreground-muted">Loading reviews…</div>;
  if (items.length === 0) return <div className="text-sm text-foreground-muted">No reviews yet.</div>;

  return (
    <div className="space-y-5">
      {items.map((r) => (
        <div key={r.id} className="border-b border-border pb-5 last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold overflow-hidden">
              {r.buyer?.avatar_url
                ? <img src={r.buyer.avatar_url} alt="" className="w-full h-full object-cover" />
                : (r.buyer?.full_name?.[0] ?? r.buyer?.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{r.buyer?.full_name ?? r.buyer?.username ?? "User"}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={cn("h-3.5 w-3.5", n <= r.rating ? "fill-warning text-warning" : "text-foreground-subtle")} />
                ))}
                <span className="text-xs text-foreground-muted ml-1">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          {r.review_text && <p className="mt-3 text-sm whitespace-pre-line">{r.review_text}</p>}
          {r.reply && (
            <div className="mt-3 ml-12 bg-background-elevated rounded-lg p-3 text-sm">
              <div className="text-xs text-foreground-muted mb-1">Seller's reply</div>
              <p className="whitespace-pre-line">{r.reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
