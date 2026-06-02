import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatUSD } from "@/lib/money";

type Project = {
  id: string;
  title: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  created_at: string;
  skills: string[] | null;
};

export function ProjectRecsRow() {
  const { user, profile } = useAuth();
  const isSeller = profile?.role === "seller" || profile?.role === "admin";
  const [items, setItems] = useState<Project[] | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let skills: string[] = [];
      if (isSeller && user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("seller_skills")
          .eq("id", user.id)
          .maybeSingle();
        skills = ((p as { seller_skills?: string[] } | null)?.seller_skills) ?? [];
      }

      let q = supabase
        .from("project_posts")
        .select("id, title, category, budget_min, budget_max, deadline, created_at, skills")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(12);

      if (isSeller && skills.length) q = q.overlaps("skills", skills);

      let { data } = await q;
      if (isSeller && (!data || data.length === 0)) {
        const fb = await supabase
          .from("project_posts")
          .select("id, title, category, budget_min, budget_max, deadline, created_at, skills")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(12);
        data = fb.data ?? [];
      }
      if (active) setItems((data ?? []) as Project[]);
    })();
    return () => { active = false; };
  }, [user?.id, isSeller]);

  const scrollBy = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  const heading = isSeller ? "Open projects matching your skills" : "Recently posted projects";

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items == null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[300px] h-[180px] rounded-2xl border border-border bg-background-subtle animate-pulse"
            />
          ))
        ) : items.length === 0 ? (
          <div className="text-sm text-foreground-muted py-8">No open projects right now.</div>
        ) : (
          items.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="snap-start shrink-0 w-[300px] rounded-2xl border border-border bg-background p-4 hover:border-border-strong hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all no-underline text-foreground"
            >
              {p.category && (
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-foreground-muted mb-2">
                  {p.category}
                </div>
              )}
              <div className="font-semibold leading-snug line-clamp-2 min-h-[2.6em]">{p.title}</div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {p.budget_min != null && p.budget_max != null
                    ? `${formatUSD(p.budget_min)} – ${formatUSD(p.budget_max)}`
                    : p.budget_max != null
                      ? `Up to ${formatUSD(p.budget_max)}`
                      : "Open budget"}
                </span>
                {p.deadline && (
                  <span className="text-xs text-foreground-muted">
                    Due {new Date(p.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              {p.skills && p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
