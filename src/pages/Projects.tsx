import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";

type Project = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  bid_count: number;
  created_at: string;
};

type Sort = "newest" | "most_bids" | "ending_soon" | "budget_high";

export default function Projects() {
  const { profile } = useAuth();
  const { data: categories } = useCategories();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [sort, setSort] = useState<Sort>("newest");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("project_posts")
        .select("id,title,description,category,budget_min,budget_max,deadline,bid_count,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(500);
      setProjects((data ?? []) as Project[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = projects;
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle),
      );
    }
    if (cat) list = list.filter((p) => p.category === cat);
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "most_bids") sorted.sort((a, b) => b.bid_count - a.bid_count);
    if (sort === "ending_soon")
      sorted.sort((a, b) => {
        const da = a.deadline ? +new Date(a.deadline) : Infinity;
        const db = b.deadline ? +new Date(b.deadline) : Infinity;
        return da - db;
      });
    if (sort === "budget_high") sorted.sort((a, b) => (b.budget_max ?? 0) - (a.budget_max ?? 0));
    return sorted;
  }, [projects, q, cat, sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div
          style={{
            background: "#fff",
            borderBottom: "2px solid #000",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderRadius: 4,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#000", lineHeight: 1.2 }}>Open Projects</div>
            <div style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
              Find a project that matches your skills and place your bid
            </div>
          </div>
          {profile?.role === "client" && (
            <Link to="/post-job">
              <button
                style={{
                  background: "#000",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Post a Project
              </button>
            </Link>
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-6">Project Board</h1>

        <div className="mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects by keyword…"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCat("")}
              className={`px-3 py-1.5 rounded-full text-xs border ${cat === "" ? "border-white/40 bg-white/[0.06]" : "border-white/15"}`}
            >
              All
            </button>
            {categories.filter((c) => !c.parent_id).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`px-3 py-1.5 rounded-full text-xs border ${cat === c.slug ? "border-white/40 bg-white/[0.06]" : "border-white/15"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-[4px] bg-white/[0.03] border border-white/10 px-3 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="most_bids">Most Bids</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="budget_high">Budget High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="text-sm text-foreground-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-foreground-muted">No open projects yet.</div>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {filtered.map((p) => {
              const isOpen = expanded === p.id;
              return (
                <li key={p.id}>
                  <div
                    role="button"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="flex items-center justify-between gap-4 py-4 cursor-pointer hover:bg-white/[0.02] px-2 -mx-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 15, fontWeight: 600 }} className="truncate">{p.title}</div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-foreground-muted">
                        {p.category && <span className="px-2 py-0.5 rounded-full border border-white/15">{p.category}</span>}
                        <span>
                          ${p.budget_min ?? "?"} – ${p.budget_max ?? "?"}
                        </span>
                        {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
                        <span>{p.bid_count} bid{p.bid_count === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    {profile?.role === "seller" || profile?.role === "admin" ? (
                      <Link to={`/projects/${p.id}/bid`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline">Place a Bid</Button>
                      </Link>
                    ) : (
                      <Link to={`/projects/${p.id}/bids`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline">View Bids</Button>
                      </Link>
                    )}
                  </div>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-5 pr-4 text-sm text-foreground-muted whitespace-pre-wrap">
                        {p.description}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
