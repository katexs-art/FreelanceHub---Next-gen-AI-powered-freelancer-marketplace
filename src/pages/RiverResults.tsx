import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ArrowLeft, Search as SearchIcon, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Seller = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_category: string | null;
  secondary_category: string | null;
  seller_skills: string[] | null;
  average_rating: number | null;
  total_reviews: number | null;
  river_score: number | null;
  response_time_minutes: number | null;
  // computed
  startingPrice: number | null;
  deliveryDays: number | null;
  allTags: string[];
  matchedSkills: number;
  matchedTags: Set<string>;
  hayMatch: boolean;
  riverScore: number;
};

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function fmtPrice(cents: number | null): string {
  if (cents == null) return "—";
  return `$${Math.round(cents / 100)}`;
}

function fmtDelivery(days: number | null): string {
  if (!days) return "—";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function Stars({ rating, count }: { rating: number; count: number }) {
  const full = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-flex" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={12} fill={i <= full ? "#facc15" : "transparent"} stroke="#facc15" strokeWidth={1.5} />
        ))}
      </span>
      <span style={{ color: "#888", fontSize: 12 }}>({count})</span>
    </span>
  );
}

export default function RiverResults() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topSellers, setTopSellers] = useState<Seller[]>([]);
  const [otherSellers, setOtherSellers] = useState<Seller[]>([]);
  const [visibleOther, setVisibleOther] = useState(24);
  const notifiedRef = useRef<string>("");

  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setVisibleOther(24);

      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,primary_category,secondary_category,seller_skills,average_rating,total_reviews,river_score,response_time_minutes")
        .eq("seller_status", "approved")
        .limit(1000);

      const sellerIds = (profs ?? []).map((p: any) => p.id);
      const gigsBySeller = new Map<string, any[]>();
      if (sellerIds.length) {
        const { data: gigs } = await supabase
          .from("gigs")
          .select("seller_id,title,tags,category,starting_price")
          .eq("status", "active")
          .in("seller_id", sellerIds)
          .limit(2000);
        (gigs ?? []).forEach((g: any) => {
          const arr = gigsBySeller.get(g.seller_id) || [];
          arr.push(g);
          gigsBySeller.set(g.seller_id, arr);
        });
      }

      const enriched: Seller[] = (profs ?? []).map((p: any) => {
        const gigs = gigsBySeller.get(p.id) || [];
        const skills: string[] = Array.isArray(p.seller_skills) ? p.seller_skills : [];
        const gigTags: string[] = [];
        let minPrice: number | null = null;
        gigs.forEach((g: any) => {
          (g.tags || []).forEach((t: string) => { if (!gigTags.includes(t)) gigTags.push(t); });
          if (g.starting_price != null && (minPrice == null || g.starting_price < minPrice)) minPrice = g.starting_price;
        });
        const allTags = Array.from(new Set([...skills, ...gigTags]));

        const matchedTags = new Set<string>();
        allTags.forEach((t) => {
          const tl = t.toLowerCase();
          if (tokens.some((tok) => tl.includes(tok))) matchedTags.add(t);
        });

        const hay = [
          p.full_name, p.bio, p.primary_category, p.secondary_category,
          ...gigs.map((g: any) => g.title),
          ...gigs.map((g: any) => g.category),
          ...gigs.flatMap((g: any) => g.tags || []),
        ].filter(Boolean).join(" ").toLowerCase();
        const hayMatch = tokens.length === 0 ? true : tokens.some((tok) => hay.includes(tok)) || matchedTags.size > 0;

        const riverScore = p.river_score != null ? Number(p.river_score) : Math.round(((Number(p.average_rating) || 0) / 5) * 100);

        return {
          id: p.id,
          username: p.username,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          bio: p.bio,
          primary_category: p.primary_category,
          secondary_category: p.secondary_category,
          seller_skills: skills,
          average_rating: p.average_rating,
          total_reviews: p.total_reviews,
          river_score: p.river_score,
          response_time_minutes: p.response_time_minutes,
          startingPrice: minPrice,
          deliveryDays: null,
          allTags,
          matchedSkills: matchedTags.size,
          matchedTags,
          hayMatch,
          riverScore,
        };
      });

      const matched = enriched.filter((s) => s.hayMatch || s.matchedSkills > 0);

      const top = [...matched].sort((a, b) =>
        (b.matchedSkills - a.matchedSkills) ||
        (b.riverScore - a.riverScore) ||
        ((Number(b.average_rating) || 0) - (Number(a.average_rating) || 0))
      ).slice(0, 15);

      const topIds = new Set(top.map((s) => s.id));
      const others = matched
        .filter((s) => !topIds.has(s.id))
        .sort((a, b) =>
          ((Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)) ||
          ((b.total_reviews || 0) - (a.total_reviews || 0))
        )
        .slice(0, 50);

      if (cancelled) return;
      setTopSellers(top);
      setOtherSellers(others);
      setLoading(false);

      const sig = `${query}::${top.map((s) => s.id).join(",")}`;
      if (user && query.trim() && top.length && notifiedRef.current !== sig) {
        notifiedRef.current = sig;
        supabase.rpc("notify_river_match", { _query: query, _seller_ids: top.map((s) => s.id) })
          .then(({ error }) => { if (error) console.warn("notify_river_match", error.message); });
      }
    })();
    return () => { cancelled = true; };
  }, [query, user?.id]);

  const openMessage = async (sellerId: string) => {
    if (!user) { nav("/login"); return; }
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: sellerId });
    if (error || !data) { toast({ title: "Could not start conversation", description: error?.message }); return; }
    nav(`/inbox/${data}`);
  };

  const totalCount = topSellers.length + otherSellers.length;
  const noResults = !loading && totalCount === 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      <SiteHeader />

      {/* Page header */}
      <div style={{
        background: "#fff", padding: "32px 80px", borderBottom: "1px solid #f0f0f0",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16,
      }}>
        <div>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#000", textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#888" }}>Results for</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#000", marginTop: 2 }}>"{query}"</div>
        </div>
        <div style={{ fontSize: 13, color: "#888", textAlign: "right" }}>
          {loading ? "Searching…" : `${totalCount} expert${totalCount === 1 ? "" : "s"} found`}
        </div>
      </div>

      <main style={{ flex: 1 }}>
        {noResults ? (
          <div style={{ background: "#fff", padding: "96px 80px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999, background: "#f5f5f5",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
            }}>
              <SearchIcon size={26} color="#999" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#000" }}>No experts found for this search</div>
            <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>Try different keywords or browse all experts</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 24 }}>
              <Link to="/" style={pillBtn(false)}>Try Another Search</Link>
              <Link to="/browse" style={pillBtn(true)}>Browse All Experts</Link>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1 HEADER STRIP */}
            <div style={{
              background: "#111", borderBottom: "1px solid #222", padding: "16px 80px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#a855f7", display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", letterSpacing: "0.05em" }}>
                  River's Top 15 Matches
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#555" }}>Ranked by River Score and skill match</span>
            </div>

            {/* SECTION 1 */}
            <section style={{ background: "#0a0a0a", padding: "48px 80px" }}>
              {topSellers.length === 0 ? (
                <div style={{ color: "#fff", fontSize: 14, textAlign: "center", padding: 32 }}>
                  River is still learning this category — browse all experts below
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  {topSellers.map((s) => (
                    <TopCard key={s.id} s={s} onPitch={() => openMessage(s.id)} />
                  ))}
                </div>
              )}
            </section>

            {/* DIVIDER */}
            <div style={{
              background: "#fff", padding: "20px 80px", textAlign: "center",
              borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #f0f0f0",
              fontSize: 13, color: "#999",
            }}>
              River's picks are above · All matching experts are below
            </div>

            {/* SECTION 2 */}
            <section style={{ background: "#fff", padding: "48px 80px" }}>
              <div style={{ marginBottom: 16, fontSize: 13, color: "#999" }}>
                Showing {otherSellers.length} expert{otherSellers.length === 1 ? "" : "s"} for [{query}]
              </div>

              {otherSellers.length === 0 ? (
                <div style={{ fontSize: 14, color: "#888", textAlign: "center", padding: 32 }}>
                  No additional experts for this search.
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {otherSellers.slice(0, visibleOther).map((s) => (
                      <OtherCard key={s.id} s={s} onMessage={() => openMessage(s.id)} />
                    ))}
                  </div>

                  {visibleOther < otherSellers.length && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                      <button onClick={() => setVisibleOther((v) => v + 24)} style={{
                        background: "transparent", color: "#000", border: "1px solid #d4d4d4",
                        borderRadius: 999, padding: "10px 24px", fontSize: 13, cursor: "pointer",
                      }}>Load More</button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function TopCard({ s, onPitch }: { s: Seller; onPitch: () => void }) {
  const [viewHover, setViewHover] = useState(false);
  const [pitchHover, setPitchHover] = useState(false);
  const badge = s.matchedSkills >= 3
    ? { label: "Perfect match", bg: "#1a3a1a", color: "#4ade80" }
    : s.matchedSkills === 2
    ? { label: "Strong match", bg: "#1a1a3a", color: "#60a5fa" }
    : { label: "Good match", bg: "#2a2a2a", color: "#aaa" };
  const tagsToShow = s.allTags.slice(0, 3);
  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: 24,
      boxShadow: "0 4px 24px rgba(255,255,255,0.04)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#fff", lineHeight: 1 }}>
            {Math.round(s.riverScore)}
          </div>
          <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>
            River Score
          </div>
        </div>
        <span style={{
          background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 500,
          padding: "4px 12px", borderRadius: 999,
        }}>{badge.label}</span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginTop: 12, marginBottom: 4 }}>
        {s.full_name || s.username || "Anonymous"}
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>
        {s.primary_category || "AI Expert"}
      </div>

      {tagsToShow.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {tagsToShow.map((t) => {
            const matched = s.matchedTags.has(t);
            return (
              <span key={t} style={{
                background: matched ? "#1a3a1a" : "#252525",
                border: `1px solid ${matched ? "#4ade80" : "#333"}`,
                color: matched ? "#4ade80" : "#ccc",
                borderRadius: 999, padding: "4px 10px", fontSize: 11,
              }}>{t}</span>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {[1,2,3,4,5].map((i) => (
            <Star key={i} size={12} fill={i <= Math.round(Number(s.average_rating) || 0) ? "#f59e0b" : "transparent"} stroke="#f59e0b" strokeWidth={1.5} />
          ))}
          <span style={{ fontSize: 12, color: "#666", marginLeft: 2 }}>({s.total_reviews || 0})</span>
        </span>
        <span style={{ color: "#333" }}>·</span>
        <span style={{ fontSize: 12, color: "#777" }}>
          {s.response_time_minutes ? `~${s.response_time_minutes < 60 ? `${s.response_time_minutes}m` : `${Math.round(s.response_time_minutes / 60)}h`}` : "—"}
        </span>
        <span style={{ color: "#333" }}>·</span>
        <span style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>
          {s.startingPrice ? `From ${fmtPrice(s.startingPrice)}` : "—"}
        </span>
      </div>

      <div style={{
        marginTop: 18, paddingTop: 14, borderTop: "1px solid #2a2a2a",
        display: "flex", gap: 8,
      }}>
        <Link to={`/u/${s.username || s.id}`}
          onMouseEnter={() => setViewHover(true)} onMouseLeave={() => setViewHover(false)}
          style={{
            flex: 1, textAlign: "center",
            background: viewHover ? "#fff" : "transparent",
            color: viewHover ? "#000" : "#fff",
            border: "1px solid #444", borderRadius: 999,
            padding: "8px 18px", fontSize: 12, fontWeight: 500, textDecoration: "none",
            transition: "all 0.2s",
          }}>View Profile</Link>
        <button onClick={onPitch}
          onMouseEnter={() => setPitchHover(true)} onMouseLeave={() => setPitchHover(false)}
          style={{
            flex: 1, background: pitchHover ? "#e5e5e5" : "#fff", color: "#000", border: "none",
            borderRadius: 999, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
          }}>Get a Pitch</button>
      </div>
    </div>
  );
}

function OtherCard({ s, onMessage }: { s: Seller; onMessage: () => void }) {
  const [cardHover, setCardHover] = useState(false);
  const [viewHover, setViewHover] = useState(false);
  const [msgHover, setMsgHover] = useState(false);
  const tagsToShow = s.allTags.slice(0, 3);
  const rating = Number(s.average_rating) || 0;
  const full = Math.round(rating);
  const online = false; // last_seen not selected; keep dot off unless we add it
  return (
    <div
      onMouseEnter={() => setCardHover(true)} onMouseLeave={() => setCardHover(false)}
      style={{
        background: "#fff", border: "1px solid #e5e5e5", borderRadius: 16, padding: 20,
        boxShadow: cardHover ? "0 2px 12px rgba(0,0,0,0.04)" : "none",
        transition: "box-shadow 0.2s",
        display: "flex", flexDirection: "column",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999, overflow: "hidden", background: "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {s.avatar_url ? (
              <img src={s.avatar_url} alt={s.full_name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "#888", fontSize: 15, fontWeight: 500 }}>
                {(s.full_name || s.username || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          {online && (
            <span style={{
              position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: 999,
              background: "#22c55e", border: "2px solid #fff",
            }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>{s.full_name || s.username || "Anonymous"}</div>
          <div style={{ marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {[1,2,3,4,5].map((i) => (
              <Star key={i} size={12} fill={i <= full ? "#f59e0b" : "transparent"} stroke="#f59e0b" strokeWidth={1.5} />
            ))}
            <span style={{ fontSize: 12, fontWeight: 500, color: "#000", marginLeft: 2 }}>{rating ? rating.toFixed(1) : "—"}</span>
            <span style={{ fontSize: 12, color: "#888" }}>({s.total_reviews || 0})</span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 12, fontSize: 13, color: "#666", lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden", marginBottom: 12,
      }}>
        {s.bio || s.primary_category || ""}
      </div>

      {tagsToShow.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {tagsToShow.map((t) => (
            <span key={t} style={{
              background: "#f5f5f5", color: "#555", borderRadius: 999,
              padding: "3px 10px", fontSize: 11,
            }}>{t}</span>
          ))}
        </div>
      )}

      <div style={{
        marginTop: "auto", paddingTop: 12, borderTop: "1px solid #f0f0f0",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 14, color: "#000", fontWeight: 600 }}>
          {s.startingPrice ? `From ${fmtPrice(s.startingPrice)}` : "—"}
        </span>
        <span style={{ fontSize: 13, color: "#888" }}>
          {s.response_time_minutes ? `~${s.response_time_minutes < 60 ? `${s.response_time_minutes}m` : `${Math.round(s.response_time_minutes / 60)}h`}` : ""}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Link to={`/u/${s.username || s.id}`}
            onMouseEnter={() => setViewHover(true)} onMouseLeave={() => setViewHover(false)}
            style={{
              background: viewHover ? "#000" : "#fff",
              color: viewHover ? "#fff" : "#000",
              border: "1px solid #000", borderRadius: 999,
              padding: "7px 16px", fontSize: 12, fontWeight: 500, textDecoration: "none",
              transition: "all 0.2s",
            }}>View Profile</Link>
          <button onClick={onMessage}
            onMouseEnter={() => setMsgHover(true)} onMouseLeave={() => setMsgHover(false)}
            style={{
              background: "#fff",
              color: msgHover ? "#000" : "#555",
              border: `1px solid ${msgHover ? "#000" : "#e5e5e5"}`,
              borderRadius: 999, padding: "7px 16px", fontSize: 12, cursor: "pointer",
              transition: "all 0.2s",
            }}>Message</button>
        </div>
      </div>
    </div>
  );
}


function pillBtn(filled: boolean): React.CSSProperties {
  return filled
    ? { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px", fontSize: 13, textDecoration: "none" }
    : { background: "transparent", color: "#000", border: "1px solid #d4d4d4", borderRadius: 999, padding: "10px 22px", fontSize: 13, textDecoration: "none" };
}
