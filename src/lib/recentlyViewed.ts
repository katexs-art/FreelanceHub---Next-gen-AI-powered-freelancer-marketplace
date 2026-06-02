const KEY = "katexs:recently-viewed-gigs";
const CAT_KEY = "katexs:recent-categories";
const MAX = 12;

export function trackRecentlyViewed(gigId: string) {
  try {
    const cur = getRecentlyViewed();
    const next = [gigId, ...cur.filter((id) => id !== gigId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function trackCategoryView(slug: string | null | undefined) {
  if (!slug) return;
  try {
    const cur = getRecentCategories();
    const next = [slug, ...cur.filter((s) => s !== slug)].slice(0, MAX);
    localStorage.setItem(CAT_KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentCategories(): string[] {
  try {
    const raw = localStorage.getItem(CAT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
