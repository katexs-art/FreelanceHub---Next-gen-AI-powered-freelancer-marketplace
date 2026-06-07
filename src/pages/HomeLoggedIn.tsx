import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, MessageSquare, Search, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FiverCard, FiverCardSkeleton, FiverCardData } from "@/components/marketplace/FiverCard";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";

const CATEGORY_ROWS = [
  { label: "Top Rated in Voice AI", filter: "voice-ai" },
  { label: "Top Rated in GoHighLevel", filter: "gohighlevel" },
  { label: "Top Rated in AI Automation", filter: "ai-automation" },
  { label: "Top Rated in Chat AI", filter: "chat-ai" },
];

async function fetchGigsByIds(ids: string[]): Promise<FiverCardData[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("gigs")
    .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,profiles:seller_id(id,username,full_name,avatar_url,total_reviews)")
    .in("id", ids)
    .eq("status", "active");
  if (!data) return [];
  return (data as any[]).map((g) => ({
    id: g.id,
    title: g.title,
    thumbnail_url: g.thumbnail_url,
    starting_price: g.starting_price,
    average_rating: g.average_rating ?? 0,
    total_reviews: g.total_reviews ?? 0,
    seller: g.profiles ?? null,
  }));
}

async function fetchGigs(filter?: string, limit = 8): Promise<FiverCardData[]> {
  let q = supabase
    .from("gigs")
    .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,profiles:seller_id(id,username,full_name,avatar_url,total_reviews)")
    .eq("status", "active")
    .order("average_rating", { ascending: false })
    .limit(limit);
  if (filter) q = q.ilike("category", `%${filter}%`);
  const { data } = await q;
  if (!data) return [];
  return (data as any[]).map((g) => ({
    id: g.id,
    title: g.title,
    thumbnail_url: g.thumbnail_url,
    starting_price: g.starting_price,
    average_rating: g.average_rating ?? 0,
    total_reviews: g.total_reviews ?? 0,
    seller: g.profiles ?? null,
  }));
}

function HorizScroll({ gigs, loading }: { gigs: FiverCardData[]; loading: boolean }) {
  return (
    <div style={{ overflowX: "auto", scrollbarWidth: "none", marginLeft: -8, paddingLeft: 8 }}>
      <style>{`.kx-hscroll::-webkit-scrollbar{display:none}`}</style>
      <div
        className="kx-hscroll"
        style={{ display: "flex", gap: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ minWidth: 220, maxWidth: 220 }}>
                <FiverCardSkeleton />
              </div>
            ))
          : gigs.map((g) => (
              <div key={g.id} style={{ minWidth: 220, maxWidth: 220 }}>
                <FiverCard gig={g} />
              </div>
            ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>{title}</h2>
      <Link
        to={to}
        style={{ fontSize: 12, color: "#888", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}
      >
        See all <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export default function HomeLoggedIn() {
  const { user, profile } = useAuth();
  const firstName = (profile as any)?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  const [unread, setUnread] = useState(0);
  const [recentGigs, setRecentGigs] = useState<FiverCardData[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recommended, setRecommended] = useState<FiverCardData[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [catRows, setCatRows] = useState<Record<string, FiverCardData[]>>({});
  const [catLoading, setCatLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Unread message count
  useEffect(() => {
    if (!user) return;
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => { if (mounted.current) setUnread(count ?? 0); });
  }, [user?.id]);

  // Recently viewed
  useEffect(() => {
    const ids = getRecentlyViewed().slice(0, 8);
    if (!ids.length) { setRecentLoading(false); return; }
    fetchGigsByIds(ids).then((gigs) => {
      if (!mounted.current) return;
      // preserve order
      const map = Object.fromEntries(gigs.map((g) => [g.id, g]));
      setRecentGigs(ids.map((id) => map[id]).filter(Boolean));
      setRecentLoading(false);
    });
  }, []);

  // Recommended
  useEffect(() => {
    supabase
      .from("gigs")
      .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,profiles:seller_id(id,username,full_name,avatar_url,total_reviews)")
      .eq("status", "active")
      .order("total_orders", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!mounted.current || !data) return;
        setRecommended(
          (data as any[]).map((g) => ({
            id: g.id, title: g.title, thumbnail_url: g.thumbnail_url,
            starting_price: g.starting_price,
            average_rating: g.average_rating ?? 0, total_reviews: g.total_reviews ?? 0,
            seller: g.profiles ?? null,
          }))
        );
        setRecLoading(false);
      });
  }, []);

  // Category rows
  useEffect(() => {
    setCatLoading(true);
    Promise.all(CATEGORY_ROWS.map((r) => fetchGigs(r.filter, 8))).then((results) => {
      if (!mounted.current) return;
      const next: Record<string, FiverCardData[]> = {};
      CATEGORY_ROWS.forEach((r, i) => { next[r.filter] = results[i]; });
      setCatRows(next);
      setCatLoading(false);
    });
  }, []);

  const quickActions = [
    {
      icon: <FileText size={22} color="#16A34A" />,
      label: "Post a Project Brief",
      desc: "Tell experts what you need",
      to: "/projects/new",
      border: "#16A34A33",
    },
    {
      icon: <MessageSquare size={22} color={unread > 0 ? "#F59E0B" : "#888"} />,
      label: unread > 0 ? `Messages (${unread} unread)` : "Messages",
      desc: unread > 0 ? "You have unread messages" : "Chat with your experts",
      to: "/inbox",
      border: unread > 0 ? "#F59E0B33" : "#1e1e1e",
    },
    {
      icon: <Search size={22} color="#7C3AED" />,
      label: "Find an Expert",
      desc: "Browse AI specialists",
      to: "/services",
      border: "#7C3AED33",
    },
  ];

  return (
    <>
      <SEO title="Home · KATEXS" description="Your AI business productivity hub." />
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" }}>

          {/* Welcome header */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 6px" }}>
              Welcome back, {firstName} 👋
            </h1>
            <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
              Here's what's happening on your KATEXS dashboard.
            </p>
          </div>

          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 52 }}>
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "#111111", border: `1px solid ${a.border}`,
                  borderRadius: 12, padding: "18px 20px",
                  textDecoration: "none", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#1a1a1a"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#111111"; }}
              >
                <div style={{ flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Recently viewed */}
          {(recentLoading || recentGigs.length > 0) && (
            <div style={{ marginBottom: 52 }}>
              <SectionHeader title="Pick up where you left off" to="/services" />
              <HorizScroll gigs={recentGigs} loading={recentLoading} />
            </div>
          )}

          {/* Recommended */}
          <div style={{ marginBottom: 52 }}>
            <SectionHeader title="Recommended for you" to="/services" />
            {recLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {Array.from({ length: 8 }).map((_, i) => <FiverCardSkeleton key={i} />)}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {recommended.map((g) => <FiverCard key={g.id} gig={g} />)}
              </div>
            )}
          </div>

          {/* Category rows */}
          {CATEGORY_ROWS.map((row) => (
            <div key={row.filter} style={{ marginBottom: 52 }}>
              <SectionHeader
                title={row.label}
                to={`/services?category=${encodeURIComponent(row.label.replace("Top Rated in ", ""))}`}
              />
              <HorizScroll gigs={catRows[row.filter] ?? []} loading={catLoading} />
            </div>
          ))}

        </div>
      </div>
      <SiteFooter />
    </>
  );
}
