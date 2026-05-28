import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reply: string | null;
  seller_id: string;
  communication_rating: number | null;
  service_rating: number | null;
  recommend_rating: number | null;
  buyer: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export function ReviewsList({ gigId, sellerId }: { gigId?: string; sellerId?: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    let q = supabase
      .from("reviews")
      .select(
        "id, rating, review_text, created_at, reply, seller_id, communication_rating, service_rating, recommend_rating, buyer:buyer_id (full_name, username, avatar_url)"
      )
      .eq("reviewer_role", "buyer")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (gigId) q = q.eq("gig_id", gigId);
    if (sellerId) q = q.eq("seller_id", sellerId);
    const { data } = await q;
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigId, sellerId]);

  const saveReply = async (id: string) => {
    if (!replyText.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").update({ reply: replyText.trim() }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Reply posted");
    setReplyingId(null);
    setReplyText("");
    load();
  };

  if (loading) return <div className="text-sm text-foreground-muted">Loading reviews…</div>;
  if (items.length === 0) return <div className="text-sm text-foreground-muted">No reviews yet.</div>;

  return (
    <div className="space-y-5">
      {items.map((r) => {
        const canReply = me && me === r.seller_id && !r.reply;
        return (
          <div key={r.id} className="border-b border-border pb-5 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold overflow-hidden">
                {r.buyer?.avatar_url ? (
                  <img src={r.buyer.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (r.buyer?.full_name?.[0] ?? r.buyer?.username?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{r.buyer?.full_name ?? r.buyer?.username ?? "User"}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-success border border-success/30 rounded-full px-1.5 py-0.5">
                    <BadgeCheck className="h-3 w-3" /> Verified purchase
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-3.5 w-3.5",
                        n <= r.rating ? "fill-warning text-warning" : "text-foreground-subtle"
                      )}
                    />
                  ))}
                  <span className="text-xs text-foreground-muted ml-1">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {(r.communication_rating || r.service_rating || r.recommend_rating) && (
              <div className="mt-2 ml-12 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                {r.communication_rating != null && <span>Communication {r.communication_rating}/5</span>}
                {r.service_rating != null && <span>Service {r.service_rating}/5</span>}
                {r.recommend_rating != null && <span>Recommend {r.recommend_rating}/5</span>}
              </div>
            )}

            {r.review_text && <p className="mt-3 text-sm whitespace-pre-line">{r.review_text}</p>}

            {r.reply && (
              <div className="mt-3 ml-12 bg-background-elevated rounded-lg p-3 text-sm">
                <div className="text-xs text-foreground-muted mb-1">Seller's reply</div>
                <p className="whitespace-pre-line">{r.reply}</p>
              </div>
            )}

            {canReply && (
              <div className="mt-3 ml-12">
                {replyingId === r.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Write a public reply"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => saveReply(r.id)} disabled={saving}>
                        Post reply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingId(r.id)}
                    className="text-xs text-foreground-muted hover:text-foreground underline"
                  >
                    Reply
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
