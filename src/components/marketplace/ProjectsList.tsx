import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { C, FONT, MONO } from "@/lib/marketplace/theme";

type ProjectRow = {
  id: string;
  description: string | null;
  price: number;
  status: string;
  created_at: string;
  client_id: string;
  expert_id: string;
};

export function ProjectsList({ role }: { role: "client" | "expert" }) {
  const { user, loading: authLoading, signOut, profile } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const col = role === "client" ? "client_id" : "expert_id";
    supabase.from("projects" as any).select("*").eq(col, user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setProjects((data ?? []) as any); setLoading(false); });
  }, [user, role]);

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />
      <div style={{ padding: "2.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: C.gray, fontFamily: MONO }}>{role.toUpperCase()} DASHBOARD</div>
            <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 600 }}>Welcome, {profile?.full_name || "there"}</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {role === "client" && (
              <Link to="/browse" style={btnNeon}>Browse experts</Link>
            )}
            <button onClick={signOut} style={btnGhost}>Sign out</button>
          </div>
        </div>

        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: C.gray, fontFamily: MONO }}>YOUR PROJECTS</h2>

        {loading ? (
          <div style={{ color: C.gray }}>Loading…</div>
        ) : projects.length === 0 ? (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "3rem", textAlign: "center", color: C.gray, background: C.card }}>
            No projects yet. {role === "client" ? <Link to="/browse" style={{ color: C.neon }}>Find an expert →</Link> : "Once a client hires you, projects will show up here."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {projects.map((p) => (
              <Link key={p.id} to={`/project/${p.id}`} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.2rem 1.4rem",
                background: C.card, textDecoration: "none", color: C.white,
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.description || "Untitled project"}</div>
                  <div style={{ fontSize: "0.75rem", color: C.gray, fontFamily: MONO }}>
                    {new Date(p.created_at).toLocaleDateString()} · {p.status.replace(/_/g, " ")}
                  </div>
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>${p.price}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const btnNeon: React.CSSProperties = {
  background: C.neon, color: C.black, padding: "0.6rem 1.2rem",
  borderRadius: 999, textDecoration: "none", fontWeight: 600,
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: C.white, border: `1px solid ${C.border2}`,
  borderRadius: 999, padding: "0.6rem 1.2rem", cursor: "pointer",
};
