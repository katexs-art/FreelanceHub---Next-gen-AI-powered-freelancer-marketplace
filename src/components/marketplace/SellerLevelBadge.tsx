import { computeSellerLevel } from "@/lib/sellerLevel";
import { cn } from "@/lib/utils";

interface Props {
  orders: number;
  rating: number;
  reviews: number;
  className?: string;
}

export function SellerLevelBadge({ orders, rating, reviews, className }: Props) {
  const { level, label } = computeSellerLevel({ orders, rating, reviews });
  const styles: Record<string, string> = {
    new: "bg-background-elevated text-foreground-muted border-border",
    level_1: "bg-background-elevated text-foreground border-border-strong",
    level_2: "bg-foreground/10 text-foreground border-foreground/30",
    top_rated: "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] uppercase tracking-wide font-semibold border rounded-full px-2 py-0.5",
        styles[level],
        className,
      )}
    >
      {label}
    </span>
  );
}
