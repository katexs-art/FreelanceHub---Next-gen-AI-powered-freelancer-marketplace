import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, DollarSign, Clock, Users, Plus, FolderOpen, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
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

const CATEGORY_COLORS: Record<string, string> = {
  GoHighLevel: "bg-purple-100 text-purple-700 border-purple-200",
  "Voice AI": "bg-blue-100 text-blue-700 border-blue-200",
  "AI Automation": "bg-green-100 text-green-700 border-green-200",
  Marketing: "bg-pink-100 text-pink-700 border-pink-200",
  Development: "bg-orange-100 text-orange-700 border-orange-200",
};

function categoryClass(cat?: string | null) {
  if (!cat) return "bg-gray-100 text-gray-700 border-gray-200";
  return CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function accentColor(p: ProjectPost) {
  const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
  if (p.deadline) {
    const daysLeft = (new Date(p.deadline).getTime() - Date.now()) / 86_400_000;
    if (daysLeft <= 3) return "border-l-orange-500";
  }
  if (ageHours < 24) return "border-l-green-500";
  return "border-l-blue-500";
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black">Open Projects</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
              </span>
              Live
            </span>
          </div>
          <p className="text-foreground-muted mt-2">Browse open client projects and submit your proposal</p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={FolderOpen} label="Total Open Projects" value={stats.total.toString()} tint="green" />
            <StatCard
              icon={TrendingUp}
              label="Avg Budget"
              value={stats.avg ? `$${stats.avg.toLocaleString()}` : "—"}
              tint="blue"
            />
            <StatCard icon={Calendar} label="Posted Today" value={stats.today.toString()} tint="orange" />
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, skill or category…"
              className="pl-9 bg-white"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="md:w-56 bg-white rounded-md">
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
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-foreground border-border hover:border-green-600 hover:text-green-700",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-foreground-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-[#f9f9f9] p-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-4">
              <FolderOpen className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-black">No open projects yet</h3>
            <p className="text-sm text-foreground-muted mt-1">Be the first to post one!</p>
            <Button asChild className="mt-5 bg-green-600 hover:bg-green-700 text-white">
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
                  className={cn(
                    "group bg-white border border-border border-l-4 rounded-2xl p-5 flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                    accentColor(p),
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-base text-black line-clamp-2 flex-1">{p.title}</h2>
                    {p.category && (
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border",
                          categoryClass(p.category),
                        )}
                      >
                        {p.category}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-foreground-muted line-clamp-2">{p.description}</p>

                  {p.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-xs text-foreground-muted">
                    <span className="inline-flex items-center gap-1 font-medium text-black">
                      <DollarSign className="h-3.5 w-3.5 text-green-600" />
                      {budget}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
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
                      className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                    >
                      <Link to={`/projects/${p.id}`}>View & Bid</Link>
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

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: string;
  tint: "green" | "blue" | "orange";
}) {
  const tints = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  } as const;
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center", tints[tint])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-foreground-muted">{label}</p>
        <p className="text-xl font-bold text-black leading-tight">{value}</p>
      </div>
    </div>
  );
}
