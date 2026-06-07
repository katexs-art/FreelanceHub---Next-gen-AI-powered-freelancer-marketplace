import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Star, Briefcase, ShoppingBag, DollarSign, Plus, MessageSquare } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}
function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-[#888]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-xs text-[#888] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

interface Bid {
  id: string;
  bid_amount: number;
  cover_message: string;
  status: string;
  created_at: string;
  project_id: string;
  project_title: string;
  seller_id: string;
  seller_name: string;
  seller_avatar: string | null;
  seller_username: string | null;
  avg_rating: number | null;
}

interface Project {
  id: string;
  title: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
}

export default function BuyerHq() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ openProjects: 0, bidsReceived: 0, activeOrders: 0, totalSpent: 0 });
  const [bids, setBids] = useState<Bid[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();

    const channel = supabase
      .channel("buyer-hq")
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_posts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function load() {
    if (!user) return;

    const [projectsRes, ordersRes] = await Promise.all([
      supabase.from("project_posts").select("id, title, status, budget_min, budget_max, created_at").eq("buyer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, status, total_amount").eq("buyer_id", user.id),
    ]);

    const myProjects = projectsRes.data ?? [];
    const myOrders = ordersRes.data ?? [];
    const projectIds = myProjects.map((p) => p.id);

    setProjects(myProjects);

    const openCount = myProjects.filter((p) => p.status === "open").length;
    const activeOrdersCount = myOrders.filter((o) => !["completed", "cancelled", "refunded"].includes(o.status)).length;
    const totalSpent = myOrders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

    if (projectIds.length > 0) {
      const { data: bidsData } = await supabase
        .from("bids")
        .select("id, bid_amount, cover_message, status, created_at, project_id, seller_id")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      const sellerIds = [...new Set((bidsData ?? []).map((b) => b.seller_id))];
      let sellerMap: Record<string, any> = {};
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username, average_rating")
          .in("id", sellerIds);
        (profiles ?? []).forEach((p) => { sellerMap[p.id] = p; });
      }

      const projectMap: Record<string, string> = {};
      myProjects.forEach((p) => { projectMap[p.id] = p.title; });

      const enriched: Bid[] = (bidsData ?? []).map((b) => ({
        ...b,
        project_title: projectMap[b.project_id] ?? "Project",
        seller_name: sellerMap[b.seller_id]?.full_name ?? "Expert",
        seller_avatar: sellerMap[b.seller_id]?.avatar_url ?? null,
        seller_username: sellerMap[b.seller_id]?.username ?? null,
        avg_rating: sellerMap[b.seller_id]?.average_rating ?? null,
      }));

      enriched.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
      setBids(enriched);
      setStats({ openProjects: openCount, bidsReceived: enriched.length, activeOrders: activeOrdersCount, totalSpent });
    } else {
      setBids([]);
      setStats({ openProjects: openCount, bidsReceived: 0, activeOrders: activeOrdersCount, totalSpent });
    }

    setLoading(false);
  }

  async function hireBid(bid: Bid) {
    if (!user) return;
    const { data, error } = await supabase.rpc("create_escrow_order", {
      _project_id: bid.project_id,
      _bid_id: bid.id,
    });
    if (error || !data) {
      console.error(error);
      return;
    }
    navigate(`/checkout/${data}`);
  }

  async function messageExpert(bid: Bid) {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_one.eq.${user.id},participant_two.eq.${bid.seller_id}),and(participant_one.eq.${bid.seller_id},participant_two.eq.${user.id})`)
      .maybeSingle();
    if (data) {
      navigate(`/inbox/${data.id}`);
    } else {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ participant_one: user.id, participant_two: bid.seller_id })
        .select("id")
        .single();
      if (conv) navigate(`/inbox/${conv.id}`);
    }
  }

  return (
    <>
      <SiteHeader showCategories={false} />
      <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="container-page py-8 max-w-5xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Partner HQ</h1>
              <p className="text-sm text-[#888] mt-1">Your project activity at a glance</p>
            </div>
            <Link
              to="/post-job"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#16A34A] text-white text-sm font-medium hover:bg-[#15803d] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post a Project
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard label="Open Projects" value={loading ? "—" : stats.openProjects} icon={<Briefcase className="w-5 h-5" />} />
            <StatCard label="Bids Received" value={loading ? "—" : stats.bidsReceived} icon={<ShoppingBag className="w-5 h-5" />} />
            <StatCard label="Active Orders" value={loading ? "—" : stats.activeOrders} icon={<Briefcase className="w-5 h-5" />} />
            <StatCard label="Total Spent" value={loading ? "—" : `$${stats.totalSpent.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
          </div>

          {/* Bids received */}
          <section className="mb-10">
            <h2 className="text-base font-semibold mb-4">Bids Received</h2>
            {loading ? (
              <div className="text-sm text-[#555]">Loading…</div>
            ) : bids.length === 0 ? (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center text-sm text-[#555]">
                No bids yet — post a project to start receiving proposals.
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="rounded-xl border border-[#1e1e1e] bg-[#111] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Expert info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {bid.seller_avatar ? (
                        <img src={bid.seller_avatar} alt={bid.seller_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {bid.seller_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white truncate">{bid.seller_name}</span>
                          {bid.avg_rating != null && (
                            <span className="flex items-center gap-1 text-xs text-[#888]">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {bid.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#888] mt-0.5 truncate">For: {bid.project_title}</p>
                        <p className="text-xs text-[#666] mt-1 line-clamp-2">{bid.cover_message}</p>
                      </div>
                    </div>

                    {/* Bid amount + actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-lg font-semibold text-white">${bid.bid_amount}</span>
                      {bid.status === "pending" && (
                        <>
                          <button
                            onClick={() => hireBid(bid)}
                            className="px-4 py-1.5 rounded-full bg-[#16A34A] text-white text-xs font-medium hover:bg-[#15803d] transition-colors"
                          >
                            Hire
                          </button>
                          <button
                            onClick={() => messageExpert(bid)}
                            className="p-1.5 rounded-full border border-[#1e1e1e] text-[#888] hover:text-white hover:border-[#333] transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {bid.status !== "pending" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          bid.status === "accepted" ? "bg-green-900/40 text-green-400" : "bg-[#222] text-[#555]"
                        }`}>
                          {bid.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">My Projects</h2>
              <Link to="/projects" className="text-xs text-[#888] hover:text-white transition-colors">View all</Link>
            </div>
            {loading ? (
              <div className="text-sm text-[#555]">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center text-sm text-[#555]">
                No projects yet.{" "}
                <Link to="/post-job" className="text-[#16A34A] hover:underline">Post your first project →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}/bids`}
                    className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111] px-5 py-4 hover:border-[#2a2a2a] transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-[#16A34A] transition-colors">{p.title}</p>
                      <p className="text-xs text-[#666] mt-0.5">
                        {p.budget_min != null && p.budget_max != null ? `$${p.budget_min} – $${p.budget_max}` : "Budget TBD"}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      p.status === "open" ? "bg-green-900/40 text-green-400" :
                      p.status === "in_progress" ? "bg-blue-900/40 text-blue-400" :
                      "bg-[#222] text-[#555]"
                    }`}>
                      {p.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
      <SiteFooter />
    </>
  );
}
