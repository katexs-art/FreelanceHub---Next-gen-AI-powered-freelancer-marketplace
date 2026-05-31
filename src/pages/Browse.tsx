import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Star, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function tokenizeQ(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}
function fmtCents(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return `$${Math.round(cents / 100)}`;
}

const CATEGORIES = [
  "All",
  "Build with AI",
  "Sound and Speak with AI",
  "Create with AI",
  "Grow with AI",
  "Run with AI",
  "Understand AI",
  "Write with AI",
  "Learn AI",
];

const QUICK_FILTERS = [
  "Available Now",
  "Top Rated",
  "Fast Delivery under 3 days",
  "Budget under $50",
  "Pro Experts",
  "Elite Experts",
] as const;
type Quick = (typeof QUICK_FILTERS)[number];

const SORTS = [
  "River Recommended",
  "Highest Rated",
  "Most Projects",
  "Fastest Delivery",
  "Lowest Price",
  "Newest",
] as const;
type Sort = (typeof SORTS)[number];

const PAGE = 24;

type Seller = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  seller_skills: string[] | null;
  primary_category: string | null;
  secondary_category: string | null;
  river_score: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  is_online: boolean | null;
  last_seen: string | null;
  member_since: string | null;
  // aggregated
  startingPrice: number;
  minDelivery: number;
  totalOrders: number;
  gigTitles: string[];
  gigTags: string[];
};

function sellerLevel(score: number | null): "Elite" | "Pro" | "Rising" {
  const s = score ?? 0;
  if (s >= 9) return "Elite";
  if (s >= 7) return "Pro";
  return "Rising";
}

function isOnline(s: Seller) {
  if (s.is_online) return true;
  if (!s.last_seen) return false;
  return Date.now() - new Date(s.last_seen).getTime() < 24 * 3600 * 1000;
}

export default function Browse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalApproved, setTotalApproved] = useState(0);

  const [searchParams] = useSearchParams();
  const urlQ = (searchParams.get("q") ?? "").trim();
  const [query, setQuery] = useState(urlQ);
  const [pendingQuery, setPendingQuery] = useState(urlQ);
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [quick, setQuick] = useState<Set<Quick>>(new Set());
  const [sort, setSort] = useState<Sort>("River Recommended");
  const [page, setPage] = useState(1);
  const [riverOtherVisible, setRiverOtherVisible] = useState(24);

  // Keep search state in sync with URL ?q=
  useEffect(() => {
    setQuery(urlQ);
    setPendingQuery(urlQ);
  }, [urlQ]);

  // Initial load
  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, bio, seller_skills, primary_category, secondary_category, river_score, average_rating, total_reviews, is_online, last_seen, member_since"
        )
        .eq("seller_status", "approved")
        .is("suspended_at", null)
        .limit(500);

      const ids = (profs ?? []).map((p: any) => p.id);
      const [gigsRes, pkgsRes] = await Promise.all([
        ids.length
          ? supabase
              .from("gigs")
              .select("id, seller_id, title, tags, starting_price, total_orders")
              .in("seller_id", ids)
              .eq("status", "active")
          : Promise.resolve({ data: [] as any }),
        Promise.resolve({ data: [] as any }),
      ]);

      // delivery days from gig_packages min per gig
      const gigIds = (gigsRes.data ?? []).map((g: any) => g.id);
      const { data: pkgs } = gigIds.length
        ? await supabase.from("gig_packages").select("gig_id, delivery_days").in("gig_id", gigIds)
        : { data: [] as any };
      const minDaysByGig = new Map<string, number>();
      for (const p of pkgs ?? []) {
        const cur = minDaysByGig.get(p.gig_id);
        if (cur === undefined || p.delivery_days < cur) minDaysByGig.set(p.gig_id, p.delivery_days);
      }

      const gigsBySeller = new Map<string, any[]>();
      for (const g of gigsRes.data ?? []) {
        const arr = gigsBySeller.get(g.seller_id) ?? [];
        arr.push(g);
        gigsBySeller.set(g.seller_id, arr);
      }

      const merged: Seller[] = (profs ?? []).map((p: any) => {
        const gs = gigsBySeller.get(p.id) ?? [];
        const prices = gs.map((g: any) => g.starting_price).filter((n: number) => n > 0);
        const days = gs
          .map((g: any) => minDaysByGig.get(g.id))
          .filter((n: number | undefined): n is number => typeof n === "number");
        const orders = gs.reduce((acc: number, g: any) => acc + (g.total_orders ?? 0), 0);
        return {
          ...p,
          startingPrice: prices.length ? Math.min(...prices) : 0,
          minDelivery: days.length ? Math.min(...days) : 0,
          totalOrders: orders,
          gigTitles: gs.map((g: any) => g.title ?? "").filter(Boolean),
          gigTags: gs.flatMap((g: any) => g.tags ?? []),
        };
      });

      setSellers(merged);
      setTotalApproved(merged.length);
      setLoading(false);
    })();

    const { count: _ } = {} as any;
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("seller_status", "approved")
      .is("suspended_at", null)
      .then(({ count }) => count != null && setTotalApproved(count));

    const channel = supabase
      .channel("browse-sellers-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: "seller_status=eq.approved" },
        () => {
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("seller_status", "approved")
            .is("suspended_at", null)
            .then(({ count }) => count != null && setTotalApproved(count));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = sellers.slice();

    if (q) {
      out = out.filter((s) => {
        const hay = [
          s.full_name ?? "",
          s.username ?? "",
          s.bio ?? "",
          s.primary_category ?? "",
          s.secondary_category ?? "",
          ...(s.seller_skills ?? []),
          ...s.gigTitles,
          ...s.gigTags,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (category !== "All") {
      const c = category.toLowerCase();
      out = out.filter(
        (s) =>
          (s.primary_category ?? "").toLowerCase() === c ||
          (s.secondary_category ?? "").toLowerCase() === c
      );
    }

    if (quick.has("Available Now")) out = out.filter(isOnline);
    if (quick.has("Top Rated")) out = out.filter((s) => (s.average_rating ?? 0) >= 4.8);
    if (quick.has("Fast Delivery under 3 days"))
      out = out.filter((s) => s.minDelivery > 0 && s.minDelivery < 3);
    if (quick.has("Budget under $50"))
      out = out.filter((s) => s.startingPrice > 0 && s.startingPrice < 5000);
    if (quick.has("Pro Experts")) out = out.filter((s) => (s.river_score ?? 0) >= 7);
    if (quick.has("Elite Experts")) out = out.filter((s) => (s.river_score ?? 0) >= 9);

    switch (sort) {
      case "Highest Rated":
        out.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
        break;
      case "Most Projects":
        out.sort((a, b) => b.totalOrders - a.totalOrders);
        break;
      case "Fastest Delivery":
        out.sort((a, b) => (a.minDelivery || 999) - (b.minDelivery || 999));
        break;
      case "Lowest Price":
        out.sort((a, b) => (a.startingPrice || Infinity) - (b.startingPrice || Infinity));
        break;
      case "Newest":
        out.sort(
          (a, b) =>
            new Date(b.member_since ?? 0).getTime() - new Date(a.member_since ?? 0).getTime()
        );
        break;
      case "River Recommended":
      default:
        out.sort((a, b) => (b.river_score ?? 0) - (a.river_score ?? 0));
    }

    return out;
  }, [sellers, query, category, quick, sort]);

  useEffect(() => {
    setPage(1);
  }, [query, category, quick, sort]);

  const visible = filtered.slice(0, page * PAGE);

  // River-style search results when ?q= is present in URL
  const riverResults = useMemo(() => {
    if (!urlQ) return null;
    const tokens = tokenizeQ(urlQ);
    const qLower = urlQ.toLowerCase();
    const scored = sellers.map((s) => {
      const allTags = Array.from(
        new Set([...(s.seller_skills ?? []), ...s.gigTags])
      );
      const matchedTags = new Set<string>();
      allTags.forEach((t) => {
        const tl = t.toLowerCase();
        if (tokens.length ? tokens.some((tok) => tl.includes(tok)) : tl.includes(qLower)) {
          matchedTags.add(t);
        }
      });
      const hay = [
        s.full_name ?? "",
        s.username ?? "",
        s.bio ?? "",
        s.primary_category ?? "",
        s.secondary_category ?? "",
        ...allTags,
        ...s.gigTitles,
      ].join(" ").toLowerCase();
      const hayMatch = tokens.length
        ? tokens.some((tok) => hay.includes(tok))
        : hay.includes(qLower);
      const match = hayMatch || matchedTags.size > 0;
      const riverScore =
        s.river_score != null
          ? Number(s.river_score)
          : Math.round(((Number(s.average_rating) || 0) / 5) * 100);
      return { s, match, matchedTags, allTags, riverScore };
    });
    const matched = scored.filter((x) => x.match);
    const top = [...matched]
      .sort(
        (a, b) =>
          b.matchedTags.size - a.matchedTags.size ||
          b.riverScore - a.riverScore ||
          (Number(b.s.average_rating) || 0) - (Number(a.s.average_rating) || 0)
      )
      .slice(0, 15);
    const topIds = new Set(top.map((x) => x.s.id));
    const others = matched
      .filter((x) => !topIds.has(x.s.id))
      .sort(
        (a, b) =>
          (Number(b.s.average_rating) || 0) - (Number(a.s.average_rating) || 0) ||
          (b.s.total_reviews || 0) - (a.s.total_reviews || 0)
      );
    return { top, others };
  }, [urlQ, sellers]);

  useEffect(() => {
    setRiverOtherVisible(24);
  }, [urlQ]);

  const runSearch = () => setQuery(pendingQuery);
  const clearAll = () => {
    setQuery("");
    setPendingQuery("");
    setCategory("All");
    setQuick(new Set());
  };
  const toggleQuick = (q: Quick) => {
    setQuick((prev) => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });
  };
  const onTagClick = (tag: string) => {
    setQuery(tag);
    setPendingQuery(tag);
  };

  const openMessage = async (sellerId: string) => {
    if (!user) {
      navigate("/login?next=/browse");
      return;
    }
    if (user.id === sellerId) return;
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, participant_one, participant_two")
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${sellerId}),and(participant_one.eq.${sellerId},participant_two.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();
      let convoId = existing?.id;
      if (!convoId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ participant_one: user.id, participant_two: sellerId })
          .select("id")
          .single();
        if (error) throw error;
        convoId = created.id;
      }
      navigate(`/inbox/${convoId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open message thread");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-5 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", lineHeight: 1.15 }}>
                Browse AI Experts
              </h1>
              <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
                Search by keyword, skill, or service — find exactly who you need
              </p>
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>
                {totalApproved.toLocaleString()}
              </span>{" "}
              experts on Katexs
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6 flex items-center gap-2"
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 999,
              padding: "6px 8px 6px 24px",
            }}
          >
            <input
              value={pendingQuery}
              onChange={(e) => setPendingQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search by keyword, skill, or service — example: voice AI, GoHighLevel, chatbot..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 15,
                padding: "8px 0",
                color: "#111",
              }}
            />
            {query && (
              <button
                onClick={clearAll}
                aria-label="Clear search"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#666",
                  padding: 6,
                  cursor: "pointer",
                  display: "inline-flex",
                }}
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={runSearch}
              style={{
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>

          {/* Category pills + sort */}
          <div className="mt-5 flex items-center gap-3 flex-wrap justify-between">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    style={{
                      background: active ? "#000" : "#fff",
                      color: active ? "#fff" : "#333",
                      border: `1px solid ${active ? "#000" : "#e5e5e5"}`,
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                color: "#333",
                cursor: "pointer",
              }}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  Sort: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Quick filters */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {QUICK_FILTERS.map((q) => {
              const active = quick.has(q);
              return (
                <button
                  key={q}
                  onClick={() => toggleQuick(q)}
                  style={{
                    background: active ? "#000" : "#fff",
                    color: active ? "#fff" : "#333",
                    border: `1px solid ${active ? "#000" : "#e5e5e5"}`,
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Results bar */}
          <div className="mt-6 flex items-center gap-3" style={{ fontSize: 13, color: "#666" }}>
            <span>
              Showing <strong style={{ color: "#111" }}>{filtered.length}</strong> experts
            </span>
            {query && (
              <button
                onClick={clearAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#f5f5f5",
                  border: "1px solid #e5e5e5",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "#333",
                  cursor: "pointer",
                }}
              >
                "{query}" <X size={12} />
              </button>
            )}
          </div>

          {/* Grid / empty / loading */}
          {loading ? (
            <div className="mt-6 text-sm" style={{ color: "#666" }}>Loading experts…</div>
          ) : urlQ && riverResults ? (
            <RiverSections
              query={urlQ}
              top={riverResults.top}
              others={riverResults.others}
              visibleOther={riverOtherVisible}
              onLoadMore={() => setRiverOtherVisible((v) => v + 24)}
              onMessage={openMessage}
            />
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center">
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>
                No experts found for this search
              </div>
              <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
                Try a different keyword or browse all categories
              </div>
              <button
                onClick={clearAll}
                style={{
                  marginTop: 16,
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 22px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((s) => (
                  <SellerCard
                    key={s.id}
                    seller={s}
                    onTag={onTagClick}
                    onMessage={() => openMessage(s.id)}
                  />
                ))}
              </div>
              {visible.length < filtered.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      background: "#fff",
                      color: "#111",
                      border: "1px solid #111",
                      borderRadius: 999,
                      padding: "10px 28px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SellerCard({
  seller,
  onTag,
  onMessage,
}: {
  seller: Seller;
  onTag: (t: string) => void;
  onMessage: () => void;
}) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const online = isOnline(seller);
  const level = sellerLevel(seller.river_score);
  const levelStyle: React.CSSProperties =
    level === "Elite"
      ? { background: "#000", color: "#fff" }
      : level === "Pro"
      ? { background: "#333", color: "#fff" }
      : { background: "#e5e5e5", color: "#333" };
  const skills = (seller.seller_skills ?? []).slice(0, 4);
  const profileHref = seller.username ? `/u/${seller.username}` : `/u/${seller.id}`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              background: "#f5f5f5",
              overflow: "hidden",
            }}
          >
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  color: "#666",
                }}
              >
                {(seller.full_name ?? seller.username ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {online && (
            <span
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#10b981",
                border: "2px solid #fff",
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
            {seller.full_name ?? seller.username ?? "Unknown"}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span
              style={{
                background: "#000",
                color: "#fff",
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              River Score {(seller.river_score ?? 0).toFixed(1)}
            </span>
            <span
              style={{
                ...levelStyle,
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {level}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div
        style={{
          fontSize: 13,
          color: "#555",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 36,
        }}
      >
        {seller.bio ?? "—"}
      </div>

      {/* Tags */}
      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((t) => (
            <button
              key={t}
              onClick={(e) => {
                e.stopPropagation();
                onTag(t);
              }}
              style={{
                background: "#f5f5f5",
                color: "#333",
                border: "none",
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: "#e5e5e5" }} />

      {/* Data points */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#555",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Star size={12} fill="#111" color="#111" />
          {(seller.average_rating ?? 0).toFixed(1)} ({seller.total_reviews ?? 0})
        </span>
        <span>From ${Math.round((seller.startingPrice || 0) / 100)}</span>
        <span>{seller.minDelivery || "—"} days</span>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(profileHref);
          }}
          style={{
            flex: 1,
            height: 38,
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Profile
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMessage();
          }}
          style={{
            flex: 1,
            height: 38,
            background: "#fff",
            color: "#111",
            border: "1px solid #111",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Message
        </button>
      </div>
    </div>
  );
}

type RiverItem = {
  s: Seller;
  match: boolean;
  matchedTags: Set<string>;
  allTags: string[];
  riverScore: number;
};

function RiverSections({
  query,
  top,
  others,
  visibleOther,
  onLoadMore,
  onMessage,
}: {
  query: string;
  top: RiverItem[];
  others: RiverItem[];
  visibleOther: number;
  onLoadMore: () => void;
  onMessage: (id: string) => void;
}) {
  if (top.length === 0 && others.length === 0) {
    return (
      <div className="mt-16 text-center">
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>
          No experts found for "{query}"
        </div>
        <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
          Try a different keyword or browse all categories
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6" style={{ marginLeft: -20, marginRight: -20 }}>
      {/* SECTION 1 — Dark, River Top 15 */}
      {top.length > 0 && (
        <>
          <div
            style={{
              background: "#111",
              borderBottom: "1px solid #222",
              padding: "16px 80px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#a855f7" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", letterSpacing: "0.05em" }}>
                River's Top 15 Matches
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#555" }}>Ranked by River Score and skill match</span>
          </div>
          <section style={{ background: "#0a0a0a", padding: "48px 80px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {top.map((x) => (
                <RiverTopCard key={x.s.id} item={x} onPitch={() => onMessage(x.s.id)} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* DIVIDER */}
      <div
        style={{
          background: "#fff",
          padding: "16px 80px",
          textAlign: "center",
          fontSize: 13,
          color: "#999",
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        River's picks are above · All matching experts are below
      </div>

      {/* SECTION 2 — White, more experts */}
      <section style={{ background: "#fff", padding: "48px 80px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            More experts for this search
          </span>
          <span style={{ fontSize: 11, color: "#bbb" }}>Sorted by rating — highest first</span>
        </div>

        {others.length === 0 ? (
          <div style={{ fontSize: 14, color: "#888", textAlign: "center", padding: 32 }}>
            No additional experts for this search.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {others.slice(0, visibleOther).map((x) => (
                <RiverOtherCard key={x.s.id} item={x} onMessage={() => onMessage(x.s.id)} />
              ))}
            </div>
            {visibleOther < others.length && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <button
                  onClick={onLoadMore}
                  style={{
                    background: "transparent",
                    color: "#000",
                    border: "1px solid #d4d4d4",
                    borderRadius: 999,
                    padding: "10px 24px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function RiverTopCard({ item, onPitch }: { item: RiverItem; onPitch: () => void }) {
  const { s, matchedTags, allTags, riverScore } = item;
  const [viewHover, setViewHover] = useState(false);
  const [pitchHover, setPitchHover] = useState(false);
  const badge =
    matchedTags.size >= 3
      ? { label: "Perfect match", bg: "#1a3a1a", color: "#4ade80" }
      : matchedTags.size === 2
      ? { label: "Strong match", bg: "#1a1a3a", color: "#60a5fa" }
      : { label: "Good match", bg: "#2a2a2a", color: "#aaa" };
  const tagsToShow = allTags.slice(0, 3);
  const rating = Number(s.average_rating) || 0;
  const profileHref = s.username ? `/u/${s.username}` : `/u/${s.id}`;
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 4px 24px rgba(255,255,255,0.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#fff", lineHeight: 1 }}>
            {Math.round(riverScore)}
          </div>
          <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>
            River Score
          </div>
        </div>
        <span
          style={{
            background: badge.bg,
            color: badge.color,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          {badge.label}
        </span>
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
            const matched = matchedTags.has(t);
            return (
              <span
                key={t}
                style={{
                  background: matched ? "#1a3a1a" : "#252525",
                  border: `1px solid ${matched ? "#4ade80" : "#333"}`,
                  color: matched ? "#4ade80" : "#ccc",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={12}
              fill={i <= Math.round(rating) ? "#f59e0b" : "transparent"}
              stroke="#f59e0b"
              strokeWidth={1.5}
            />
          ))}
          <span style={{ fontSize: 12, color: "#666", marginLeft: 2 }}>({s.total_reviews || 0})</span>
        </span>
        <span style={{ color: "#333" }}>·</span>
        <span style={{ fontSize: 12, color: "#777" }}>
          {s.minDelivery ? `${s.minDelivery}d delivery` : "—"}
        </span>
        <span style={{ color: "#333" }}>·</span>
        <span style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>
          {s.startingPrice ? `From ${fmtCents(s.startingPrice)}` : "—"}
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid #2a2a2a",
          display: "flex",
          gap: 8,
        }}
      >
        <Link
          to={profileHref}
          onMouseEnter={() => setViewHover(true)}
          onMouseLeave={() => setViewHover(false)}
          style={{
            flex: 1,
            textAlign: "center",
            background: viewHover ? "#fff" : "transparent",
            color: viewHover ? "#000" : "#fff",
            border: "1px solid #444",
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          View Profile
        </Link>
        <button
          onClick={onPitch}
          onMouseEnter={() => setPitchHover(true)}
          onMouseLeave={() => setPitchHover(false)}
          style={{
            flex: 1,
            background: pitchHover ? "#e5e5e5" : "#fff",
            color: "#000",
            border: "none",
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Get a Pitch
        </button>
      </div>
    </div>
  );
}

function RiverOtherCard({ item, onMessage }: { item: RiverItem; onMessage: () => void }) {
  const { s, allTags } = item;
  const [cardHover, setCardHover] = useState(false);
  const [viewHover, setViewHover] = useState(false);
  const [msgHover, setMsgHover] = useState(false);
  const rating = Number(s.average_rating) || 0;
  const full = Math.round(rating);
  const tagsToShow = allTags.slice(0, 3);
  const profileHref = s.username ? `/u/${s.username}` : `/u/${s.id}`;
  return (
    <div
      onMouseEnter={() => setCardHover(true)}
      onMouseLeave={() => setCardHover(false)}
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 16,
        padding: 20,
        boxShadow: cardHover ? "0 2px 12px rgba(0,0,0,0.04)" : "none",
        transition: "box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            overflow: "hidden",
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {s.avatar_url ? (
            <img src={s.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "#888", fontSize: 15, fontWeight: 500 }}>
              {(s.full_name || s.username || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
            {s.full_name || s.username || "Anonymous"}
          </div>
          <div style={{ marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={12}
                fill={i <= full ? "#f59e0b" : "transparent"}
                stroke="#f59e0b"
                strokeWidth={1.5}
              />
            ))}
            <span style={{ fontSize: 12, fontWeight: 500, color: "#000", marginLeft: 2 }}>
              {rating ? rating.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "#888" }}>({s.total_reviews || 0})</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: "#666",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        {s.bio || s.primary_category || ""}
      </div>

      {tagsToShow.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {tagsToShow.map((t) => (
            <span
              key={t}
              style={{
                background: "#f5f5f5",
                color: "#555",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 11,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, color: "#000", fontWeight: 600 }}>
          {s.startingPrice ? `From ${fmtCents(s.startingPrice)}` : "—"}
        </span>
        <span style={{ fontSize: 13, color: "#888" }}>
          {s.minDelivery ? `${s.minDelivery}d` : ""}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Link
            to={profileHref}
            onMouseEnter={() => setViewHover(true)}
            onMouseLeave={() => setViewHover(false)}
            style={{
              background: viewHover ? "#000" : "#fff",
              color: viewHover ? "#fff" : "#000",
              border: "1px solid #000",
              borderRadius: 999,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            View Profile
          </Link>
          <button
            onClick={onMessage}
            onMouseEnter={() => setMsgHover(true)}
            onMouseLeave={() => setMsgHover(false)}
            style={{
              background: "#fff",
              color: msgHover ? "#000" : "#555",
              border: `1px solid ${msgHover ? "#000" : "#e5e5e5"}`,
              borderRadius: 999,
              padding: "7px 16px",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
}
