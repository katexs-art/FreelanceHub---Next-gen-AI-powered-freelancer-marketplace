import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, DollarSign, Clock, Users, Plus, FolderOpen, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RecommendationsBlock } from "@/components/hq/RecommendationsBlock";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ProjectPost = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  bid_count: number;
  created_at: string;
  status: string;
};

const CATEGORY_FILTERS = [
  "All",
  "GoHighLevel",
  "Voice AI",
  "AI Automation",
  "Marketing",
  "Development",
];

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [sort, setSort] = useState<"newest" | "budget" | "bids">("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_posts")
        .select("id,title,description,category,skills,budget_min,budget_max,deadline,bid_count,created_at,status")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) console.error("Failed to load projects", error);
      setProjects((data ?? []) as ProjectPost[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("project_posts_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_posts" },
        (payload) => {
          const next = payload.new as ProjectPost;
          if (next.status !== "open") return;
          setProjects((prev) => {
            if (prev.some((p) => p.id === next.id)) return prev;
            return [next, ...prev];
          });
          toast.success("New project posted!", {
            description: next.title,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_posts" },
        (payload) => {
          const next = payload.new as ProjectPost;
          setProjects((prev) => {
            const exists = prev.some((p) => p.id === next.id);
            if (next.status !== "open") return prev.filter((p) => p.id !== next.id);
            if (!exists) return [next, ...prev];
            return prev.map((p) => (p.id === next.id ? next : p));
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = projects;
    if (activeCat !== "All") {
      list = list.filter((p) => (p.category ?? "").toLowerCase() === activeCat.toLowerCase());
    }
    if (term) {
      list = list.filter((p) =>
        [p.title, p.description, p.category, ...(p.skills ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      );
    }
    if (sort === "budget") {
      list = [...list].sort((a, b) => (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0));
    } else if (sort === "bids") {
      list = [...list].sort((a, b) => b.bid_count - a.bid_count);
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [projects, q, activeCat, sort]);

  const stats = useMemo(() => {
    const total = projects.length;
    const budgets = projects
      .map((p) => {
        if (p.budget_min != null && p.budget_max != null) return (p.budget_min + p.budget_max) / 2;
        return p.budget_min ?? p.budget_max ?? null;
      })
      .filter((v): v is number => v != null);
    const avg = budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = projects.filter((p) => new Date(p.created_at) >= startOfDay).length;
    return { total, avg, today };
  }, [projects]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO title="Open Projects — Katexs" description="Browse open client projects on Katexs and submit bids." />
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0F172A]">Open Projects</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F46E5] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F46E5]" />
              </span>
              Live
            </span>
          </div>
          <p className="text-slate-500 mt-2">Browse open client projects and submit your proposal</p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={FolderOpen} label="Total Open Projects" value={stats.total.toString()} tint="blue" />
            <StatCard
              icon={TrendingUp}
              label="Avg Budget"
              value={stats.avg ? `$${stats.avg.toLocaleString()}` : "—"}
              tint="purple"
            />
            <StatCard icon={Calendar} label="Posted Today" value={stats.today.toString()} tint="orange" />
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, skill or category…"
              className="pl-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#4F46E5]/30 focus-visible:border-[#4F46E5]"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="md:w-56 bg-white rounded-md border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="budget">Budget High–Low</SelectItem>
              <SelectItem value="bids">Most Bids</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORY_FILTERS.map((cat) => {
            const active = activeCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  active
                    ? "bg-[#0F172A] text-white border-[#0F172A]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#0F172A] hover:text-[#0F172A]",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f9f9f9] p-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center mb-4">
              <FolderOpen className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h3 className="font-semibold text-lg text-[#0F172A]">No open projects yet</h3>
            <p className="text-sm text-slate-500 mt-1">Be the first to post one!</p>
            <Button asChild className="mt-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white">
              <Link to="/post-job">
                <Plus className="h-4 w-4" /> Post a Project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => {
              const budget =
                p.budget_min != null && p.budget_max != null
                  ? `$${p.budget_min.toLocaleString()} – $${p.budget_max.toLocaleString()}`
                  : p.budget_min != null
                    ? `From $${p.budget_min.toLocaleString()}`
                    : p.budget_max != null
                      ? `Up to $${p.budget_max.toLocaleString()}`
                      : "Budget on request";
              return (
                <div
                  key={p.id}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-5 pt-6 flex flex-col overflow-hidden transition-all duration-200 hover:shadow-[0_12px_32px_-12px_rgba(79,70,229,0.25)] hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]" />
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-base text-[#0F172A] line-clamp-2 flex-1">{p.title}</h2>
                    {p.category && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#0F172A] text-white">
                        {p.category}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-slate-500 line-clamp-2">{p.description}</p>

                  {p.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-[#0F172A]">{budget}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {p.bid_count} bid{p.bid_count === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {ago(p.created_at)}
                      </span>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-full w-full md:w-auto"
                    >
                      <Link to={`/projects/${p.id}`}>View & Bid</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <RecommendationsBlock />
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: string;
  tint: "blue" | "purple" | "orange";
}) {
  const tints = {
    blue: "bg-[#2563EB] text-white",
    purple: "bg-[#7C3AED] text-white",
    orange: "bg-[#EA580C] text-white",
  } as const;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", tints[tint])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-[#0F172A] leading-tight">{value}</p>
      </div>
    </div>
  );
}
