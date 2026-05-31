import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { SaveGigButton } from "@/components/marketplace/SaveGigButton";
import { trackPromotionEvent } from "@/lib/promotions";

export interface GigCardData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
  total_reviews: number;
  promotion_id?: string | null;
  seller?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function GigCard({ gig, promoted }: { gig: GigCardData; promoted?: boolean }) {
  const impressed = useRef(false);
  useEffect(() => {
    if (promoted && gig.promotion_id && !impressed.current) {
      impressed.current = true;
      trackPromotionEvent(gig.promotion_id, "impression");
    }
  }, [promoted, gig.promotion_id]);
  const handleClick = () => {
    if (promoted && gig.promotion_id) trackPromotionEvent(gig.promotion_id, "click");
  };
  const sellerName = gig.seller?.full_name ?? gig.seller?.username ?? "Expert";
  const initial = (sellerName[0] ?? "?").toUpperCase();

  return (
    <Link
      to={`/gig/${gig.id}`}
      onClick={handleClick}
      className="group block bg-background border border-border rounded-2xl overflow-hidden no-underline text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-border-strong"
    >
      <div className="relative h-40 overflow-hidden bg-background-subtle">
        {gig.thumbnail_url ? (
          <img
            src={gig.thumbnail_url}
            alt={gig.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs uppercase text-foreground-subtle"
            style={{ letterSpacing: "0.18em" }}
          >
            No image
          </div>
        )}
        {Number(gig.average_rating) >= 4.8 && gig.total_reviews >= 10 && (
          <span
            className="absolute top-2 left-2 text-[10px] font-semibold uppercase px-2 py-1 rounded-full"
            style={{ background: "#0a0a0a", color: "#fff", letterSpacing: "0.08em" }}
          >
            Top Rated
          </span>
        )}
        {promoted && (
          <span
            className="absolute bottom-2 left-2 text-[10px] font-bold uppercase px-2 py-1 rounded-full"
            style={{ background: "#fff", color: "#0a0a0a", letterSpacing: "0.08em" }}
          >
            Promoted
          </span>
        )}
        <SaveGigButton gigId={gig.id} className="absolute top-2.5 right-2.5" />
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[26px] h-[26px] rounded-full overflow-hidden bg-background-subtle flex items-center justify-center text-[10px] font-semibold text-foreground-muted flex-shrink-0">
            {gig.seller?.avatar_url ? (
              <img src={gig.seller.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : initial}
          </div>
          <span
            className="text-[11px] font-semibold uppercase text-foreground truncate"
            style={{ letterSpacing: "0.04em" }}
          >
            {sellerName}
          </span>
        </div>
        <p
          className="text-[13px] leading-[1.5] text-foreground/80 mb-2.5"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 40,
          }}
        >
          {gig.title}
        </p>
        <div className="flex items-center justify-between pt-2.5 border-t border-[#f0f0f0]">
          {gig.total_reviews > 0 ? (
            <div className="flex items-center gap-1">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span className="text-xs font-semibold" style={{ color: "#F59E0B" }}>
                {Number(gig.average_rating).toFixed(1)}
              </span>
              <span className="text-[11px] text-foreground-subtle">({gig.total_reviews})</span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold uppercase text-foreground-subtle" style={{ letterSpacing: "0.08em" }}>
              New
            </span>
          )}
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase text-foreground-subtle" style={{ letterSpacing: "0.08em" }}>
              From
            </div>
            <div className="text-base font-bold text-foreground">${gig.starting_price}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GigCardSkeleton() {
  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden">
      <div className="h-40 bg-background-subtle" />
      <div className="p-3.5">
        <div className="h-3 w-1/3 bg-background-subtle rounded" />
        <div className="mt-2.5 h-4 w-3/4 bg-background-subtle rounded" />
        <div className="mt-2.5 h-3.5 w-1/4 bg-background-subtle rounded" />
      </div>
    </div>
  );
}
