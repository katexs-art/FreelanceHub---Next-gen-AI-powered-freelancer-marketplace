import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Cat = { name: string; desc: string; tags: string[]; aliases: string[] };

const CATS: Cat[] = [
  { name: "Build with AI", desc: "Websites, apps, agents, chatbots, integrations and custom AI development", tags: ["Web Apps", "Chatbots", "Integrations"], aliases: ["build", "build with ai", "development", "web", "app"] },
  { name: "Sound and Speak with AI", desc: "Voice AI agents, voice cloning, AI phone systems and conversational AI", tags: ["Voice AI", "Voice Cloning", "Phone Systems"], aliases: ["sound", "speak", "voice", "sound and speak with ai", "audio"] },
  { name: "Create with AI", desc: "AI video, visuals, avatars, image editing and AI generated content", tags: ["AI Video", "Avatars", "Image Editing"], aliases: ["create", "create with ai", "video", "image", "visuals", "design"] },
  { name: "Grow with AI", desc: "AI marketing, SEO, ad automation, lead generation and campaign management", tags: ["Marketing", "SEO", "Lead Gen"], aliases: ["grow", "grow with ai", "marketing", "ads", "seo"] },
  { name: "Run with AI", desc: "Workflow automation, CRM setup, GoHighLevel, Zapier and business operations", tags: ["Automation", "CRM", "Zapier"], aliases: ["run", "run with ai", "automation", "ops", "operations", "workflow"] },
  { name: "Understand AI", desc: "Data science, machine learning, analytics, model training and business intelligence", tags: ["ML", "Analytics", "Data Science"], aliases: ["understand", "understand ai", "data", "analytics", "ml", "machine learning"] },
  { name: "Write with AI", desc: "AI content, copywriting, scripts, prompts and SEO articles", tags: ["Copywriting", "Prompts", "SEO Articles"], aliases: ["write", "write with ai", "copy", "content", "writing"] },
  { name: "Learn AI", desc: "AI consulting, strategy, training, courses and prompt engineering", tags: ["Consulting", "Training", "Prompt Engineering"], aliases: ["learn", "learn ai", "consulting", "training", "education", "courses"] },
];

type Seller = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; river_score: number | null; seller_skills: string[] | null };

export default function Services() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("gigs").select("category").eq("status", "active");
      const tally: Record<string, number> = {};
      (data ?? []).forEach((g: any) => {
        const raw = String(g.category ?? "").toLowerCase().trim();
        const hit = CATS.find((c) => c.aliases.some((a) => raw === a || raw.includes(a)));
        if (hit) tally[hit.name] = (tally[hit.name] ?? 0) + 1;
      });
      setCounts(tally);
    })();
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, river_score, seller_skills")
        .eq("seller_status", "approved")
        .is("suspended_at", null)
        .order("river_score", { ascending: false, nullsFirst: false })
        .limit(5);
      setSellers((data ?? []) as Seller[]);
    })();
  }, []);

  const goCat = (name: string) => navigate(`/browse?category=${encodeURIComponent(name)}`);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div className="container-page" style={{ paddingTop: 40, paddingBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#000" }}>AI Services</h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
          Everything you need to build, grow, and run with AI — all in one place
        </p>
      </div>

      {/* Services grid */}
      <div className="container-page" style={{ paddingBottom: 56 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {CATS.map((c) => (
            <ServiceCard key={c.name} cat={c} count={counts[c.name] ?? 0} onClick={() => goCat(c.name)} />
          ))}
        </div>
      </div>

      {/* Featured sellers */}
      <div className="container-page" style={{ paddingBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#000" }}>Top Experts This Week</h2>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {sellers.map((s) => (
            <div
              key={s.id}
              style={{
                flex: "0 0 240px",
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f5f5f5" }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.full_name || s.username || "Seller"}
                  </div>
                  <div style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", background: "#ecfdf5", color: "#065F46", borderRadius: 999 }}>
                    River {Number(s.river_score ?? 0).toFixed(1)}
                  </div>
                </div>
              </div>
              {s.seller_skills?.[0] && (
                <span style={{ alignSelf: "flex-start", fontSize: 11, padding: "3px 8px", background: "#f5f5f5", color: "#333", borderRadius: 999 }}>
                  {s.seller_skills[0]}
                </span>
              )}
              <Link
                to={`/u/${s.username ?? s.id}`}
                style={{
                  marginTop: "auto",
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 12px",
                  border: "1px solid #000",
                  borderRadius: 999,
                  color: "#000",
                  textDecoration: "none",
                }}
              >
                View Profile
              </Link>
            </div>
          ))}
          {sellers.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>Loading…</p>}
        </div>
      </div>

      {/* How it works */}
      <div className="container-page" style={{ paddingBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px", color: "#000" }}>How Katexs Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
          {[
            { n: "1", t: "Tell River what you need", d: "Type your project into River and get matched to the top 15 experts instantly." },
            { n: "2", t: "Choose your expert", d: "Review pitches, compare River Scores, message directly, and pick the best fit." },
            { n: "3", t: "Get it done", d: "Pay securely, track your project, approve delivery, and release payment in 3 days." },
          ].map((s) => (
            <div key={s.n}>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#e5e5e5", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#000", marginTop: 8 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: "#000", color: "#fff", padding: "48px 0" }}>
        <div className="container-page" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>Ready to get started?</h2>
          <p style={{ fontSize: 14, color: "#ccc", marginTop: 8 }}>
            Tell River what you need and find your expert in seconds.
          </p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              marginTop: 20,
              background: "#fff",
              color: "#000",
              padding: "12px 32px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Find My Expert
          </Link>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ cat, count, onClick }: { cat: Cat; count: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hover ? "#000" : "#e5e5e5"}`,
        borderRadius: 12,
        padding: 24,
        cursor: "pointer",
        boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "#000" }}>{cat.name}</div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.4 }}>{cat.desc}</div>
      <div style={{ fontSize: 12, color: "#999" }}>{count} services available</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {cat.tags.map((t) => (
          <span key={t} style={{ fontSize: 11, padding: "3px 8px", background: "#f5f5f5", color: "#333", borderRadius: 999 }}>
            {t}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#000", marginTop: 4 }}>Browse services →</div>
    </div>
  );
}
