import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type SellerMatch = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  response_time_minutes: number | null;
  average_rating: number;
  total_reviews: number;
  total_orders: number;
  starting_price: number | null;
  tags: string[];
  categories: string[];
  matchScore: number;
  riverScore: number;
};

function tokenize(s: string) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

export default function RiverResults() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<SellerMatch[]>([]);
  const notifiedRef = useRef<string>("");

  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Try Claude-powered matcher first
      try {
        const { data, error } = await supabase.functions.invoke("river-public-match", { body: { query } });
        if (!error && data && Array.isArray((data as any).sellers) && (data as any).sellers.length) {
          const list = ((data as any).sellers as any[]).map((s) => ({
            id: s.id, username: s.username, full_name: s.full_name, avatar_url: s.avatar_url,
            bio: s.bio, response_time_minutes: s.response_time_minutes,
            average_rating: Number(s.average_rating) || 0,
            total_reviews: s.total_reviews || 0, total_orders: s.total_orders || 0,
            starting_price: s.starting_price ?? null,
            tags: s.tags || [], categories: s.categories || [],
            matchScore: s.matchScore || 0, riverScore: Number(s.riverScore) || 0,
          })) as SellerMatch[];
          setSellers(list);
          setLoading(false);

          const sig = `${query}::${list.map((s) => s.id).join(",")}`;
          if (user && query.trim() && list.length && notifiedRef.current !== sig) {
            notifiedRef.current = sig;
            supabase.rpc("notify_river_match", { _query: query, _seller_ids: list.map((s) => s.id) })
              .then(({ error }) => { if (error) console.warn("notify_river_match", error.message); });
          }
          return;
        }
      } catch (e) {
        console.warn("river-public-match failed, using local fallback", e);
      }

      // Fallback: original client-side scoring
      const { data: gigs } = await supabase
        .from("gigs")
        .select("seller_id,title,description,category,subcategory,tags,starting_price,average_rating,total_reviews,total_orders")
        .eq("status", "active")
        .limit(1000);

      const sellerIds = [...new Set((gigs ?? []).map((g) => g.seller_id))];
      if (!sellerIds.length) {
        setSellers([]); setLoading(false); return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,response_time_minutes")
        .in("id", sellerIds);

      const byId = new Map<string, SellerMatch>();
      (profiles ?? []).forEach((p: any) => {
        byId.set(p.id, {
          id: p.id, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url,
          bio: p.bio, response_time_minutes: p.response_time_minutes,
          average_rating: 0, total_reviews: 0, total_orders: 0,
          starting_price: null, tags: [], categories: [], matchScore: 0, riverScore: 0,
        });
      });

      (gigs ?? []).forEach((g: any) => {
        const s = byId.get(g.seller_id);
        if (!s) return;
        s.total_reviews += g.total_reviews || 0;
        s.total_orders += g.total_orders || 0;
        s.average_rating = Math.max(s.average_rating, Number(g.average_rating) || 0);
        if (g.starting_price && (s.starting_price === null || g.starting_price < s.starting_price)) {
          s.starting_price = g.starting_price;
        }
        (g.tags || []).forEach((t: string) => { if (!s.tags.includes(t)) s.tags.push(t); });
        if (g.category && !s.categories.includes(g.category)) s.categories.push(g.category);

        const hay = [g.title, g.description, g.category, g.subcategory, (g.tags || []).join(" "), s.bio, s.full_name]
          .filter(Boolean).join(" ").toLowerCase();
        tokens.forEach((tok) => { if (hay.includes(tok)) s.matchScore += 1; });
      });

      const list = Array.from(byId.values())
        .map((s) => {
          const completion = s.total_orders > 0 ? Math.min(100, 80 + Math.min(20, s.total_reviews)) : 50;
          const completeness =
            (s.bio ? 25 : 0) + (s.avatar_url ? 25 : 0) + (s.tags.length ? 25 : 0) + (s.starting_price ? 25 : 0);
          const river = (s.average_rating / 5) * 40 + completion * 0.35 + completeness * 0.25;
          return { ...s, riverScore: Math.round(river * 10) / 10 };
        })
        .sort((a, b) => (b.matchScore - a.matchScore) || (b.riverScore - a.riverScore))
        .slice(0, 15);

      setSellers(list);
      setLoading(false);

      // Fire-and-forget: notify the matched sellers via River AI
      const sig = `${query}::${list.map((s) => s.id).join(",")}`;
      if (user && query.trim() && list.length && notifiedRef.current !== sig) {
        notifiedRef.current = sig;
        supabase.rpc("notify_river_match", {
          _query: query,
          _seller_ids: list.map((s) => s.id),
        }).then(({ error }) => { if (error) console.warn("notify_river_match", error.message); });
      }
    })();
  }, [query, user?.id]);

  const openMessage = async (sellerId: string) => {
    if (!user) { nav("/login"); return; }
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: sellerId });
    if (error || !data) { toast({ title: "Could not start conversation", description: error?.message }); return; }
    nav(`/inbox/${data}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container-page py-12">
        <div className="surface rounded-lg p-4 mb-8 text-sm text-foreground-muted">
          River AI matched these experts to your exact need. Sorted by best fit.
        </div>

        <header className="mb-10">
          <h1 className="display-md">River found your top matches</h1>
          {query && <p className="mt-3 text-foreground-muted italic">"{query}"</p>}
        </header>

        {loading ? (
          <p className="text-foreground-muted">Searching…</p>
        ) : sellers.length === 0 ? (
          <p className="text-foreground-muted">No matching experts found. Try a different query.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellers.map((s) => (
              <div key={s.id} className="surface rounded-lg p-6 flex flex-col">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-background-subtle shrink-0">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.full_name || "Expert"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-foreground-muted text-sm">
                        {(s.full_name || "?").slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-base truncate">{s.full_name || s.username || "Anonymous"}</div>
                    <div className="mt-1 inline-flex items-center gap-1 mono-tag">
                      <span>RIVER SCORE</span>
                      <span className="tabular">{s.riverScore.toFixed(1)}/100</span>
                    </div>
                  </div>
                </div>

                {s.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.tags.slice(0, 3).map((t) => (
                      <span key={t} className="mono-tag">{t}</span>
                    ))}
                  </div>
                )}

                {s.bio && <p className="mt-4 text-sm text-foreground-muted line-clamp-2">{s.bio}</p>}

                <div className="mt-4 flex items-center justify-between text-xs text-foreground-subtle">
                  <span>
                    {s.response_time_minutes
                      ? `Responds in ~${s.response_time_minutes < 60 ? `${s.response_time_minutes}m` : `${Math.round(s.response_time_minutes / 60)}h`}`
                      : "Response time —"}
                  </span>
                  <span>
                    {s.starting_price ? `From $${(s.starting_price / 100).toFixed(0)}` : "—"}
                  </span>
                </div>

                <div className="mt-6 flex gap-2">
                  <Link to={`/u/${s.username || s.id}`} className="flex-1">
                    <Button className="w-full" size="sm">View Profile</Button>
                  </Link>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openMessage(s.id)}>
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
