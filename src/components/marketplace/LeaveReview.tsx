import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  orderId: string;
  gigId: string;
  buyerId: string;
  sellerId: string;
  currentUserId: string;
  onDone?: () => void;
}

const buyerSchema = z.object({
  communication: z.number().int().min(1).max(5),
  service: z.number().int().min(1).max(5),
  recommend: z.number().int().min(1).max(5),
  text: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

const sellerSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

function StarRow({ value, onChange, size = 7 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            className={cn(
              `h-${size} w-${size} transition-colors`,
              n <= value ? "fill-warning text-warning" : "text-foreground-subtle hover:text-warning"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function LeaveReview({ orderId, gigId, buyerId, sellerId, currentUserId, onDone }: Props) {
  const role = currentUserId === buyerId ? "buyer" : "seller";
  const [existing, setExisting] = useState<any>(null);
  const [communication, setCommunication] = useState(0);
  const [service, setService] = useState(0);
  const [recommend, setRecommend] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .eq("order_id", orderId)
      .eq("reviewer_role", role)
      .maybeSingle()
      .then(({ data }) => setExisting(data));
  }, [orderId, role]);

  if (existing) {
    return (
      <div className="border border-border rounded-lg p-4 bg-background-elevated">
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn("h-4 w-4", n <= existing.rating ? "fill-warning text-warning" : "text-foreground-subtle")}
            />
          ))}
        </div>
        <p className="text-sm">
          {existing.review_text || <span className="italic text-foreground-muted">No comment</span>}
        </p>
        {!existing.is_public && (
          <p className="mt-3 text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted">
            Waiting on counterpart — review publishes once both sides post, or after 14 days.
          </p>
        )}
      </div>
    );
  }

  const submit = async () => {
    try {
      let payload: any = {
        order_id: orderId,
        gig_id: gigId,
        buyer_id: buyerId,
        seller_id: sellerId,
        reviewer_role: role,
        review_text: text || null,
      };
      if (role === "buyer") {
        const parsed = buyerSchema.parse({ communication, service, recommend, text });
        const overall = Math.round((parsed.communication + parsed.service + parsed.recommend) / 3);
        payload = {
          ...payload,
          rating: overall,
          communication_rating: parsed.communication,
          service_rating: parsed.service,
          recommend_rating: parsed.recommend,
        };
      } else {
        const parsed = sellerSchema.parse({ rating: sellerRating, text });
        payload.rating = parsed.rating;
      }
      setBusy(true);
      const { error } = await supabase.from("reviews").insert(payload);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Review submitted");
      onDone?.();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? e?.message ?? "Please complete the review";
      toast.error(msg);
    }
  };

  if (role === "seller") {
    return (
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h4 className="font-semibold text-sm">Rate this partner</h4>
        <StarRow value={sellerRating} onChange={setSellerRating} />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Feedback on this partner"
        />
        <Button onClick={submit} disabled={busy}>
          Submit review
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <h4 className="font-semibold text-sm">Leave a review</h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground-muted">Communication</span>
          <StarRow value={communication} onChange={setCommunication} size={5} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground-muted">Service as described</span>
          <StarRow value={service} onChange={setService} size={5} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground-muted">Would recommend</span>
          <StarRow value={recommend} onChange={setRecommend} size={5} />
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="How was the service?"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">{text.length}/500</span>
        <Button onClick={submit} disabled={busy}>
          Submit review
        </Button>
      </div>
    </div>
  );
}
