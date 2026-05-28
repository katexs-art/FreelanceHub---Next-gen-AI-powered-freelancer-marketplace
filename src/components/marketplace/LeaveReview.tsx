import { useEffect, useState } from "react";
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

export function LeaveReview({ orderId, gigId, buyerId, sellerId, currentUserId, onDone }: Props) {
  const role = currentUserId === buyerId ? "buyer" : "seller";
  const [existing, setExisting] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("reviews").select("*")
      .eq("order_id", orderId).eq("reviewer_role", role).maybeSingle()
      .then(({ data }) => setExisting(data));
  }, [orderId, role]);

  if (existing) {
    return (
      <div className="border border-border rounded-lg p-4 bg-background-elevated">
        <div className="flex items-center gap-1 mb-2">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} className={cn("h-4 w-4", n <= existing.rating ? "fill-warning text-warning" : "text-foreground-subtle")} />
          ))}
        </div>
        <p className="text-sm">{existing.review_text || <span className="italic text-foreground-muted">No comment</span>}</p>
      </div>
    );
  }

  const submit = async () => {
    if (rating === 0) return toast.error("Pick a star rating");
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId, gig_id: gigId, buyer_id: buyerId, seller_id: sellerId,
      reviewer_role: role, rating, review_text: text, is_public: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Review submitted");
    onDone?.();
  };

  return (
    <div className="border border-border rounded-lg p-5 space-y-3">
      <h4 className="font-semibold text-sm">Leave a review</h4>
      <div className="flex gap-1">
        {[1,2,3,4,5].map((n) => (
          <button key={n} onClick={() => setRating(n)} type="button">
            <Star className={cn("h-7 w-7 transition-colors",
              n <= rating ? "fill-warning text-warning" : "text-foreground-subtle hover:text-warning")} />
          </button>
        ))}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder={role === "buyer" ? "How was the service?" : "Feedback on this buyer"} />
      <Button onClick={submit} disabled={busy}>Submit review</Button>
    </div>
  );
}
