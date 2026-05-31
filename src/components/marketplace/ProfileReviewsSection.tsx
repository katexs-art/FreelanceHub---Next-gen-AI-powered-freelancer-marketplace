import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReviewRow {
  id: string;
  rating: number;
  overall_rating: number | null;
  review_text: string | null;
  standout_moment: string | null;
  reply: string | null;
  created_at: string;
  seller_id: string;
  helpful_count: number | null;
  rating_communication: number | null;
  rating_quality: number | null;
  rating_delivery: number | null;
  rating_value: number | null;
  rating_rehire: number | null;
  buyer: { full_name: string | null; username: string | null } | null;
}

const CATEGORY_LABELS: { key: keyof ReviewRow; label: string }[] = [
  { key: "rating_communication", label: "Communication" },
  { key: "rating_quality", label: "Quality of Work" },
  { key: "rating_delivery", label: "On Time Delivery" },
  { key: "rating_value", label: "Value for Money" },
  { key: "rating_rehire", label: "Would Rehire" },
];

type SortKey = "newest" | "helpful" | "highest";

function StarVisual({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{
            width: size,
            height: size,
            color: n <= Math.round(value) ? "#000" : "#d1d5db",
            fill: n <= Math.round(value) ? "#000" : "transparent",
          }}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function privacyName(full?: string | null, username?: string | null) {
  const src = full ?? username ?? "User";
  const parts = src.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last[0]?.toUpperCase() ?? ""}.`.trim();
}

export function ProfileReviewsSection({ sellerId }: { sellerId: string }) {
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, rating, overall_rating, review_text, standout_moment, reply, created_at, seller_id, helpful_count, rating_communication, rating_quality, rating_delivery, rating_value, rating_rehire, partner:buyer_id (full_name, username)"
      )
      .eq("seller_id", sellerId)
      .eq("reviewer_role", "buyer")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const saveReply = async (id: string) => {
    const txt = replyText.trim();
    if (!txt) return;
    if (txt.length > 300) {
      toast.error("Response must be 300 characters or fewer");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reviews").update({ reply: txt }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Response posted");
    setReplyingId(null);
    setReplyText("");
    load();
  };

  const sorted = [...items].sort((a, b) => {
    if (sort === "helpful") return (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
    if (sort === "highest")
      return Number(b.overall_rating ?? b.rating) - Number(a.overall_rating ?? a.rating);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const total = items.length;
  const avg =
    total === 0
      ? 0
      : items.reduce((s, r) => s + Number(r.overall_rating ?? r.rating ?? 0), 0) / total;
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = items.filter(
      (r) => Math.round(Number(r.overall_rating ?? r.rating ?? 0)) === star
    ).length;
    return { star, count, pct: total > 0 ? (count / total) * 100 : 0 };
  });

  if (loading) return <div className="text-sm text-foreground-muted">Loading reviews…</div>;

  return (
    <div id="reviews" className="space-y-6">
      {/* Aggregate header */}
      {total > 0 ? (
        <div className="border border-border rounded-xl p-5 grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            <div className="text-4xl font-bold tabular-nums">{avg.toFixed(1)}</div>
            <div className="mt-2"><StarVisual value={avg} size={18} /></div>
            <div className="text-xs text-foreground-muted mt-1.5">
              {total} review{total === 1 ? "" : "s"}
            </div>
          </div>
          <div className="space-y-1.5">
            {dist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-10 text-foreground-muted">{star} star</span>
                <div className="flex-1 h-2 rounded-full bg-background-elevated overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: "#000" }}
                  />
                </div>
                <span className="w-12 text-right text-foreground-muted tabular-nums">
                  {pct.toFixed(0)}% ({count})
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-foreground-muted">No reviews yet.</div>
      )}

      {/* Sort */}
      {total > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-foreground-muted">Sort:</span>
          {[
            { k: "newest", l: "Newest" },
            { k: "helpful", l: "Most Helpful" },
            { k: "highest", l: "Highest Rated" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => setSort(opt.k as SortKey)}
              className={cn(
                "px-2.5 py-1 rounded-full border transition-colors",
                sort === opt.k
                  ? "border-foreground text-foreground"
                  : "border-border text-foreground-muted hover:text-foreground"
              )}
            >
              {opt.l}
            </button>
          ))}
        </div>
      )}

      {/* Review cards */}
      <div className="space-y-5">
        {sorted.map((r) => {
          const canReply = me && me === r.seller_id && !r.reply;
          const overall = Number(r.overall_rating ?? r.rating ?? 0);
          return (
            <div key={r.id} className="border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium text-sm">
                  {privacyName(r.buyer?.full_name, r.buyer?.username)}
                </div>
                <div className="text-xs text-foreground-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-2"><StarVisual value={overall} /></div>

              {/* Sub category rows */}
              <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {CATEGORY_LABELS.map((c) => {
                  const v = r[c.key] as number | null;
                  if (v == null) return null;
                  return (
                    <div key={c.key} className="flex items-center justify-between gap-3">
                      <span className="text-foreground-muted">{c.label}</span>
                      <span className="tabular-nums font-medium">{v}/5</span>
                    </div>
                  );
                })}
              </div>

              {r.review_text && (
                <p className="mt-3 text-sm whitespace-pre-line">{r.review_text}</p>
              )}

              {r.standout_moment && (
                <p className="mt-2 text-sm italic text-foreground-muted whitespace-pre-line">
                  {r.standout_moment}
                </p>
              )}

              {r.reply && (
                <div className="mt-4 ml-4 pl-4 border-l border-border">
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#999",
                    }}
                  >
                    Seller response
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-line">{r.reply}</p>
                </div>
              )}

              {canReply && (
                <div className="mt-4">
                  {replyingId === r.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, 300))}
                        rows={3}
                        placeholder="Write your response (max 300 characters)"
                      />
                      <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
                        <span>{replyText.length}/300</span>
                        <div className="flex items-center gap-2">
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
                          <Button size="sm" onClick={() => saveReply(r.id)} disabled={saving}>
                            Post response
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingId(r.id)}
                      className="text-xs text-foreground-muted hover:text-foreground underline"
                    >
                      Respond to this review
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
