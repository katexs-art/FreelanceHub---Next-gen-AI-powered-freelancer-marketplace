import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { SaveGigButton } from "@/components/marketplace/SaveGigButton";

export interface GigCardData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
  total_reviews: number;
  seller?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function GigCard({ gig, promoted }: { gig: GigCardData; promoted?: boolean }) {
  const sellerName = gig.seller?.full_name ?? gig.seller?.username ?? "Seller";
  return (
    <Link to={`/gig/${gig.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden border-hairline bg-background-subtle transition-colors group-hover:border-white/20">
        {gig.thumbnail_url ? (
          <img src={gig.thumbnail_url} alt={gig.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground-subtle font-mono text-xs uppercase tracking-[0.18em]">
            No image
          </div>
        )}
        {Number(gig.average_rating) >= 4.8 && gig.total_reviews >= 10 && (
          <span className="absolute top-2 left-2 mono-tag bg-background/90 text-foreground">Top Rated</span>
        )}
        {promoted && (
          <span className="absolute bottom-2 left-2 mono-tag bg-foreground text-background border-foreground">Promoted</span>
        )}
        <SaveGigButton gigId={gig.id} className="absolute top-2 right-2" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-background-elevated text-foreground-muted text-[10px] flex items-center justify-center font-mono overflow-hidden border-hairline">
            {gig.seller?.avatar_url
              ? <img src={gig.seller.avatar_url} alt="" className="w-full h-full object-cover" />
              : sellerName[0]?.toUpperCase()}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground-muted truncate">{sellerName}</span>
        </div>
        <p className="text-sm leading-snug line-clamp-2 text-foreground group-hover:text-foreground">
          {gig.title}
        </p>
        <div className="flex items-center justify-between pt-2 border-t-hairline">
          {gig.total_reviews > 0 ? (
            <div className="flex items-center gap-1 font-mono text-xs tabular">
              <Star className="h-3 w-3 fill-foreground text-foreground" />
              <span>{Number(gig.average_rating).toFixed(1)}</span>
              <span className="text-foreground-subtle">({gig.total_reviews})</span>
            </div>
          ) : <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-subtle">New</span>}
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-subtle">From</div>
            <div className="font-mono text-base tabular">${gig.starting_price}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GigCardSkeleton() {
  return (
    <div>
      <div className="aspect-[4/3] skeleton" />
      <div className="mt-3 h-3 w-1/3 skeleton" />
      <div className="mt-2 h-4 w-3/4 skeleton" />
      <div className="mt-2 h-4 w-1/4 skeleton" />
    </div>
  );
}
