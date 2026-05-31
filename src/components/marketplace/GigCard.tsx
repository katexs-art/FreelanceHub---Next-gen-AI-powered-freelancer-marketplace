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
  return (
    <Link
      to={`/gig/${gig.id}`}
      onClick={handleClick}
      className="group block"
      style={{
        background: "#1a1a1a",
        border: "1px solid #333333",
        borderRadius: 16,
        overflow: "hidden",
        textDecoration: "none",
        color: "#ffffff",
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "#0a0a0a" }}>
        {gig.thumbnail_url ? (
          <img
            src={gig.thumbnail_url}
            alt={gig.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-mono text-xs uppercase"
            style={{ color: "#888888", letterSpacing: "0.18em" }}
          >
            No image
          </div>
        )}
        {Number(gig.average_rating) >= 4.8 && gig.total_reviews >= 10 && (
          <span
            className="absolute top-2 left-2"
            style={{
              background: "rgba(0,0,0,0.7)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            Top Rated
          </span>
        )}
        {promoted && (
          <span
            className="absolute bottom-2 left-2"
            style={{
              background: "#ffffff",
              color: "#000000",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            Promoted
          </span>
        )}
        <SaveGigButton gigId={gig.id} className="absolute top-2 right-2" />
      </div>
      <div style={{ background: "#1a1a1a", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#252525",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {gig.seller?.avatar_url ? (
              <img src={gig.seller.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              sellerName[0]?.toUpperCase()
            )}
          </div>
          <span
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sellerName}
          </span>
        </div>
        <p
          style={{
            color: "#dddddd",
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 400,
            margin: "0 0 12px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 42,
          }}
        >
          {gig.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #2a2a2a" }}>
          {gig.total_reviews > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={13} fill="#f59e0b" color="#f59e0b" />
              <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                {Number(gig.average_rating).toFixed(1)}
              </span>
              <span style={{ color: "#888888", fontSize: 12 }}>({gig.total_reviews})</span>
            </div>
          ) : (
            <span style={{ color: "#888888", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              New
            </span>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#777777", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              From
            </div>
            <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 700 }}>${gig.starting_price}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GigCardSkeleton() {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333333", borderRadius: 16, overflow: "hidden" }}>
      <div className="aspect-[4/3]" style={{ background: "#0a0a0a" }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 12, width: "33%", background: "#252525", borderRadius: 4 }} />
        <div style={{ marginTop: 10, height: 16, width: "75%", background: "#252525", borderRadius: 4 }} />
        <div style={{ marginTop: 10, height: 14, width: "25%", background: "#252525", borderRadius: 4 }} />
      </div>
    </div>
  );
}
