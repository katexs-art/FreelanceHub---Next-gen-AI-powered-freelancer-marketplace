const KEY = "katexs:recently-viewed-gigs";
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
