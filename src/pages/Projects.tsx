import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) =>
      [p.title, p.description, p.category, ...(p.skills ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [projects, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Open Projects — Katexs" description="Browse open client projects on Katexs and submit bids." />
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Open projects</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Browse open client projects and submit a bid.
          </p>
        </div>

        <div className="mb-6 max-w-xl">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, skill or category…"
          />
        </div>

        {loading ? (
          <p className="text-foreground-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-16 text-center">
            <h3 className="font-semibold">No open projects right now</h3>
            <p className="text-sm text-foreground-muted mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => {
              const budget =
                p.budget_min != null && p.budget_max != null
                  ? `$${p.budget_min} – $${p.budget_max}`
                  : p.budget_min != null
                    ? `From $${p.budget_min}`
                    : p.budget_max != null
                      ? `Up to $${p.budget_max}`
                      : "Budget on request";
              return (
                <div key={p.id} className="bg-background border border-border rounded-2xl p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-base line-clamp-2">{p.title}</h2>
                    <span className="text-xs text-foreground-muted shrink-0">{ago(p.created_at)}</span>
                  </div>
                  {p.category && (
                    <p className="text-xs text-foreground-muted mt-1">{p.category}</p>
                  )}
                  <p className="mt-3 text-sm text-foreground-muted line-clamp-3">{p.description}</p>
                  {p.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 5).map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-foreground-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-foreground-muted">
                    <span>{budget} · {p.bid_count} bid{p.bid_count === 1 ? "" : "s"}</span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/projects/${p.id}/bid`}>View & bid</Link>
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
