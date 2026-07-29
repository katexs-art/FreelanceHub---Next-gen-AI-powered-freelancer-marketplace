import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Briefcase, CheckCircle, DollarSign, Send } from "lucide-react";

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

const BID_STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#222] text-[#888]",
  accepted: "bg-green-900/40 text-green-400",
  declined: "bg-[#1a1a1a] text-[#444]",
};

interface Project {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  created_at: string;
}

interface MyBid {
  id: string;
  bid_amount: number;
  status: string;
  created_at: string;
  project_id: string;
  project_title: string;
}

interface MyGig {
  id: string;
  title: string;
  slug: string;
  starting_price: number | null;
  status: string;
}

export default function SellerHq() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeBids: 0, activeOrders: 0, completed: 0, totalEarned: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [myBids, setMyBids] = useState<MyBid[]>([]);
  const [myGigs, setMyGigs] = useState<MyGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();

    const channel = supabase
      .channel("seller-hq")
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_posts" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function load() {
    if (!user) return;

    const [bidsRes, ordersRes, gigsRes, projectsRes] = await Promise.all([
      supabase.from("bids").select("id, bid_amount, status, created_at, project_id").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, status, seller_amount").eq("seller_id", user.id),
      supabase.from("gigs").select("id, title, slug, starting_price, status").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("project_posts").select("id, title, description, category, budget_min, budget_max, deadline, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(20),
    ]);

    const myBidsRaw = bidsRes.data ?? [];
    const myOrders = ordersRes.data ?? [];

    const projectIds = [...new Set(myBidsRaw.map((b) => b.project_id))];
    let projectTitleMap: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: pp } = await supabase.from("project_posts").select("id, title").in("id", projectIds);
      (pp ?? []).forEach((p) => { projectTitleMap[p.id] = p.title; });
    }

    const enrichedBids: MyBid[] = myBidsRaw.map((b) => ({
      ...b,
      project_title: projectTitleMap[b.project_id] ?? "Project",
    }));

    const alreadyBidIds = new Set(myBidsRaw.map((b) => b.project_id));

    const activeBids = myBidsRaw.filter((b) => b.status === "pending").length;
    const activeOrders = myOrders.filter((o) => !["completed", "cancelled", "refunded"].includes(o.status)).length;
    const completedCount = myOrders.filter((o) => o.status === "completed").length;
    const totalEarned = myOrders.filter((o) => o.status === "completed").reduce((s, o) => s + (o.seller_amount ?? 0), 0);

    setStats({ activeBids, activeOrders, completed: completedCount, totalEarned });
    setMyBids(enrichedBids);
    setMyGigs(gigsRes.data ?? []);
    setProjects((projectsRes.data ?? []).filter((p) => !alreadyBidIds.has(p.id)));
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="text-white">
        <div className="py-8 max-w-5xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Expert HQ</h1>
              <p className="text-sm text-[#888] mt-1">Your work and earnings at a glance</p>
            </div>
            <Link
              to="/seller/gigs/new"
              className="px-4 py-2 rounded-full bg-[#16A34A] text-white text-sm font-medium hover:bg-[#15803d] transition-colors"
            >
              + New Service
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard label="Active Bids" value={loading ? "—" : stats.activeBids} icon={<Send className="w-5 h-5" />} />
            <StatCard label="Active Orders" value={loading ? "—" : stats.activeOrders} icon={<Briefcase className="w-5 h-5" />} />
            <StatCard label="Completed" value={loading ? "—" : stats.completed} icon={<CheckCircle className="w-5 h-5" />} />
            <StatCard label="Total Earned" value={loading ? "—" : `$${stats.totalEarned.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Live projects feed */}
            <section>
              <h2 className="text-base font-semibold mb-4">Open Projects</h2>
              {loading ? (
                <div className="text-sm text-[#555]">Loading…</div>
              ) : projects.length === 0 ? (
                <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-6 text-center text-sm text-[#555]">
                  No open projects right now.
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-xl border border-[#1e1e1e] bg-[#111] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.title}</p>
                          <p className="text-xs text-[#666] mt-1 line-clamp-2">{p.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-[#555]">
                            {p.category && (
                              <span className="px-2 py-0.5 rounded-full border border-[#222]">{p.category}</span>
                            )}
                            {p.budget_min != null && (
                              <span>${p.budget_min}{p.budget_max ? ` – $${p.budget_max}` : "+"}</span>
                            )}
                            {p.deadline && (
                              <span>Due {new Date(p.deadline).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={`/projects/${p.id}/bid`}
                          className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[#16A34A] text-[#16A34A] text-xs font-medium hover:bg-[#16A34A] hover:text-white transition-colors whitespace-nowrap"
                        >
                          Bid Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-8">
              {/* My bids */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">My Bids</h2>
                </div>
                {loading ? (
                  <div className="text-sm text-[#555]">Loading…</div>
                ) : myBids.length === 0 ? (
                  <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-6 text-center text-sm text-[#555]">
                    No bids placed yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {myBids.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111] px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{b.project_title}</p>
                          <p className="text-xs text-[#666] mt-0.5">${b.bid_amount}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${BID_STATUS_STYLE[b.status] ?? "bg-[#222] text-[#666]"}`}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* My services */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">My Services</h2>
                  <Link to="/seller/gigs" className="text-xs text-[#888] hover:text-white transition-colors">View all</Link>
                </div>
                {loading ? (
                  <div className="text-sm text-[#555]">Loading…</div>
                ) : myGigs.length === 0 ? (
                  <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-6 text-center text-sm text-[#555]">
                    No services yet.{" "}
                    <Link to="/seller/gigs/new" className="text-[#16A34A] hover:underline">Create one →</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myGigs.map((g) => (
                      <Link
                        key={g.id}
                        to={`/seller/gigs/${g.id}/edit`}
                        className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111] px-4 py-3 hover:border-[#2a2a2a] transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-[#16A34A] transition-colors truncate">{g.title}</p>
                          {g.starting_price != null && (
                            <p className="text-xs text-[#666] mt-0.5">From ${g.starting_price}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-3 ${
                          g.status === "active" ? "bg-green-900/40 text-green-400" : "bg-[#222] text-[#555]"
                        }`}>
                          {g.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
