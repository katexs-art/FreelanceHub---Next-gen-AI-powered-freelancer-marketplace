export type SellerLevel = "new" | "level_1" | "level_2" | "top_rated";

export interface LevelInfo {
  level: SellerLevel;
  label: string;
}

export function computeSellerLevel(opts: {
  orders: number;
  rating: number;
  reviews: number;
}): LevelInfo {
  const { orders, rating, reviews } = opts;
  if (orders >= 100 && rating >= 4.8 && reviews >= 50) return { level: "top_rated", label: "Top Rated" };
  if (orders >= 50 && rating >= 4.7 && reviews >= 25) return { level: "level_2", label: "Level 2" };
  if (orders >= 10 && rating >= 4.5 && reviews >= 5) return { level: "level_1", label: "Level 1" };
  return { level: "new", label: "New Expert" };
}
