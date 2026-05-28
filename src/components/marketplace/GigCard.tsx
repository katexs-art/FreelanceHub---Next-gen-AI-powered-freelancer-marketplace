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
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-background-elevated border border-border">
        {gig.thumbnail_url ? (
          <img src={gig.thumbnail_url} alt={gig.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground-subtle text-xs">No image</div>
        )}
        {Number(gig.average_rating) >= 4.8 && gig.total_reviews >= 10 && (
          <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide font-semibold bg-background/90 text-foreground border border-border rounded-full px-2 py-0.5">
            Top Rated
          </span>
        )}
        {promoted && (
          <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wide font-semibold bg-foreground/90 text-background rounded-full px-2 py-0.5">
            Promoted
          </span>
        )}
        <SaveGigButton gigId={gig.id} className="absolute top-2 right-2" />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium overflow-hidden">
            {gig.seller?.avatar_url
              ? <img src={gig.seller.avatar_url} alt="" className="w-full h-full object-cover" />
              : sellerName[0]?.toUpperCase()}
          </div>
          <span className="text-xs text-foreground-muted truncate">{sellerName}</span>
        </div>
        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {gig.title}
        </p>
        {gig.total_reviews > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="font-medium">{Number(gig.average_rating).toFixed(1)}</span>
            <span className="text-foreground-muted">({gig.total_reviews})</span>
          </div>
        )}
        <div className="text-xs text-foreground-muted">From</div>
        <div className="text-base font-bold">${gig.starting_price}</div>
      </div>
    </Link>
  );
}

export function GigCardSkeleton() {
  return (
    <div>
      <div className="aspect-[4/3] rounded-xl bg-background-elevated animate-pulse" />
      <div className="mt-3 h-4 w-3/4 rounded bg-background-elevated animate-pulse" />
      <div className="mt-2 h-4 w-1/3 rounded bg-background-elevated animate-pulse" />
    </div>
  );
}
