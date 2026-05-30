// Shared rate-limit helper backed by the `rate_limits` table.
// Fixed-window counter: bucket+identifier+window_start unique row, count incremented per call.
//
// Usage:
//   import { checkRateLimit } from "../_shared/rate-limit.ts";
//   const admin = createClient(SUPABASE_URL, SERVICE_KEY);
//   if (!(await checkRateLimit(admin, { bucket: "ai-search", identifier: `user:${uid}`, limit: 20 }))) {
//     return tooManyRequests();
//   }

// deno-lint-ignore no-explicit-any
type Client = any;

export interface RateLimitArgs {
  bucket: string;
  identifier: string;
  limit: number;
  /** Window size in ms. Defaults to 60s. */
  windowMs?: number;
}

export async function checkRateLimit(admin: Client, args: RateLimitArgs): Promise<boolean> {
  const { bucket, identifier, limit, windowMs = 60_000 } = args;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const { data: existing } = await admin
    .from("rate_limits")
    .select("id,count")
    .eq("bucket", bucket)
    .eq("identifier", identifier)
    .eq("window_start", windowStart)
    .maybeSingle();
  if (existing) {
    if (existing.count >= limit) return false;
    await admin.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await admin.from("rate_limits").insert({ bucket, identifier, window_start: windowStart, count: 1 });
  }
  return true;
}

export function tooManyRequests(headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
    status: 429,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
