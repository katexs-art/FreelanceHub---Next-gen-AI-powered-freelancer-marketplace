import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SellerRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_category: string | null;
  secondary_category: string | null;
  seller_skills: string[] | null;
  river_score: number | null;
  average_rating: number | null;
  total_reviews: number;
  is_online: boolean;
}

function initials(s: SellerRow) {
  const n = (s.full_name ?? s.username ?? "?").trim();
  return n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function FindExperts() {
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,primary_category,secondary_category,seller_skills,river_score,average_rating,total_reviews,is_online")
        .eq("role", "seller")
        .eq("seller_status", "approved")
        .is("suspended_at", null)
        .order("river_score", { ascending: false, nullsFirst: false });
      setSellers((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sellers;
    return sellers.filter((s) =>
      [s.full_name, s.username, s.bio, s.primary_category, s.secondary_category, ...(s.seller_skills ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [sellers, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Find Experts — Katexs" description="Browse verified AI experts ready to deliver." />
      <SiteHeader />
      <main className="flex-1 container py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Find experts</h1>
          <p className="text-foreground-muted mt-1">Browse verified sellers on Katexs.</p>
          <div className="mt-5 relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, skill or category"
              className="pl-9 h-11"
            />
          </div>
        </header>

        {loading ? (
          <p className="text-foreground-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-foreground-muted">No experts found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => {
              const name = s.full_name ?? s.username ?? "Expert";
              const tags = (s.seller_skills ?? []).slice(0, 3);
              if (tags.length === 0 && s.primary_category) tags.push(s.primary_category);
              const handle = s.username ?? s.id;
              return (
                <div key={s.id} className="bg-background border border-border rounded-2xl p-5 flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt={name} className="w-full h-full object-cover" />
                        : <span>{initials(s)}</span>}
                      {s.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold truncate">{name}</h2>
                        {s.river_score != null && (
                          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            River {Number(s.river_score).toFixed(0)}
                          </span>
                        )}
                      </div>
                      {s.username && <p className="text-xs text-foreground-muted truncate">@{s.username}</p>}
                      {s.primary_category && (
                        <p className="text-xs text-foreground-muted mt-0.5 truncate">{s.primary_category}</p>
                      )}
                    </div>
                  </div>

                  {s.bio && (
                    <p className="mt-3 text-sm text-foreground-muted line-clamp-2">{s.bio}</p>
                  )}

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-foreground-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-foreground-muted">
                    <span>
                      {s.average_rating ? `★ ${Number(s.average_rating).toFixed(1)} (${s.total_reviews})` : "New expert"}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/seller/${handle}`}>View profile</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
