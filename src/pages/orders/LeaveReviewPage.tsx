import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderData {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  completed_at: string | null;
  delivered_at: string | null;
  project_title: string | null;
  gig_id: string | null;
  gig?: { title: string | null } | null;
  seller?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    river_score: number | null;
  } | null;
}

const CATEGORIES = [
  { key: "communication", label: "Communication" },
  { key: "quality", label: "Quality of Work" },
  { key: "delivery", label: "On Time Delivery" },
  { key: "value", label: "Value for Money" },
  { key: "rehire", label: "Would Rehire" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <Star
              className="h-7 w-7 transition-colors"
              strokeWidth={1.5}
              style={{
                color: filled ? "#000" : "#d1d5db",
                fill: filled ? "#000" : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function LeaveReviewPage() {
  const { order_id } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ratings, setRatings] = useState<Record<CategoryKey, number>>({
    communication: 0,
    quality: 0,
    delivery: 0,
    value: 0,
    rehire: 0,
  });
  const [reviewText, setReviewText] = useState("");
  const [standout, setStandout] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setMe(uid);
      if (!order_id || !uid) {
        setLoading(false);
        return;
      }

      const { data: o } = await supabase
        .from("orders")
        .select(
          "id, buyer_id, seller_id, status, completed_at, delivered_at, project_title, gig_id"
        )
        .eq("id", order_id)
        .maybeSingle();
      if (!o) {
        setLoading(false);
        return;
      }

      const [{ data: seller }, gigRes, existingRes, promptRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, river_score")
          .eq("id", o.seller_id)
          .maybeSingle(),
        o.gig_id
          ? supabase.from("gigs").select("title").eq("id", o.gig_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("reviews")
          .select("id")
          .eq("order_id", order_id)
          .eq("reviewer_role", "buyer")
          .maybeSingle(),
        supabase
          .from("review_prompts")
          .select("expires_at")
          .eq("order_id", order_id)
          .maybeSingle(),
      ]);

      setOrder({ ...(o as any), seller: seller as any, gig: gigRes.data as any });
      setAlreadyReviewed(!!existingRes.data);

      const expiresAt = promptRes.data?.expires_at
        ? new Date(promptRes.data.expires_at)
        : o.completed_at
          ? new Date(new Date(o.completed_at).getTime() + 14 * 24 * 60 * 60 * 1000)
          : null;
      setExpired(!!expiresAt && expiresAt.getTime() < Date.now());
      setLoading(false);
    })();
  }, [order_id]);

  const overall = useMemo(() => {
    const vals = Object.values(ratings);
    if (vals.some((v) => v === 0)) return 0;
    return vals.reduce((a, b) => a + b, 0) / 5;
  }, [ratings]);

  const allRated = Object.values(ratings).every((v) => v >= 1);
  const textOk = reviewText.trim().length >= 50;
  const canSubmit = allRated && textOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !order) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_full_review" as any, {
      _order_id: order.id,
      _communication: ratings.communication,
      _quality: ratings.quality,
      _delivery: ratings.delivery,
      _value: ratings.value,
      _rehire: ratings.rehire,
      _text: reviewText.trim(),
      _standout: standout.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review submitted");
    navigate(`/orders/${order.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-10 text-foreground-muted">Loading…</main>
        <SiteFooter />
      </div>
    );
  }

  if (!order || !me || order.buyer_id !== me) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const seller = order.seller;
  const sellerName = seller?.full_name ?? seller?.username ?? "Expert";
  const projectTitle = order.project_title ?? order.gig?.title ?? "Project";
  const deliveryDate = order.completed_at ?? order.delivered_at;

  if (alreadyReviewed || expired) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Review" description="Project review" />
        <SiteHeader />
        <main className="flex-1 container py-10 max-w-2xl mx-auto">
          <div className="border border-border rounded-xl p-8 text-center">
            <h1 className="text-xl font-bold mb-2">
              {alreadyReviewed ? "You already reviewed this project" : "Review window closed"}
            </h1>
            <p className="text-foreground-muted">
              {alreadyReviewed
                ? "Thanks for your feedback."
                : "Reviews can be left within 14 days of completion."}
            </p>
            <Link to={`/orders/${order.id}`} className="text-primary inline-block mt-4">
              Back to order
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Leave a review" description={`Review ${sellerName}`} />
      <SiteHeader />
      <main className="flex-1 container py-10 max-w-2xl mx-auto">
        {/* Seller summary card */}
        <div className="border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden">
            {seller?.avatar_url ? (
              <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              sellerName[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{sellerName}</div>
            <div className="text-xs text-foreground-muted">
              River Score: {seller?.river_score != null ? Number(seller.river_score).toFixed(1) : "—"}
            </div>
          </div>
        </div>

        {/* Project info */}
        <div className="mt-4">
          <h1 className="text-lg font-bold">{projectTitle}</h1>
          {deliveryDate && (
            <div className="text-sm text-foreground-muted">
              Delivered {new Date(deliveryDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Star rows */}
        <div className="mt-8 space-y-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
            >
              <span className="text-sm font-medium">{c.label}</span>
              <StarRow
                value={ratings[c.key]}
                onChange={(n) => setRatings((r) => ({ ...r, [c.key]: n }))}
              />
            </div>
          ))}
        </div>

        {/* Overall */}
        <div className="mt-8 text-center">
          <div className="text-4xl font-bold tabular-nums" style={{ color: "#000" }}>
            {overall.toFixed(1)} <span className="text-foreground-muted text-2xl">out of 5.0</span>
          </div>
        </div>

        {/* Written review */}
        <div className="mt-8">
          <label className="text-sm font-medium block mb-2">
            Tell others about your experience
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Describe what was delivered, how the expert communicated, and whether you would recommend them. Minimum 50 characters required."
            className="w-full min-h-[140px] border border-border rounded-lg p-3 text-sm resize-y bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            maxLength={2000}
          />
          <div
            className={cn(
              "mt-1.5 text-xs",
              textOk ? "text-success" : "text-foreground-muted"
            )}
            style={textOk ? { color: "#16a34a" } : undefined}
          >
            {reviewText.trim().length} characters — minimum 50 required
          </div>
        </div>

        {/* Standout moment */}
        <div className="mt-5">
          <label className="text-sm font-medium block mb-2">Stand out moment</label>
          <textarea
            value={standout}
            onChange={(e) => setStandout(e.target.value)}
            placeholder="Was there anything that really impressed you? Optional but experts love this."
            className="w-full min-h-[80px] border border-border rounded-lg p-3 text-sm resize-y bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            maxLength={500}
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-8 w-full"
          style={{
            backgroundColor: canSubmit ? "#000" : "#d1d5db",
            color: canSubmit ? "#fff" : "#6b7280",
            borderRadius: 999,
            height: 48,
            fontSize: 15,
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background-color 150ms",
          }}
        >
          {submitting ? "Submitting…" : "Submit My Review"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
